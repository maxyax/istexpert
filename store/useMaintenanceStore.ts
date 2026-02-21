
import { create } from 'zustand';
import { MaintenanceRecord, BreakdownRecord, BreakdownStatus, PlannedTO, PlannedTOStatus, BreakdownSeverity, FuelRecord, EquipStatus } from '../types';
import { useNotificationStore } from './useNotificationStore';
import { useFleetStore } from './useFleetStore';
import { useAuthStore } from './useAuthStore';

interface MaintenanceState {
  records: MaintenanceRecord[];
  breakdowns: BreakdownRecord[];
  plannedTOs: PlannedTO[];
  fuelRecords: FuelRecord[];
  selectedMaintenanceEquipId: string | null;
  setSelectedMaintenanceEquipId: (id: string | null) => void;
  addMaintenance: (record: MaintenanceRecord) => void;
  addBreakdown: (record: Omit<BreakdownRecord, 'id'>) => void;
  updateBreakdownStatus: (id: string, status: BreakdownStatus, fixedDate?: string, hoursAtFix?: number, mileageAtFix?: number) => void;
  addPlannedTO: (to: Omit<PlannedTO, 'id'>) => void;
  updatePlannedTO: (id: string, updates: Partial<PlannedTO>) => void;
  removePlannedTO: (id: string) => void;
  addFuelRecord: (record: FuelRecord) => void;
  _recalculateEquipmentStatus?: (equipmentId: string) => void;
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  records: [],
  breakdowns: [
    // Fixed status and severity to match types.ts Russian strings
    { id: 'b-demo', equipmentId: 'id-1', date: new Date().toISOString(), node: 'Двигатель', partName: 'ТНВД', status: 'Новая', severity: 'Критическая', hoursAtBreakdown: 1400, description: 'Утечка топлива под высоким давлением', reportedBy: 'Иванов А.А.' }
  ],
  plannedTOs: [
    { id: 'p1', equipmentId: 'id-1', type: 'ТО-1', date: '2025-06-15', status: 'planned' }
  ],
  fuelRecords: [
    {
      id: 'f1',
      equipmentId: 'id-1',
      date: new Date(Date.now() - 86400000).toISOString(),
      station: 'Лукойл',
      fuelType: 'ДТ (Зимнее)' as any,
      quantity: 120,
      pricePerLiter: 65,
      totalCost: 7800,
      currentHours: 1410,
      currentMileage: 12000,
      paymentMethod: 'Топливная карта' as any,
      performedBy: 'Петров А.В.'
    }
  ],
  selectedMaintenanceEquipId: null,
  setSelectedMaintenanceEquipId: (id) => set({ selectedMaintenanceEquipId: id }),
  addMaintenance: (record) => set((state) => ({
    records: [record, ...state.records],
    plannedTOs: state.plannedTOs.map(p => 
      (p.equipmentId === record.equipmentId && p.type === record.type && p.status === 'planned')
      ? { ...p, status: 'completed' } : p
    )
  })),
  addBreakdown: (record) => {
    const id = `b-${Math.random().toString(36).substr(2, 9)}`;
    set((state) => {
      const actNumber = `АКТ-${String(state.breakdowns.length + 1).padStart(3, '0')}`; // Generate act number like АКТ-001, АКТ-002
      const equipment = useFleetStore.getState().equipment.find(e => e.id === record.equipmentId);
      
      // Fixed comparison to match BreakdownSeverity type
      useNotificationStore.getState().addNotification(
        'Зарегистрирована поломка',
        `${equipment?.name || 'Техника'}: неисправность узла "${record.node}" (${record.partName}). Степень: ${record.severity}. АКТ ${actNumber}`,
        record.severity === 'Критическая' ? 'error' : 'warning'
      );

      return {
        breakdowns: [{ ...record, id, actNumber }, ...state.breakdowns]
      };
    });
    // After adding breakdown, recalculate equipment status
    const calc = useMaintenanceStore.getState()._recalculateEquipmentStatus;
    if (calc) calc(record.equipmentId);
  },
  updateBreakdownStatus: (id, status, fixedDate, hoursAtFix?: number, mileageAtFix?: number) => {
    const breakdown = useMaintenanceStore.getState().breakdowns.find(b => b.id === id);
    
    set((state) => ({
      breakdowns: state.breakdowns.map(b => {
        if (b.id !== id) return b;
        return {
          ...b,
          status,
          // Fixed comparison to match BreakdownStatus type
          fixedDate: status === 'Исправлено' ? (fixedDate || new Date().toISOString()) : b.fixedDate,
          // Сохраняем наработку и пробег на момент исправления
          hoursAtFix: status === 'Исправлено' ? hoursAtFix : b.hoursAtFix,
          mileageAtFix: status === 'Исправлено' ? mileageAtFix : b.mileageAtFix
        };
      })
    }));
    
    // Если статус "Исправлено", добавляем запись в архив обслуживания
    if (status === 'Исправлено' && breakdown) {
      const equip = useFleetStore.getState().equipment.find(e => e.id === breakdown.equipmentId);
      const hoursAtFixValue = hoursAtFix || breakdown.hoursAtBreakdown || equip?.hours || 0;
      
      useMaintenanceStore.getState().addMaintenance({
        id: `fix-${id}-${Date.now()}`,
        equipmentId: breakdown.equipmentId,
        date: fixedDate || new Date().toISOString().split('T')[0],
        type: `Исправление поломки ${breakdown.actNumber || ''}`,
        hoursAtMaintenance: hoursAtFixValue,
        performedBy: useAuthStore.getState().user?.full_name || 'Механик',
        checklistItems: [
          { text: `Поломка: ${breakdown.partName} (${breakdown.node})`, done: true, note: breakdown.description },
          { text: 'Неисправность устранена', done: true, note: `Статус: ${status}` },
          ...(hoursAtFix ? [{ text: `Наработка при исправлении: ${hoursAtFix} м/ч`, done: true }] : []),
          ...(mileageAtFix ? [{ text: `Пробег при исправлении: ${mileageAtFix} км`, done: true }] : [])
        ]
      });
    }
    
    // After updating, find equipment id and recalc status
    const b = useMaintenanceStore.getState().breakdowns.find(bb => bb.id === id);
    if (b) {
      const calc = useMaintenanceStore.getState()._recalculateEquipmentStatus;
      if (calc) calc(b.equipmentId);
    }
  },
  addPlannedTO: (to) => set((state) => ({
    plannedTOs: [...state.plannedTOs, { ...to, id: `pto-${Math.random().toString(36).substr(2, 9)}` }]
  })),
  updatePlannedTO: (id, updates) => set((state) => ({
    plannedTOs: state.plannedTOs.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  removePlannedTO: (id) => set((state) => ({
    plannedTOs: state.plannedTOs.filter(t => t.id !== id)
  })),
  addFuelRecord: (record) => set((state) => ({
    fuelRecords: [record, ...state.fuelRecords]
  })),
  // helper to compute and set equipment status based on breakdowns and planned TOs
  _recalculateEquipmentStatus: (equipmentId: string) => {
    const state = useMaintenanceStore.getState();
    const fleet = useFleetStore.getState();
    const breakdowns = state.breakdowns.filter(b => b.equipmentId === equipmentId);
    const active = breakdowns.filter(b => b.status !== 'Исправлено');

    if (active.length === 0) {
      const hasPlanned = state.plannedTOs.some(t => t.equipmentId === equipmentId && t.status === 'planned');
      const newStatus = hasPlanned ? EquipStatus.MAINTENANCE : EquipStatus.ACTIVE;
      fleet.updateEquipment(equipmentId, { status: newStatus });
      return;
    }

    if (active.some(b => b.severity === 'Критическая')) {
      fleet.updateEquipment(equipmentId, { status: EquipStatus.REPAIR });
      return;
    }

    if (active.some(b => b.status === 'Запчасти заказаны' || b.status === 'Запчасти получены')) {
      fleet.updateEquipment(equipmentId, { status: EquipStatus.WAITING_PARTS });
      return;
    }

    // default for non-critical active breakdowns
    fleet.updateEquipment(equipmentId, { status: EquipStatus.ACTIVE_WITH_RESTRICTIONS });
  }
}));

// initialize equipment statuses from existing breakdowns/planned TOs
setTimeout(() => {
  const s = useMaintenanceStore.getState();
  const equipmentIds = Array.from(new Set([...s.breakdowns.map(b => b.equipmentId), ...s.plannedTOs.map(t => t.equipmentId)]));
  equipmentIds.forEach(id => s._recalculateEquipmentStatus && s._recalculateEquipmentStatus(id));
}, 0);
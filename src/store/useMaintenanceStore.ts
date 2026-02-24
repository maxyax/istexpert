
import { create } from 'zustand';
import { MaintenanceRecord, BreakdownRecord, BreakdownStatus, PlannedTO, PlannedTOStatus, BreakdownSeverity, FuelRecord, EquipStatus } from '../types';
import { useNotificationStore } from './useNotificationStore';
import { useFleetStore } from './useFleetStore';
import { useAuthStore } from './useAuthStore';
import { getDemoData, isDemoSession } from '../services/demo';

interface MaintenanceState {
  records: MaintenanceRecord[];
  breakdowns: BreakdownRecord[];
  plannedTOs: PlannedTO[];
  fuelRecords: FuelRecord[];
  selectedMaintenanceEquipId: string | null;
  setSelectedMaintenanceEquipId: (id: string | null) => void;
  addMaintenance: (record: MaintenanceRecord) => void;
  addBreakdown: (record: Omit<BreakdownRecord, 'id'>) => void;
  updateBreakdownStatus: (id: string, status: BreakdownStatus, fixedDate?: string, hoursAtFix?: number, mileageAtFix?: number, fixNotes?: string) => void;
  addPlannedTO: (to: Omit<PlannedTO, 'id'>) => void;
  updatePlannedTO: (id: string, updates: Partial<PlannedTO>) => void;
  removePlannedTO: (id: string) => void;
  addFuelRecord: (record: FuelRecord) => void;
  _recalculateEquipmentStatus?: (equipmentId: string) => void;
  loadDemoData: () => void;
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  records: [],
  breakdowns: [],
  plannedTOs: [],
  fuelRecords: [],
  selectedMaintenanceEquipId: null,
  setSelectedMaintenanceEquipId: (id) => set({ selectedMaintenanceEquipId: id }),
  loadDemoData: () => {
    if (isDemoSession()) {
      const demoData = getDemoData();
      if (demoData) {
        if (demoData.maintenance) set({ records: demoData.maintenance });
        if (demoData.breakdowns) set({ breakdowns: demoData.breakdowns });
        if (demoData.fuel) set({ fuelRecords: demoData.fuel });
      }
    }
  },
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
  updateBreakdownStatus: (id, status, fixedDate, hoursAtFix?: number, mileageAtFix?: number, fixNotes?: string) => {
    const breakdown = useMaintenanceStore.getState().breakdowns.find(b => b.id === id);

    set((state) => ({
      breakdowns: state.breakdowns.map(b => {
        if (b.id !== id) return b;
        return {
          ...b,
          status,
          fixedDate: status === 'Исправлено' ? (fixedDate || new Date().toISOString()) : b.fixedDate,
          hoursAtFix: status === 'Исправлено' ? hoursAtFix : b.hoursAtFix,
          mileageAtFix: status === 'Исправлено' ? mileageAtFix : b.mileageAtFix,
          fixNotes: status === 'Исправлено' ? fixNotes : b.fixNotes
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
          ...(mileageAtFix ? [{ text: `Пробег при исправлении: ${mileageAtFix} км`, done: true }] : []),
          ...(fixNotes ? [{ text: `Примечание: ${fixNotes}`, done: false }] : [])
        ]
      });
    }

    const b = useMaintenanceStore.getState().breakdowns.find(bb => bb.id === id);
    if (b) {
      const calc = useMaintenanceStore.getState()._recalculateEquipmentStatus;
      if (calc) calc(b.equipmentId);
    }
  },
  addPlannedTO: (to) => {
    set((state) => ({
      plannedTOs: [...state.plannedTOs, { ...to, id: `pto-${Math.random().toString(36).substr(2, 9)}` }]
    }));
    // Recalculate status for this equipment
    const calc = useMaintenanceStore.getState()._recalculateEquipmentStatus;
    if (calc) calc(to.equipmentId);
  },
  updatePlannedTO: (id, updates) => {
    const to = useMaintenanceStore.getState().plannedTOs.find(t => t.id === id);
    set((state) => ({
      plannedTOs: state.plannedTOs.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
    // Recalculate status for this equipment
    if (to) {
      const calc = useMaintenanceStore.getState()._recalculateEquipmentStatus;
      if (calc) calc(to.equipmentId);
    }
  },
  removePlannedTO: (id) => {
    const to = useMaintenanceStore.getState().plannedTOs.find(t => t.id === id);
    set((state) => ({
      plannedTOs: state.plannedTOs.filter(t => t.id !== id)
    }));
    // Recalculate status for this equipment
    if (to) {
      const calc = useMaintenanceStore.getState()._recalculateEquipmentStatus;
      if (calc) calc(to.equipmentId);
    }
  },
  addFuelRecord: (record) => set((state) => ({
    fuelRecords: [record, ...state.fuelRecords]
  })),
  // helper to compute and set equipment status based on breakdowns and planned TOs
  _recalculateEquipmentStatus: (equipmentId: string) => {
    const state = useMaintenanceStore.getState();
    const fleet = useFleetStore.getState();
    const breakdowns = state.breakdowns.filter(b => b.equipmentId === equipmentId);
    const plannedTOs = state.plannedTOs.filter(t => t.equipmentId === equipmentId);
    const active = breakdowns.filter(b => b.status !== 'Исправлено');
    const equip = fleet.equipment.find(e => e.id === equipmentId);

    // 1. Критические поломки - В ремонте
    const criticalBreakdowns = active.filter(b => b.severity === 'Критическая');
    if (criticalBreakdowns.length > 0) {
      fleet.updateEquipment(equipmentId, { status: EquipStatus.REPAIR });
      return;
    }

    // 2. Поломки в работе - В ремонте
    const inWorkBreakdowns = active.filter(b => b.status === 'В работе');
    if (inWorkBreakdowns.length > 0) {
      fleet.updateEquipment(equipmentId, { status: EquipStatus.REPAIR });
      return;
    }

    // 3. Ожидание запчастей
    const waitingForParts = active.filter(b =>
      b.status === 'Запчасти заказаны' || b.status === 'Запчасти получены'
    );
    if (waitingForParts.length > 0) {
      fleet.updateEquipment(equipmentId, { status: EquipStatus.WAITING_PARTS });
      return;
    }

    // 4. Незначительные поломки (низкая/средняя) в статусе "Новая"
    const minorBreakdowns = active.filter(b =>
      (b.severity === 'Низкая' || b.severity === 'Средняя') && b.status === 'Новая'
    );
    if (minorBreakdowns.length > 0) {
      fleet.updateEquipment(equipmentId, { status: EquipStatus.ACTIVE_WITH_RESTRICTIONS });
      return;
    }

    // 5. Проверка просроченного ТО по пробегу/моточасам
    if (equip && equip.regulations && equip.regulations.length > 0) {
      const currHours = equip.hours || 0;
      const currKm = equip.mileage_km || 0;

      for (const reg of equip.regulations) {
        const intervalHours = reg.intervalHours || 0;
        const intervalKm = reg.intervalKm || 0;

        let nextHours = intervalHours > 0 ? Math.ceil(currHours / intervalHours) * intervalHours : Infinity;
        let nextKm = intervalKm > 0 ? Math.ceil(currKm / intervalKm) * intervalKm : Infinity;

        const hoursOverdue = intervalHours > 0 && currHours >= nextHours;
        const kmOverdue = intervalKm > 0 && currKm >= nextKm;

        if (hoursOverdue || kmOverdue) {
          fleet.updateEquipment(equipmentId, { status: EquipStatus.MAINTENANCE });
          return;
        }
      }
    }

    // 6. Проверка просроченного ТО по календарю
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overduePlannedTO = plannedTOs.filter(t => {
      if (t.status !== 'planned') return false;
      const plannedDate = new Date(t.date);
      plannedDate.setHours(0, 0, 0, 0);
      return plannedDate < today;
    });

    if (overduePlannedTO.length > 0) {
      fleet.updateEquipment(equipmentId, { status: EquipStatus.MAINTENANCE });
      return;
    }

    // 7. Проверка предстоящего планового ТО
    const upcomingPlannedTO = plannedTOs.filter(t => t.status === 'planned');
    if (upcomingPlannedTO.length > 0) {
      fleet.updateEquipment(equipmentId, { status: EquipStatus.MAINTENANCE });
      return;
    }

    // 8. Техника в работе (нет активных проблем)
    fleet.updateEquipment(equipmentId, { status: EquipStatus.ACTIVE });
  }
}));

// initialize equipment statuses from existing breakdowns/planned TOs
setTimeout(() => {
  const s = useMaintenanceStore.getState();
  const equipmentIds = Array.from(new Set([...s.breakdowns.map(b => b.equipmentId), ...s.plannedTOs.map(t => t.equipmentId)]));
  equipmentIds.forEach(id => s._recalculateEquipmentStatus && s._recalculateEquipmentStatus(id));
}, 0);
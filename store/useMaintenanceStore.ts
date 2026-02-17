
import { create } from 'zustand';
import { MaintenanceRecord, BreakdownRecord, BreakdownStatus, PlannedTO, PlannedTOStatus, BreakdownSeverity, FuelRecord } from '../types';
import { useNotificationStore } from './useNotificationStore';
import { useFleetStore } from './useFleetStore';

interface MaintenanceState {
  records: MaintenanceRecord[];
  breakdowns: BreakdownRecord[];
  plannedTOs: PlannedTO[];
  fuelRecords: FuelRecord[];
  selectedMaintenanceEquipId: string | null;
  setSelectedMaintenanceEquipId: (id: string | null) => void;
  addMaintenance: (record: MaintenanceRecord) => void;
  addBreakdown: (record: Omit<BreakdownRecord, 'id'>) => void;
  updateBreakdownStatus: (id: string, status: BreakdownStatus, fixedDate?: string) => void;
  addPlannedTO: (to: Omit<PlannedTO, 'id'>) => void;
  updatePlannedTO: (id: string, updates: Partial<PlannedTO>) => void;
  removePlannedTO: (id: string) => void;
  addFuelRecord: (record: FuelRecord) => void;
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
    const equipment = useFleetStore.getState().equipment.find(e => e.id === record.equipmentId);
    
    // Fixed comparison to match BreakdownSeverity type
    useNotificationStore.getState().addNotification(
      'Зарегистрирована поломка',
      `${equipment?.name || 'Техника'}: неисправность узла "${record.node}" (${record.partName}). Степень: ${record.severity}.`,
      record.severity === 'Критическая' ? 'error' : 'warning'
    );

    set((state) => ({
      breakdowns: [{ ...record, id }, ...state.breakdowns]
    }));
  },
  updateBreakdownStatus: (id, status, fixedDate) => set((state) => ({
    breakdowns: state.breakdowns.map(b => {
      if (b.id !== id) return b;
      return { 
        ...b, 
        status, 
        // Fixed comparison to match BreakdownStatus type
        fixedDate: status === 'Исправлено' ? (fixedDate || new Date().toISOString()) : b.fixedDate 
      };
    })
  })),
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
}));
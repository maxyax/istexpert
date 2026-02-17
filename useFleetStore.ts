
import { create } from 'zustand';
import { Equipment, EquipStatus, MaintenanceRegulation } from './types';

interface FleetState {
  equipment: Equipment[];
  selectedEquipmentId: string | null;
  addEquipment: (item: Equipment) => void;
  updateEquipment: (id: string, updates: Partial<Equipment>) => void;
  deleteEquipment: (id: string) => void;
  selectEquipment: (id: string | null) => void;
  updateRegulations: (id: string, regs: MaintenanceRegulation[]) => void;
}

export const useFleetStore = create<FleetState>((set) => ({
  equipment: [
    { 
      id: 'id-1', name: 'Бульдозер Б-01', make: 'Liebherr', model: 'PR 736', vin: 'LB-736-XYZ', 
      status: EquipStatus.ACTIVE, hours: 1420, year: 2022,
      regulations: [
        { id: 'r1', type: 'ТО-250', intervalHours: 250, works: ['Замена масла', 'Проверка гидравлики'] }
      ]
    }
  ],
  selectedEquipmentId: null,
  addEquipment: (item) => set((state) => ({ equipment: [item, ...state.equipment] })),
  updateEquipment: (id, updates) => set((state) => ({
    equipment: state.equipment.map(e => e.id === id ? { ...e, ...updates } : e)
  })),
  deleteEquipment: (id) => set((state) => ({
    equipment: state.equipment.filter(e => e.id !== id)
  })),
  selectEquipment: (id) => set({ selectedEquipmentId: id }),
  updateRegulations: (id, regs) => set((state) => ({
    equipment: state.equipment.map(e => e.id === id ? { ...e, regulations: regs } : e)
  })),
}));

import { create } from 'zustand';
import { Equipment, EquipStatus, MaintenanceRegulation } from '../types';
import { getDemoData, isDemoSession } from '../services/demo';

interface FleetState {
  equipment: Equipment[];
  selectedEquipmentId: string | null;
  addEquipment: (item: Equipment) => void;
  updateEquipment: (id: string, updates: Partial<Equipment>) => void;
  deleteEquipment: (id: string) => void;
  selectEquipment: (id: string | null) => void;
  updateRegulations: (id: string, regs: MaintenanceRegulation[]) => void;
  loadDemoData: () => void;
}

export const useFleetStore = create<FleetState>((set) => ({
  equipment: [],
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
  loadDemoData: () => {
    if (isDemoSession()) {
      const demoData = getDemoData();
      if (demoData && demoData.equipment) {
        set({ equipment: demoData.equipment });
      }
    }
  },
}));


import { create } from 'zustand';
import { Equipment, EquipStatus, MaintenanceRegulation } from '../types';

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
      id: 'id-1', 
      name: 'Liebherr PR 736', 
      make: 'Liebherr', 
      model: 'PR 736 LGP', 
      vin: 'LB-736-2023-XYZ-01', 
      license_plate: '7788 РЕ 77',
      status: EquipStatus.ACTIVE, 
      hours: 1420, 
      mileage_km: 12500,
      year: 2023,
      driver: 'Иванов С.П.',
      insurance_end: '2025-12-10',
      insuranceCompany: 'Росгосстрах',
      insuranceNumber: 'ОСАГО-2023-12345678',
      insuranceStart: '2024-12-10',
      image: 'https://www.liebherr.com/shared/media/construction-machinery/crawler-tractors/pr-736/pr-736-litronic-crawler-tractor-liebherr.jpg',
      documents: [
        { name: 'СТС.pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', type: 'sts' },
        { name: 'ОСАГО.pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', type: 'osago' }
      ],
      regulations: [
        { id: 'r1', type: 'ТО-250', intervalHours: 250, works: ['Замена масла ДВС', 'Проверка гидравлики', 'Смазка узлов'] }
      ]
    },
    { 
      id: 'id-2', 
      name: 'Caterpillar 336', 
      make: 'CAT', 
      model: '336 Next Gen', 
      vin: 'CAT-336-EXT-992', 
      license_plate: '0012 МС 50',
      status: EquipStatus.REPAIR, 
      hours: 3120, 
      mileage_km: 8400,
      year: 2022,
      driver: 'Петров А.В.',
      insurance_end: '2025-02-25',
      insuranceCompany: 'АльфаСтрахование',
      insuranceNumber: 'ОСАГО-2024-87654321',
      insuranceStart: '2024-02-25',
      image: 'https://s7d2.scene7.com/is/image/Caterpillar/CM20180815-47583-36307',
      regulations: []
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

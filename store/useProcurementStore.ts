
import { create } from 'zustand';
import { ProcurementRequest, ProcurementStatus } from '../types';

interface ProcurementState {
  requests: ProcurementRequest[];
  selectedRequestId: string | null;
  setSelectedRequestId: (id: string | null) => void;
  addRequest: (req: ProcurementRequest) => void;
  updateRequestStatus: (id: string, status: ProcurementStatus) => void;
}

export const useProcurementStore = create<ProcurementState>((set) => ({
  requests: [
    { 
      id: 'p1', 
      title: 'Комплект фильтров ТО-1000 (Масляный, Топливный, Воздушный)', 
      status: 'Новая', 
      items: [], 
      cost: 28500, 
      createdAt: new Date().toISOString(),
      equipmentId: 'id-1'
    },
    { 
      id: 'p2', 
      title: 'Гидравлическое масло Shell Tellus S2 V 46 (200л)', 
      status: 'Поиск', 
      items: [], 
      cost: 84000, 
      createdAt: new Date().toISOString(),
      equipmentId: 'id-2'
    }
  ],
  selectedRequestId: null,
  setSelectedRequestId: (id) => set({ selectedRequestId: id }),
  addRequest: (req) => set((state) => ({ requests: [req, ...state.requests] })),
  updateRequestStatus: (id, status) => set((state) => ({
    requests: state.requests.map(r => r.id === id ? { ...r, status } : r)
  })),
}));

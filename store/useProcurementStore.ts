
import { create } from 'zustand';
import { ProcurementRequest, ProcurementStatus } from '../types';
import { useMaintenanceStore } from './useMaintenanceStore';
import { useAuthStore } from './useAuthStore';

interface ProcurementState {
  requests: ProcurementRequest[];
  selectedRequestId: string | null;
  setSelectedRequestId: (id: string | null) => void;
  addRequest: (req: ProcurementRequest) => void;
  updateRequestStatus: (id: string, status: ProcurementStatus) => void;
  updateRequest: (id: string, updates: Partial<ProcurementRequest>) => void;
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
  updateRequestStatus: (id, status) => set((state) => {
    const updated = state.requests.map(r => r.id === id ? { ...r, status, completedAt: status === 'На складе' ? new Date().toISOString() : r.completedAt } : r);
    const req = state.requests.find(r => r.id === id);
    if (req && req.breakdownId) {
      // Автоматическая синхронизация статусов поломки со статусом заявки
      if (status === 'Оплачено' || status === 'В пути') {
        // Когда заявка оплачена или в пути - ставим "Запчасти заказаны"
        useMaintenanceStore.getState().updateBreakdownStatus(req.breakdownId, 'Запчасти заказаны');
      } else if (status === 'На складе') {
        // Когда запчасти на складе - ставим "Запчасти получены"
        useMaintenanceStore.getState().updateBreakdownStatus(req.breakdownId, 'Запчасти получены');
      } else if (status === 'Новая' || status === 'Поиск') {
        // Когда заявка новая или в поиске - ставим "Новая"
        useMaintenanceStore.getState().updateBreakdownStatus(req.breakdownId, 'Новая');
      }
    }
    // Добавляем запись в историю статусов
    const statusHistoryEntry = { status, date: new Date().toISOString(), user: useAuthStore.getState().user?.full_name };
    const withHistory = updated.map(r => r.id === id ? { ...r, statusHistory: [...(r.statusHistory || []), statusHistoryEntry] } : r);
    return { requests: withHistory };
  }),
  updateRequest: (id, updates) => set((state) => ({
    requests: state.requests.map(r => r.id === id ? { ...r, ...updates } : r)
  })),
}));


import { create } from 'zustand';
import { ProcurementRequest, ProcurementStatus } from './types';

interface ProcurementState {
  requests: ProcurementRequest[];
  selectedRequestId: string | null;
  addRequest: (req: ProcurementRequest) => void;
  updateRequestStatus: (id: string, status: ProcurementStatus) => void;
  setSelectedRequestId: (id: string | null) => void;
}

export const useProcurementStore = create<ProcurementState>((set) => ({
  requests: [],
  selectedRequestId: null,
  addRequest: (req) => set((state) => ({ requests: [req, ...state.requests] })),
  updateRequestStatus: (id, status) => set((state) => ({
    requests: state.requests.map(r => r.id === id ? { ...r, status } : r)
  })),
  setSelectedRequestId: (id) => set({ selectedRequestId: id }),
}));

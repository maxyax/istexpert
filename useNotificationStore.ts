
import { create } from 'zustand';

export const useNotificationStore = create<any>((set) => ({
  notifications: [],
  addNotification: (title: string, message: string, type = 'info') => set((state: any) => ({
    notifications: [{ id: Math.random().toString(), title, message, type, read: false }, ...state.notifications]
  })),
  markAsRead: (id: string) => set((state: any) => ({
    notifications: state.notifications.map((n: any) => n.id === id ? { ...n, read: true } : n)
  })),
  clearAll: () => set({ notifications: [] }),
}));

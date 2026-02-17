
import { create } from 'zustand';
import { User, UserRole } from '../types';

interface CompanyInfo {
  name: string;
  inn: string;
  address: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isRegistered: boolean;
  user: User | null;
  company: CompanyInfo | null;
  staff: User[];
  login: (email: string, pass: string) => Promise<boolean>;
  demoLogin: () => void;
  register: (companyName: string, inn: string, adminEmail: string) => void;
  logout: () => void;
  addStaff: (member: Omit<User, 'id' | 'company_id'>) => void;
  removeStaff: (id: string) => void;
  updateCompany: (updates: Partial<CompanyInfo>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isRegistered: false,
  user: null,
  company: { 
    name: 'ООО ТехноПарк', 
    inn: '7700123456', 
    address: 'г. Москва, ул. Промышленная, 12' 
  },
  staff: [
    { id: 'u1', email: 'mechanic@ist.ru', full_name: 'Петров А.В.', role: UserRole.MECHANIC, company_id: 'c1' },
    { id: 'u2', email: 'supply@ist.ru', full_name: 'Сидоров К.М.', role: UserRole.PROCUREMENT, company_id: 'c1' },
    { id: 'u3', email: 'chief@ist.ru', full_name: 'Иванов И.И.', role: UserRole.CHIEF_MECHANIC, company_id: 'c1' },
    { id: 'demo', email: 'demo@istexpert.ru', full_name: 'Демо Пользователь', role: UserRole.ADMIN, company_id: 'c1' },
  ],
  login: async (email, pass) => {
    if (email === 'demo@istexpert.ru') {
      set({ isAuthenticated: true, user: useAuthStore.getState().staff.find(s => s.id === 'demo') || null });
      return true;
    }
    const found = useAuthStore.getState().staff.find(s => s.email === email);
    if (found) {
      set({ isAuthenticated: true, user: found });
      return true;
    }
    return false;
  },
  demoLogin: () => {
    set({ 
      isAuthenticated: true, 
      user: { id: 'demo', email: 'demo@istexpert.ru', full_name: 'Демо Пользователь', role: UserRole.ADMIN, company_id: 'c1' } 
    });
  },
  register: (name, inn, email) => {
    set({ 
      isRegistered: true, 
      isAuthenticated: true,
      company: { name, inn, address: '' },
      user: { id: 'admin-new', email, full_name: 'Владелец бизнеса', role: UserRole.ADMIN, company_id: 'new-c' }
    });
  },
  logout: () => set({ isAuthenticated: false, user: null }),
  addStaff: (member) => set((state) => ({
    staff: [...state.staff, { ...member, id: Math.random().toString(36).substr(2, 9), company_id: state.user?.company_id || 'c1' }]
  })),
  removeStaff: (id) => set((state) => ({
    staff: state.staff.filter(s => s.id !== id)
  })),
  updateCompany: (updates) => set((state) => ({
    company: state.company ? { ...state.company, ...updates } : null
  })),
}));

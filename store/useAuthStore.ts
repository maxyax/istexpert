
import { create } from 'zustand';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';

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

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isRegistered: false,
  user: null,
  company: {
    name: 'ООО ТехноПарк',
    inn: '7700123456',
    address: 'г. Москва, ул. Промышленная, 12'
  },
  staff: [
    { id: 'u1', email: 'mechanic@ist.ru', full_name: 'Петров А.В.', role: UserRole.USER, company_id: 'c1' },
    { id: 'u2', email: 'supply@ist.ru', full_name: 'Сидоров К.М.', role: UserRole.USER, company_id: 'c1' },
    { id: 'u3', email: 'chief@ist.ru', full_name: 'Иванов И.И.', role: UserRole.COMPANY_ADMIN, company_id: 'c1' },
    { id: 'demo', email: 'demo@istexpert.ru', full_name: 'Демо Пользователь', role: UserRole.COMPANY_ADMIN, company_id: 'c1' },
  ],
  login: async (email, pass) => {
    // Проверяем через Supabase
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass
      });

      if (error) {
        console.error('Supabase login error:', error);
        return false;
      }

      // Получаем информацию о пользователе из нашей БД
      const { data: userData } = await supabase
        .from('users')
        .select('*, company:companies(name, inn)')
        .eq('id', data.user.id)
        .single();

      if (userData) {
        // Проверяем на супер-админа
        const isAdmin = email === import.meta.env.VITE_ADMIN_EMAIL;
        set({
          isAuthenticated: true,
          user: {
            id: userData.id,
            email: userData.email,
            full_name: userData.full_name,
            role: isAdmin ? UserRole.SUPER_ADMIN : (userData.role as UserRole),
            company_id: userData.company_id
          },
          company: userData.company ? {
            name: userData.company.name,
            inn: userData.company.inn,
            address: ''
          } : get().company
        });
        return true;
      }

      // Если пользователя нет в БД, используем данные из auth
      const isAdmin = email === import.meta.env.VITE_ADMIN_EMAIL;
      set({
        isAuthenticated: true,
        user: {
          id: data.user.id,
          email: data.user.email || email,
          full_name: data.user.user_metadata?.full_name || 'Пользователь',
          role: isAdmin ? UserRole.SUPER_ADMIN : UserRole.USER,
          company_id: 'default'
        }
      });
      return true;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  },
  demoLogin: async () => {
    const { user } = get();
    if (user) {
      set({ isAuthenticated: true });
    } else {
      set({
        isAuthenticated: true,
        user: { id: 'demo', email: 'demo@istexpert.ru', full_name: 'Демо Пользователь', role: UserRole.COMPANY_ADMIN, company_id: 'c1' }
      });
    }
  },
  register: (name, inn, email) => {
    set({ 
      isRegistered: true,
      isAuthenticated: true,
      company: { name, inn, address: '' },
      user: { id: 'admin-new', email, full_name: 'Владелец бизнеса', role: UserRole.COMPANY_ADMIN, company_id: 'new-c' }
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

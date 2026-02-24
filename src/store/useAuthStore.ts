
import { create } from 'zustand';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabase';
import { initializeDemoData, clearDemoData, isDemoSession, getDemoData } from '../services/demo';
import { useFleetStore } from './useFleetStore';
import { useMaintenanceStore } from './useMaintenanceStore';
import { useProcurementStore } from './useProcurementStore';

interface CompanyInfo {
  name: string;
  inn: string;
  address: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isRegistered: boolean;
  isDemo: boolean;
  user: User | null;
  company: CompanyInfo | null;
  staff: User[];
  login: (email: string, pass: string) => Promise<boolean>;
  demoLogin: () => Promise<void>;
  register: (companyName: string, inn: string, adminEmail: string) => void;
  logout: () => void;
  addStaff: (member: Omit<User, 'id' | 'company_id'>) => void;
  removeStaff: (id: string) => void;
  updateCompany: (updates: Partial<CompanyInfo>) => void;
  loadUserFromSupabase: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isRegistered: false,
  isDemo: false,
  user: null,
  company: null,
  staff: [],
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
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, company:companies(name, inn)')
        .eq('id', data.user.id)
        .single();

      if (userError || !userData) {
        // Пользователь есть в auth, но нет в таблице users
        console.error('User not found in database:', data.user.id);
        // Выходим из auth, чтобы не было несоответствия
        await supabase.auth.signOut();
        return false;
      }

      // Проверяем на супер-админа
      const isAdmin = email === import.meta.env.VITE_ADMIN_EMAIL;
      set({
        isAuthenticated: true,
        isDemo: false,
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
        } : null
      });
      return true;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  },
  demoLogin: async () => {
    // Инициализируем демо-данные
    const demoData = await initializeDemoData();
    
    set({
      isAuthenticated: true,
      isDemo: true,
      isRegistered: false,
      user: {
        id: demoData.userId,
        email: 'demo@istexpert.ru',
        full_name: 'Демо Пользователь',
        role: UserRole.COMPANY_ADMIN,
        company_id: demoData.companyId
      },
      company: {
        name: 'Демо-компания «СпецТехСтрой»',
        inn: '7701234567',
        address: 'г. Москва, ул. Примерная, д. 1'
      },
      staff: [
        { id: 'demo-staff-1', email: 'ivanov@demo.ru', full_name: 'Иванов С.П.', role: UserRole.DRIVER, company_id: demoData.companyId },
        { id: 'demo-staff-2', email: 'petrov@demo.ru', full_name: 'Петров А.В.', role: UserRole.DRIVER, company_id: demoData.companyId },
        { id: 'demo-staff-3', email: 'mekhanikov@demo.ru', full_name: 'Механиков С.В.', role: UserRole.MECHANIC, company_id: demoData.companyId }
      ]
    });

    console.log('AuthStore: Demo login completed, loading demo data...');
    console.log('AuthStore: Demo company ID:', demoData.companyId);
    
    // Загружаем данные в хранилища
    useFleetStore.getState().loadDemoData();
    useMaintenanceStore.getState().loadDemoData();
    useProcurementStore.getState().loadDemoData();
    
    console.log('AuthStore: All demo data loaded');
  },
  register: (name, inn, email) => {
    set({
      isRegistered: true,
      isAuthenticated: true,
      isDemo: false,
      company: { name, inn, address: '' },
      user: { id: 'admin-new', email, full_name: 'Владелец бизнеса', role: UserRole.COMPANY_ADMIN, company_id: 'new-c' }
    });
  },
  loadUserFromSupabase: async () => {
    // Проверяем, не демо ли это сессия
    if (isDemoSession()) {
      const demoData = getDemoData();
      if (demoData) {
        set({
          isAuthenticated: true,
          isDemo: true,
          user: {
            id: demoData.userId,
            email: 'demo@istexpert.ru',
            full_name: 'Демо Пользователь',
            role: UserRole.COMPANY_ADMIN,
            company_id: demoData.companyId
          },
          company: {
            name: 'Демо-компания «СпецТехСтрой»',
            inn: '7701234567',
            address: 'г. Москва, ул. Примерная, д. 1'
          }
        });
        return;
      }
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      set({ isAuthenticated: false, isDemo: false, user: null, company: null });
      return;
    }

    const { data: userData } = await supabase
      .from('users')
      .select('*, company:companies(name, inn)')
      .eq('id', authUser.id)
      .single();

    if (userData) {
      const isAdmin = authUser.email === import.meta.env.VITE_ADMIN_EMAIL;
      set({
        isAuthenticated: true,
        isDemo: false,
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
        } : null
      });
    } else {
      set({ isAuthenticated: false, isDemo: false, user: null, company: null });
    }
  },
  logout: async () => {
    await supabase.auth.signOut();
    clearDemoData();
    set({ isAuthenticated: false, isDemo: false, user: null, company: null, staff: [] });
  },
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

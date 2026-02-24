import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Типы данных
export interface Company {
  id: string;
  name: string;
  inn?: string;
  email: string;
  phone?: string;
  subscription_status: 'active' | 'expired' | 'suspended' | 'trial';
  subscription_plan: 'free' | 'basic' | 'pro' | 'enterprise';
  subscription_start?: string;
  subscription_end?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'company_admin' | 'user';
  company_id: string;
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: 'month' | 'year';
  features: string[];
  max_users: number;
  max_equipment: number;
}

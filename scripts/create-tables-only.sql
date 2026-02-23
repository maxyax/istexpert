-- ISTExpert: Часть 1 - Создание таблиц
-- Выполните в Supabase SQL Editor

-- Компании
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  inn TEXT,
  kpp TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  subscription_plan TEXT NOT NULL DEFAULT 'free',
  subscription_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_end TIMESTAMP WITH TIME ZONE,
  max_users INTEGER DEFAULT 3,
  max_equipment INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Пользователи
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Техника
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  make TEXT,
  model TEXT,
  vin TEXT,
  license_plate TEXT,
  year INTEGER,
  status TEXT DEFAULT 'active',
  hours NUMERIC DEFAULT 0,
  mileage_km NUMERIC,
  insurance_end TEXT,
  insurance_start TEXT,
  insurance_company TEXT,
  insurance_number TEXT,
  driver TEXT,
  documents JSONB,
  photos TEXT[],
  regulations JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Записи ТО
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  hours_at_maintenance NUMERIC,
  mileage_at_maintenance NUMERIC,
  performed_by TEXT,
  checklist_items JSONB,
  cost NUMERIC DEFAULT 0,
  fluids JSONB,
  is_early_service BOOLEAN DEFAULT FALSE,
  planned_to_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Плановые ТО
CREATE TABLE IF NOT EXISTS planned_tos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT DEFAULT 'planned',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Поломки
CREATE TABLE IF NOT EXISTS breakdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  act_number TEXT,
  date DATE NOT NULL,
  part_name TEXT NOT NULL,
  node TEXT,
  description TEXT,
  status TEXT DEFAULT 'Новая',
  severity TEXT DEFAULT 'Средняя',
  fixed_date TIMESTAMP WITH TIME ZONE,
  hours_at_breakdown NUMERIC,
  hours_at_fix NUMERIC,
  mileage_at_fix NUMERIC,
  fix_notes TEXT,
  reported_by TEXT,
  photos TEXT[],
  items JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Заявки снабжения (БЕЗ status column - будет добавлен отдельно)
CREATE TABLE IF NOT EXISTS procurement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id),
  breakdown_id UUID REFERENCES breakdowns(id),
  breakdown_act_number TEXT,
  breakdown_name TEXT,
  breakdown_description TEXT,
  breakdown_node TEXT,
  title TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  items JSONB,
  cost NUMERIC DEFAULT 0,
  contractor_name TEXT,
  invoice_number TEXT,
  carrier_name TEXT,
  tracking_number TEXT,
  responsible TEXT,
  created_by TEXT,
  breakdown_photos JSONB,
  invoice_files JSONB,
  attachments JSONB,
  status_history JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Топливо
CREATE TABLE IF NOT EXISTS fuel_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME,
  quantity NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  price_per_liter NUMERIC,
  station TEXT,
  fuel_type TEXT,
  current_hours NUMERIC,
  current_mileage NUMERIC,
  payment_method TEXT,
  performed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Уведомления
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

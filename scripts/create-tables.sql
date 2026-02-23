-- ISTExpert: Создание таблиц базы данных
-- Выполните в Supabase SQL Editor: https://supabase.com/dashboard/project/plsaqkfxrrtgnrhmmcho/sql/new

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  inn TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  subscription_plan TEXT NOT NULL DEFAULT 'free',
  subscription_start TIMESTAMPTZ DEFAULT NOW(),
  subscription_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  make TEXT,
  model TEXT,
  vin TEXT,
  license_plate TEXT,
  status TEXT DEFAULT 'active',
  hours NUMERIC DEFAULT 0,
  mileage_km NUMERIC,
  year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  hours_at_maintenance NUMERIC,
  performed_by TEXT,
  checklist_items JSONB,
  cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS planned_tos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

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
  fixed_date TIMESTAMPTZ,
  hours_at_breakdown NUMERIC,
  reported_by TEXT,
  photos TEXT[],
  items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS procurement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id),
  breakdown_id UUID REFERENCES breakdowns(id),
  title TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Новая',
  items JSONB,
  cost NUMERIC DEFAULT 0,
  contractor_name TEXT,
  invoice_number TEXT,
  tracking_number TEXT,
  responsible TEXT,
  created_by TEXT,
  status_history JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS fuel_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  quantity NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  station TEXT,
  fuel_type TEXT,
  current_hours NUMERIC,
  payment_method TEXT,
  performed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

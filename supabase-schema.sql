-- ISTExpert Supabase Schema
-- Выполните этот SQL в редакторе Supabase: https://app.supabase.com/project/_sql

-- ============================================
-- 1. ТАБЛИЦЫ
-- ============================================

-- Компании
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  inn TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('active', 'expired', 'suspended', 'trial')),
  subscription_plan TEXT NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'basic', 'pro', 'enterprise')),
  subscription_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Пользователи
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY, -- Связь с auth.users
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'company_admin', 'user')),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Техника (основная таблица из демо)
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
  image TEXT,
  insurance_end TEXT,
  insurance_company TEXT,
  insurance_number TEXT,
  insurance_start TEXT,
  insurance_history JSONB,
  supplier TEXT,
  supplier_phone TEXT,
  supplier_email TEXT,
  regulations JSONB,
  driver TEXT,
  documents JSONB,
  photos TEXT[],
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
  cost NUMERIC,
  fluids JSONB,
  is_early_service BOOLEAN DEFAULT FALSE,
  planned_to_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  reported_by TEXT,
  photos TEXT[],
  hours_at_fix NUMERIC,
  mileage_at_fix NUMERIC,
  fix_notes TEXT,
  items JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Заявки на снабжение
CREATE TABLE IF NOT EXISTS procurement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'Новая',
  items JSONB,
  cost NUMERIC,
  contractor_name TEXT,
  invoice_number TEXT,
  carrier_name TEXT,
  tracking_number TEXT,
  responsible TEXT,
  breakdown_photos JSONB,
  invoice_files JSONB,
  attachments JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  equipment_id UUID REFERENCES equipment(id),
  breakdown_id UUID REFERENCES breakdowns(id),
  breakdown_act_number TEXT,
  breakdown_name TEXT,
  breakdown_description TEXT,
  breakdown_node TEXT,
  priority INTEGER DEFAULT 0,
  created_by TEXT,
  status_history JSONB
);

-- Плановые ТО
CREATE TABLE IF NOT EXISTS planned_tos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  current_hours NUMERIC,
  station TEXT,
  fuel_type TEXT,
  price_per_liter NUMERIC,
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
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Платежи (для будущей интеграции с ЮKassa)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'RUB',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_method TEXT,
  transaction_id TEXT,
  invoice_id TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 2. RLS (Row Level Security)
-- ============================================

-- Включаем RLS для всех таблиц
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_tos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. POLICIES
-- ============================================

-- Компании: пользователи видят только свою компанию
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.company_id = companies.id
      AND users.id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.company_id = companies.id
      AND users.id = auth.uid()
    )
  );

-- Пользователи: видят пользователей своей компании
CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Техника: видят только технику своей компании
CREATE POLICY "Users can view equipment in their company"
  ON equipment FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Остальные таблицы: аналогично
CREATE POLICY "Users can manage maintenance in their company"
  ON maintenance_records FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage breakdowns in their company"
  ON breakdowns FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage procurement in their company"
  ON procurement_requests FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage planned_tos in their company"
  ON planned_tos FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage fuel in their company"
  ON fuel_records FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view notifications in their company"
  ON notifications FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view payments in their company"
  ON payments FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================
-- 4. ADMIN POLICY (для владельца)
-- ============================================

-- Политика для админа (владелец может видеть всё)
-- Админ определяется по email в приложении

-- ============================================
-- 5. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_company ON equipment(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_company ON maintenance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_breakdowns_company ON breakdowns(company_id);
CREATE INDEX IF NOT EXISTS idx_procurement_company ON procurement_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_planned_tos_company ON planned_tos(company_id);
CREATE INDEX IF NOT EXISTS idx_fuel_company ON fuel_records(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);

CREATE INDEX IF NOT EXISTS idx_subscription_status ON companies(subscription_status);
CREATE INDEX IF NOT EXISTS idx_subscription_end ON companies(subscription_end);

-- ============================================
-- 6. TRIGGERS для updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. DEMO DATA (опционально)
-- ============================================

-- Можно добавить тестовые данные для отладки

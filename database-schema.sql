-- ISTExpert: Полная структура базы данных
-- Выполните в Supabase SQL Editor: https://supabase.com/dashboard/project/plsaqkfxrrtgnrhmmcho/sql/new

-- ============================================
-- 1. ТАБЛИЦЫ
-- ============================================

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

-- ============================================
-- 2. ВКЛЮЧАЕМ RLS
-- ============================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_tos ENABLE ROW LEVEL SECURITY;
ALTER TABLE breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. ФУНКЦИИ
-- ============================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
DECLARE
  company_id UUID;
BEGIN
  SELECT u.company_id INTO company_id FROM users u WHERE u.id = auth.uid();
  RETURN company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. RLS ПОЛИТИКИ
-- ============================================

DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company" ON companies FOR SELECT
  USING (id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "Users can update their own company" ON companies;
CREATE POLICY "Users can update their own company" ON companies FOR UPDATE
  USING (id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "Users can create companies" ON companies;
CREATE POLICY "Users can create companies" ON companies FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all companies" ON companies;
CREATE POLICY "Admins can view all companies" ON companies FOR SELECT USING (is_super_admin());

DROP POLICY IF EXISTS "Admins can update all companies" ON companies;
CREATE POLICY "Admins can update all companies" ON companies FOR UPDATE USING (is_super_admin());

DROP POLICY IF EXISTS "Admins can delete all companies" ON companies;
CREATE POLICY "Admins can delete all companies" ON companies FOR DELETE USING (is_super_admin());

DROP POLICY IF EXISTS "Users can view users in their company" ON users;
CREATE POLICY "Users can view users in their company" ON users FOR SELECT
  USING (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "Users can create users" ON users;
CREATE POLICY "Users can create users" ON users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own user" ON users;
CREATE POLICY "Users can update own user" ON users FOR UPDATE
  USING (id = auth.uid() OR (company_id = get_user_company_id() AND EXISTS (
    SELECT 1 FROM users u2 WHERE u2.id = auth.uid() 
    AND (u2.role = 'company_admin' OR u2.role = 'owner')
  )) OR is_super_admin());

DROP POLICY IF EXISTS "Admins can delete users" ON users;
CREATE POLICY "Admins can delete users" ON users FOR DELETE
  USING ((company_id = get_user_company_id() AND EXISTS (
    SELECT 1 FROM users u2 WHERE u2.id = auth.uid() 
    AND (u2.role = 'company_admin' OR u2.role = 'owner')
  )) OR is_super_admin());

DROP POLICY IF EXISTS "Users can view equipment in their company" ON equipment;
CREATE POLICY "Users can view equipment in their company" ON equipment FOR SELECT
  USING (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "Users can manage equipment in their company" ON equipment;
CREATE POLICY "Users can manage equipment in their company" ON equipment FOR ALL
  USING (company_id = get_user_company_id() OR is_super_admin())
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "Users can manage maintenance in their company" ON maintenance_records;
CREATE POLICY "Users can manage maintenance in their company" ON maintenance_records FOR ALL
  USING (company_id = get_user_company_id() OR is_super_admin())
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "Users can manage planned_tos in their company" ON planned_tos;
CREATE POLICY "Users can manage planned_tos in their company" ON planned_tos FOR ALL
  USING (company_id = get_user_company_id() OR is_super_admin())
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "Users can manage breakdowns in their company" ON breakdowns;
CREATE POLICY "Users can manage breakdowns in their company" ON breakdowns FOR ALL
  USING (company_id = get_user_company_id() OR is_super_admin())
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "Users can manage procurement in their company" ON procurement_requests;
CREATE POLICY "Users can manage procurement in their company" ON procurement_requests FOR ALL
  USING (company_id = get_user_company_id() OR is_super_admin())
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "Users can manage fuel in their company" ON fuel_records;
CREATE POLICY "Users can manage fuel in their company" ON fuel_records FOR ALL
  USING (company_id = get_user_company_id() OR is_super_admin())
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "Users can view notifications in their company" ON notifications;
CREATE POLICY "Users can view notifications in their company" ON notifications FOR ALL
  USING (company_id = get_user_company_id() OR is_super_admin())
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================
-- 5. ИНДЕКСЫ
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_equipment_company ON equipment(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_company ON maintenance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_equipment ON maintenance_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_breakdowns_company ON breakdowns(company_id);
CREATE INDEX IF NOT EXISTS idx_breakdowns_equipment ON breakdowns(equipment_id);
CREATE INDEX IF NOT EXISTS idx_procurement_company ON procurement_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_fuel_company ON fuel_records(company_id);
CREATE INDEX IF NOT EXISTS idx_fuel_equipment ON fuel_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id);

CREATE INDEX IF NOT EXISTS idx_subscription_status ON companies(subscription_status);
CREATE INDEX IF NOT EXISTS idx_subscription_end ON companies(subscription_end);

-- ============================================
-- 6. TRIGGERS
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

CREATE TRIGGER update_breakdowns_updated_at BEFORE UPDATE ON breakdowns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ГОТОВО!
-- ============================================

-- ISTExpert: RLS политики (без проблемных индексов)
-- Выполните в Supabase SQL Editor

-- ============================================
-- 1. ВКЛЮЧАЕМ RLS
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
-- 2. ФУНКЦИИ
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
-- 3. RLS ПОЛИТИКИ
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
-- 4. ИНДЕКСЫ (только безопасные)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_company ON equipment(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_company ON maintenance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_breakdowns_company ON breakdowns(company_id);
CREATE INDEX IF NOT EXISTS idx_procurement_company ON procurement_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_fuel_company ON fuel_records(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id);

CREATE INDEX IF NOT EXISTS idx_subscription_status ON companies(subscription_status);

-- ============================================
-- 5. TRIGGERS
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

-- ISTExpert: RLS Policies для существующих таблиц
-- Выполните этот SQL в редакторе Supabase

-- ============================================
-- 1. Включаем RLS для всех таблиц
-- ============================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. Функция для проверки роли пользователя
-- ============================================

-- Функция для проверки на супер-админа
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. POLICIES для companies
-- ============================================

DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.company_id = companies.id
      AND users.id = auth.uid()
    )
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "Users can update their own company" ON companies;
CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.company_id = companies.id
      AND (users.role = 'company_admin' OR users.role = 'owner')
      AND users.id = auth.uid()
    )
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "Users can create companies" ON companies;
CREATE POLICY "Users can create companies"
  ON companies FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all companies" ON companies;
CREATE POLICY "Admins can view all companies"
  ON companies FOR SELECT
  USING (is_super_admin());

DROP POLICY IF EXISTS "Admins can update all companies" ON companies;
CREATE POLICY "Admins can update all companies"
  ON companies FOR UPDATE
  USING (is_super_admin());

DROP POLICY IF EXISTS "Admins can delete all companies" ON companies;
CREATE POLICY "Admins can delete all companies"
  ON companies FOR DELETE
  USING (is_super_admin());

-- ============================================
-- 4. POLICIES для users
-- ============================================

-- Все пользователи видят пользователей своей компании
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    OR is_super_admin()
  );

-- Создание пользователей (при регистрации)
DROP POLICY IF EXISTS "Users can create users" ON users;
CREATE POLICY "Users can create users"
  ON users FOR INSERT
  WITH CHECK (true);

-- Обновление только себя или пользователей своей компании (для админа)
DROP POLICY IF EXISTS "Users can update own user" ON users;
CREATE POLICY "Users can update own user"
  ON users FOR UPDATE
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.id = auth.uid()
      AND u2.company_id = users.company_id
      AND (u2.role = 'company_admin' OR u2.role = 'owner')
    )
    OR is_super_admin()
  );

-- Удаление пользователей (только админ компании или супер-админ)
DROP POLICY IF EXISTS "Admins can delete users" ON users;
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.id = auth.uid()
      AND u2.company_id = users.company_id
      AND (u2.role = 'company_admin' OR u2.role = 'owner')
    )
    OR is_super_admin()
  );

-- ============================================
-- 5. POLICIES для equipment
-- ============================================

DROP POLICY IF EXISTS "Users can view equipment in their company" ON equipment;
CREATE POLICY "Users can view equipment in their company"
  ON equipment FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "Users can manage equipment in their company" ON equipment;
CREATE POLICY "Users can manage equipment in their company"
  ON equipment FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    OR is_super_admin()
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    OR is_super_admin()
  );

-- ============================================
-- 6. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_equipment_company ON equipment(company_id);

CREATE INDEX IF NOT EXISTS idx_subscription_status ON companies(subscription_status);
CREATE INDEX IF NOT EXISTS idx_subscription_end ON companies(subscription_end);

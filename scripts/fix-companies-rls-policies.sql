-- ISTExpert: Исправление RLS политик для таблицы companies
-- Выполните этот SQL в Supabase SQL Editor:
-- https://supabase.com/dashboard/project/plsaqkfxrrtgnrhmmcho/sql/new

-- ============================================
-- 1. УДАЛЯЕМ СТАРЫЕ ПОЛИТИКИ
-- ============================================

DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can update their own company" ON companies;
DROP POLICY IF EXISTS "Users can create companies during registration" ON companies;
DROP POLICY IF EXISTS "enable_insert_for_authenticated_users" ON companies;
DROP POLICY IF EXISTS "enable_select_for_company_users" ON companies;
DROP POLICY IF EXISTS "enable_update_for_company_users" ON companies;

-- ============================================
-- 2. ВКЛЮЧАЕМ RLS
-- ============================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. СОЗДАЁМ НОВЫЕ ПОЛИТИКИ
-- ============================================

-- Политика для INSERT - любой аутентифицированный пользователь может создать компанию
-- Это нужно для регистрации новых компаний
CREATE POLICY "enable_insert_for_authenticated_users"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Политика для SELECT - пользователи видят только свою компанию
CREATE POLICY "enable_select_for_company_users"
  ON companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.company_id = companies.id
      AND users.id = auth.uid()
    )
  );

-- Политика для UPDATE - пользователи могут обновлять только свою компанию
CREATE POLICY "enable_update_for_company_users"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.company_id = companies.id
      AND users.id = auth.uid()
    )
  );

-- ============================================
-- 4. ПРОВЕРКА
-- ============================================

-- Показать все политики для companies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY policyname;

-- ============================================
-- ПОСЛЕ ВЫПОЛНЕНИЯ:
-- ============================================
-- 1. Обновите страницу регистрации
-- 2. Попробуйте зарегистрировать новую компанию
-- 3. Проверьте что компания появилась в Table Editor → companies

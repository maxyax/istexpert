-- =====================================================
-- СОЗДАНИЕ АДМИНИСТРАТОРА ISTExpert
-- =====================================================
-- Выполните этот SQL в Supabase SQL Editor:
-- https://app.supabase.com/project/hlpjxvqreuiqfjzqgkza/sql/new
-- =====================================================

-- Шаг 1: Создаем компанию для администратора
INSERT INTO companies (
  name,
  email,
  inn,
  subscription_status,
  subscription_plan,
  subscription_start,
  subscription_end
) VALUES (
  'ISTExpert Admin',
  'maxyax@gmail.com',
  '1234567890',
  'active',
  'enterprise',
  NOW(),
  NOW() + INTERVAL '1 year'
)
ON CONFLICT (email) DO UPDATE SET
  subscription_status = 'active',
  subscription_plan = 'enterprise',
  updated_at = NOW();

-- Шаг 2: Создаем пользователя через Supabase Auth API
-- Это нужно сделать через Dashboard или API
-- После регистрации пользователя на сайте, выполните Шаг 3

-- Шаг 3: Обновляем роль пользователя на 'owner'
-- Замените USER_ID на реальный ID пользователя из auth.users
-- Его можно узнать после регистрации:
-- SELECT id FROM auth.users WHERE email = 'maxyax@gmail.com';

-- UPDATE users SET role = 'owner' WHERE email = 'maxyax@gmail.com';

-- =====================================================
-- АЛЬТЕРНАТИВА: Создать пользователя через Dashboard
-- =====================================================
-- 1. Authentication → Users → Add User
-- 2. Email: maxyax@gmail.com
-- 3. Password: 2504
-- 4. Скопируйте User ID
-- 5. Выполните:

/*
INSERT INTO users (id, email, full_name, role, company_id)
VALUES (
  'СКОПИРУЙТЕ_ID_ИЗ_AUTH',
  'maxyax@gmail.com',
  'Admin',
  'owner',
  (SELECT id FROM companies WHERE email = 'maxyax@gmail.com')
);
*/

-- =====================================================
-- ПРОВЕРКА
-- =====================================================
-- Проверить что компания создана:
SELECT id, name, email, subscription_status, subscription_plan 
FROM companies 
WHERE email = 'maxyax@gmail.com';

-- Проверить пользователя:
SELECT id, email, full_name, role, company_id 
FROM users 
WHERE email = 'maxyax@gmail.com';

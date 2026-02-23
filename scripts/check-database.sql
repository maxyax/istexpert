-- Проверка структуры базы данных ISTExpert
-- Выполните в Supabase SQL Editor

-- 1. Показать все таблицы
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Показать количество записей в каждой таблице
SELECT 'companies' as table_name, COUNT(*) as row_count FROM companies
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'equipment', COUNT(*) FROM equipment
UNION ALL
SELECT 'maintenance_records', COUNT(*) FROM maintenance_records
UNION ALL
SELECT 'breakdowns', COUNT(*) FROM breakdowns
UNION ALL
SELECT 'procurement_requests', COUNT(*) FROM procurement_requests
UNION ALL
SELECT 'planned_tos', COUNT(*) FROM planned_tos
UNION ALL
SELECT 'fuel_records', COUNT(*) FROM fuel_records
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications;

-- 3. Показать структуру таблицы companies
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'companies'
ORDER BY ordinal_position;

-- 4. Показать структуру таблицы users
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 5. Показать структуру таблицы equipment
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'equipment'
ORDER BY ordinal_position;

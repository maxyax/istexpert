-- ISTExpert: Добавление колонки INN в таблицу companies
-- Выполните этот SQL в Supabase SQL Editor: 
-- https://app.supabase.com/project/_sql

-- Добавляем колонку INN если она отсутствует
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS inn TEXT;

-- Проверяем что колонка добавлена
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'companies' 
-- ORDER BY ordinal_position;

-- ISTExpert: Добавление недостающих колонок в таблицу companies
-- Выполните этот SQL в Supabase SQL Editor

-- Добавляем все недостающие колонки сразу
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS inn TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Проверка результата
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'companies' 
ORDER BY ordinal_position;

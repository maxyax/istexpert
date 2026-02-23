-- =====================================================
-- ISTExpert: ПОЛНАЯ СТРУКТУРА БАЗЫ ДАННЫХ
-- Multi-tenant SaaS архитектура с RLS
-- =====================================================

-- ============================================
-- 1. ОСНОВНЫЕ ТАБЛИЦЫ
-- ============================================

-- Компании (клиенты SaaS)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  inn TEXT,
  kpp TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'trial' 
    CHECK (subscription_status IN ('active', 'expired', 'suspended', 'trial')),
  subscription_plan TEXT NOT NULL DEFAULT 'free' 
    CHECK (subscription_plan IN ('free', 'basic', 'pro', 'enterprise')),
  subscription_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_end TIMESTAMP WITH TIME ZONE,
  max_users INTEGER DEFAULT 3,
  max_equipment INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Пользователи (сотрудники компаний)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY, -- Связь с auth.users
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' 
    CHECK (role IN ('super_admin', 'owner', 'company_admin', 'user', 'mechanic', 'driver', 'procurement')),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. ТЕХНИКА И ОБОРУДОВАНИЕ
-- ============================================

-- Техника (основная таблица автопарка)
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Основная информация
  name TEXT NOT NULL,
  make TEXT,
  model TEXT,
  vin TEXT,
  license_plate TEXT,
  year INTEGER,
  
  -- Статус и состояние
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'maintenance', 'repair', 'idle', 'active_with_restrictions', 'waiting_parts')),
  hours NUMERIC DEFAULT 0,
  mileage_km NUMERIC,
  
  -- Страхование
  insurance_end TEXT,
  insurance_start TEXT,
  insurance_company TEXT,
  insurance_number TEXT,
  insurance_history JSONB,
  
  -- Поставщик
  supplier TEXT,
  supplier_phone TEXT,
  supplier_email TEXT,
  
  -- Водитель
  driver TEXT,
  
  -- Документы и фото
  documents JSONB,
  photos TEXT[],
  
  -- Регламенты ТО
  regulations JSONB,
  
  -- Метаданные
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. ТЕХНИЧЕСКОЕ ОБСЛУЖИВАНИЕ
-- ============================================

-- Записи ТО (история обслуживания)
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  
  -- Информация о ТО
  date DATE NOT NULL,
  type TEXT NOT NULL, -- ТО-1, ТО-2, и т.д.
  hours_at_maintenance NUMERIC,
  mileage_at_maintenance NUMERIC,
  performed_by TEXT,
  
  -- Чек-листы и работы
  checklist_items JSONB, -- [{text, done, note}]
  cost NUMERIC DEFAULT 0,
  
  -- Жидкости и материалы
  fluids JSONB, -- [{name, quantity}]
  
  -- Раннее обслуживание
  is_early_service BOOLEAN DEFAULT FALSE,
  planned_to_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Плановые ТО (календарь)
CREATE TABLE IF NOT EXISTS planned_tos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT DEFAULT 'planned'
    CHECK (status IN ('planned', 'completed', 'cancelled')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 4. ПОЛОМКИ И РЕМОНТЫ
-- ============================================

-- Поломки техники
CREATE TABLE IF NOT EXISTS breakdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  
  -- Акт поломки
  act_number TEXT,
  date DATE NOT NULL,
  
  -- Информация о поломке
  part_name TEXT NOT NULL,
  node TEXT,
  description TEXT,
  
  -- Статус и степень
  status TEXT DEFAULT 'Новая'
    CHECK (status IN ('Новая', 'Запчасти заказаны', 'Запчасти получены', 'В работе', 'Исправлено')),
  severity TEXT DEFAULT 'Средняя'
    CHECK (severity IN ('Критическая', 'Средняя', 'Низкая')),
  
  -- Информация о ремонте
  fixed_date TIMESTAMP WITH TIME ZONE,
  hours_at_breakdown NUMERIC,
  hours_at_fix NUMERIC,
  mileage_at_fix NUMERIC,
  fix_notes TEXT,
  
  -- Кто создал
  reported_by TEXT,
  
  -- Фото и документы
  photos TEXT[],
  
  -- Запчасти (JSONB)
  items JSONB, -- [{sku, name, quantity, unitPriceWithVAT}]
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. СНАБЖЕНИЕ И ЗАКУПКИ
-- ============================================

-- Заявки на снабжение
CREATE TABLE IF NOT EXISTS procurement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Связь с техникой и поломками
  equipment_id UUID REFERENCES equipment(id),
  breakdown_id UUID REFERENCES breakdowns(id),
  breakdown_act_number TEXT,
  breakdown_name TEXT,
  breakdown_description TEXT,
  breakdown_node TEXT,
  
  -- Информация о заявке
  title TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  
  -- Статус
  status TEXT DEFAULT 'Новая'
    CHECK (status IN ('Новая', 'Поиск', 'Оплачено', 'В пути', 'На складе', 'Отменено')),
  
  -- Список запчастей
  items JSONB, -- [{id, name, quantity, unitPriceWithVAT, total}]
  cost NUMERIC DEFAULT 0,
  
  -- Контрагенты
  contractor_name TEXT,
  invoice_number TEXT,
  
  -- Доставка
  carrier_name TEXT,
  tracking_number TEXT,
  
  -- Ответственный
  responsible TEXT,
  created_by TEXT,
  
  -- Файлы
  breakdown_photos JSONB,
  invoice_files JSONB,
  attachments JSONB,
  
  -- История статусов
  status_history JSONB, -- [{status, date, user}]
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 6. ТОПЛИВО И ГСМ
-- ============================================

-- Заправки топлива
CREATE TABLE IF NOT EXISTS fuel_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  
  -- Дата и время
  date DATE NOT NULL,
  time TIME,
  
  -- Объём и стоимость
  quantity NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  price_per_liter NUMERIC,
  
  -- АЗС и тип топлива
  station TEXT,
  fuel_type TEXT,
  
  -- Показания
  current_hours NUMERIC,
  current_mileage NUMERIC,
  
  -- Оплата и исполнитель
  payment_method TEXT,
  performed_by TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. УВЕДОМЛЕНИЯ
-- ============================================

-- Уведомления пользователей
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('info', 'warning', 'error', 'success')),
  read BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 8. ПЛАТЕЖИ (на будущее)
-- ============================================

-- Платежи и транзакции
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'RUB',
  
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  
  payment_method TEXT,
  transaction_id TEXT,
  invoice_id TEXT,
  description TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 9. RLS (ROW LEVEL SECURITY)
-- ============================================

-- Включаем RLS для всех таблиц
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_tos ENABLE ROW LEVEL SECURITY;
ALTER TABLE breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. ФУНКЦИИ ДЛЯ ПРОВЕРКИ РОЛЕЙ
-- ============================================

-- Функция проверки на супер-админа
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

-- Функция получения company_id текущего пользователя
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
DECLARE
  company_id UUID;
BEGIN
  SELECT u.company_id INTO company_id
  FROM users u
  WHERE u.id = auth.uid();
  
  RETURN company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. RLS ПОЛИТИКИ ДЛЯ companies
-- ============================================

-- Пользователи видят только свою компанию
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (
    id = get_user_company_id()
    OR is_super_admin()
  );

-- Пользователи могут обновлять только свою компанию
DROP POLICY IF EXISTS "Users can update their own company" ON companies;
CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  USING (
    id = get_user_company_id()
    OR is_super_admin()
  );

-- Создание компании (при регистрации)
DROP POLICY IF EXISTS "Users can create companies" ON companies;
CREATE POLICY "Users can create companies"
  ON companies FOR INSERT
  WITH CHECK (true);

-- Супер-админ видит все компании
DROP POLICY IF EXISTS "Admins can view all companies" ON companies;
CREATE POLICY "Admins can view all companies"
  ON companies FOR SELECT
  USING (is_super_admin());

-- Супер-админ может обновлять все компании
DROP POLICY IF EXISTS "Admins can update all companies" ON companies;
CREATE POLICY "Admins can update all companies"
  ON companies FOR UPDATE
  USING (is_super_admin());

-- Супер-админ может удалять компании
DROP POLICY IF EXISTS "Admins can delete all companies" ON companies;
CREATE POLICY "Admins can delete all companies"
  ON companies FOR DELETE
  USING (is_super_admin());

-- ============================================
-- 12. RLS ПОЛИТИКИ ДЛЯ users
-- ============================================

-- Пользователи видят пользователей своей компании
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (
    company_id = get_user_company_id()
    OR is_super_admin()
  );

-- Создание пользователей
DROP POLICY IF EXISTS "Users can create users" ON users;
CREATE POLICY "Users can create users"
  ON users FOR INSERT
  WITH CHECK (true);

-- Обновление только себя или пользователей своей компании
DROP POLICY IF EXISTS "Users can update own user" ON users;
CREATE POLICY "Users can update own user"
  ON users FOR UPDATE
  USING (
    id = auth.uid()
    OR (company_id = get_user_company_id() AND EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.id = auth.uid()
      AND (u2.role = 'company_admin' OR u2.role = 'owner')
    ))
    OR is_super_admin()
  );

-- Удаление пользователей (только админ компании или супер-админ)
DROP POLICY IF EXISTS "Admins can delete users" ON users;
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  USING (
    (company_id = get_user_company_id() AND EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.id = auth.uid()
      AND (u2.role = 'company_admin' OR u2.role = 'owner')
    ))
    OR is_super_admin()
  );

-- ============================================
-- 13. RLS ПОЛИТИКИ ДЛЯ equipment
-- ============================================

-- Пользователи видят технику своей компании
DROP POLICY IF EXISTS "Users can view equipment in their company" ON equipment;
CREATE POLICY "Users can view equipment in their company"
  ON equipment FOR SELECT
  USING (
    company_id = get_user_company_id()
    OR is_super_admin()
  );

-- Пользователи могут управлять техникой своей компании
DROP POLICY IF EXISTS "Users can manage equipment in their company" ON equipment;
CREATE POLICY "Users can manage equipment in their company"
  ON equipment FOR ALL
  USING (
    company_id = get_user_company_id()
    OR is_super_admin()
  )
  WITH CHECK (
    company_id = get_user_company_id()
    OR is_super_admin()
  );

-- ============================================
-- 14. RLS ПОЛИТИКИ ДЛЯ ОСТАЛЬНЫХ ТАБЛИЦ
-- ============================================

-- maintenance_records
DROP POLICY IF EXISTS "Users can manage maintenance in their company" ON maintenance_records;
CREATE POLICY "Users can manage maintenance in their company"
  ON maintenance_records FOR ALL
  USING (company_id = get_user_company_id() OR is_super_admin())
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- planned_tos
DROP POLICY IF EXISTS "Users can manage planned_tos in their company" ON planned_tos;
CREATE POLICY "Users can manage planned_tos in their company"
  ON planned_tos FOR ALL
  USING (company_id = get_user_company_id() OR is_super_admin())
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- breakdowns
DROP POLICY IF EXISTS "Users can manage breakdowns in their company" ON breakdowns;
CREATE POLICY "Users can manage breakdowns in their company"
  ON breakdowns FOR ALL
  USING (company_id = get_user_company_id() OR is_super_admin())
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- procurement_requests
DROP POLICY IF EXISTS "Users can manage procurement in their company" ON procurement_requests;
CREATE POLICY "Users can manage procurement in their company"
  ON procurement_requests FOR ALL
  USING (company_id = get_user_company_id() OR is_super_admin())
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- fuel_records
DROP POLICY IF EXISTS "Users can manage fuel in their company" ON fuel_records;
CREATE POLICY "Users can manage fuel in their company"
  ON fuel_records FOR ALL
  USING (company_id = get_user_company_id() OR is_super_admin())
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- notifications
DROP POLICY IF EXISTS "Users can view notifications in their company" ON notifications;
CREATE POLICY "Users can view notifications in their company"
  ON notifications FOR ALL
  USING (company_id = get_user_company_id() OR is_super_admin())
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- payments
DROP POLICY IF EXISTS "Users can view payments in their company" ON payments;
CREATE POLICY "Users can view payments in their company"
  ON payments FOR ALL
  USING (company_id = get_user_company_id() OR is_super_admin())
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- ============================================
-- 15. ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_equipment_company ON equipment(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_company ON maintenance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_equipment ON maintenance_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance_records(date);
CREATE INDEX IF NOT EXISTS idx_planned_tos_company ON planned_tos(company_id);
CREATE INDEX IF NOT EXISTS idx_planned_tos_equipment ON planned_tos(equipment_id);
CREATE INDEX IF NOT EXISTS idx_planned_tos_date ON planned_tos(date);
CREATE INDEX IF NOT EXISTS idx_breakdowns_company ON breakdowns(company_id);
CREATE INDEX IF NOT EXISTS idx_breakdowns_equipment ON breakdowns(equipment_id);
CREATE INDEX IF NOT EXISTS idx_breakdowns_status ON breakdowns(status);
CREATE INDEX IF NOT EXISTS idx_procurement_company ON procurement_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_procurement_status ON procurement_requests(status);
CREATE INDEX IF NOT EXISTS idx_fuel_company ON fuel_records(company_id);
CREATE INDEX IF NOT EXISTS idx_fuel_equipment ON fuel_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_fuel_date ON fuel_records(date);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);

CREATE INDEX IF NOT EXISTS idx_subscription_status ON companies(subscription_status);
CREATE INDEX IF NOT EXISTS idx_subscription_end ON companies(subscription_end);

-- ============================================
-- 16. TRIGGERS ДЛЯ updated_at
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
-- 17. ДЕМО ДАННЫЕ (опционально)
-- ============================================

-- Можно добавить тестовые данные для отладки
-- INSERT INTO companies (id, name, email, subscription_status, subscription_plan)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Company', 'demo@istexpert.ru', 'active', 'enterprise');

-- ============================================
-- ГОТОВО!
-- ============================================

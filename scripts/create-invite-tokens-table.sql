-- ISTExpert: Таблица приглашений сотрудников
-- Выполните этот SQL в Supabase SQL Editor

-- Таблица приглашений
CREATE TABLE IF NOT EXISTS invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_email ON invite_tokens(email);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_company ON invite_tokens(company_id);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_status ON invite_tokens(status);

-- RLS политики
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть приглашения своей компании
CREATE POLICY "Users can view invites in their company"
  ON invite_tokens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.company_id = invite_tokens.company_id
      AND users.id = auth.uid()
    )
  );

-- Пользователи могут создавать приглашения для своей компании
CREATE POLICY "Users can create invites for their company"
  ON invite_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.company_id = invite_tokens.company_id
      AND users.id = auth.uid()
    )
  );

-- Пользователи могут обновлять приглашения своей компании
CREATE POLICY "Users can update invites in their company"
  ON invite_tokens FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.company_id = invite_tokens.company_id
      AND users.id = auth.uid()
    )
  );

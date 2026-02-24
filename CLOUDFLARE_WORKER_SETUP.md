# Настройка Cloudflare Workers Proxy для ISTExpert

## Проблема
Supabase может блокироваться на территории России. Cloudflare Workers позволяет создать прокси-сервер для обхода блокировок.

## Решение 1: Через Cloudflare Dashboard (без CLI)

### Шаг 1: Регистрация на Cloudflare
1. Перейдите на https://workers.cloudflare.com
2. Войдите через Google/GitHub или создайте аккаунт
3. Подтвердите email

### Шаг 2: Создание Worker
1. В Dashboard нажмите **"Create a Worker"**
2. Назовите Worker: `supabase-proxy-istexpert`
3. Нажмите **"Deploy"**

### Шаг 3: Настройка кода
1. Перейдите в **"Quick Edit"**
2. Удалите весь код по умолчанию
3. Вставьте содержимое файла `cloudflare-worker/supabase-proxy.js`
4. Нажмите **"Save and Deploy"**

### Шаг 4: Настройка переменных окружения
1. Перейдите в **"Settings"** → **"Variables"**
2. Нажмите **"Add variable"**
3. Добавьте переменные:
   - `SUPABASE_URL_ENV` = `https://plsaqkfxrrtgnrhmmcho.supabase.co`
   - `SUPABASE_ANON_KEY_ENV` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc2Fxa2Z4cnJ0Z25yaG1tY2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MzY2ODYsImV4cCI6MjA4NzQxMjY4Nn0.buYTJjzX4UZce0Ihvfcbwzs5Jy9gfMid0N1233HM_L0`
4. Нажмите **"Save"**

### Шаг 5: Тестирование
1. Worker будет доступен по адресу: `https://supabase-proxy-istexpert.<your-subdomain>.workers.dev`
2. Проверьте работу: `curl https://supabase-proxy-istexpert.<your-subdomain>.workers.dev/rest/v1/`

### Шаг 6: Обновление .env в проекте
```env
VITE_SUPABASE_URL=https://supabase-proxy-istexpert.<your-subdomain>.workers.dev
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc2Fxa2Z4cnJ0Z25yaG1tY2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MzY2ODYsImV4cCI6MjA4NzQxMjY4Nn0.buYTJjzX4UZce0Ihvfcbwzs5Jy9gfMid0N1233HM_L0
VITE_ADMIN_EMAIL=maxyax@gmail.com
```

---

## Решение 2: Через Wrangler CLI (продвинутый способ)

### Установка Wrangler
```bash
npm install -g wrangler
```

### Авторизация
```bash
cd /Users/maksimakusev/istexpert/cloudflare-worker
wrangler login
```

### Настройка секретов
```bash
wrangler secret put SUPABASE_ANON_KEY_ENV
# Введите ваш anon key когда попросят
```

### Деплой
```bash
wrangler deploy
```

### Добавление своего домена (опционально)
1. В Cloudflare Dashboard перейдите в Workers → Ваш Worker
2. **"Triggers"** → **"Custom Domains"**
3. Добавьте домен (например: `api.istexpert.ru`)

---

## Обновление проекта

После настройки Worker обновите `.env`:

```bash
cp .env .env.backup
```

Отредактируйте `.env`:
```env
VITE_SUPABASE_URL=https://supabase-proxy-istexpert.<your-subdomain>.workers.dev
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc2Fxa2Z4cnJ0Z25yaG1tY2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MzY2ODYsImV4cCI6MjA4NzQxMjY4Nn0.buYTJjzX4UZce0Ihvfcbwzs5Jy9gfMid0N1233HM_L0
VITE_ADMIN_EMAIL=maxyax@gmail.com
```

Пересоберите проект:
```bash
npm run build
```

---

## Проверка работы

1. Откройте сайт без VPN
2. Проверьте консоль браузера на ошибки
3. Проверьте подключение к Supabase в Network tab

---

## Тарифы Cloudflare Workers

- **Free**: 100,000 запросов/день, 10ms CPU time
- **Paid**: $5/месяц, 10M запросов/месяц, больше возможностей

Для ISTExpert достаточно бесплатного тарифа на старте.

---

## Альтернативы

Если Cloudflare Workers не подходит:
1. **Yandex Cloud Functions** — российский провайдер
2. **Selectel Cloud Functions** — российский провайдер
3. **Vercel Edge Functions** — если уже используете Vercel

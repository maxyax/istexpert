# Настройка прокси для ISTExpert на вашем домене Cloudflare

## Быстрая настройка (используем ваш домен)

### Шаг 1: Создание Worker

1. Зайдите в [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Перейдите в **Workers & Pages** → **Create**
3. Назовите Worker: `supabase-proxy-istexpert`
4. Нажмите **"Deploy"**

### Шаг 2: Вставка кода

1. Откройте ваш Worker
2. Перейдите во вкладку **"Quick Edit"**
3. Удалите весь код по умолчанию
4. Вставьте код из файла `cloudflare-worker/supabase-proxy.js`
5. Нажмите **"Save and Deploy"**

### Шаг 3: Настройка переменных

1. Перейдите в **"Settings"** → **"Variables"**
2. Нажмите **"Add variable"**
3. Добавьте:
   - `SUPABASE_URL_ENV` = `https://plsaqkfxrrtgnrhmmcho.supabase.co`
   - `SUPABASE_ANON_KEY_ENV` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc2Fxa2Z4cnJ0Z25yaG1tY2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MzY2ODYsImV4cCI6MjA4NzQxMjY4Nn0.buYTJjzX4UZce0Ihvfcbwzs5Jy9gfMid0N1233HM_L0`
4. **Save**

### Шаг 4: Привязка к вашему домену

1. В Worker перейдите в **"Triggers"** → **"Custom Domains"**
2. Нажмите **"Add Custom Domain"**
3. Введите поддомен, например: `api.istexpert.ru` или `supabase.istexpert.ru`
4. Cloudflare автоматически создаст DNS запись
5. Нажмите **"Add Domain"**

### Шаг 5: Обновление .env

Отредактируйте `.env`:

```env
VITE_SUPABASE_URL=https://api.istexpert.ru
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsc2Fxa2Z4cnJ0Z25yaG1tY2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MzY2ODYsImV4cCI6MjA4NzQxMjY4Nn0.buYTJjzX4UZce0Ihvfcbwzs5Jy9gfMid0N1233HM_L0
VITE_ADMIN_EMAIL=maxyax@gmail.com
```

### Шаг 6: Пересборка и деплой

```bash
npm run build
```

Если используете Vercel — изменения подтянутся автоматически после git push.

---

## Проверка работы

```bash
# Проверка Worker
curl https://api.istexpert.ru/rest/v1/

# Проверка сайта без VPN
откройте https://istexpert.ru в браузере
```

---

## Преимущества такого подхода

✅ **Свой домен** — выглядит профессионально  
✅ **Бесплатно** — Cloudflare Workers Free: 100K запросов/день  
✅ **Быстро** — CDN Cloudflare по всему миру  
✅ **Надёжно** — работает без VPN в России  
✅ **SSL** — автоматический HTTPS от Cloudflare

---

## Если что-то не работает

1. Проверьте консоль браузера (F12) на ошибки
2. Убедитесь, что DNS записи обновились (может занять до 5 минут)
3. Проверьте Worker Logs в Cloudflare Dashboard
4. Убедитесь, что в `.env` правильный URL Worker

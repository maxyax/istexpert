import { createClient } from '@supabase/supabase-js';

// Admin API для создания администратора
const supabaseUrl = 'https://hlpjxvqreuiqfjzqgkza.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscGp4dnFyZXVpcWZqenFna3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzNzQ0NzMsImV4cCI6MjA1NTk1MDQ3M30.H6zJbqRXM4vTqfLqfJqKqGqKqGqKqGqKqGqKqGqKqGq';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  console.log('🔧 Создание аккаунта администратора...');

  try {
    // Шаг 1: Создаем компанию
    console.log('📦 Создание компании...');
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([{
        name: 'ISTExpert Admin',
        email: 'maxyax@gmail.com',
        inn: '1234567890',
        subscription_status: 'active',
        subscription_plan: 'enterprise',
        subscription_start: new Date().toISOString(),
        subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 год
      }])
      .select()
      .single();

    if (companyError) {
      console.error('❌ Ошибка создания компании:', companyError);
      return;
    }

    console.log('✅ Компания создана:', company.id);

    // Шаг 2: Создаем пользователя в Supabase Auth
    console.log('👤 Создание пользователя...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'maxyax@gmail.com',
      password: '2504',
      options: {
        data: {
          full_name: 'Admin',
          company_name: 'ISTExpert Admin'
        }
      }
    });

    if (authError) {
      console.error('❌ Ошибка создания пользователя:', authError);
      return;
    }

    console.log('✅ Пользователь создан:', authData.user.id);

    // Шаг 3: Создаем запись в users
    console.log('📝 Создание записи в users...');
    const { error: userError } = await supabase
      .from('users')
      .insert([{
        id: authData.user.id,
        email: 'maxyax@gmail.com',
        full_name: 'Admin',
        role: 'owner',
        company_id: company.id
      }]);

    if (userError) {
      console.error('❌ Ошибка создания записи пользователя:', userError);
      return;
    }

    console.log('✅ Пользователь добавлен в users');

    console.log('\n✨ Готово!');
    console.log('\n📧 Логин: maxyax@gmail.com');
    console.log('🔑 Пароль: 2504');
    console.log('\n🌐 Войти: http://localhost:5173/login');
    console.log('📊 Админка: http://localhost:5173/admin');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

createAdmin();

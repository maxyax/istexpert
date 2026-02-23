import React, { useState } from 'react';
import { Truck, CheckCircle2, ArrowRight, Mail, Phone, Building2, User, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FormData {
  companyName: string;
  inn: string;
  email: string;
  phone: string;
  fullName: string;
  password: string;
  confirmPassword: string;
}

export const Register: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    inn: '',
    email: '',
    phone: '',
    fullName: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (formData.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    // Валидация ИНН (10 или 12 цифр)
    if (formData.inn && !/^\d{10}$|^\d{12}$/.test(formData.inn)) {
      setError('ИНН должен содержать 10 или 12 цифр');
      return;
    }

    setLoading(true);

    try {
      // Шаг 1: Регистрация пользователя в Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            company_name: formData.companyName
          },
          emailRedirectTo: window.location.origin
        }
      });

      if (authError) {
        // Обработка ошибок rate limiting
        if (authError.message.includes('rate limit') || authError.message.includes('50 SECONDS')) {
          throw new Error('Слишком много запросов. Подождите 1 минуту и попробуйте снова.');
        }
        // Пользователь уже существует
        if (authError.message.includes('User already registered')) {
          throw new Error('Пользователь с таким email уже зарегистрирован. Попробуйте войти.');
        }
        throw authError;
      }

      if (!authData.user) throw new Error('Ошибка регистрации');

      // Шаг 2: Создание компании
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{
          name: formData.companyName,
          inn: formData.inn || null,
          email: formData.email,
          phone: formData.phone || null,
          subscription_status: 'trial',
          subscription_plan: 'free',
          subscription_start: new Date().toISOString(),
          subscription_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        }])
        .select()
        .single();

      if (companyError) {
        // Если компания уже существует (дубликат email)
        if (companyError.code === '23505') {
          throw new Error('Компания с таким email уже существует');
        }
        throw companyError;
      }

      // Шаг 3: Создание пользователя компании
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          role: 'company_admin',
          company_id: companyData.id
        }]);

      if (userError) throw userError;

      // Переход на страницу с инструкцией
      setStep(2);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Ошибка регистрации. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="min-h-screen bg-neo-bg flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center space-y-8 animate-in zoom-in duration-500">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-blue-500 flex items-center justify-center text-white shadow-xl">
            <Mail size={48} />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase text-gray-800 dark:text-gray-200 mb-4">
              Подтвердите email!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Компания <strong className="text-gray-800 dark:text-gray-200">{formData.companyName}</strong> зарегистрирована.
            </p>
            <div className="p-6 rounded-[2rem] bg-blue-500/10 border border-blue-500/20 mb-8">
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-4">
                На почту <strong className="text-blue-500">{formData.email}</strong> отправлено письмо с:
              </p>
              <div className="space-y-2 text-left max-w-md mx-auto">
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Ссылкой для подтверждения email</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Вашим логином (email)</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Инструкцией по входу</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              После подтверждения email вы сможете войти в систему
            </p>
          </div>
          <div className="space-y-4">
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full py-5 rounded-[2rem] bg-blue-500 text-white font-black uppercase text-sm shadow-xl hover:scale-105 transition-all"
            >
              Перейти ко входу
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-bg flex items-center justify-center p-6">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom duration-700">
        {/* Левая часть - информация */}
        <div className="space-y-8 p-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-neo-bg shadow-neo flex items-center justify-center text-blue-600">
              <Truck size={24} />
            </div>
            <div>
              <span className="text-xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-200">
                ISTExpert
              </span>
              <p className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest -mt-1">
                Система управления автопарком
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-black uppercase text-gray-800 dark:text-gray-200">
              Начните бесплатно
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              14 дней полного доступа ко всем функциям. Карта не требуется.
            </p>
          </div>

          <div className="space-y-4">
            {[
              'Полный учет автопарка',
              'QR-паспорта техники',
              'Планирование ТО',
              'Снабжение и запчасти',
              'Электронные документы',
              'Аналитика и отчеты'
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Правая часть - форма */}
        <div className="bg-neo-bg dark:bg-gray-800 rounded-[2.5rem] shadow-neo p-8">
          <h2 className="text-2xl font-black uppercase text-gray-800 dark:text-gray-200 mb-6">
            Регистрация компании
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Название компании *
              </label>
              <div className="relative">
                <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-neo-bg dark:bg-gray-700 shadow-neo-inset outline-none text-gray-800 dark:text-gray-200 text-sm font-medium"
                  placeholder="ООО «Ромашка»"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                ИНН
              </label>
              <input
                type="text"
                value={formData.inn}
                onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
                className="w-full px-4 py-4 rounded-2xl bg-neo-bg dark:bg-gray-700 shadow-neo-inset outline-none text-gray-800 dark:text-gray-200 text-sm font-medium"
                placeholder="1234567890"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Email *
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-neo-bg dark:bg-gray-700 shadow-neo-inset outline-none text-gray-800 dark:text-gray-200 text-sm font-medium"
                  placeholder="director@company.ru"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Телефон
              </label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-neo-bg dark:bg-gray-700 shadow-neo-inset outline-none text-gray-800 dark:text-gray-200 text-sm font-medium"
                  placeholder="+7 (999) 000-00-00"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                ФИО администратора *
              </label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-neo-bg dark:bg-gray-700 shadow-neo-inset outline-none text-gray-800 dark:text-gray-200 text-sm font-medium"
                  placeholder="Иванов Иван Иванович"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Пароль *
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-12 pr-12 py-4 rounded-2xl bg-neo-bg dark:bg-gray-700 shadow-neo-inset outline-none text-gray-800 dark:text-gray-200 text-sm font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Подтверждение пароля *
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-neo-bg dark:bg-gray-700 shadow-neo-inset outline-none text-gray-800 dark:text-gray-200 text-sm font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 rounded-[2rem] bg-blue-500 text-white font-black uppercase text-sm shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
              {!loading && <ArrowRight size={18} />}
            </button>

            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              Уже есть аккаунт?{' '}
              <button
                type="button"
                onClick={onBack}
                className="text-blue-500 font-bold hover:underline"
              >
                Войти
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

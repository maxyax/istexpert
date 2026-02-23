import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AcceptInvite: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkInvite = async () => {
      if (!token) {
        setError('Неверная ссылка приглашения');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('invite_tokens')
        .select('*, company:companies(name)')
        .eq('token', token)
        .single();

      if (error || !data) {
        setError('Приглашение не найдено или истёк срок действия');
        setLoading(false);
        return;
      }

      if (data.status === 'accepted') {
        setError('Это приглашение уже было использовано');
        setLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('Срок действия приглашения истёк');
        setLoading(false);
        return;
      }

      setInvite(data);
      setLoading(false);
    };

    checkInvite();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setSettingPassword(true);

    try {
      // Шаг 1: Регистрация пользователя в Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invite.email,
        password: password,
        options: {
          data: {
            full_name: invite.full_name,
            company_id: invite.company_id
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Ошибка регистрации');

      // Шаг 2: Создание записи пользователя в таблице users
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: invite.email,
          full_name: invite.full_name,
          role: invite.role,
          company_id: invite.company_id
        }]);

      if (userError) throw userError;

      // Шаг 3: Обновление статуса приглашения
      const { error: inviteError } = await supabase
        .from('invite_tokens')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invite.id);

      if (inviteError) throw inviteError;

      setSuccess(true);

      // Автоматический вход через 2 секунды
      setTimeout(async () => {
        await supabase.auth.signInWithPassword({
          email: invite.email,
          password: password
        });
        navigate('/');
      }, 2000);
    } catch (err: any) {
      console.error('Error setting password:', err);
      setError(err.message || 'Ошибка установки пароля');
    } finally {
      setSettingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neo-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-bold">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-neo-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-[2rem] shadow-neo bg-neo-bg text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black uppercase text-gray-800 dark:text-gray-100 mb-4">Ошибка</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-4 rounded-2xl bg-blue-500 text-white font-black uppercase text-[10px] tracking-widest"
          >
            Перейти ко входу
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-neo-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-[2rem] shadow-neo bg-neo-bg text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-black uppercase text-gray-800 dark:text-gray-100 mb-4">Готово!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            Пароль успешно установлен
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Перенаправляем в систему...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 rounded-[2rem] shadow-neo bg-neo-bg">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
            <Lock size={40} className="text-blue-500" />
          </div>
          <h2 className="text-2xl font-black uppercase text-gray-800 dark:text-gray-100 mb-2">
            Установка пароля
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Приглашение в компанию <strong className="text-blue-500">{invite?.company?.name}</strong>
          </p>
        </div>

        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6">
          <p className="text-xs text-gray-700 dark:text-gray-300 font-bold">
            👋 <strong>{invite?.full_name}</strong>, добро пожаловать!
          </p>
          <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">
            Ваш email: <strong>{invite?.email}</strong>
          </p>
          <p className="text-[10px] text-gray-600 dark:text-gray-400">
            Роль: <strong className="uppercase">{invite?.role?.replace('_', ' ')}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[9px] font-black text-gray-700 dark:text-gray-300 uppercase ml-2">
              Пароль
            </label>
            <div className="relative mt-1">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl shadow-neo-inset bg-neo-bg outline-none text-xs font-bold border-none"
                placeholder="Минимум 6 символов"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black text-gray-700 dark:text-gray-300 uppercase ml-2">
              Подтверждение пароля
            </label>
            <div className="relative mt-1">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl shadow-neo-inset bg-neo-bg outline-none text-xs font-bold border-none"
                placeholder="Повторите пароль"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-500 font-bold">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={settingPassword}
            className="w-full py-4 rounded-2xl bg-blue-500 text-white font-black uppercase text-[10px] tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all"
          >
            {settingPassword ? 'Установка...' : 'Установить пароль'}
          </button>
        </form>
      </div>
    </div>
  );
};

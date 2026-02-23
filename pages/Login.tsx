
import React, { useState } from 'react';
import { Truck, Mail, Lock, Building, ArrowLeft, ChevronRight, PlayCircle, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';

export const Login: React.FC<{onBack: () => void; onRegister?: () => void}> = ({ onBack, onRegister }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [inn, setInn] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, register, demoLogin } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isRegister) {
      if (!companyName || !inn || !email || !pass) { 
        setError('Заполните все обязательные поля'); 
        setLoading(false);
        return; 
      }

      if (pass !== confirmPass) {
        setError('Пароли не совпадают');
        setLoading(false);
        return;
      }

      if (pass.length < 6) {
        setError('Пароль должен быть не менее 6 символов');
        setLoading(false);
        return;
      }
      
      try {
        // Регистрация в Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: {
            data: {
              company_name: companyName,
              inn: inn,
              full_name: fullName,
              phone: phone
            },
            emailRedirectTo: window.location.origin
          }
        });

        if (error) throw error;

        // Создание компании
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .insert([{
            name: companyName,
            inn: inn,
            email: email,
            phone: phone,
            subscription_status: 'trial',
            subscription_plan: 'free',
            subscription_start: new Date().toISOString(),
            subscription_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          }])
          .select()
          .single();

        if (companyError) throw companyError;

        // Создание пользователя
        await supabase
          .from('users')
          .insert([{
            id: data.user.id,
            email: email,
            full_name: fullName || companyName,
            role: 'company_admin',
            company_id: companyData.id
          }]);

        setLoading(false);
        // Переход на страницу с инструкцией
        window.location.href = '/register-success';
      } catch (err: any) {
        setError(err.message || 'Ошибка регистрации');
        setLoading(false);
      }
    } else {
      const ok = await login(email, pass);
      if (!ok) setError('Неверный логин или доступ ограничен');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neo-bg p-6">
       <div className="w-full max-w-md space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="text-center space-y-4">
             <button onClick={onBack} className="p-3 rounded-xl shadow-neo hover:shadow-neo-inset transition-all text-gray-400 mb-4"><ArrowLeft size={20}/></button>
             <div className="w-16 h-16 rounded-2xl shadow-neo bg-blue-500 flex items-center justify-center text-white mx-auto"><Truck size={32}/></div>
             <h2 className="text-2xl font-black uppercase tracking-tight">{isRegister ? 'Регистрация компании' : 'Вход в систему'}</h2>
             <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{isRegister ? 'Создайте аккаунт для вашей организации' : 'Введите данные сотрудника'}</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button onClick={demoLogin} className="w-full py-4 rounded-2xl shadow-neo bg-neo-bg text-blue-600 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:shadow-neo-inset transition-all">
              <PlayCircle size={18}/> Быстрый Демо-вход
            </button>
            <div className="flex items-center gap-4 py-2">
              <div className="h-px flex-1 bg-gray-300"></div>
              <span className="text-[8px] font-black text-gray-400 uppercase">или через почту</span>
              <div className="h-px flex-1 bg-gray-300"></div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
             {isRegister && (
               <>
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Название организации *</label>
                    <div className="relative">
                       <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
                       <input 
                         type="text" 
                         className="w-full pl-12 pr-4 py-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-xs font-bold border-none" 
                         value={companyName} 
                         onChange={e => setCompanyName(e.target.value)}
                         required
                         placeholder="ООО «Ромашка»"
                       />
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">ИНН</label>
                    <input 
                      type="text" 
                      className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-xs font-bold border-none" 
                      value={inn} 
                      onChange={e => setInn(e.target.value)}
                      placeholder="1234567890"
                    />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">ФИО контактного лица</label>
                    <div className="relative">
                       <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
                       <input 
                         type="text" 
                         className="w-full pl-12 pr-4 py-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-xs font-bold border-none" 
                         value={fullName} 
                         onChange={e => setFullName(e.target.value)}
                         placeholder="Иванов Иван Иванович"
                       />
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Телефон</label>
                    <input 
                      type="tel" 
                      className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-xs font-bold border-none" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+7 (999) 000-00-00"
                    />
                 </div>
               </>
             )}

             <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Email адрес *</label>
                <div className="relative">
                   <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
                   <input 
                     type="email" 
                     placeholder="demo@istexpert.ru" 
                     className="w-full pl-12 pr-4 py-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-xs font-bold border-none" 
                     value={email} 
                     onChange={e => setEmail(e.target.value)}
                     required
                   />
                </div>
             </div>

             {!isRegister && (
               <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Пароль *</label>
                  <div className="relative">
                     <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
                     <input 
                       type="password" 
                       placeholder="••••••••" 
                       className="w-full pl-12 pr-4 py-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-xs font-bold border-none" 
                       value={pass} 
                       onChange={e => setPass(e.target.value)}
                       required
                     />
                  </div>
               </div>
             )}

             {isRegister && (
               <>
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Пароль *</label>
                    <div className="relative">
                       <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
                       <input 
                         type={showPassword ? 'text' : 'password'}
                         placeholder="Минимум 6 символов"
                         className="w-full pl-12 pr-12 py-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-xs font-bold border-none" 
                         value={pass} 
                         onChange={e => setPass(e.target.value)}
                         required
                         minLength={6}
                       />
                       <button
                         type="button"
                         onClick={() => setShowPassword(!showPassword)}
                         className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                       >
                         {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                       </button>
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Подтверждение пароля *</label>
                    <div className="relative">
                       <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
                       <input 
                         type={showPassword ? 'text' : 'password'}
                         placeholder="Повторите пароль"
                         className="w-full pl-12 pr-4 py-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-xs font-bold border-none" 
                         value={confirmPass} 
                         onChange={e => setConfirmPass(e.target.value)}
                         required
                         minLength={6}
                       />
                    </div>
                 </div>
                 <p className="text-[9px] text-gray-500 ml-2">
                   📧 На почту придет письмо с подтверждением и логином для входа
                 </p>
               </>
             )}

             {error && <p className="text-[10px] text-red-500 font-black uppercase text-center">{error}</p>}

             <button
               type="submit"
               disabled={loading}
               className="w-full py-5 rounded-[2rem] bg-blue-500 text-white font-black uppercase text-xs shadow-lg hover:shadow-neo transition-all tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {loading ? 'Обработка...' : (isRegister ? 'Зарегистрироваться' : 'Войти в кабинет')}
                {!loading && <ChevronRight size={18}/>}
             </button>
          </form>

          <div className="text-center pt-4">
             <button onClick={() => setIsRegister(!isRegister)} className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline">
                {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрировать компанию'}
             </button>
          </div>
       </div>
    </div>
  );
};

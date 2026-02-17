
import React, { useState } from 'react';
import { Truck, Mail, Lock, Building, ArrowLeft, ChevronRight, PlayCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const Login: React.FC<{onBack: () => void}> = ({ onBack }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [inn, setInn] = useState('');
  const [error, setError] = useState('');
  
  const { login, register, demoLogin } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isRegister) {
      if (!companyName || !inn || !email) { setError('Заполните все поля'); return; }
      register(companyName, inn, email);
    } else {
      const ok = await login(email, pass);
      if (!ok) setError('Неверный логин или доступ ограничен');
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
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Название организации</label>
                    <div className="relative">
                       <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
                       <input type="text" className="w-full pl-12 pr-4 py-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-xs font-bold border-none" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">ИНН</label>
                    <input type="text" className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-xs font-bold border-none" value={inn} onChange={e => setInn(e.target.value)} />
                 </div>
               </>
             )}
             
             <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Email адрес</label>
                <div className="relative">
                   <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
                   <input type="email" placeholder="demo@istexpert.ru" className="w-full pl-12 pr-4 py-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-xs font-bold border-none" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
             </div>

             {!isRegister && (
               <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Пароль</label>
                  <div className="relative">
                     <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
                     <input type="password" placeholder="••••••••" className="w-full pl-12 pr-4 py-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-xs font-bold border-none" value={pass} onChange={e => setPass(e.target.value)} />
                  </div>
               </div>
             )}

             {error && <p className="text-[10px] text-red-500 font-black uppercase text-center">{error}</p>}

             <button type="submit" className="w-full py-5 rounded-[2rem] bg-blue-500 text-white font-black uppercase text-xs shadow-lg hover:shadow-neo transition-all tracking-widest flex items-center justify-center gap-2">
                {isRegister ? 'Зарегистрироваться' : 'Войти в кабинет'} <ChevronRight size={18}/>
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

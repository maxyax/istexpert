import React from 'react';
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react';

export const RegisterSuccess: React.FC = () => {
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
            Регистрация успешна. На вашу почту отправлено письмо с подтверждением.
          </p>
          <div className="p-6 rounded-[2rem] bg-blue-500/10 border border-blue-500/20 mb-8">
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-4">
              В письме вы найдете:
            </p>
            <div className="space-y-3 text-left max-w-md mx-auto">
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Ссылку для подтверждения email</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Ваш логин (email)</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Инструкцию по входу в систему</span>
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
            className="w-full py-5 rounded-[2rem] bg-blue-500 text-white font-black uppercase text-sm shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3"
          >
            <ArrowLeft size={18} />
            Перейти ко входу
          </button>
        </div>
      </div>
    </div>
  );
};

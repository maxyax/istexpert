import React, { useState } from 'react';
import { CheckCircle2, X, Truck, Zap, Shield, BarChart3, ArrowRight } from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Пробный',
    price: 0,
    period: '14 дней',
    description: 'Для знакомства с системой',
    features: [
      'До 5 единиц техники',
      'До 3 пользователей',
      'Базовый учет ТО',
      'QR-паспорта',
      'Без документов'
    ],
    limitations: [
      'Нет снабжения',
      'Нет аналитики',
      'Нет API'
    ],
    popular: false
  },
  {
    id: 'basic',
    name: 'Базовый',
    price: 2900,
    period: 'месяц',
    description: 'Для небольших автопарков',
    features: [
      'До 20 единиц техники',
      'До 10 пользователей',
      'Полный учет ТО',
      'QR-паспорта',
      'Документы (до 100)',
      'Снабжение',
      'Email поддержка'
    ],
    limitations: [
      'Нет аналитики',
      'Нет API'
    ],
    popular: true
  },
  {
    id: 'pro',
    name: 'Профи',
    price: 7900,
    period: 'месяц',
    description: 'Для средних компаний',
    features: [
      'До 100 единиц техники',
      'До 50 пользователей',
      'Полный учет ТО',
      'QR-паспорта',
      'Безлимитные документы',
      'Снабжение',
      'Аналитика и отчеты',
      'Приоритетная поддержка'
    ],
    limitations: [
      'Нет API'
    ],
    popular: false
  },
  {
    id: 'enterprise',
    name: 'Корпоративный',
    price: 19900,
    period: 'месяц',
    description: 'Для крупных предприятий',
    features: [
      'Безлимитная техника',
      'Безлимитные пользователи',
      'Полный учет ТО',
      'QR-паспорта',
      'Безлимитные документы',
      'Снабжение',
      'Расширенная аналитика',
      'API доступ',
      'Персональный менеджер',
      'Обучение сотрудников'
    ],
    limitations: [],
    popular: false
  }
];

export const Pricing: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>('month');

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    // Здесь будет интеграция с платежной системой
    setTimeout(() => {
      onComplete();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-neo-bg py-20 px-6">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Заголовок */}
        <div className="text-center space-y-4 animate-in slide-in-from-bottom duration-700">
          <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter text-gray-800 dark:text-gray-200">
            Выберите свой план
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Начните с 14-дневного пробного периода. Карта не требуется.
          </p>
        </div>

        {/* Переключатель периода */}
        <div className="flex justify-center animate-in slide-in-from-bottom duration-700 delay-100">
          <div className="inline-flex items-center gap-2 p-2 rounded-2xl shadow-neo bg-neo-bg dark:bg-gray-800">
            <button
              onClick={() => setBillingPeriod('month')}
              className={`px-6 py-3 rounded-xl font-black text-sm uppercase transition-all ${
                billingPeriod === 'month'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              Ежемесячно
            </button>
            <button
              onClick={() => setBillingPeriod('year')}
              className={`px-6 py-3 rounded-xl font-black text-sm uppercase transition-all flex items-center gap-2 ${
                billingPeriod === 'year'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              Ежегодно
              <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full">-20%</span>
            </button>
          </div>
        </div>

        {/* Карточки тарифов */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom duration-700 delay-200">
          {PLANS.map((plan, i) => (
            <div
              key={plan.id}
              className={`relative p-8 rounded-[2.5rem] shadow-neo bg-neo-bg dark:bg-gray-800 transition-all duration-500 hover:shadow-neo-inset ${
                plan.popular ? 'ring-2 ring-blue-500 ring-offset-4' : ''
              }`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest">
                  Популярный
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-black uppercase text-gray-800 dark:text-gray-200 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-gray-800 dark:text-gray-200">
                    {billingPeriod === 'year' && plan.price > 0
                      ? Math.round((plan.price * 12 * 0.8) / 12)
                      : plan.price}
                  </span>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400">₽ / {billingPeriod === 'year' ? 'месяц' : plan.period}</span>
                    {billingPeriod === 'year' && plan.price > 0 && (
                      <span className="text-[10px] text-emerald-500 font-bold">
                        {plan.price * 12 * 0.8}₽ / год
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={selectedPlan !== null && selectedPlan !== plan.id}
                  className={`w-full py-4 rounded-[2rem] font-black uppercase text-sm shadow-xl transition-all flex items-center justify-center gap-2 ${
                    selectedPlan === plan.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-blue-500 text-white hover:scale-105'
                  }`}
                >
                  {selectedPlan === plan.id ? (
                    <>
                      <CheckCircle2 size={18} />
                      Выбрано
                    </>
                  ) : (
                    <>
                      Начать
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Возможности:
                  </p>
                  {plan.features.map((feature, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {feature}
                      </span>
                    </div>
                  ))}
                  {plan.limitations && plan.limitations.length > 0 && (
                    <>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pt-4">
                        Ограничения:
                      </p>
                      {plan.limitations.map((feature, j) => (
                        <div key={j} className="flex items-start gap-3">
                          <X size={16} className="text-red-500 shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Сравнение тарифов */}
        <div className="pt-20 animate-in slide-in-from-bottom duration-700 delay-300">
          <h2 className="text-3xl font-black uppercase text-center text-gray-800 dark:text-gray-200 mb-12">
            Сравнение возможностей
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full max-w-4xl mx-auto">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-6 text-sm font-black uppercase text-gray-500 dark:text-gray-400">
                    Функция
                  </th>
                  {PLANS.map((plan) => (
                    <th key={plan.id} className="py-4 px-6 text-center">
                      <div className="text-lg font-black uppercase text-gray-800 dark:text-gray-200">
                        {plan.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {[
                  { name: 'Единицы техники', values: ['5', '20', '100', '∞'] },
                  { name: 'Пользователи', values: ['3', '10', '50', '∞'] },
                  { name: 'QR-паспорта', values: [true, true, true, true] },
                  { name: 'Учет ТО', values: ['Базовый', 'Полный', 'Полный', 'Полный'] },
                  { name: 'Документы', values: ['—', '100', '∞', '∞'] },
                  { name: 'Снабжение', values: [false, true, true, true] },
                  { name: 'Аналитика', values: [false, false, true, true] },
                  { name: 'API доступ', values: [false, false, false, true] },
                  { name: 'Поддержка', values: ['—', 'Email', 'Приоритет', 'Персональный'] }
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-white/5 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-bold text-gray-700 dark:text-gray-300">
                      {row.name}
                    </td>
                    {row.values.map((value, j) => (
                      <td key={j} className="py-4 px-6 text-center">
                        {typeof value === 'boolean' ? (
                          value ? (
                            <CheckCircle2 size={20} className="text-emerald-500 mx-auto" />
                          ) : (
                            <X size={20} className="text-red-500 mx-auto" />
                          )
                        ) : (
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {value}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="pt-20 pb-20 animate-in slide-in-from-bottom duration-700 delay-400">
          <h2 className="text-3xl font-black uppercase text-center text-gray-800 dark:text-gray-200 mb-12">
            Частые вопросы
          </h2>
          <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                q: 'Можно ли изменить тариф позже?',
                a: 'Да, вы можете перейти на любой тариф в любое время.'
              },
              {
                q: 'Что происходит после пробного периода?',
                a: 'Ваш аккаунт будет заблокирован до выбора платного тарифа.'
              },
              {
                q: 'Есть ли скидка за годовую оплату?',
                a: 'Да, при оплате за год вы получаете скидку 20%.'
              },
              {
                q: 'Можно ли вернуть деньги?',
                a: 'Да, в течение 14 дней после оплаты мы возвращаем полную сумму.'
              }
            ].map((faq, i) => (
              <div
                key={i}
                className="p-6 rounded-[2rem] shadow-neo bg-neo-bg dark:bg-gray-800 hover:shadow-neo-inset transition-all"
              >
                <h3 className="text-lg font-black uppercase text-gray-800 dark:text-gray-200 mb-3">
                  {faq.q}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

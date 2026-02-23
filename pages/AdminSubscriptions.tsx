import React, { useState, useEffect } from 'react';
import {
  TrendingUp, DollarSign, Calendar, CreditCard, RefreshCw,
  ArrowUpRight, ArrowDownRight, Users, Building
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatMoney, formatDate } from '../utils/format';

interface SubscriptionStats {
  totalCompanies: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  expiredSubscriptions: number;
  suspendedSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  projectedRevenue: number;
}

interface AdminSubscriptionsProps {
  onBack: () => void;
  onNavigate?: (page: string) => void;
}

export const AdminSubscriptions: React.FC<AdminSubscriptionsProps> = ({ onBack, onNavigate }) => {
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadSubscriptions();
  }, []);

  const loadStats = async () => {
    try {
      const [companiesCount, companiesData] = await Promise.all([
        supabase.from('companies').select('id', { count: 'exact' }),
        supabase.from('companies').select('subscription_status, subscription_plan')
      ]);

      const active = companiesData.data?.filter(c => c.subscription_status === 'active').length || 0;
      const trial = companiesData.data?.filter(c => c.subscription_status === 'trial').length || 0;
      const expired = companiesData.data?.filter(c => c.subscription_status === 'expired').length || 0;
      const suspended = companiesData.data?.filter(c => c.subscription_status === 'suspended').length || 0;

      // Подсчёт по тарифам
      const free = companiesData.data?.filter(c => c.subscription_plan === 'free').length || 0;
      const basic = companiesData.data?.filter(c => c.subscription_plan === 'basic').length || 0;
      const pro = companiesData.data?.filter(c => c.subscription_plan === 'pro').length || 0;
      const enterprise = companiesData.data?.filter(c => c.subscription_plan === 'enterprise').length || 0;

      // Примерный доход (можно заменить на реальные данные из payments)
      const monthlyRevenue = (basic * 990) + (pro * 2990) + (enterprise * 9990);

      setStats({
        totalCompanies: companiesCount.count || 0,
        activeSubscriptions: active,
        trialSubscriptions: trial,
        expiredSubscriptions: expired,
        suspendedSubscriptions: suspended,
        totalRevenue: monthlyRevenue * 12,
        monthlyRevenue,
        projectedRevenue: monthlyRevenue * 1.2 // +20% рост
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .in('subscription_status', ['active', 'trial'])
        .order('subscription_end', { ascending: true })
        .limit(50);

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
  };

  const handleExtendTrial = async (companyId: string) => {
    const newEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('companies')
      .update({
        subscription_status: 'trial',
        subscription_end: newEndDate
      })
      .eq('id', companyId);

    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      alert('Триал продлён на 14 дней');
      loadStats();
      loadSubscriptions();
    }
  };

  const handleGrantFreeYear = async (companyId: string) => {
    const newEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('companies')
      .update({
        subscription_status: 'active',
        subscription_plan: 'enterprise',
        subscription_end: newEndDate
      })
      .eq('id', companyId);

    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      alert('Предоставлен бесплатный Enterprise на 1 год');
      loadStats();
      loadSubscriptions();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neo-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500 animate-pulse" />
          <p className="text-gray-500 font-medium">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-bg flex flex-col md:flex-row">
      {/* Мобильная шапка */}
      <header className="md:hidden bg-neo-bg border-b border-white/30 dark:border-gray-800 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw size={20} className="text-gray-500" />
          </button>
          <span className="text-base font-black text-gray-800 dark:text-gray-200">Подписки</span>
        </div>
      </header>

      {/* Сайдбар - скрыт на мобильных */}
      <aside className="hidden md:flex flex-col w-64 bg-neo-bg border-r border-white/30 dark:border-gray-800 p-6 space-y-6 min-h-screen">
        <div className="flex items-center gap-3 px-2">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw size={20} className="text-gray-500" />
          </button>
          <span className="text-lg font-black text-gray-800 dark:text-gray-200">Админ-панель</span>
        </div>

        <nav className="space-y-2 flex-1">
          {[
            { id: 'dashboard', label: 'Дашборд' },
            { id: 'companies', label: 'Компании' },
            { id: 'subscriptions', label: 'Подписки', active: true },
            { id: 'settings', label: 'Настройки' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate && onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                item.active
                  ? 'bg-purple-500 text-white shadow-neo'
                  : 'text-gray-600 dark:text-gray-300 hover:shadow-neo-inset'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Нижняя навигация для мобильных */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-neo-bg border-t border-white/30 dark:border-gray-800 p-2 z-40 flex justify-around">
        {[
          { id: 'dashboard', label: 'Дашборд' },
          { id: 'companies', label: 'Компании' },
          { id: 'subscriptions', label: 'Подписки', active: true },
          { id: 'settings', label: 'Настройки' }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate && onNavigate(item.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl font-bold text-[10px] ${
              item.active ? 'text-purple-500' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Основной контент */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase text-gray-800 dark:text-gray-200">Подписки</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Управление подписками и доступом</p>
          </div>
          <button onClick={() => { loadStats(); loadSubscriptions(); }} className="p-3 rounded-xl shadow-neo text-blue-500 hover:shadow-neo-inset transition-all">
            <RefreshCw size={20} />
          </button>
        </div>

        {/* Статистика */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
            {[
              { label: 'Всего компаний', value: stats.totalCompanies, icon: Building, color: 'text-blue-500' },
              { label: 'Активные', value: stats.activeSubscriptions, icon: TrendingUp, color: 'text-emerald-500' },
              { label: 'Триал', value: stats.trialSubscriptions, icon: Calendar, color: 'text-orange-500' },
              { label: 'Истекли', value: stats.expiredSubscriptions, icon: ArrowDownRight, color: 'text-red-500' },
              { label: 'Заблокированы', value: stats.suspendedSubscriptions, icon: ArrowUpRight, color: 'text-gray-500' },
              { label: 'За месяц', value: formatMoney(stats.monthlyRevenue), icon: DollarSign, color: 'text-emerald-500' },
              { label: 'За год', value: formatMoney(stats.totalRevenue), icon: CreditCard, color: 'text-blue-500' },
              { label: 'Прогноз', value: formatMoney(stats.projectedRevenue), icon: TrendingUp, color: 'text-purple-500' }
            ].map((stat, i) => (
              <div key={i} className="p-6 rounded-[2rem] shadow-neo bg-neo-bg dark:bg-gray-800 hover:shadow-neo-inset transition-all">
                <div className={`mb-3 ${stat.color}`}><stat.icon size={20} /></div>
                <div className="text-2xl font-black text-gray-800 dark:text-gray-200">{stat.value}</div>
                <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Таблица подписок */}
        <div className="bg-neo-bg dark:bg-gray-800 rounded-[2.5rem] shadow-neo overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-black uppercase text-gray-800 dark:text-gray-200">Активные подписки</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Компании с активной подпиской или триалом</p>
          </div>
          <table className="w-full min-w-[800px]">
            <thead className="bg-white/5 dark:bg-gray-900/50">
              <tr>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Компания</th>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Тариф</th>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Статус</th>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Окончание</th>
                <th className="text-right py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {subscriptions.map((company) => (
                <tr key={company.id} className="hover:bg-white/5 dark:hover:bg-gray-900/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-black text-gray-800 dark:text-gray-200 uppercase">{company.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{company.email}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      company.subscription_plan === 'enterprise' ? 'bg-purple-500' :
                      company.subscription_plan === 'pro' ? 'bg-blue-500' :
                      company.subscription_plan === 'basic' ? 'bg-emerald-500' : 'bg-gray-500'
                    } text-white`}>
                      {company.subscription_plan}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        company.subscription_status === 'active' ? 'bg-emerald-500' :
                        company.subscription_status === 'trial' ? 'bg-orange-500' : 'bg-red-500'
                      }`} />
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">{company.subscription_status}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      {formatDate(company.subscription_end)}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      {company.subscription_status === 'trial' && (
                        <>
                          <button
                            onClick={() => handleExtendTrial(company.id)}
                            className="px-3 py-2 rounded-xl bg-orange-500 text-white text-[10px] font-black uppercase hover:scale-105 transition-all"
                          >
                            +14 дней
                          </button>
                          <button
                            onClick={() => handleGrantFreeYear(company.id)}
                            className="px-3 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase hover:scale-105 transition-all"
                          >
                            Год бесплатно
                          </button>
                        </>
                      )}
                      {company.subscription_status === 'active' && (
                        <button
                          onClick={() => handleGrantFreeYear(company.id)}
                          className="px-3 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase hover:scale-105 transition-all"
                        >
                          +Год
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    Нет активных подписок
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Информация о тарифах */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          {[
            { name: 'Free', price: '0 ₽', features: ['До 3 пользователей', 'До 5 единиц техники', 'Базовый функционал'], color: 'gray' },
            { name: 'Basic', price: '990 ₽/мес', features: ['До 10 пользователей', 'До 20 единиц техники', 'ТО и ремонты', 'Календарь'], color: 'emerald' },
            { name: 'Pro', price: '2 990 ₽/мес', features: ['До 50 пользователей', 'До 100 единиц техники', 'Полный функционал', 'Снабжение', 'Отчёты'], color: 'blue' },
            { name: 'Enterprise', price: '9 990 ₽/мес', features: ['Безлимитно', 'Приоритетная поддержка', 'API доступ', 'Интеграции'], color: 'purple' }
          ].map((plan, i) => (
            <div key={i} className={`p-6 rounded-[2rem] shadow-neo bg-neo-bg dark:bg-gray-800 border-t-4 border-${plan.color}-500`}>
              <h3 className="text-lg font-black uppercase text-gray-800 dark:text-gray-200">{plan.name}</h3>
              <p className="text-2xl font-black text-gray-800 dark:text-gray-200 mt-2">{plan.price}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature, j) => (
                  <li key={j} className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full bg-${plan.color}-500`} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

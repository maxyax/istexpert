import React, { useState, useEffect } from 'react';
import {
  Truck, Users, BarChart3, TrendingUp, DollarSign, Calendar,
  Shield, Lock, LogOut, Search, Filter, MoreVertical,
  Eye, PauseCircle, PlayCircle, Trash2, Download, RefreshCw
} from 'lucide-react';
import { supabase, Company, User } from '../lib/supabase';
import { formatMoney, formatDate } from '../utils/format';

interface AdminStats {
  totalCompanies: number;
  totalUsers: number;
  totalEquipment: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  suspendedSubscriptions: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
}

export const AdminDashboard: React.FC<{ onLogout: () => void; onNavigate?: (page: string) => void }> = ({ onLogout, onNavigate }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showCompanyDetails, setShowCompanyDetails] = useState(false);

  useEffect(() => {
    loadStats();
    loadCompanies();
  }, []);

  const loadStats = async () => {
    try {
      // Загрузка статистики
      const [companiesCount, usersCount, companiesData] = await Promise.all([
        supabase.from('companies').select('id', { count: 'exact' }),
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('companies').select('subscription_status, subscription_plan')
      ]);

      const active = companiesData.data?.filter(c => c.subscription_status === 'active').length || 0;
      const expired = companiesData.data?.filter(c => c.subscription_status === 'expired').length || 0;
      const suspended = companiesData.data?.filter(c => c.subscription_status === 'suspended').length || 0;

      // Подсчет техники
      const equipmentCount = await supabase.from('equipment').select('id', { count: 'exact' });

      setStats({
        totalCompanies: companiesCount.count || 0,
        totalUsers: usersCount.count || 0,
        totalEquipment: equipmentCount.count || 0,
        activeSubscriptions: active,
        expiredSubscriptions: expired,
        suspendedSubscriptions: suspended,
        monthlyRevenue: 0, // Здесь нужен расчет из платежей
        yearlyRevenue: 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const handleToggleSubscription = async (companyId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
      const { error } = await supabase
        .from('companies')
        .update({ subscription_status: newStatus })
        .eq('id', companyId);

      if (error) throw error;
      loadCompanies();
      loadStats();
    } catch (error) {
      console.error('Error toggling subscription:', error);
      alert('Ошибка изменения статуса');
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Вы уверены? Это действие нельзя отменить.')) return;

    try {
      // Удаление компании и всех связанных данных (каскадом)
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;
      loadCompanies();
      loadStats();
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Ошибка удаления');
    }
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(search.toLowerCase()) ||
                         company.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || company.subscription_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500';
      case 'expired': return 'bg-orange-500';
      case 'suspended': return 'bg-red-500';
      case 'trial': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'bg-purple-500';
      case 'pro': return 'bg-blue-500';
      case 'basic': return 'bg-emerald-500';
      default: return 'bg-gray-500';
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
    <div className="min-h-screen bg-neo-bg flex">
      {/* Сайдбар */}
      <aside className="w-64 bg-neo-bg border-r border-white/30 dark:border-gray-800 p-6 space-y-6">
        <div className="flex items-center gap-3 px-2">
          <Truck className="text-blue-500" size={28} />
          <span className="text-xl font-black tracking-tight text-gray-800 dark:text-gray-200">
            ISTExpert Admin
          </span>
        </div>

        <nav className="space-y-2">
          {[
            { id: 'dashboard', label: 'Дашборд', icon: BarChart3 },
            { id: 'companies', label: 'Компании', icon: Users },
            { id: 'subscriptions', label: 'Подписки', icon: Calendar },
            { id: 'settings', label: 'Настройки', icon: Shield }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate ? onNavigate(item.id) : null}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl shadow-neo text-gray-600 dark:text-gray-300 font-bold text-sm hover:shadow-neo-inset transition-all"
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl shadow-neo text-red-500 font-bold text-sm hover:shadow-neo-inset transition-all"
          >
            <LogOut size={18} />
            Выйти
          </button>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 overflow-y-auto p-8">
        {/* Заголовок */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase text-gray-800 dark:text-gray-200">
              Панель администратора
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Управление сервисом и пользователями
            </p>
          </div>
          <button
            onClick={() => { loadStats(); loadCompanies(); }}
            className="p-3 rounded-xl shadow-neo text-blue-500 hover:shadow-neo-inset transition-all"
          >
            <RefreshCw size={20} />
          </button>
        </div>

        {/* Статистика */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
            {[
              { label: 'Компаний', value: stats.totalCompanies, icon: Users, color: 'text-blue-500' },
              { label: 'Пользователей', value: stats.totalUsers, icon: Users, color: 'text-emerald-500' },
              { label: 'Техники', value: stats.totalEquipment, icon: Truck, color: 'text-purple-500' },
              { label: 'Активных', value: stats.activeSubscriptions, icon: TrendingUp, color: 'text-emerald-500' },
              { label: 'Истекло', value: stats.expiredSubscriptions, icon: Calendar, color: 'text-orange-500' },
              { label: 'Заблокировано', value: stats.suspendedSubscriptions, icon: Lock, color: 'text-red-500' },
              { label: 'За месяц', value: `${formatMoney(stats.monthlyRevenue)}`, icon: DollarSign, color: 'text-emerald-500' },
              { label: 'За год', value: `${formatMoney(stats.yearlyRevenue)}`, icon: DollarSign, color: 'text-blue-500' }
            ].map((stat, i) => (
              <div
                key={i}
                className="p-6 rounded-[2rem] shadow-neo bg-neo-bg dark:bg-gray-800 hover:shadow-neo-inset transition-all"
              >
                <div className={`mb-3 ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                <div className="text-2xl font-black text-gray-800 dark:text-gray-200">
                  {stat.value}
                </div>
                <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Фильтры */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск компании..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-neo-bg dark:bg-gray-800 shadow-neo-inset outline-none text-sm text-gray-800 dark:text-gray-200"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-6 py-4 rounded-2xl bg-neo-bg dark:bg-gray-800 shadow-neo-inset outline-none text-sm text-gray-800 dark:text-gray-200 font-medium"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="trial">Триал</option>
            <option value="expired">Истекли</option>
            <option value="suspended">Заблокированы</option>
          </select>
        </div>

        {/* Таблица компаний */}
        <div className="bg-neo-bg dark:bg-gray-800 rounded-[2.5rem] shadow-neo overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-white/5 dark:bg-gray-900/50">
                <tr>
                  <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">
                    Компания
                  </th>
                  <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">
                    Контакт
                  </th>
                  <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">
                    План
                  </th>
                  <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">
                    Статус
                  </th>
                  <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">
                    Окончание
                  </th>
                  <th className="text-right py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCompanies.map((company) => (
                  <tr
                    key={company.id}
                    className="hover:bg-white/5 dark:hover:bg-gray-900/30 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedCompany(company);
                      setShowCompanyDetails(true);
                    }}
                  >
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-black text-gray-800 dark:text-gray-200 uppercase">
                          {company.name}
                        </div>
                        {company.inn && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            ИНН: {company.inn}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {company.email}
                      </div>
                      {company.phone && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {company.phone}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase ${getPlanColor(company.subscription_plan)} text-white`}>
                        {company.subscription_plan}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(company.subscription_status)}`} />
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">
                          {company.subscription_status}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {company.subscription_end ? formatDate(company.subscription_end) : '—'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSubscription(company.id, company.subscription_status);
                          }}
                          className="p-2 rounded-xl shadow-neo hover:shadow-neo-inset transition-all"
                          title={company.subscription_status === 'suspended' ? 'Разблокировать' : 'Заблокировать'}
                        >
                          {company.subscription_status === 'suspended' ? (
                            <PlayCircle size={18} className="text-emerald-500" />
                          ) : (
                            <PauseCircle size={18} className="text-red-500" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCompany(company.id);
                          }}
                          className="p-2 rounded-xl shadow-neo hover:shadow-neo-inset transition-all"
                          title="Удалить"
                        >
                          <Trash2 size={18} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Детали компании (модалка) */}
        {showCompanyDetails && selectedCompany && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setShowCompanyDetails(false)}
          >
            <div
              className="bg-neo-bg dark:bg-gray-800 w-full max-w-3xl rounded-[3rem] shadow-neo p-8 md:p-12 border border-white/20 animate-in zoom-in duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-black uppercase text-gray-800 dark:text-gray-200">
                    {selectedCompany.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    ИНН: {selectedCompany.inn || '—'}
                  </p>
                </div>
                <button
                  onClick={() => setShowCompanyDetails(false)}
                  className="p-3 rounded-xl shadow-neo text-gray-400 hover:shadow-neo-inset transition-all"
                >
                  <Lock size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="p-6 rounded-[2rem] shadow-neo-inset bg-neo-bg dark:bg-gray-700">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Email
                  </p>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {selectedCompany.email}
                  </p>
                </div>
                <div className="p-6 rounded-[2rem] shadow-neo-inset bg-neo-bg dark:bg-gray-700">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Телефон
                  </p>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {selectedCompany.phone || '—'}
                  </p>
                </div>
                <div className="p-6 rounded-[2rem] shadow-neo-inset bg-neo-bg dark:bg-gray-700">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    План
                  </p>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200 uppercase">
                    {selectedCompany.subscription_plan}
                  </p>
                </div>
                <div className="p-6 rounded-[2rem] shadow-neo-inset bg-neo-bg dark:bg-gray-700">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Статус
                  </p>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(selectedCompany.subscription_status)}`} />
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-200 uppercase">
                      {selectedCompany.subscription_status}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    handleToggleSubscription(selectedCompany.id, selectedCompany.subscription_status);
                    setShowCompanyDetails(false);
                  }}
                  className={`flex-1 py-5 rounded-[2rem] font-black uppercase text-sm shadow-xl transition-all flex items-center justify-center gap-3 ${
                    selectedCompany.subscription_status === 'suspended'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {selectedCompany.subscription_status === 'suspended' ? (
                    <>
                      <PlayCircle size={18} />
                      Разблокировать
                    </>
                  ) : (
                    <>
                      <PauseCircle size={18} />
                      Заблокировать
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    handleDeleteCompany(selectedCompany.id);
                    setShowCompanyDetails(false);
                  }}
                  className="px-8 py-5 rounded-[2rem] bg-gray-500 text-white font-black uppercase text-sm shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3"
                >
                  <Trash2 size={18} />
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

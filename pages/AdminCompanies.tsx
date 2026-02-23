import React, { useState, useEffect } from 'react';
import {
  Search, Filter, MoreVertical, PauseCircle, PlayCircle, Trash2, 
  RefreshCw, AlertTriangle, CheckCircle2, XCircle, User, Mail, Phone,
  Building, Calendar, CreditCard, Edit2, Shield, Ban
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatMoney, formatDate } from '../utils/format';

interface Company {
  id: string;
  name: string;
  inn?: string;
  email: string;
  phone?: string;
  subscription_status: 'active' | 'expired' | 'suspended' | 'trial';
  subscription_plan: 'free' | 'basic' | 'pro' | 'enterprise';
  subscription_start?: string;
  subscription_end?: string;
  created_at: string;
  updated_at: string;
}

interface AdminCompaniesProps {
  onBack: () => void;
  onNavigate?: (page: string) => void;
}

export const AdminCompanies: React.FC<AdminCompaniesProps> = ({ onBack, onNavigate }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Company>>({});

  useEffect(() => {
    loadCompanies();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubscription = async (companyId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const { error } = await supabase
      .from('companies')
      .update({ subscription_status: newStatus })
      .eq('id', companyId);

    if (error) {
      alert('Ошибка изменения статуса: ' + error.message);
    } else {
      loadCompanies();
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Вы уверены? Это действие нельзя отменить.')) return;

    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId);

    if (error) {
      alert('Ошибка удаления: ' + error.message);
    } else {
      loadCompanies();
      setShowDetails(false);
    }
  };

  const handleGrantFreeAccess = async (companyId: string) => {
    const { error } = await supabase
      .from('companies')
      .update({
        subscription_status: 'active',
        subscription_plan: 'enterprise',
        subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', companyId);

    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      alert('Предоставлен бесплатный доступ на 1 год');
      loadCompanies();
      setShowDetails(false);
    }
  };

  const handleSaveEdit = async () => {
    const { error } = await supabase
      .from('companies')
      .update(editForm)
      .eq('id', selectedCompany?.id);

    if (error) {
      alert('Ошибка сохранения: ' + error.message);
    } else {
      alert('Данные обновлены');
      loadCompanies();
      setShowEditModal(false);
      setSelectedCompany({ ...selectedCompany!, ...editForm });
    }
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(search.toLowerCase()) ||
                         company.email.toLowerCase().includes(search.toLowerCase()) ||
                         (company.inn && company.inn.includes(search));
    const matchesStatus = statusFilter === 'all' || company.subscription_status === statusFilter;
    const matchesPlan = planFilter === 'all' || company.subscription_plan === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
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
      case 'free': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neo-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500 animate-pulse" />
          <p className="text-gray-500 font-medium">Загрузка компаний...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-bg flex">
      {/* Сайдбар */}
      <aside className="w-64 bg-neo-bg border-r border-white/30 dark:border-gray-800 p-6 space-y-6">
        <div className="flex items-center gap-3 px-2">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw size={20} className="text-gray-500" />
          </button>
          <span className="text-lg font-black text-gray-800 dark:text-gray-200">Админ-панель</span>
        </div>

        <nav className="space-y-2">
          {[
            { id: 'dashboard', label: 'Дашборд', icon: '📊' },
            { id: 'companies', label: 'Компании', icon: '🏢', active: true },
            { id: 'subscriptions', label: 'Подписки', icon: '💳' },
            { id: 'settings', label: 'Настройки', icon: '⚙️' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate ? onNavigate(item.id) : window.location.href = `/admin/${item.id === 'dashboard' ? '' : item.id}`}
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

      {/* Основной контент */}
      <main className="flex-1 overflow-y-auto p-8">
        {/* Заголовок */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase text-gray-800 dark:text-gray-200">
              Компании
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Управление компаниями и доступом
            </p>
          </div>
          <button
            onClick={loadCompanies}
            className="p-3 rounded-xl shadow-neo text-blue-500 hover:shadow-neo-inset transition-all"
          >
            <RefreshCw size={20} />
          </button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="p-6 rounded-[2rem] shadow-neo bg-neo-bg dark:bg-gray-800">
            <div className="text-3xl font-black text-gray-800 dark:text-gray-200">{companies.length}</div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">Всего компаний</div>
          </div>
          <div className="p-6 rounded-[2rem] shadow-neo bg-neo-bg dark:bg-gray-800">
            <div className="text-3xl font-black text-emerald-500">{companies.filter(c => c.subscription_status === 'active').length}</div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">Активные</div>
          </div>
          <div className="p-6 rounded-[2rem] shadow-neo bg-neo-bg dark:bg-gray-800">
            <div className="text-3xl font-black text-orange-500">{companies.filter(c => c.subscription_status === 'trial').length}</div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">Триал</div>
          </div>
          <div className="p-6 rounded-[2rem] shadow-neo bg-neo-bg dark:bg-gray-800">
            <div className="text-3xl font-black text-red-500">{companies.filter(c => c.subscription_status === 'suspended').length}</div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">Заблокированы</div>
          </div>
        </div>

        {/* Фильтры */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск компании, email, ИНН..."
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
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-6 py-4 rounded-2xl bg-neo-bg dark:bg-gray-800 shadow-neo-inset outline-none text-sm text-gray-800 dark:text-gray-200 font-medium"
          >
            <option value="all">Все тарифы</option>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        {/* Таблица компаний */}
        <div className="bg-neo-bg dark:bg-gray-800 rounded-[2.5rem] shadow-neo overflow-hidden">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-white/5 dark:bg-gray-900/50">
              <tr>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Компания</th>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Контакт</th>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Тариф</th>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Статус</th>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Окончание</th>
                <th className="text-right py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCompanies.map((company) => (
                <tr
                  key={company.id}
                  className="hover:bg-white/5 dark:hover:bg-gray-900/30 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedCompany(company);
                    setShowDetails(true);
                  }}
                >
                  <td className="py-4 px-6">
                    <div className="font-black text-gray-800 dark:text-gray-200 uppercase">{company.name}</div>
                    {company.inn && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">ИНН: {company.inn}</div>}
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">{company.email}</div>
                    {company.phone && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{company.phone}</div>}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase ${getPlanColor(company.subscription_plan)} text-white`}>
                      {company.subscription_plan}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(company.subscription_status)}`} />
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">{company.subscription_status}</span>
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
                      >
                        {company.subscription_status === 'suspended' ? (
                          <PlayCircle size={18} className="text-emerald-500" />
                        ) : (
                          <PauseCircle size={18} className="text-red-500" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Детали компании */}
        {showDetails && selectedCompany && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setShowDetails(false)}>
            <div className="bg-neo-bg dark:bg-gray-800 w-full max-w-3xl rounded-[3rem] shadow-neo p-8 md:p-12 border border-white/20" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-black uppercase text-gray-800 dark:text-gray-200">{selectedCompany.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ИНН: {selectedCompany.inn || '—'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditForm(selectedCompany); setShowEditModal(true); }} className="p-3 rounded-xl shadow-neo text-blue-500 hover:shadow-neo-inset transition-all">
                    <Edit2 size={20} />
                  </button>
                  <button onClick={() => setShowDetails(false)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:shadow-neo-inset transition-all">
                    <XCircle size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="p-6 rounded-[2rem] shadow-neo-inset bg-neo-bg dark:bg-gray-700">
                  <div className="flex items-center gap-2 mb-2 text-gray-400">
                    <Mail size={16} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Email</p>
                  </div>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{selectedCompany.email}</p>
                </div>
                <div className="p-6 rounded-[2rem] shadow-neo-inset bg-neo-bg dark:bg-gray-700">
                  <div className="flex items-center gap-2 mb-2 text-gray-400">
                    <Phone size={16} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Телефон</p>
                  </div>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{selectedCompany.phone || '—'}</p>
                </div>
                <div className="p-6 rounded-[2rem] shadow-neo-inset bg-neo-bg dark:bg-gray-700">
                  <div className="flex items-center gap-2 mb-2 text-gray-400">
                    <CreditCard size={16} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Тариф</p>
                  </div>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200 uppercase">{selectedCompany.subscription_plan}</p>
                </div>
                <div className="p-6 rounded-[2rem] shadow-neo-inset bg-neo-bg dark:bg-gray-700">
                  <div className="flex items-center gap-2 mb-2 text-gray-400">
                    <Shield size={16} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Статус</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(selectedCompany.subscription_status)}`} />
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-200 uppercase">{selectedCompany.subscription_status}</p>
                  </div>
                </div>
                <div className="p-6 rounded-[2rem] shadow-neo-inset bg-neo-bg dark:bg-gray-700">
                  <div className="flex items-center gap-2 mb-2 text-gray-400">
                    <Calendar size={16} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Начало</p>
                  </div>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{selectedCompany.subscription_start ? formatDate(selectedCompany.subscription_start) : '—'}</p>
                </div>
                <div className="p-6 rounded-[2rem] shadow-neo-inset bg-neo-bg dark:bg-gray-700">
                  <div className="flex items-center gap-2 mb-2 text-gray-400">
                    <Calendar size={16} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Окончание</p>
                  </div>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{selectedCompany.subscription_end ? formatDate(selectedCompany.subscription_end) : '—'}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => handleToggleSubscription(selectedCompany.id, selectedCompany.subscription_status)}
                  className={`flex-1 py-5 rounded-[2rem] font-black uppercase text-sm shadow-xl transition-all flex items-center justify-center gap-3 ${
                    selectedCompany.subscription_status === 'suspended'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {selectedCompany.subscription_status === 'suspended' ? (
                    <><PlayCircle size={18} /> Разблокировать</>
                  ) : (
                    <><PauseCircle size={18} /> Заблокировать</>
                  )}
                </button>
                <button
                  onClick={() => handleGrantFreeAccess(selectedCompany.id)}
                  className="flex-1 py-5 rounded-[2rem] bg-emerald-500 text-white font-black uppercase text-sm shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3"
                >
                  <CheckCircle2 size={18} /> Бесплатный доступ
                </button>
                <button
                  onClick={() => handleDeleteCompany(selectedCompany.id)}
                  className="px-8 py-5 rounded-[2rem] bg-gray-500 text-white font-black uppercase text-sm shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3"
                >
                  <Trash2 size={18} /> Удалить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Редактирование */}
        {showEditModal && selectedCompany && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setShowEditModal(false)}>
            <div className="bg-neo-bg dark:bg-gray-800 w-full max-w-2xl rounded-[3rem] shadow-neo p-8 md:p-12" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-black uppercase text-gray-800 dark:text-gray-200 mb-6">Редактировать компанию</h2>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Название</label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg dark:bg-gray-700 outline-none text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Email</label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg dark:bg-gray-700 outline-none text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Телефон</label>
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg dark:bg-gray-700 outline-none text-sm font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Тариф</label>
                    <select
                      value={editForm.subscription_plan || 'free'}
                      onChange={(e) => setEditForm({ ...editForm, subscription_plan: e.target.value as any })}
                      className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg dark:bg-gray-700 outline-none text-sm font-bold"
                    >
                      <option value="free">Free</option>
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Статус</label>
                    <select
                      value={editForm.subscription_status || 'trial'}
                      onChange={(e) => setEditForm({ ...editForm, subscription_status: e.target.value as any })}
                      className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg dark:bg-gray-700 outline-none text-sm font-bold"
                    >
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                      <option value="expired">Expired</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={handleSaveEdit} className="flex-1 py-5 rounded-[2rem] bg-blue-500 text-white font-black uppercase text-sm shadow-xl hover:scale-105 transition-all">
                  Сохранить
                </button>
                <button onClick={() => setShowEditModal(false)} className="px-8 py-5 rounded-[2rem] bg-gray-500 text-white font-black uppercase text-sm shadow-xl hover:scale-105 transition-all">
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Building2, UserPlus, Trash2, Mail, Shield, User, X, Save, Edit3, Calendar, CreditCard, TrendingUp, Users, Truck } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole } from '../types';
import { supabase } from '../lib/supabase';

interface CompanyData {
  id: string;
  name: string;
  inn: string;
  email: string;
  phone: string;
  address?: string;
  subscription_status: string;
  subscription_plan: string;
  subscription_start: string;
  subscription_end: string;
}

interface PlanLimits {
  users: number;
  equipment: number;
  documents: number;
  procurement: number;
  analytics: boolean;
  price: number;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: { users: 3, equipment: 5, documents: 50, procurement: 10, analytics: true, price: 0 },
  basic: { users: 10, equipment: 20, documents: 100, procurement: 999, analytics: true, price: 2900 },
  pro: { users: 50, equipment: 100, documents: 9999, procurement: 999, analytics: true, price: 7900 },
  enterprise: { users: 999999, equipment: 999999, documents: 999999, procurement: 999, analytics: true, price: 19900 }
};

const PLAN_NAMES: Record<string, string> = {
  free: 'Пробный',
  basic: 'Базовый',
  pro: 'Профи',
  enterprise: 'Корпоративный'
};

export const CompanySettings: React.FC = () => {
  const { company, user, staff, addStaff, removeStaff } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [usage, setUsage] = useState({ users: 0, equipment: 0 });
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [newMember, setNewMember] = useState({ full_name: '', email: '', role: UserRole.USER });

  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.COMPANY_ADMIN || user?.role === UserRole.OWNER;

  // Загрузка данных компании из Supabase
  useEffect(() => {
    const loadCompanyData = async () => {
      if (!user?.company_id) return;

      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.company_id)
        .single();

      if (company) {
        setCompanyData(company);

        // Расчет дней до конца подписки
        const endDate = new Date(company.subscription_end);
        const now = new Date();
        const diff = endDate.getTime() - now.getTime();
        setDaysRemaining(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
      }
    };

    const loadUsage = async () => {
      if (!user?.company_id) return;

      const [{ count: userCount }, { count: equipmentCount }] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('company_id', user.company_id),
        supabase.from('equipment').select('*', { count: 'exact', head: true }).eq('company_id', user.company_id)
      ]);

      setUsage({
        users: userCount || 0,
        equipment: equipmentCount || 0
      });
    };

    loadCompanyData();
    loadUsage();
  }, [user?.company_id]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addStaff(newMember);
    setIsModalOpen(false);
    setNewMember({ full_name: '', email: '', role: UserRole.USER });
    // Обновляем счетчик пользователей
    setUsage(prev => ({ ...prev, users: prev.users + 1 }));
  };

  const handleCompanySave = async () => {
    if (!user?.company_id) return;

    await supabase
      .from('companies')
      .update({
        name: companyData?.name,
        inn: companyData?.inn,
        address: companyData?.address,
        phone: companyData?.phone
      })
      .eq('id', user.company_id);

    setIsEditingCompany(false);
  };

  const handlePlanChange = async (newPlan: string) => {
    if (!user?.company_id || !companyData) return;

    const confirmChange = window.confirm(
      `Вы уверены, что хотите сменить тариф на "${PLAN_NAMES[newPlan]}"?\n\n` +
      `Стоимость: ${PLAN_LIMITS[newPlan].price}₽/месяц`
    );

    if (!confirmChange) return;

    const { error } = await supabase
      .from('companies')
      .update({
        subscription_plan: newPlan,
        subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', user.company_id);

    if (error) {
      alert('Ошибка смены тарифа: ' + error.message);
    } else {
      alert('Тариф успешно изменён!');
      setCompanyData({ ...companyData, subscription_plan: newPlan });
    }
  };

  if (!companyData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-bold">Загрузка данных компании...</p>
        </div>
      </div>
    );
  }

  const currentPlan = companyData.subscription_plan;
  const limits = PLAN_LIMITS[currentPlan];
  const usersPercent = Math.round((usage.users / limits.users) * 100);
  const equipmentPercent = Math.round((usage.equipment / limits.equipment) * 100);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* ===== ПОДПИСКА И ТАРИФ ===== */}
      <section className="p-8 rounded-[2rem] shadow-neo bg-gradient-to-br from-blue-500/10 to-purple-500/10">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl shadow-neo bg-blue-500 flex items-center justify-center text-white">
            <CreditCard size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Ваш тарифный план</h2>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
              {PLAN_NAMES[currentPlan]} • {limits.price}₽/месяц
            </p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-3xl font-black text-blue-500">{daysRemaining}</div>
            <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest">дней до оплаты</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Лимит пользователей */}
          <div className="p-4 rounded-2xl shadow-neo-inset bg-neo-bg">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-blue-500" />
              <span className="text-[9px] font-black text-gray-400 uppercase">Пользователи</span>
            </div>
            <div className="text-2xl font-black">
              {usage.users} <span className="text-sm text-gray-500">/ {limits.users}</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${usersPercent > 90 ? 'bg-red-500' : usersPercent > 70 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, usersPercent)}%` }}
              />
            </div>
          </div>

          {/* Лимит техники */}
          <div className="p-4 rounded-2xl shadow-neo-inset bg-neo-bg">
            <div className="flex items-center gap-2 mb-2">
              <Truck size={16} className="text-green-500" />
              <span className="text-[9px] font-black text-gray-400 uppercase">Техника</span>
            </div>
            <div className="text-2xl font-black">
              {usage.equipment} <span className="text-sm text-gray-500">/ {limits.equipment}</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${equipmentPercent > 90 ? 'bg-red-500' : equipmentPercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, equipmentPercent)}%` }}
              />
            </div>
          </div>

          {/* Документы */}
          <div className="p-4 rounded-2xl shadow-neo-inset bg-neo-bg">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-purple-500" />
              <span className="text-[9px] font-black text-gray-400 uppercase">Документы</span>
            </div>
            <div className="text-2xl font-black">
              {limits.documents >= 9999 ? '∞' : limits.documents}
            </div>
            <div className="text-[9px] text-gray-500 font-black uppercase mt-2">лимит</div>
          </div>

          {/* Снабжение */}
          <div className="p-4 rounded-2xl shadow-neo-inset bg-neo-bg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-orange-500" />
              <span className="text-[9px] font-black text-gray-400 uppercase">Снабжение</span>
            </div>
            <div className="text-2xl font-black">
              {limits.procurement >= 999 ? '∞' : limits.procurement}
            </div>
            <div className="text-[9px] text-gray-500 font-black uppercase mt-2">заявок</div>
          </div>
        </div>

        {/* Смена тарифа */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(PLAN_LIMITS).map(([plan, planLimits]) => (
            <button
              key={plan}
              onClick={() => handlePlanChange(plan)}
              disabled={plan === currentPlan}
              className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                plan === currentPlan
                  ? 'bg-green-500 text-white cursor-default'
                  : 'bg-neo-bg shadow-neo text-blue-500 hover:shadow-neo-inset'
              }`}
            >
              {PLAN_NAMES[plan]} {planLimits.price > 0 && `• ${planLimits.price}₽`}
              {plan === currentPlan && ' ✓'}
            </button>
          ))}
        </div>
      </section>

      {/* ===== ДАННЫЕ КОМПАНИИ ===== */}
      <section className="p-8 md:p-12 rounded-[2rem] shadow-neo bg-neo-bg relative">
        {isAdmin && (
          <button
            onClick={isEditingCompany ? handleCompanySave : () => setIsEditingCompany(true)}
            className={`absolute top-8 right-8 p-4 rounded-2xl shadow-neo transition-all ${
              isEditingCompany ? 'bg-green-500 text-white shadow-none' : 'text-blue-500 hover:shadow-neo-inset'
            }`}
          >
            {isEditingCompany ? <Save size={20} /> : <Edit3 size={20} />}
          </button>
        )}

        <div className="flex items-center gap-6 mb-10">
          <div className="w-16 h-16 rounded-2xl shadow-neo bg-neo-bg flex items-center justify-center text-blue-500">
            <Building2 size={32} />
          </div>
          <div className="flex-1">
            {isEditingCompany ? (
              <input
                className="bg-neo-bg shadow-neo-inset p-3 rounded-xl font-black text-xl uppercase outline-none text-blue-500 w-full mb-2 border-none"
                value={companyData.name}
                onChange={e => setCompanyData({ ...companyData, name: e.target.value })}
              />
            ) : (
              <h2 className="text-2xl font-black uppercase tracking-tight">{companyData.name}</h2>
            )}
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">ИНН:</span>
                {isEditingCompany ? (
                  <input
                    className="bg-neo-bg shadow-neo-inset p-1 px-3 rounded-lg font-black text-[10px] outline-none text-blue-500 border-none"
                    value={companyData.inn}
                    onChange={e => setCompanyData({ ...companyData, inn: e.target.value })}
                  />
                ) : (
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{companyData.inn || '—'}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Email:</span>
                <span className="text-[10px] text-gray-700 dark:text-gray-300 font-bold">{companyData.email}</span>
              </div>
              {companyData.phone && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Телефон:</span>
                  <span className="text-[10px] text-gray-700 dark:text-gray-300 font-bold">{companyData.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="p-6 rounded-2xl shadow-neo-inset bg-neo-bg">
            <p className="text-[9px] font-black text-gray-400 uppercase mb-2">Юридический адрес</p>
            {isEditingCompany ? (
              <textarea
                className="bg-transparent w-full font-bold text-xs outline-none text-blue-500 border-none resize-none"
                rows={3}
                value={companyData.address || ''}
                onChange={e => setCompanyData({ ...companyData, address: e.target.value })}
                placeholder="Введите юридический адрес компании"
              />
            ) : (
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase leading-relaxed">
                {companyData.address || 'Адрес не указан'}
              </p>
            )}
          </div>
        </div>

        {/* Информация о подписке */}
        <div className="mt-8 p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-3 mb-4">
            <Calendar size={20} className="text-blue-500" />
            <h3 className="text-sm font-black uppercase tracking-widest">Информация о подписке</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[9px] text-gray-500 font-black uppercase mb-1">Дата начала</p>
              <p className="text-sm font-bold">
                {new Date(companyData.subscription_start).toLocaleDateString('ru-RU', { 
                  day: 'numeric', month: 'long', year: 'numeric' 
                })}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-gray-500 font-black uppercase mb-1">Дата окончания</p>
              <p className="text-sm font-bold">
                {new Date(companyData.subscription_end).toLocaleDateString('ru-RU', { 
                  day: 'numeric', month: 'long', year: 'numeric' 
                })}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-gray-500 font-black uppercase mb-1">Статус</p>
              <p className={`text-sm font-bold uppercase ${
                companyData.subscription_status === 'active' ? 'text-green-500' :
                companyData.subscription_status === 'trial' ? 'text-blue-500' :
                'text-red-500'
              }`}>
                {companyData.subscription_status === 'active' ? 'Активна' :
                 companyData.subscription_status === 'trial' ? 'Пробный период' :
                 companyData.subscription_status}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ШТАТ СОТРУДНИКОВ ===== */}
      <section className="space-y-6">
        <div className="flex justify-between items-center px-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <User size={16} className="text-blue-500" /> Штат сотрудников
          </h3>
          {isAdmin && (
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="px-6 py-3 rounded-xl shadow-neo bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:shadow-neo-inset transition-all"
            >
              <UserPlus size={14} /> Добавить
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map(member => (
            <div key={member.id} className="p-6 rounded-[2rem] shadow-neo bg-neo-bg relative group">
              {isAdmin && member.id !== user?.id && (
                <button 
                  onClick={() => removeStaff(member.id)} 
                  className="absolute top-4 right-4 p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl shadow-neo bg-neo-bg flex items-center justify-center text-gray-400 font-black text-sm uppercase">
                  {member.full_name[0]}
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase">{member.full_name}</h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Shield size={10} className="text-blue-500" />
                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">
                      {member.role === 'user' ? 'Пользователь' : 
                       member.role === 'company_admin' ? 'Администратор' :
                       member.role === 'driver' ? 'Водитель' :
                       member.role === 'mechanic' ? 'Механик' :
                       member.role === 'procurement' ? 'Снабженец' :
                       member.role === 'accountant' ? 'Бухгалтер' :
                       member.role.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[9px] text-gray-500 font-bold uppercase">
                <Mail size={12} className="text-gray-400" /> {member.email}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== МОДАЛКА ДОБАВЛЕНИЯ СОТРУДНИКА ===== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-neo-bg w-full max-w-lg rounded-[2.5rem] shadow-neo p-8 md:p-12 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black uppercase">Новый сотрудник</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">ФИО</label>
                <input 
                  className="w-full p-4 rounded-xl shadow-neo-inset bg-neo-bg outline-none text-xs font-bold border-none" 
                  value={newMember.full_name} 
                  onChange={e => setNewMember({ ...newMember, full_name: e.target.value })} 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Email</label>
                <input 
                  type="email" 
                  className="w-full p-4 rounded-xl shadow-neo-inset bg-neo-bg outline-none text-xs font-bold border-none" 
                  value={newMember.email} 
                  onChange={e => setNewMember({ ...newMember, email: e.target.value })} 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Должность</label>
                <select 
                  className="w-full p-4 rounded-xl shadow-neo-inset bg-neo-bg outline-none text-xs font-black uppercase border-none" 
                  value={newMember.role} 
                  onChange={e => setNewMember({ ...newMember, role: e.target.value as any })}
                >
                  <option value={UserRole.DRIVER}>Водитель</option>
                  <option value={UserRole.MECHANIC}>Механик</option>
                  <option value={UserRole.PROCUREMENT}>Снабженец</option>
                  <option value={UserRole.ACCOUNTANT}>Бухгалтер</option>
                  <option value={UserRole.USER}>Пользователь</option>
                  <option value={UserRole.COMPANY_ADMIN}>Администратор</option>
                </select>
              </div>
              <button 
                type="submit" 
                className="w-full py-5 rounded-2xl bg-blue-500 text-white font-black uppercase text-[10px] shadow-lg tracking-widest"
              >
                Добавить в штат
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

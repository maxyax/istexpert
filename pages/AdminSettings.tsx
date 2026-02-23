import React, { useState, useEffect } from 'react';
import {
  Settings, Users, Shield, Database, Trash2, Edit2, Save, X,
  RefreshCw, AlertTriangle, CheckCircle2, Search, UserPlus, Key,
  Building
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company_id: string;
  company_name?: string;
}

interface AdminSettingsProps {
  onBack: () => void;
  onNavigate?: (page: string) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ onBack, onNavigate }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, company:companies(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data?.map(u => ({ ...u, company_name: u.company?.name })) || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRole = async () => {
    if (!selectedUser) return;

    const { error } = await supabase
      .from('users')
      .update({ role: editForm.role })
      .eq('id', selectedUser.id);

    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      alert('Роль обновлена');
      loadUsers();
      setShowEditModal(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    if (!confirm('Вы уверены? Это действие нельзя отменить.')) return;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', selectedUser.id);

    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      alert('Пользователь удалён');
      loadUsers();
      setShowDeleteConfirm(false);
      setSelectedUser(null);
    }
  };

  const handleResetPassword = async (email: string) => {
    const { error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: window.location.origin + '/reset-password'
      }
    });

    if (error) {
      alert('Ошибка: ' + error.message);
    } else {
      alert('Письмо для сброса пароля отправлено на ' + email);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.full_name.toLowerCase().includes(search.toLowerCase()) ||
    user.company_name?.toLowerCase().includes(search.toLowerCase())
  );

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
          <span className="text-base font-black text-gray-800 dark:text-gray-200">Настройки</span>
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
            { id: 'subscriptions', label: 'Подписки' },
            { id: 'settings', label: 'Настройки', active: true }
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
          { id: 'subscriptions', label: 'Подписки' },
          { id: 'settings', label: 'Настройки', active: true }
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
            <h1 className="text-3xl font-black uppercase text-gray-800 dark:text-gray-200">Настройки</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Управление пользователями и доступом</p>
          </div>
          <button onClick={loadUsers} className="p-3 rounded-xl shadow-neo text-blue-500 hover:shadow-neo-inset transition-all">
            <RefreshCw size={20} />
          </button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-6 rounded-[2rem] shadow-neo bg-neo-bg dark:bg-gray-800">
            <div className="flex items-center gap-3 mb-3">
              <Users className="text-blue-500" size={24} />
              <div className="text-3xl font-black text-gray-800 dark:text-gray-200">{users.length}</div>
            </div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Всего пользователей</div>
          </div>
          <div className="p-6 rounded-[2rem] shadow-neo bg-neo-bg dark:bg-gray-800">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="text-purple-500" size={24} />
              <div className="text-3xl font-black text-gray-800 dark:text-gray-200">{users.filter(u => u.role === 'super_admin').length}</div>
            </div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Супер-админы</div>
          </div>
          <div className="p-6 rounded-[2rem] shadow-neo bg-neo-bg dark:bg-gray-800">
            <div className="flex items-center gap-3 mb-3">
              <Building className="text-emerald-500" size={24} />
              <div className="text-3xl font-black text-gray-800 dark:text-gray-200">{users.filter(u => u.role === 'company_admin').length}</div>
            </div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Админы компаний</div>
          </div>
        </div>

        {/* Поиск */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск пользователя, email, компания..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-neo-bg dark:bg-gray-800 shadow-neo-inset outline-none text-sm text-gray-800 dark:text-gray-200"
            />
          </div>
        </div>

        {/* Таблица пользователей */}
        <div className="bg-neo-bg dark:bg-gray-800 rounded-[2.5rem] shadow-neo overflow-hidden">
          <table className="w-full min-w-[800px]">
            <thead className="bg-white/5 dark:bg-gray-900/50">
              <tr>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Пользователь</th>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Компания</th>
                <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Роль</th>
                <th className="text-right py-4 px-6 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 dark:hover:bg-gray-900/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-black">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-black text-gray-800 dark:text-gray-200">{user.full_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">{user.company_name || '—'}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      user.role === 'super_admin' ? 'bg-purple-500 text-white' :
                      user.role === 'company_admin' ? 'bg-blue-500 text-white' :
                      user.role === 'driver' ? 'bg-orange-500 text-white' :
                      user.role === 'mechanic' ? 'bg-emerald-500 text-white' :
                      user.role === 'procurement' ? 'bg-indigo-500 text-white' :
                      'bg-gray-500 text-white'
                    }`}>
                      {user.role === 'super_admin' ? 'Супер-админ' :
                       user.role === 'company_admin' ? 'Админ компании' :
                       user.role === 'driver' ? 'Водитель' :
                       user.role === 'mechanic' ? 'Механик' :
                       user.role === 'procurement' ? 'Снабженец' : 'Пользователь'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setSelectedUser(user); setEditForm({ role: user.role }); setShowEditModal(true); }}
                        className="p-2 rounded-xl shadow-neo text-blue-500 hover:shadow-neo-inset transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleResetPassword(user.email)}
                        className="p-2 rounded-xl shadow-neo text-orange-500 hover:shadow-neo-inset transition-all"
                        title="Сбросить пароль"
                      >
                        <Key size={18} />
                      </button>
                      {user.role !== 'super_admin' && (
                        <button
                          onClick={() => { setSelectedUser(user); setShowDeleteConfirm(true); }}
                          className="p-2 rounded-xl shadow-neo text-red-500 hover:shadow-neo-inset transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    Пользователи не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Системная информация */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="p-6 rounded-[2rem] shadow-neo bg-neo-bg dark:bg-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <Database className="text-blue-500" size={24} />
              <h3 className="text-lg font-black uppercase text-gray-800 dark:text-gray-200">База данных</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Таблицы</span>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">companies, users, equipment</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">RLS включён</span>
                <span className="text-sm font-bold text-emerald-500">Да</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-[2rem] shadow-neo bg-neo-bg dark:bg-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="text-purple-500" size={24} />
              <h3 className="text-lg font-black uppercase text-gray-800 dark:text-gray-200">Безопасность</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">2FA</span>
                <span className="text-sm font-bold text-orange-500">Не настроено</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Сессии</span>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Supabase Auth</span>
              </div>
            </div>
          </div>
        </div>

        {/* Предупреждение */}
        <div className="mt-8 p-6 rounded-[2rem] bg-orange-500/10 border border-orange-500/20 flex items-start gap-4">
          <AlertTriangle className="text-orange-500 shrink-0" size={24} />
          <div>
            <h4 className="text-sm font-black text-orange-700 dark:text-orange-400 uppercase mb-2">Внимание</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Удаление пользователей и компаний является необратимым действием. Все связанные данные будут удалены безвозвратно.
            </p>
          </div>
        </div>
      </main>

      {/* Редактирование роли */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setShowEditModal(false)}>
          <div className="bg-neo-bg dark:bg-gray-800 w-full max-w-md rounded-[3rem] shadow-neo p-8 md:p-12" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-black uppercase text-gray-800 dark:text-gray-200 mb-6">Изменить роль</h2>
            
            <div className="mb-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{selectedUser.email}</p>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg dark:bg-gray-700 outline-none text-sm font-bold"
              >
                <option value="user">Пользователь</option>
                <option value="driver">Водитель</option>
                <option value="mechanic">Механик</option>
                <option value="procurement">Снабженец</option>
                <option value="company_admin">Админ компании</option>
              </select>
            </div>

            <div className="flex gap-4">
              <button onClick={handleUpdateUserRole} className="flex-1 py-5 rounded-[2rem] bg-blue-500 text-white font-black uppercase text-sm shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2">
                <Save size={18} /> Сохранить
              </button>
              <button onClick={() => setShowEditModal(false)} className="px-8 py-5 rounded-[2rem] bg-gray-500 text-white font-black uppercase text-sm shadow-xl hover:scale-105 transition-all">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Подтверждение удаления */}
      {showDeleteConfirm && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-neo-bg dark:bg-gray-800 w-full max-w-md rounded-[3rem] shadow-neo p-8 md:p-12" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500 text-white flex items-center justify-center mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="text-2xl font-black uppercase text-gray-800 dark:text-gray-200 mb-2">Удалить пользователя?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{selectedUser.full_name}</p>
            </div>

            <div className="flex gap-4">
              <button onClick={handleDeleteUser} className="flex-1 py-5 rounded-[2rem] bg-red-500 text-white font-black uppercase text-sm shadow-xl hover:scale-105 transition-all">
                Удалить
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="px-8 py-5 rounded-[2rem] bg-gray-500 text-white font-black uppercase text-sm shadow-xl hover:scale-105 transition-all">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


import React, { useState } from 'react';
import { LayoutDashboard, Truck, Wrench, Bell, LogOut, Moon, Sun, Menu, X, ShoppingBag, Fuel, Calendar, Settings } from 'lucide-react';
import { useAuthStore } from './store/useAuthStore';
import { useNotificationStore } from './store/useNotificationStore';

export const Layout: React.FC<any> = ({ children, activePage, onNavigate }) => {
  const { user, logout, company } = useAuthStore();
  const { notifications } = useNotificationStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };
  
  const navItems = [
    { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
    { id: 'equipment', label: 'Автопарк', icon: Truck },
    { id: 'maintenance', label: 'ТО и Ремонт', icon: Wrench },
    { id: 'calendar', label: 'Календарь ТО', icon: Calendar },
    { id: 'procurement', label: 'Снабжение', icon: ShoppingBag },
    { id: 'fuel', label: 'Топливо', icon: Fuel },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-neo-bg text-gray-700 dark:text-gray-300 overflow-hidden">
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-neo-bg border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center space-x-3 mb-10 px-2">
            <Truck className="text-blue-500" size={28} />
            <span className="text-xl font-black tracking-tight">ISTExpert</span>
          </div>
          <nav className="flex-1 space-y-4">
            {navItems.map(item => (
              <button key={item.id} onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 p-4 rounded-2xl transition-all ${activePage === item.id ? 'shadow-neo-inset text-blue-500 font-bold' : 'shadow-neo hover:shadow-neo-inset text-gray-500'}`}>
                <item.icon size={20} /> <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
          <button onClick={logout} className="mt-10 flex items-center space-x-3 p-4 rounded-2xl shadow-neo text-red-500 font-bold text-sm uppercase tracking-widest hover:shadow-neo-inset transition-all">
            <LogOut size={18} /> <span>Выйти</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 px-8 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-neo-bg/80 backdrop-blur-md">
          <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-3 rounded-xl shadow-neo"><Menu size={20} /></button>
          <h2 className="text-lg font-black uppercase tracking-tight hidden md:block">{company?.name}</h2>
          <div className="flex items-center space-x-4">
            <button onClick={toggleTheme} className="p-3 rounded-xl shadow-neo cursor-pointer hover:shadow-neo-inset transition-all">
              <Moon size={20} className="dark:hidden" />
              <Sun size={20} className="hidden dark:block" />
            </button>
            <div className="relative p-3 rounded-xl shadow-neo cursor-pointer">
              <Bell size={20} />
              {notifications.filter((n:any)=>!n.read).length > 0 && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-neo-bg" />}
            </div>

          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">{children}</div>
      </main>
    </div>
  );
};
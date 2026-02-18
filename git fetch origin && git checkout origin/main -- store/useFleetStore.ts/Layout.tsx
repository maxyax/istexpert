
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Truck, Wrench, Bell, LogOut, Moon, Sun, Menu, X, ShoppingBag, Fuel, Settings, QrCode, Calendar
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';

export const Layout: React.FC<any> = ({ children, activePage, onNavigate }) => {
  const { user, logout, company } = useAuthStore();
  const { notifications } = useNotificationStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const navItems = [
    { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
    { id: 'equipment', label: 'Автопарк', icon: Truck },
    { id: 'maintenance', label: 'ТО и Ремонт', icon: Wrench },
    { id: 'calendar', label: 'Календарь', icon: Calendar },
    { id: 'procurement', label: 'Снабжение', icon: ShoppingBag },
    { id: 'fuel', label: 'Топливо', icon: Fuel },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ];

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // Закрытие меню при переходе
  const handleNavigate = (id: string) => {
    onNavigate(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-neo-bg text-gray-800 dark:text-gray-200 overflow-hidden relative transition-colors duration-300">
      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-neo-bg border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 md:p-8 flex flex-col h-full space-y-6 md:space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl shadow-neo bg-blue-500 text-white"><Truck size={24} /></div>
              <span className="text-xl font-black tracking-tight text-gray-800 dark:text-gray-100 uppercase">ISTExpert</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 rounded-xl shadow-neo text-gray-500"><X size={18}/></button>
          </div>

          <nav className="flex-1 space-y-3 md:space-y-4 overflow-y-auto custom-scrollbar pr-2">
            {navItems.map(item => (
              <button 
                key={item.id} 
                onClick={() => handleNavigate(item.id)} 
                className={`w-full flex items-center space-x-4 p-4 rounded-2xl transition-all ${activePage === item.id ? 'shadow-neo-inset text-blue-600 font-black' : 'shadow-neo hover:shadow-neo-inset text-gray-500'}`}
              >
                <item.icon size={20} className="shrink-0" /> 
                <span className="text-[10px] uppercase tracking-widest font-black text-left">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="pt-6 border-t border-gray-200 dark:border-gray-800 space-y-4">
             <div className="flex items-center space-x-3 p-2">
                <div className="w-10 h-10 rounded-full shadow-neo flex items-center justify-center bg-gray-300 dark:bg-gray-700 text-sm font-black uppercase text-gray-700 dark:text-gray-200">{user?.full_name?.[0] || 'U'}</div>
                <div className="overflow-hidden">
                   <p className="text-xs font-black uppercase tracking-tight text-gray-800 dark:text-gray-100 truncate">{user?.full_name}</p>
                   <p className="text-[9px] font-bold text-blue-500 uppercase">{user?.role}</p>
                </div>
             </div>
             <button onClick={logout} className="w-full flex items-center space-x-3 p-4 rounded-2xl shadow-neo text-red-500 font-black text-[10px] uppercase tracking-widest hover:shadow-neo-inset transition-all">
               <LogOut size={18} className="shrink-0" /> <span>Выйти</span>
             </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-neo-bg relative">
        <header className="h-20 md:h-24 px-4 md:px-8 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-neo-bg/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-4 md:gap-6">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-3 rounded-xl shadow-neo text-gray-500"><Menu size={20} /></button>
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 hidden sm:block">Проект: <span className="text-gray-800 dark:text-gray-100">{company?.name}</span></h2>
          </div>

          <div className="flex items-center space-x-3 md:space-x-6">
            <button className="p-3 rounded-xl shadow-neo text-blue-500 hover:shadow-neo-inset transition-all" title="QR Сканер"><QrCode size={18}/></button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-xl shadow-neo text-gray-500 hover:shadow-neo-inset transition-all">{isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}</button>
            <div className="relative p-3 rounded-xl shadow-neo cursor-pointer text-gray-500 hover:shadow-neo-inset">
              <Bell size={18} />
              {notifications.filter((n:any)=>!n.read).length > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-neo-bg" />}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

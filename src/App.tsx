
import React, { useState } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { Layout } from './Layout';
import { Landing } from './features/landing/Landing';
import { Login } from './features/auth/Login';
import { Register } from './features/auth/Register';
import { RegisterSuccess } from './features/auth/RegisterSuccess';
import { Pricing } from './features/landing/Pricing';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { AdminCompanies } from './features/admin/AdminCompanies';
import { AdminSubscriptions } from './features/admin/AdminSubscriptions';
import { AdminSettings } from './features/admin/AdminSettings';
import { Dashboard } from './features/dashboard/Dashboard';
import { EquipmentList } from './features/equipment/EquipmentList';
import { Maintenance } from './features/maintenance/Maintenance';
import { MaintenanceCalendar } from './features/maintenance/MaintenanceCalendar';
import { Procurement } from './features/procurement/Procurement';
import { FuelManagement } from './features/fuel/FuelManagement';
import { CompanySettings } from './features/settings/CompanySettings';
import { AcceptInvite } from './features/auth/AcceptInvite';

const App: React.FC = () => {
  const { isAuthenticated, user, loadUserFromSupabase } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showPricing, setShowPricing] = useState(false);
  const [showRegisterSuccess, setShowRegisterSuccess] = useState(false);
  const [hasRedirectedAdmin, setHasRedirectedAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем пользователя из Supabase при старте
  React.useEffect(() => {
    loadUserFromSupabase().finally(() => setIsLoading(false));
  }, []);

  // Проверка на админа
  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  // Определяем adminPage из URL
  const getAdminPageFromUrl = (): string => {
    const path = window.location.pathname;
    if (path === '/admin/companies') return 'companies';
    if (path === '/admin/subscriptions') return 'subscriptions';
    if (path === '/admin/settings') return 'settings';
    return 'dashboard';
  };

  const [adminPage, setAdminPage] = useState(getAdminPageFromUrl());

  // Слушаем изменения URL (popstate)
  React.useEffect(() => {
    const handlePopState = () => {
      setAdminPage(getAdminPageFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Проверяем URL при загрузке и при изменении статуса авторизации
  React.useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin' && isAdmin) {
      setCurrentPage('admin');
      setAdminPage('dashboard');
    } else if (path === '/admin/companies' && isAdmin) {
      setCurrentPage('admin');
      setAdminPage('companies');
    } else if (path === '/admin/subscriptions' && isAdmin) {
      setCurrentPage('admin');
      setAdminPage('subscriptions');
    } else if (path === '/admin/settings' && isAdmin) {
      setCurrentPage('admin');
      setAdminPage('settings');
    }
    // Если админ только что залогинился, перенаправляем на /admin
    if (isAuthenticated && isAdmin && !hasRedirectedAdmin) {
      setCurrentPage('admin');
      setAdminPage('dashboard');
      window.history.pushState({}, '', '/admin');
      setHasRedirectedAdmin(true);
    }
  }, [isAdmin, isAuthenticated, hasRedirectedAdmin]);

  // Админ-панель
  if (currentPage === 'admin' && isAdmin) {
    const handleLogout = () => {
      setCurrentPage('dashboard');
      setHasRedirectedAdmin(false);
      setAdminPage('dashboard');
      window.history.pushState({}, '', '/');
    };

    const handleNavigate = (page: string) => {
      setAdminPage(page);
      const path = page === 'dashboard' ? '/admin' : `/admin/${page}`;
      window.history.pushState({}, '', path);
    };

    switch (adminPage) {
      case 'companies':
        return <AdminCompanies onBack={() => handleNavigate('dashboard')} onNavigate={handleNavigate} />;
      case 'subscriptions':
        return <AdminSubscriptions onBack={() => handleNavigate('dashboard')} onNavigate={handleNavigate} />;
      case 'settings':
        return <AdminSettings onBack={() => handleNavigate('dashboard')} onNavigate={handleNavigate} />;
      default:
        return <AdminDashboard onLogout={handleLogout} onNavigate={handleNavigate} />;
    }
  }

  // Страница успеха регистрации
  if (showRegisterSuccess) {
    return <RegisterSuccess />;
  }

  // Страница принятия приглашения (доступна без авторизации)
  if (window.location.pathname.startsWith('/accept-invite/')) {
    return <AcceptInvite />;
  }

  // Показываем загрузку пока загружаем пользователя
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neo-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-bold">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showPricing) {
      return <Pricing onComplete={() => setShowPricing(false)} />;
    }
    return showLogin ? <Login onBack={() => { setShowLogin(false); setShowRegisterSuccess(false); }} onRegister={() => setShowPricing(true)} /> : <Landing onStart={() => setShowLogin(true)} onRegister={() => setShowPricing(true)} />;
  }

  const renderPage = () => {
    switch(currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />;
      case 'equipment': return <EquipmentList onNavigate={setCurrentPage} />;
      case 'maintenance': return <Maintenance onNavigate={setCurrentPage} />;
      case 'calendar': return <MaintenanceCalendar onNavigate={setCurrentPage} />;
      case 'procurement': return <Procurement onNavigate={setCurrentPage} />;
      case 'fuel': return <FuelManagement />;
      case 'settings': return <CompanySettings />;
      default: return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return <Layout activePage={currentPage} onNavigate={setCurrentPage}>{renderPage()}</Layout>;
};

export default App;

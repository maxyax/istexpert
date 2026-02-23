
import React, { useState } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { Layout } from './Layout';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { RegisterSuccess } from './pages/RegisterSuccess';
import { Pricing } from './pages/Pricing';
import { AdminDashboard } from './pages/AdminDashboard';
import { Dashboard } from './pages/Dashboard';
import { EquipmentList } from './pages/EquipmentList';
import { Maintenance } from './pages/Maintenance';
import { MaintenanceCalendar } from './pages/MaintenanceCalendar';
import { Procurement } from './pages/Procurement';
import { FuelManagement } from './pages/FuelManagement';
import { CompanySettings } from './pages/CompanySettings';

const App: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showPricing, setShowPricing] = useState(false);
  const [showRegisterSuccess, setShowRegisterSuccess] = useState(false);
  const [hasRedirectedAdmin, setHasRedirectedAdmin] = useState(false);

  // Проверка на админа
  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  // Проверяем URL при загрузке и при изменении статуса авторизации
  React.useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin' && isAdmin) {
      setCurrentPage('admin');
    }
    // Если админ только что залогинился, перенаправляем на /admin
    if (isAuthenticated && isAdmin && !hasRedirectedAdmin) {
      setCurrentPage('admin');
      window.history.pushState({}, '', '/admin');
      setHasRedirectedAdmin(true);
    }
  }, [isAdmin, isAuthenticated, hasRedirectedAdmin]);

  // Админ-панель
  if (currentPage === 'admin' && isAdmin) {
    return <AdminDashboard onLogout={() => { 
      setCurrentPage('dashboard');
      setHasRedirectedAdmin(false);
      window.history.pushState({}, '', '/');
    }} />;
  }

  // Страница успеха регистрации
  if (showRegisterSuccess) {
    return <RegisterSuccess />;
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

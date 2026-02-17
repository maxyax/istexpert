
import React, { useState } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { EquipmentList } from './pages/EquipmentList';
import { Maintenance } from './pages/Maintenance';
import { MaintenanceCalendar } from './pages/MaintenanceCalendar';
import { Procurement } from './pages/Procurement';
import { FuelManagement } from './pages/FuelManagement';
import { CompanySettings } from './pages/CompanySettings';

const App: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!isAuthenticated) {
    return showLogin ? <Login onBack={() => setShowLogin(false)} /> : <Landing onStart={() => setShowLogin(true)} />;
  }

  const renderPage = () => {
    switch(currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />;
      case 'equipment': return <EquipmentList />;
      case 'maintenance': return <Maintenance />;
      case 'calendar': return <MaintenanceCalendar onNavigate={setCurrentPage} />;
      case 'procurement': return <Procurement />;
      case 'fuel': return <FuelManagement />;
      case 'settings': return <CompanySettings />;
      default: return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return <Layout activePage={currentPage} onNavigate={setCurrentPage}>{renderPage()}</Layout>;
};

export default App;

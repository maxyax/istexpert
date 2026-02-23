import { useAuthStore } from '../store/useAuthStore';
import { UserRole } from '../types';

interface Permissions {
  canViewDashboard: boolean;
  canViewEquipment: boolean;
  canEditEquipment: boolean;
  canViewMaintenance: boolean;
  canEditMaintenance: boolean;
  canViewCalendar: boolean;
  canViewProcurement: boolean;
  canEditProcurement: boolean;
  canViewFuel: boolean;
  canEditFuel: boolean;
  canViewSettings: boolean;
  canEditSettings: boolean;
  canManageUsers: boolean;
}

export const usePermissions = (): Permissions => {
  const { user } = useAuthStore();
  const role = user?.role;

  const isSuperAdmin = role === UserRole.SUPER_ADMIN;
  const isCompanyAdmin = role === UserRole.COMPANY_ADMIN || role === UserRole.OWNER;
  const isManager = role === UserRole.USER;
  const isMechanic = role === UserRole.MECHANIC;
  const isDriver = role === UserRole.DRIVER;
  const isProcurement = role === UserRole.PROCUREMENT;

  return {
    // Дашборд - все видят
    canViewDashboard: true,
    
    // Автопарк - все видят, редактируют админ, менеджер, механик
    canViewEquipment: true,
    canEditEquipment: isSuperAdmin || isCompanyAdmin || isManager || isMechanic,
    
    // ТО и Ремонт - видят и редактируют админ, менеджер, механик
    canViewMaintenance: isSuperAdmin || isCompanyAdmin || isManager || isMechanic,
    canEditMaintenance: isSuperAdmin || isCompanyAdmin || isManager || isMechanic,
    
    // Календарь ТО - все видят
    canViewCalendar: true,
    
    // Снабжение - видят все, редактируют админ, менеджер, снабженец, механик
    canViewProcurement: true,
    canEditProcurement: isSuperAdmin || isCompanyAdmin || isManager || isProcurement || isMechanic,
    
    // Топливо - видят все, редактируют админ, менеджер, водитель, механик
    canViewFuel: true,
    canEditFuel: isSuperAdmin || isCompanyAdmin || isManager || isDriver || isMechanic,
    
    // Настройки - только админ компании и супер-админ
    canViewSettings: isSuperAdmin || isCompanyAdmin,
    canEditSettings: isSuperAdmin || isCompanyAdmin,
    
    // Управление пользователями - только админ компании и супер-админ
    canManageUsers: isSuperAdmin || isCompanyAdmin,
  };
};

// Helper для проверки конкретной роли
export const hasRole = (allowedRoles: UserRole[]): boolean => {
  const { user } = useAuthStore();
  return user?.role ? allowedRoles.includes(user.role) : false;
};

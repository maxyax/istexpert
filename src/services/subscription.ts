import { supabase } from './supabase';

/**
 * Инициализирует демо-данные для новой компании
 * Вызывается после регистрации
 */
export const initializeCompanyDemoData = async (companyId: string) => {
  // Демо-техника
  const demoEquipment = [
    {
      id: `demo-1-${Date.now()}`,
      company_id: companyId,
      name: 'Liebherr PR 736',
      make: 'Liebherr',
      model: 'PR 736 LGP',
      vin: 'LB-736-2023-XYZ-01',
      license_plate: '7788 РЕ 77',
      status: 'active',
      hours: 1420,
      mileage_km: 12500,
      year: 2023,
      driver: 'Иванов С.П.',
      insurance_end: '2026-12-10',
      insuranceCompany: 'Росгосстрах',
      insuranceNumber: 'ОСАГО-2024-12345678',
      insuranceStart: '2024-12-10',
      image: 'https://picsum.photos/seed/liebherr/800/600',
      documents: [
        { name: 'СТС.pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', type: 'sts' },
        { name: 'ОСАГО.pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', type: 'osago' }
      ],
      regulations: [
        { id: 'r1', type: 'ТО-250', intervalHours: 250, works: ['Замена масла ДВС', 'Проверка гидравлики', 'Смазка узлов'] }
      ]
    },
    {
      id: `demo-2-${Date.now()}`,
      company_id: companyId,
      name: 'Caterpillar 336',
      make: 'CAT',
      model: '336 Next Gen',
      vin: 'CAT-336-EXT-992',
      license_plate: '0012 МС 50',
      status: 'repair',
      hours: 3120,
      mileage_km: 8400,
      year: 2022,
      driver: 'Петров А.В.',
      insurance_end: '2026-02-25',
      insuranceCompany: 'АльфаСтрахование',
      insuranceNumber: 'ОСАГО-2024-87654321',
      insuranceStart: '2024-02-25',
      image: 'https://picsum.photos/seed/cat/800/600',
      regulations: []
    }
  ];

  // Добавляем технику
  const { error: equipmentError } = await supabase
    .from('equipment')
    .insert(demoEquipment);

  if (equipmentError) {
    console.error('Error inserting demo equipment:', equipmentError);
    throw equipmentError;
  }

  // Демо-записи ТО
  const demoMaintenance = [
    {
      company_id: companyId,
      equipment_id: demoEquipment[0].id,
      date: new Date().toISOString(),
      type: 'ТО-250',
      hours_at_maintenance: 1420,
      performed_by: 'Механиков С.В.',
      checklist_items: [
        { text: 'Проверить уровень масла', done: true },
        { text: 'Заменить фильтры', done: true },
        { text: 'Проверить гидравлику', done: true }
      ],
      cost: 15000
    }
  ];

  const { error: maintenanceError } = await supabase
    .from('maintenance_records')
    .insert(demoMaintenance);

  if (maintenanceError) {
    console.error('Error inserting demo maintenance:', maintenanceError);
  }

  return { success: true };
};

/**
 * Проверяет статус подписки компании
 * Возвращает true если доступ разрешен
 */
export const checkSubscriptionAccess = async (companyId: string): Promise<{
  allowed: boolean;
  status: string;
  message: string;
}> => {
  const { data: company, error } = await supabase
    .from('companies')
    .select('subscription_status, subscription_end')
    .eq('id', companyId)
    .single();

  if (error || !company) {
    return {
      allowed: false,
      status: 'error',
      message: 'Компания не найдена'
    };
  }

  const { subscription_status, subscription_end } = company;

  // Блокировка при suspended
  if (subscription_status === 'suspended') {
    return {
      allowed: false,
      status: 'suspended',
      message: 'Доступ заблокирован. Обратитесь к администратору.'
    };
  }

  // Проверка истечения подписки
  if (subscription_end && new Date(subscription_end) < new Date()) {
    return {
      allowed: false,
      status: 'expired',
      message: 'Срок подписки истек. Продлите доступ.'
    };
  }

  return {
    allowed: true,
    status: subscription_status,
    message: 'Доступ разрешен'
  };
};

/**
 * Получает лимиты тарифа
 */
export const getPlanLimits = (plan: string) => {
  const limits: Record<string, { users: number; equipment: number }> = {
    free: { users: 3, equipment: 5 },
    basic: { users: 10, equipment: 20 },
    pro: { users: 50, equipment: 100 },
    enterprise: { users: Infinity, equipment: Infinity }
  };

  return limits[plan] || limits.free;
};

/**
 * Проверяет лимиты компании
 */
export const checkCompanyLimits = async (companyId: string): Promise<{
  canAddEquipment: boolean;
  canAddUser: boolean;
  equipmentCount: number;
  userCount: number;
  limits: { users: number; equipment: number };
}> => {
  // Получаем компанию
  const { data: company } = await supabase
    .from('companies')
    .select('subscription_plan')
    .eq('id', companyId)
    .single();

  if (!company) {
    return {
      canAddEquipment: false,
      canAddUser: false,
      equipmentCount: 0,
      userCount: 0,
      limits: { users: 3, equipment: 5 }
    };
  }

  const limits = getPlanLimits(company.subscription_plan);

  // Считаем технику
  const { count: equipmentCount } = await supabase
    .from('equipment')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  // Считаем пользователей
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  return {
    canAddEquipment: (equipmentCount || 0) < limits.equipment,
    canAddUser: (userCount || 0) < limits.users,
    equipmentCount: equipmentCount || 0,
    userCount: userCount || 0,
    limits
  };
};

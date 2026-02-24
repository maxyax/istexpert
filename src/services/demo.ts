import { supabase } from './supabase';

/**
 * Инициализирует демо-данные для временной сессии
 * Вызывается при демо-входе
 */
export const initializeDemoData = async () => {
  const demoCompanyId = 'demo-company-' + Date.now();
  const demoUserId = 'demo-user-' + Date.now();

  // Демо-техника
  const demoEquipment = [
    {
      id: `demo-eq-1`,
      company_id: demoCompanyId,
      name: 'Liebherr PR 736',
      make: 'Liebherr',
      model: 'PR 736 LGP',
      vin: 'LB-736-2023-XYZ-01',
      license_plate: '7788 РЕ 77',
      status: 'В работе',
      hours: 1420,
      mileage_km: 12500,
      year: 2023,
      driver: 'Иванов С.П.',
      insurance_end: '2026-12-10',
      insuranceCompany: 'Росгосстрах',
      insuranceNumber: 'ОСАГО-2024-12345678',
      insuranceStart: '2024-12-10',
      image: 'https://picsum.photos/seed/liebherr/800/600',
      regulations: [
        { id: 'r1', type: 'ТО-250', intervalHours: 250, works: ['Замена масла ДВС', 'Проверка гидравлики', 'Смазка узлов'] }
      ]
    },
    {
      id: `demo-eq-2`,
      company_id: demoCompanyId,
      name: 'Caterpillar 336',
      make: 'CAT',
      model: '336 Next Gen',
      vin: 'CAT-336-EXT-992',
      license_plate: '0012 МС 50',
      status: 'В ремонте',
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
    },
    {
      id: `demo-eq-3`,
      company_id: demoCompanyId,
      name: 'Komatsu D61',
      make: 'Komatsu',
      model: 'D61PX-23',
      vin: 'KM-D61-2024-789',
      license_plate: '1234 АВ 99',
      status: 'В работе',
      hours: 890,
      mileage_km: 5600,
      year: 2024,
      driver: 'Сидоров В.К.',
      insurance_end: '2027-03-15',
      insuranceCompany: 'Ингосстрах',
      insuranceNumber: 'ОСАГО-2024-11223344',
      insuranceStart: '2024-03-15',
      image: 'https://picsum.photos/seed/komatsu/800/600',
      regulations: [
        { id: 'r2', type: 'ТО-500', intervalHours: 500, works: ['Замена всех фильтров', 'Диагностика двигателя'] }
      ]
    }
  ];

  // Демо-записи ТО
  const demoMaintenance = [
    {
      id: `demo-maint-1`,
      company_id: demoCompanyId,
      equipment_id: 'demo-eq-1',
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
    },
    {
      id: `demo-maint-2`,
      company_id: demoCompanyId,
      equipment_id: 'demo-eq-2',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'Внеплановое ТО',
      hours_at_maintenance: 3100,
      performed_by: 'Петров А.В.',
      checklist_items: [
        { text: 'Диагностика гидравлики', done: true },
        { text: 'Замена РВД', done: true }
      ],
      cost: 45000
    }
  ];

  // Демо-поломки
  const demoBreakdowns = [
    {
      id: `demo-break-1`,
      company_id: demoCompanyId,
      equipment_id: 'demo-eq-2',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      partName: 'Гидроцилиндр',
      node: 'Гидравлическая система',
      description: 'Утечка гидравлической жидкости',
      status: 'В работе',
      severity: 'Средняя',
      reported_by: 'Петров А.В.'
    }
  ];

  // Демо-заявки на снабжение
  const demoProcurement = [
    {
      id: `demo-proc-1`,
      company_id: demoCompanyId,
      title: 'Запчасти для Caterpillar 336',
      status: 'В пути',
      equipment_id: 'demo-eq-2',
      breakdown_id: 'demo-break-1',
      cost: 45000,
      contractorName: 'ООО «СпецДеталь»',
      invoiceNumber: 'СЧ-123 от 15.01.2025',
      carrierName: 'Деловые Линии',
      trackingNumber: 'DL-789456123',
      responsible: 'Механиков С.В.',
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        { id: 'item-1', name: 'Гидроцилиндр в сборе', quantity: '1 шт', unitPriceWithVAT: 35000, total: 35000 },
        { id: 'item-2', name: 'Уплотнительный комплект', quantity: '2 шт', unitPriceWithVAT: 5000, total: 10000 }
      ]
    }
  ];

  // Демо-заправки
  const demoFuel = [
    {
      id: `demo-fuel-1`,
      company_id: demoCompanyId,
      equipment_id: 'demo-eq-1',
      date: new Date().toISOString(),
      quantity: 150,
      totalCost: 7500,
      currentHours: 1420,
      station: 'Лукойл',
      fuelType: 'ДТ',
      pricePerLiter: 50,
      currentMileage: 12500,
      paymentMethod: 'Топливная карта',
      performed_by: 'Иванов С.П.'
    },
    {
      id: `demo-fuel-2`,
      company_id: demoCompanyId,
      equipment_id: 'demo-eq-3',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      quantity: 120,
      totalCost: 6000,
      currentHours: 880,
      station: 'Газпромнефть',
      fuelType: 'ДТ',
      pricePerLiter: 50,
      currentMileage: 5550,
      paymentMethod: 'Наличные',
      performed_by: 'Сидоров В.К.'
    }
  ];

  // Сохраняем демо-данные в localStorage для использования в хранилищах
  localStorage.setItem('demoData', JSON.stringify({
    companyId: demoCompanyId,
    userId: demoUserId,
    equipment: demoEquipment,
    maintenance: demoMaintenance,
    breakdowns: demoBreakdowns,
    procurement: demoProcurement,
    fuel: demoFuel
  }));

  return {
    companyId: demoCompanyId,
    userId: demoUserId,
    equipment: demoEquipment,
    maintenance: demoMaintenance,
    breakdowns: demoBreakdowns,
    procurement: demoProcurement,
    fuel: demoFuel
  };
};

/**
 * Очищает демо-данные
 */
export const clearDemoData = () => {
  localStorage.removeItem('demoData');
};

/**
 * Проверяет, является ли текущая сессия демо
 */
export const isDemoSession = () => {
  return localStorage.getItem('demoData') !== null;
};

/**
 * Получает демо-данные из localStorage
 */
export const getDemoData = () => {
  const data = localStorage.getItem('demoData');
  return data ? JSON.parse(data) : null;
};

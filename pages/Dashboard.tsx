import React from 'react';
import {
  Truck, AlertTriangle, Clock, Activity, History,
  ChevronRight, Fuel, TrendingUp, CheckCircle2, Wrench, Package, Calendar, DollarSign
} from 'lucide-react';
import { useFleetStore } from '../store/useFleetStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useProcurementStore } from '../store/useProcurementStore';
import { EquipStatus } from '../types';
import { formatDate, formatMoney } from '../utils/format';

const computeEquipmentStatus = (equipmentId: string, breakdowns: any[], plannedTOs: any[], equipment: any[]) => {
  const activeBreakdowns = breakdowns.filter(b => b.equipmentId === equipmentId && b.status !== 'Исправлено');
  const equip = equipment.find(e => e.id === equipmentId);

  const criticalBreakdowns = activeBreakdowns.filter(b => b.severity === 'Критическая');
  if (criticalBreakdowns.length > 0) return EquipStatus.REPAIR;

  const inWorkBreakdowns = activeBreakdowns.filter(b => b.status === 'В работе');
  if (inWorkBreakdowns.length > 0) return EquipStatus.REPAIR;

  const waitingForParts = activeBreakdowns.filter(b => b.status === 'Запчасти заказаны' || b.status === 'Запчасти получены');
  if (waitingForParts.length > 0) return EquipStatus.WAITING_PARTS;

  const minorBreakdowns = activeBreakdowns.filter(b =>
    (b.severity === 'Низкая' || b.severity === 'Средняя') && b.status === 'Новая'
  );
  if (minorBreakdowns.length > 0) return EquipStatus.ACTIVE_WITH_RESTRICTIONS;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overduePlannedTO = plannedTOs.filter(t => {
    if (t.equipmentId !== equipmentId || t.status !== 'planned') return false;
    const plannedDate = new Date(t.date);
    plannedDate.setHours(0, 0, 0, 0);
    return plannedDate < today;
  });
  if (overduePlannedTO.length > 0) return EquipStatus.MAINTENANCE;

  const upcomingPlannedTO = plannedTOs.filter(t => t.equipmentId === equipmentId && t.status === 'planned');
  if (upcomingPlannedTO.length > 0) return EquipStatus.MAINTENANCE;

  return EquipStatus.ACTIVE;
};

export const Dashboard: React.FC<any> = ({ onNavigate }) => {
  const { equipment } = useFleetStore();
  const { breakdowns, records, fuelRecords, plannedTOs } = useMaintenanceStore();
  const { requests } = useProcurementStore();

  // Вычисляем статусы для каждой единицы техники
  const equipmentWithComputedStatus = equipment.map(e => ({
    ...e,
    computedStatus: computeEquipmentStatus(e.id, breakdowns, plannedTOs, equipment)
  }));

  const activeBreakdowns = breakdowns.filter(b => b.status !== 'Исправлено');
  const criticalBreakdowns = activeBreakdowns.filter(b => b.severity === 'Критическая');
  const readyToWork = activeBreakdowns.filter(b => {
    const req = requests.find(r => r.breakdownId === b.id);
    return req?.status === 'На складе' && b.status !== 'В работе' && b.status !== 'Исправлено';
  });
  const overdueTO = plannedTOs.filter(t => {
    const plannedDate = new Date(t.date);
    return t.status === 'planned' && plannedDate < new Date();
  });

  // Считаем технику "В работе" по вычисленному статусу
  const equipmentInWork = equipmentWithComputedStatus.filter(e => e.computedStatus === EquipStatus.ACTIVE).length;
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const breakdownsThisMonth = breakdowns.filter(b => {
    const date = new Date(b.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  // Топливо за текущий месяц
  const fuelThisMonth = fuelRecords.filter(f => {
    const date = new Date(f.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  const fuelCostThisMonth = fuelThisMonth.reduce((sum, f) => sum + f.totalCost, 0);

  // Топливо за предыдущий месяц
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const fuelPrevMonth = fuelRecords.filter(f => {
    const date = new Date(f.date);
    return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
  });
  const fuelCostPrevMonth = fuelPrevMonth.reduce((sum, f) => sum + f.totalCost, 0);

  // Топливо за весь период
  const fuelAllTime = fuelRecords.reduce((sum, f) => sum + f.totalCost, 0);

  // Снабжение - заявки за текущий месяц
  const requestsThisMonth = requests.filter(r => {
    const date = r.createdAt ? new Date(r.createdAt) : new Date();
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  const requestsThisMonthCount = requestsThisMonth.length;

  // Снабжение - оплаченные заявки
  const requestsPaid = requests.filter(r => r.status === 'Оплачено');
  const requestsPaidAmount = requestsPaid.reduce((sum, r) => sum + (r.cost || 0), 0);

  // Снабжение - на складе
  const requestsInWarehouse = requests.filter(r => r.status === 'На складе');
  const requestsInWarehouseAmount = requestsInWarehouse.reduce((sum, r) => sum + (r.cost || 0), 0);

  // Поломки за весь период
  const breakdownsAllTime = breakdowns.length;

  const breakdownsByEquipment = equipment.map(e => ({
    equipment: e,
    breakdowns: breakdowns.filter(b => b.equipmentId === e.id &&
      new Date(b.date).getMonth() === currentMonth &&
      new Date(b.date).getFullYear() === currentYear
    ).length
  })).sort((a, b) => b.breakdowns - a.breakdowns).slice(0, 5);

  const stats = [
    {
      title: 'Автопарк',
      value: equipment.length,
      sub: `${equipmentInWork} в работе`,
      icon: <Truck size={24}/>,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      id: 'equipment'
    },
    {
      title: 'Готово к работе',
      value: readyToWork.length,
      sub: 'Запчасти на складе',
      icon: <CheckCircle2 size={24}/>,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      id: 'maintenance',
      highlight: readyToWork.length > 0
    },
    {
      title: 'Ремонты',
      value: activeBreakdowns.length,
      sub: `${criticalBreakdowns.length} критических`,
      icon: <AlertTriangle size={24}/>,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      id: 'maintenance'
    },
    {
      title: 'Нужно ТО',
      value: overdueTO.length,
      sub: overdueTO.length > 0 ? 'Просрочено!' : 'Плановые',
      icon: <Wrench size={24}/>,
      color: overdueTO.length > 0 ? 'text-orange-600' : 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      id: 'calendar',
      highlight: overdueTO.length > 0
    },
  ];

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700">
      {/* Карточки статистики */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map(s => (
          <div
            key={s.title}
            onClick={() => onNavigate(s.id)}
            className={`p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg cursor-pointer hover:shadow-neo-inset transition-all group border border-white/5 flex flex-col items-center text-center ${s.highlight ? 'ring-2 ring-offset-2 ' + (s.color.replace('text-', 'ring-')) + ' animate-pulse' : ''}`}
          >
            <div className="p-3 rounded-xl shadow-neo bg-neo-bg w-fit mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <div className={s.color}>{React.cloneElement(s.icon, { size: 27 })}</div>
            </div>
            <h4 className="text-gray-800 dark:text-gray-100 text-xs font-bold uppercase mb-2 whitespace-nowrap">{s.title}</h4>
            <div className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 dark:text-gray-100 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">{s.value}</div>
            <p className={`text-xs md:text-sm font-bold ${s.highlight ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'} whitespace-nowrap`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Ряд 2: Топливо (3 плитки) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {/* Топливо за предыдущий месяц */}
        <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-white/5 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="p-3 rounded-xl shadow-neo bg-neo-bg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Fuel size={27} className="text-emerald-500"/>
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold uppercase text-gray-800 dark:text-gray-100 whitespace-nowrap">Топливо за прошлый месяц</h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 uppercase whitespace-nowrap">{new Date(currentYear, prevMonth, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-emerald-700 dark:text-emerald-400 mb-4 whitespace-nowrap overflow-hidden text-ellipsis">{formatMoney(fuelCostPrevMonth)}</div>
          <div className="space-y-2 md:space-y-3 w-full">
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm font-medium uppercase text-gray-600 dark:text-gray-300 whitespace-nowrap">Заправок</span>
              <span className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">{fuelPrevMonth.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm font-medium uppercase text-gray-600 dark:text-gray-300 whitespace-nowrap">Объем</span>
              <span className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">{fuelPrevMonth.reduce((s, f) => s + f.quantity, 0)} л</span>
            </div>
          </div>
        </div>

        {/* Топливо за текущий месяц */}
        <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-white/5 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="p-3 rounded-xl shadow-neo bg-neo-bg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Fuel size={27} className="text-emerald-500"/>
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold uppercase text-gray-800 dark:text-gray-100 whitespace-nowrap">Топливо за месяц</h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 uppercase whitespace-nowrap">{new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-emerald-700 dark:text-emerald-400 mb-4 whitespace-nowrap overflow-hidden text-ellipsis">{formatMoney(fuelCostThisMonth)}</div>
          <div className="space-y-2 md:space-y-3 w-full">
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm font-medium uppercase text-gray-600 dark:text-gray-300 whitespace-nowrap">Заправок</span>
              <span className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">{fuelThisMonth.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm font-medium uppercase text-gray-600 dark:text-gray-300 whitespace-nowrap">Объем</span>
              <span className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">{fuelThisMonth.reduce((s, f) => s + f.quantity, 0)} л</span>
            </div>
          </div>
        </div>

        {/* Топливо за весь период */}
        <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-white/5 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="p-3 rounded-xl shadow-neo bg-neo-bg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Fuel size={27} className="text-emerald-500"/>
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold uppercase text-gray-800 dark:text-gray-100 whitespace-nowrap">Топливо за весь период</h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 uppercase whitespace-nowrap">Всего</p>
            </div>
          </div>
          <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-emerald-700 dark:text-emerald-400 mb-4 whitespace-nowrap overflow-hidden text-ellipsis">{formatMoney(fuelAllTime)}</div>
          <div className="space-y-2 md:space-y-3 w-full">
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm font-medium uppercase text-gray-600 dark:text-gray-300 whitespace-nowrap">Заправок</span>
              <span className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">{fuelRecords.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm font-medium uppercase text-gray-600 dark:text-gray-300 whitespace-nowrap">Объем</span>
              <span className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">{fuelRecords.reduce((s, f) => s + f.quantity, 0)} л</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ряд 3: Снабжение (3 плитки) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {/* Заявки за месяц */}
        <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-white/5 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="p-3 rounded-xl shadow-neo bg-neo-bg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Package size={27} className="text-blue-500"/>
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold uppercase text-gray-800 dark:text-gray-100 whitespace-nowrap">Заявок за месяц</h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 uppercase whitespace-nowrap">Поступило</p>
            </div>
          </div>
          <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-blue-700 dark:text-blue-400 mb-4 whitespace-nowrap overflow-hidden text-ellipsis">{requestsThisMonthCount}</div>
          <div className="space-y-2 md:space-y-3 w-full">
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm font-medium uppercase text-gray-600 dark:text-gray-300 whitespace-nowrap">Всего заявок</span>
              <span className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">{requests.length}</span>
            </div>
          </div>
        </div>

        {/* Оплачено заявок */}
        <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-white/5 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="p-3 rounded-xl shadow-neo bg-neo-bg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <span className="text-[27px] font-bold text-blue-500">₽</span>
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold uppercase text-gray-800 dark:text-gray-100 whitespace-nowrap">Оплачено заявок</h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 uppercase whitespace-nowrap">Ожидание доставки</p>
            </div>
          </div>
          <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-blue-700 dark:text-blue-400 mb-4 whitespace-nowrap overflow-hidden text-ellipsis">{formatMoney(requestsPaidAmount)}</div>
          <div className="space-y-2 md:space-y-3 w-full">
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm font-medium uppercase text-gray-600 dark:text-gray-300 whitespace-nowrap">Заявок</span>
              <span className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">{requestsPaid.length}</span>
            </div>
          </div>
        </div>

        {/* Поступило на склад */}
        <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-white/5 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="p-3 rounded-xl shadow-neo bg-neo-bg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <Package size={27} className="text-indigo-500"/>
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold uppercase text-gray-800 dark:text-gray-100 whitespace-nowrap">Поступило на склад</h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 uppercase whitespace-nowrap">Готово к выдаче</p>
            </div>
          </div>
          <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-indigo-700 dark:text-indigo-400 mb-4 whitespace-nowrap overflow-hidden text-ellipsis">{formatMoney(requestsInWarehouseAmount)}</div>
          <div className="space-y-2 md:space-y-3 w-full">
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm font-medium uppercase text-gray-600 dark:text-gray-300 whitespace-nowrap">Заявок</span>
              <span className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">{requestsInWarehouse.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ряд 4: Поломки (3 плитки) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {/* Акты за месяц */}
        <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-white/5 flex flex-col items-center text-center">
          <div className="flex justify-between items-center mb-6 w-full">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl shadow-neo bg-neo-bg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <AlertTriangle size={27} className="text-red-500"/>
              </div>
              <div className="text-left">
                <h3 className="text-sm md:text-base font-semibold uppercase text-gray-800 dark:text-gray-100 whitespace-nowrap">Акты поломок</h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 uppercase whitespace-nowrap">За этот месяц</p>
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-red-700 dark:text-red-400 whitespace-nowrap">{breakdownsThisMonth.length}</div>
          </div>
          <div className="space-y-2 md:space-y-3 w-full">
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm font-medium uppercase text-gray-600 dark:text-gray-300 whitespace-nowrap">Критические</span>
              <span className="text-sm md:text-lg font-bold text-red-700 dark:text-red-400 whitespace-nowrap ml-4">{breakdownsThisMonth.filter(b => b.severity === 'Критическая').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm font-medium uppercase text-gray-600 dark:text-gray-300 whitespace-nowrap">Средние</span>
              <span className="text-sm md:text-lg font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap ml-4">{breakdownsThisMonth.filter(b => b.severity === 'Средняя').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm font-medium uppercase text-gray-600 dark:text-gray-300 whitespace-nowrap">Низкие</span>
              <span className="text-sm md:text-lg font-bold text-yellow-600 dark:text-yellow-400 whitespace-nowrap ml-4">{breakdownsThisMonth.filter(b => b.severity === 'Низкая').length}</span>
            </div>
          </div>
        </div>

        {/* Частые поломки */}
        <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-white/5 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl shadow-neo bg-neo-bg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <TrendingUp size={27} className="text-orange-500"/>
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold uppercase text-gray-800 dark:text-gray-100 whitespace-nowrap">Частые поломки</h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 uppercase whitespace-nowrap">Топ-5 за месяц</p>
            </div>
          </div>
          <div className="space-y-2 md:space-y-3 w-full">
            {breakdownsByEquipment.filter(b => b.breakdowns > 0).map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 md:p-4 rounded-xl bg-neo-bg">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className={`w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-xs md:text-sm font-bold whitespace-nowrap ${
                    idx === 0 ? 'bg-red-500 text-white' :
                    idx === 1 ? 'bg-orange-500 text-white' :
                    idx === 2 ? 'bg-yellow-500 text-white' :
                    'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">{item.equipment.name}</p>
                    <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{item.equipment.vin}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm md:text-lg font-bold text-red-700 dark:text-red-400 whitespace-nowrap ml-4">{item.breakdowns}</p>
                  <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap ml-2">поломок</p>
                </div>
              </div>
            ))}
            {breakdownsByEquipment.filter(b => b.breakdowns > 0).length === 0 && (
              <p className="text-center py-8 md:py-10 text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">Поломок за месяц не было</p>
            )}
          </div>
        </div>

        {/* Поломки за весь период */}
        <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-white/5 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl shadow-neo bg-neo-bg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <AlertTriangle size={27} className="text-red-500"/>
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold uppercase text-gray-800 dark:text-gray-100 whitespace-nowrap">Поломок за весь период</h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 uppercase whitespace-nowrap">Всего</p>
            </div>
          </div>
          <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-red-700 dark:text-red-400 mb-4 whitespace-nowrap overflow-hidden text-ellipsis">{breakdownsAllTime}</div>
          <div className="space-y-2 md:space-y-3 w-full">
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm font-medium uppercase text-gray-600 dark:text-gray-300 whitespace-nowrap">Критические</span>
              <span className="text-sm md:text-lg font-bold text-red-700 dark:text-red-400 whitespace-nowrap ml-4">{breakdowns.filter(b => b.severity === 'Критическая').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm font-medium uppercase text-gray-600 dark:text-gray-300 whitespace-nowrap">Средние</span>
              <span className="text-sm md:text-lg font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap ml-4">{breakdowns.filter(b => b.severity === 'Средняя').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm font-medium uppercase text-gray-600 dark:text-gray-300 whitespace-nowrap">Низкие</span>
              <span className="text-sm md:text-lg font-bold text-yellow-600 dark:text-yellow-400 whitespace-nowrap ml-4">{breakdowns.filter(b => b.severity === 'Низкая').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Живая лента событий */}
      <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-white/5">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-neo bg-neo-bg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <History size={27} className="text-orange-500"/>
            </div>
            <div>
              <h3 className="text-sm md:text-base font-semibold uppercase text-gray-800 dark:text-gray-200 whitespace-nowrap">Живая лента</h3>
              <p className="text-[9px] md:text-[10px] text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">Последние события</p>
            </div>
          </div>
          <button onClick={() => onNavigate('maintenance')} className="text-[9px] md:text-[10px] font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 uppercase flex items-center gap-1 whitespace-nowrap">
            Весь журнал <ChevronRight size={14}/>
          </button>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-2">
          {(() => {
            const allEvents = [
              ...breakdowns.map(b => ({ type: 'breakdown' as const, data: b, date: new Date(b.date).getTime() })),
              ...records.map(r => ({ type: 'record' as const, data: r, date: new Date(r.date).getTime() }))
            ].sort((a, b) => b.date - a.date).slice(0, 12);

            if (allEvents.length === 0) {
              return <p className="text-center py-10 text-[9px] font-black text-gray-400 uppercase">Событий нет</p>;
            }

            return allEvents.map((item) => {
              if (item.type === 'breakdown') {
                const b = item.data as any;
                const req = requests.find(r => r.breakdownId === b.id);
                const equip = equipment.find(e=>e.id===b.equipmentId);
                return (
                  <div
                    key={`b-${b.id}`}
                    className="p-3 rounded-xl shadow-[inset_3px_3px_6px_rgba(0,0,0,0.05),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),inset_-3px_-3px_6px_rgba(60,75,95,0.2)] bg-neo-bg border-l-4 border-red-500 flex justify-between items-center group hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,1)] dark:hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.4),inset_-4px_-4px_8px_rgba(60,75,95,0.25)] hover:cursor-pointer transition-all"
                  >
                    <div className="overflow-hidden flex-1">
                      <p className="text-[11px] md:text-[12px] font-black uppercase text-gray-800 dark:text-gray-100 truncate">{b.partName || 'Поломка'}</p>
                      <p className="text-[9px] md:text-[10px] font-bold text-gray-600 dark:text-gray-300 truncate">{equip?.name || 'Техника'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                      <span className="text-[8px] md:text-[9px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(b.date)}</span>
                      {req && (
                        <span className={`text-[8px] md:text-[9px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${
                          req.status === 'На складе' ? 'bg-emerald-500 text-white' :
                          req.status === 'В пути' ? 'bg-indigo-500 text-white' :
                          req.status === 'Оплачено' ? 'bg-orange-500 text-white' :
                          req.status === 'Поиск' ? 'bg-blue-500 text-white' :
                          'bg-purple-500 text-white'
                        }`}>{req.status}</span>
                      )}
                    </div>
                  </div>
                );
              } else {
                const r = item.data;
                const recordType = 'type' in r ? r.type : '';
                const equip = equipment.find(e=>e.id===r.equipmentId);
                const isBreakdownRecord = recordType.toLowerCase().includes('поломк') || recordType.toLowerCase().includes('неисправност') || recordType.toLowerCase().includes('акт');
                return (
                  <div
                    key={`r-${r.id}`}
                    className="p-3 rounded-xl shadow-[inset_3px_3px_6px_rgba(0,0,0,0.05),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),inset_-3px_-3px_6px_rgba(60,75,95,0.2)] bg-neo-bg border-l-4 border-emerald-500 flex justify-between items-center group hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,1)] dark:hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.4),inset_-4px_-4px_8px_rgba(60,75,95,0.25)] hover:cursor-pointer transition-all"
                  >
                    <div className="overflow-hidden flex-1">
                      <p className="text-[11px] md:text-[12px] font-black uppercase text-gray-800 dark:text-gray-100 truncate">{recordType}</p>
                      <p className="text-[9px] md:text-[10px] font-bold text-gray-600 dark:text-gray-300 truncate">{equip?.name || 'Техника'}</p>
                    </div>
                    <div className="shrink-0 ml-4">
                      <span className="text-[8px] md:text-[9px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(r.date)}</span>
                    </div>
                  </div>
                );
              }
            });
          })()}
        </div>
      </div>
    </div>
  );
};

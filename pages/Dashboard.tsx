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
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const breakdownsThisMonth = breakdowns.filter(b => {
    const date = new Date(b.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  
  const fuelThisMonth = fuelRecords.filter(f => {
    const date = new Date(f.date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  
  const fuelCostThisMonth = fuelThisMonth.reduce((sum, f) => sum + f.totalCost, 0);
  
  const requestsPaid = requests.filter(r => r.status === 'Оплачено');
  const requestsPaidAmount = requestsPaid.reduce((sum, r) => sum + (r.cost || 0), 0);
  
  const requestsInWarehouse = requests.filter(r => r.status === 'На складе');
  const requestsInWarehouseAmount = requestsInWarehouse.reduce((sum, r) => sum + (r.cost || 0), 0);
  
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
      sub: `${equipment.filter(e => e.status === 'В работе').length} в работе`,
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
            className={`p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg cursor-pointer hover:shadow-neo-inset transition-all group border border-white/5 ${s.highlight ? 'ring-2 ring-offset-2 ' + (s.color.replace('text-', 'ring-')) + ' animate-pulse' : ''}`}
          >
            <div className={`p-4 rounded-2xl w-fit mb-4 md:mb-6 ${s.bgColor} group-hover:scale-110 transition-transform`}>
              <div className={s.color}>{s.icon}</div>
            </div>
            <h4 className="text-gray-700 dark:text-gray-200 text-[11px] font-semibold uppercase tracking-wide mb-1">{s.title}</h4>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{s.value}</div>
            <p className={`text-[9px] md:text-[10px] font-medium mt-2 ${s.highlight ? 'text-red-700 dark:text-red-400 font-semibold' : 'text-gray-600 dark:text-gray-300'}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Финансы и статистика за месяц */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Топливо */}
        <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              <Fuel size={24}/>
            </div>
            <div>
              <h3 className="text-base font-semibold uppercase text-gray-800 dark:text-gray-100">Топливо за месяц</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 uppercase">{new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400 mb-4">{formatMoney(fuelCostThisMonth)}</div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium uppercase text-gray-600 dark:text-gray-300">Заправок</span>
              <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{fuelThisMonth.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium uppercase text-gray-600 dark:text-gray-300">Объем</span>
              <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{fuelThisMonth.reduce((s, f) => s + f.quantity, 0)} л</span>
            </div>
          </div>
        </div>

        {/* Оплачено */}
        <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
              <DollarSign size={24}/>
            </div>
            <div>
              <h3 className="text-base font-semibold uppercase text-gray-800 dark:text-gray-100">Оплачено заявок</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 uppercase">Ожидание доставки</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-700 dark:text-blue-400 mb-4">{formatMoney(requestsPaidAmount)}</div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium uppercase text-gray-600 dark:text-gray-300">Заявок</span>
              <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{requestsPaid.length}</span>
            </div>
          </div>
        </div>

        {/* На складе */}
        <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
              <Package size={24}/>
            </div>
            <div>
              <h3 className="text-base font-semibold uppercase text-gray-800 dark:text-gray-100">Поступило на склад</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 uppercase">Готово к выдаче</p>
            </div>
          </div>
          <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-400 mb-4">{formatMoney(requestsInWarehouseAmount)}</div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium uppercase text-gray-600 dark:text-gray-300">Заявок</span>
              <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{requestsInWarehouse.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Акты за месяц */}
        <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-white/5">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                <AlertTriangle size={24}/>
              </div>
              <div>
                <h3 className="text-base font-semibold uppercase text-gray-800 dark:text-gray-100">Акты поломок</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 uppercase">За этот месяц</p>
              </div>
            </div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{breakdownsThisMonth.length}</div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium uppercase text-gray-600 dark:text-gray-300">Критические</span>
              <span className="text-lg font-bold text-red-700 dark:text-red-400">{breakdownsThisMonth.filter(b => b.severity === 'Критическая').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium uppercase text-gray-600 dark:text-gray-300">Средние</span>
              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{breakdownsThisMonth.filter(b => b.severity === 'Средняя').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium uppercase text-gray-600 dark:text-gray-300">Низкие</span>
              <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{breakdownsThisMonth.filter(b => b.severity === 'Низкая').length}</span>
            </div>
          </div>
        </div>

        {/* Самая ломающаяся техника */}
        <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
              <TrendingUp size={24}/>
            </div>
            <div>
              <h3 className="text-base font-semibold uppercase text-gray-800 dark:text-gray-100">Частые поломки</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 uppercase">Топ-5 за месяц</p>
            </div>
          </div>
          <div className="space-y-3">
            {breakdownsByEquipment.filter(b => b.breakdowns > 0).map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    idx === 0 ? 'bg-red-500 text-white' :
                    idx === 1 ? 'bg-orange-500 text-white' :
                    idx === 2 ? 'bg-yellow-500 text-white' :
                    'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{item.equipment.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.equipment.vin}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-700 dark:text-red-400">{item.breakdowns}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">поломок</p>
                </div>
              </div>
            ))}
            {breakdownsByEquipment.filter(b => b.breakdowns > 0).length === 0 && (
              <p className="text-center py-10 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">Поломок за месяц не было</p>
            )}
          </div>
        </div>
      </div>

      {/* Живая лента событий */}
      <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-white/5">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
              <History size={24}/>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase text-gray-800 dark:text-gray-200">Живая лента</h3>
              <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase">Последние события</p>
            </div>
          </div>
          <button onClick={() => onNavigate('maintenance')} className="text-[9px] font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 uppercase flex items-center gap-1">
            Весь журнал <ChevronRight size={14}/>
          </button>
        </div>
        <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
          {(() => {
            const allEvents = [
              ...breakdowns.map(b => ({ type: 'breakdown' as const, data: b, date: new Date(b.date).getTime() })),
              ...records.map(r => ({ type: 'record' as const, data: r, date: new Date(r.date).getTime() }))
            ].sort((a, b) => b.date - a.date).slice(0, 8);

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
                    className="p-4 rounded-2xl shadow-neo-sm bg-neo-bg border-l-4 border-red-500 flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="overflow-hidden flex-1">
                        <p className="text-[10px] font-black uppercase text-gray-700 truncate">{b.partName || 'Поломка'}</p>
                        <p className="text-[8px] font-bold text-gray-400 truncate">{equip?.name || 'Техника'}</p>
                      </div>
                      <span className="text-[7px] text-gray-400">{formatDate(b.date)}</span>
                    </div>
                    {req && (
                      <div className="flex items-center gap-2">
                        <Package size={10} className="text-blue-500"/>
                        <span className="text-[7px] font-black text-blue-400 uppercase">{req.status}</span>
                      </div>
                    )}
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
                    className="p-4 rounded-2xl shadow-neo-sm bg-neo-bg border-l-4 border-emerald-500 flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="overflow-hidden flex-1">
                        <p className="text-[10px] font-black uppercase text-gray-700 truncate">{recordType}</p>
                        <p className="text-[8px] font-bold text-gray-400 truncate">{equip?.name || 'Техника'}</p>
                      </div>
                      <span className="text-[7px] text-gray-400">{formatDate(r.date)}</span>
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

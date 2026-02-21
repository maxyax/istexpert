
import React from 'react';
import {
  Truck, AlertTriangle, Clock, Activity, History,
  ChevronRight, Fuel, TrendingUp, CheckCircle2, Wrench, Package, Calendar
} from 'lucide-react';
import { useFleetStore } from '../store/useFleetStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useProcurementStore } from '../store/useProcurementStore';
import { EquipStatus } from '../types';
import { formatDate } from '../utils/format';

const computeEquipmentStatus = (equipmentId: string, breakdowns: any[], plannedTOs: any[], equipment: any[]) => {
  const activeBreakdowns = breakdowns.filter(b => b.equipmentId === equipmentId && b.status !== 'Исправлено');
  const equip = equipment.find(e => e.id === equipmentId);

  // 1. Критические поломки
  const criticalBreakdowns = activeBreakdowns.filter(b => b.severity === 'Критическая');
  if (criticalBreakdowns.length > 0) return EquipStatus.REPAIR;

  // 2. Поломки в работе
  const inWorkBreakdowns = activeBreakdowns.filter(b => b.status === 'В работе');
  if (inWorkBreakdowns.length > 0) return EquipStatus.REPAIR;

  // 3. Ожидание запчастей
  const waitingForParts = activeBreakdowns.filter(b => b.status === 'Запчасти заказаны' || b.status === 'Запчасти получены');
  if (waitingForParts.length > 0) return EquipStatus.WAITING_PARTS;

  // 4. Неисправности (низкая/средняя)
  const minorBreakdowns = activeBreakdowns.filter(b =>
    (b.severity === 'Низкая' || b.severity === 'Средняя') && b.status === 'Новая'
  );
  if (minorBreakdowns.length > 0) return EquipStatus.ACTIVE_WITH_RESTRICTIONS;

  // 5. Просроченное ТО
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overduePlannedTO = plannedTOs.filter(t => {
    if (t.equipmentId !== equipmentId || t.status !== 'planned') return false;
    const plannedDate = new Date(t.date);
    plannedDate.setHours(0, 0, 0, 0);
    return plannedDate < today;
  });
  if (overduePlannedTO.length > 0) return EquipStatus.MAINTENANCE;

  // 6. Плановое ТО
  const upcomingPlannedTO = plannedTOs.filter(t => t.equipmentId === equipmentId && t.status === 'planned');
  if (upcomingPlannedTO.length > 0) return EquipStatus.MAINTENANCE;

  return EquipStatus.ACTIVE;
};

export const Dashboard: React.FC<any> = ({ onNavigate }) => {
  const { equipment } = useFleetStore();
  const { breakdowns, records, fuelRecords, plannedTOs } = useMaintenanceStore();
  const { requests } = useProcurementStore();

  // Подсчет статистики
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
  const activeProcurement = requests.filter(r => r.status !== 'На складе');

  const stats = [
    {
      title: 'Автопарк',
      value: equipment.length,
      sub: `${equipment.filter(e => computeEquipmentStatus(e.id, breakdowns, plannedTOs, equipment) === EquipStatus.ACTIVE).length} в работе`,
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
            <div className={`p-4 rounded-2xl shadow-neo w-fit mb-4 md:mb-6 ${s.color} ${s.bgColor} group-hover:scale-110 transition-transform`}>{s.icon}</div>
            <h4 className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">{s.title}</h4>
            <div className="text-2xl md:text-3xl font-black tracking-tighter text-gray-800 dark:text-gray-100">{s.value}</div>
            <p className={`text-[9px] md:text-[10px] font-bold mt-2 uppercase ${s.highlight ? 'text-red-600 font-black' : 'text-gray-500'}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* График наработки */}
        <div className="lg:col-span-8 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-neo bg-neo-bg border border-white/5 overflow-hidden">
           <div className="flex justify-between items-center mb-6 md:mb-10">
              <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} className="text-blue-500"/> Наработка парка (м/ч)
              </h3>
              <button onClick={() => onNavigate('equipment')} className="text-[8px] font-black text-blue-600 uppercase hover:underline flex items-center gap-1">
                Автопарк <ChevronRight size={12}/>
              </button>
           </div>
           <div className="h-48 md:h-64 flex items-end space-x-2 md:space-x-5 px-2">
              {equipment.slice(0, 12).map((e, i) => {
                const maxHours = Math.max(...equipment.map(eq => eq.hours));
                const height = maxHours > 0 ? (e.hours / maxHours) * 100 : 0;
                const status = computeEquipmentStatus(e.id, breakdowns, plannedTOs, equipment);
                return (
                  <div key={e.id} className="flex-1 bg-gray-100 dark:bg-gray-800/50 rounded-t-xl md:rounded-t-2xl relative group">
                     <div
                      style={{ height: `${height}%` }}
                      className={`absolute bottom-0 w-full rounded-t-xl md:rounded-t-2xl group-hover:opacity-80 transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)] ${
                        status === EquipStatus.REPAIR ? 'bg-red-500' :
                        status === EquipStatus.MAINTENANCE ? 'bg-orange-500' :
                        status === EquipStatus.WAITING_PARTS ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}
                     />
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-neo-bg shadow-neo px-2 py-1 rounded-lg border border-white/10 pointer-events-none whitespace-nowrap z-10">
                       <p className="text-[8px] font-black text-gray-400 uppercase">{e.name}</p>
                       <p className="text-[9px] font-black text-gray-700">{e.hours} м/ч</p>
                     </div>
                  </div>
                );
              })}
           </div>
           <div className="flex justify-between mt-4 text-[7px] font-black text-gray-400 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"/> В работе
                <span className="w-2 h-2 rounded-full bg-red-500"/> Ремонт
                <span className="w-2 h-2 rounded-full bg-orange-500"/> ТО
                <span className="w-2 h-2 rounded-full bg-yellow-500"/> Ожидание
              </div>
           </div>
        </div>

        {/* Живая лента событий */}
        <div className="lg:col-span-4 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-neo bg-neo-bg border border-white/5">
           <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-6 md:mb-10 flex items-center gap-2">
             <History size={16} className="text-orange-500"/> Живая лента
           </h3>
           <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
              {(() => {
                // Объединяем поломки и ТО, сортируем по дате
                const allEvents = [
                  ...breakdowns.map(b => ({ type: 'breakdown' as const, data: b, date: new Date(b.date).getTime() })),
                  ...records.map(r => ({ type: 'record' as const, data: r, date: new Date(r.date).getTime() }))
                ].sort((a, b) => b.date - a.date).slice(0, 6);

                if (allEvents.length === 0) {
                  return <p className="text-center py-10 text-[10px] font-black text-gray-400 uppercase">Событий нет</p>;
                }

                return allEvents.map((item) => {
                  if (item.type === 'breakdown') {
                    const b = item.data as any;
                    const req = requests.find(r => r.breakdownId === b.id);
                    const status = b.status || '';
                    const equip = equipment.find(e=>e.id===b.equipmentId);
                    
                    return (
                      <div
                        key={`b-${b.id}`}
                        className={`p-4 rounded-2xl shadow-neo-sm bg-neo-bg border-l-4 ${
                          status === 'Исправлено' ? 'border-emerald-500' :
                          status === 'Запчасти получены' ? 'border-emerald-500' :
                          status === 'Запчасти заказаны' ? 'border-yellow-400' :
                          status === 'В работе' ? 'border-blue-500' :
                          'border-red-500'
                        } flex flex-col gap-2 group cursor-pointer hover:shadow-neo transition-all`}
                        onClick={() => onNavigate('maintenance')}
                      >
                         <div className="flex justify-between items-start">
                            <div className="overflow-hidden flex-1">
                               <p className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-200 truncate">{b.partName || 'Поломка'}</p>
                               <p className="text-[8px] font-bold text-gray-400 uppercase truncate">{equip?.name || 'Техника'}</p>
                            </div>
                            <ChevronRight size={14} className="text-gray-300 group-hover:text-red-500 shrink-0" />
                         </div>
                         <div className="flex justify-between items-center">
                           <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded ${
                             status === 'Исправлено' ? 'bg-emerald-500 text-white' :
                             status === 'В работе' ? 'bg-blue-500 text-white' :
                             status === 'Запчасти заказаны' ? 'bg-yellow-500 text-white' :
                             'bg-red-500 text-white'
                           }`}>{status}</span>
                           <span className="text-[7px] text-gray-400">{formatDate(b.date)}</span>
                         </div>
                         {req && (
                           <div className="flex items-center gap-1 mt-1">
                             <Package size={10} className="text-blue-500"/>
                             <span className="text-[7px] font-black text-blue-400 uppercase">{req.status}</span>
                           </div>
                         )}
                      </div>
                    );
                  } else {
                    const r = item.data;
                    const recordType = 'type' in r ? r.type : '';
                    const performedBy = 'performedBy' in r ? r.performedBy : '';
                    const isBreakdownRecord = recordType.toLowerCase().includes('поломк') || recordType.toLowerCase().includes('неисправност') || recordType.toLowerCase().includes('акт');
                    const equip = equipment.find(e=>e.id===r.equipmentId);
                    
                    return (
                      <div
                        key={`r-${r.id}`}
                        className={`p-4 rounded-2xl shadow-neo-sm bg-neo-bg border-l-4 ${isBreakdownRecord ? 'border-red-500' : 'border-emerald-500'} flex flex-col gap-2 group cursor-pointer hover:shadow-neo transition-all`}
                        onClick={() => onNavigate('maintenance')}
                      >
                         <div className="flex justify-between items-start">
                            <div className="overflow-hidden flex-1">
                               <p className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-200 truncate">{recordType}</p>
                               <p className="text-[8px] font-bold text-gray-400 uppercase truncate">{equip?.name || 'Техника'}</p>
                            </div>
                            <ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-500 shrink-0" />
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-[7px] font-bold text-gray-500 uppercase">{performedBy}</span>
                           <span className="text-[7px] text-gray-400">{formatDate(r.date)}</span>
                         </div>
                      </div>
                    );
                  }
                });
              })()}
           </div>
           <button onClick={() => onNavigate('maintenance')} className="w-full mt-6 md:mt-8 py-4 rounded-2xl shadow-neo text-[10px] font-black uppercase text-blue-500 hover:shadow-neo-inset transition-all tracking-widest border border-blue-500/10 bg-neo-bg active:scale-95">Весь журнал</button>
        </div>
      </div>

      {/* Дополнительные виджеты */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Просроченное ТО */}
        {overdueTO.length > 0 && (
          <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-orange-500/30">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] md:text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle size={16}/> Просроченное ТО
              </h3>
              <button onClick={() => onNavigate('calendar')} className="text-[8px] font-black text-blue-600 uppercase hover:underline">Календарь</button>
            </div>
            <div className="space-y-3">
              {overdueTO.slice(0, 3).map(to => {
                const equip = equipment.find(e => e.id === to.equipmentId);
                const daysOverdue = Math.floor((new Date().getTime() - new Date(to.date).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={to.id} className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black text-orange-600 uppercase">{to.type}</p>
                      <p className="text-[8px] font-bold text-gray-500">{equip?.name || 'Техника'}</p>
                    </div>
                    <span className="text-[8px] font-black text-orange-600 bg-orange-500/20 px-2 py-1 rounded">
                      {daysOverdue} дн.
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Активные заявки снабжения */}
        {activeProcurement.length > 0 && (
          <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-blue-500/30">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] md:text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                <Package size={16}/> Заявки в работе
              </h3>
              <button onClick={() => onNavigate('procurement')} className="text-[8px] font-black text-blue-600 uppercase hover:underline">Снабжение</button>
            </div>
            <div className="space-y-3">
              {activeProcurement.slice(0, 3).map(req => {
                const equip = equipment.find(e => e.id === req.equipmentId);
                return (
                  <div key={req.id} className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex justify-between items-center">
                    <div className="overflow-hidden flex-1">
                      <p className="text-[9px] font-black text-blue-600 uppercase truncate">{req.title}</p>
                      <p className="text-[8px] font-bold text-gray-500">{equip?.name || 'Техника'}</p>
                    </div>
                    <span className={`text-[7px] font-black uppercase px-2 py-1 rounded ${
                      req.status === 'На складе' ? 'bg-indigo-500 text-white' :
                      req.status === 'В пути' ? 'bg-orange-500 text-white' :
                      req.status === 'Оплачено' ? 'bg-emerald-500 text-white' :
                      'bg-blue-500 text-white'
                    }`}>{req.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

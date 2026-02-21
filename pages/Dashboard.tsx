
import React from 'react';
import { 
  Truck, AlertTriangle, Clock, Activity, History, 
  ChevronRight, Fuel, TrendingUp
} from 'lucide-react';
import { useFleetStore } from '../store/useFleetStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { EquipStatus } from '../types';

const computeEquipmentStatus = (equipmentId: string, breakdowns: any[], plannedTOs: any[]) => {
  const activeBreakdowns = breakdowns.filter(b => b.equipmentId === equipmentId && b.status !== 'Исправлено');
  
  if (activeBreakdowns.length === 0) {
    const plannedTO = plannedTOs.filter(t => t.equipmentId === equipmentId && t.status === 'planned');
    if (plannedTO.length > 0) return EquipStatus.MAINTENANCE;
    return EquipStatus.ACTIVE;
  }
  
  const criticalBreakdowns = activeBreakdowns.filter(b => b.severity === 'Критическая');
  if (criticalBreakdowns.length > 0) return EquipStatus.REPAIR;
  
  const waitingForParts = activeBreakdowns.filter(b => b.status === 'Запчасти заказаны' || b.status === 'Запчасти получены');
  if (waitingForParts.length > 0) return EquipStatus.WAITING_PARTS;
  
  const inWork = activeBreakdowns.filter(b => b.status === 'В работе');
  if (inWork.length > 0) return EquipStatus.REPAIR;
  
  return EquipStatus.ACTIVE;
};

export const Dashboard: React.FC<any> = ({ onNavigate }) => {
  const { equipment } = useFleetStore();
  const { breakdowns, records, fuelRecords, plannedTOs } = useMaintenanceStore();

  const stats = [
    { 
      title: 'Автопарк', 
      value: equipment.length, 
      sub: `${equipment.filter(e => e.status === EquipStatus.ACTIVE).length} в работе`, 
      icon: <Truck size={24}/>, 
      color: 'text-blue-500', 
      id: 'equipment'
    },
    { 
      title: 'Нужно ТО', 
      value: 2, 
      sub: 'Плановые работы', 
      icon: <Clock size={24}/>, 
      color: 'text-orange-500', 
      id: 'maintenance'
    },
    { 
      title: 'Ремонты', 
      value: breakdowns.filter(b => b.status !== 'Исправлено').length, 
      sub: 'Активные поломки', 
      icon: <AlertTriangle size={24}/>, 
      color: 'text-red-500', 
      id: 'maintenance'
    },
    { 
      title: 'Топливо', 
      value: `${fuelRecords.reduce((acc, r) => acc + r.quantity, 0)} л`, 
      sub: 'За 30 дней', 
      icon: <Fuel size={24}/>, 
      color: 'text-emerald-500', 
      id: 'fuel'
    },
  ];

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map(s => (
          <div 
            key={s.title} 
            onClick={() => onNavigate(s.id)} 
            className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg cursor-pointer hover:shadow-neo-inset transition-all group border border-white/5"
          >
            <div className={`p-4 rounded-2xl shadow-neo w-fit mb-4 md:mb-6 ${s.color} group-hover:scale-110 transition-transform`}>{s.icon}</div>
            <h4 className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">{s.title}</h4>
            <div className="text-2xl md:text-3xl font-black tracking-tighter text-gray-800 dark:text-gray-100">{s.value}</div>
            <p className="text-[9px] md:text-[10px] font-bold text-gray-500 mt-2 uppercase">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-8 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-neo bg-neo-bg border border-white/5 overflow-hidden">
           <div className="flex justify-between items-center mb-6 md:mb-10">
              <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} className="text-blue-500"/> Наработка парка (м/ч)
              </h3>
           </div>
           <div className="h-48 md:h-64 flex items-end space-x-2 md:space-x-5 px-2">
              {[45, 60, 35, 90, 75, 40, 95, 80, 50, 70, 85, 60].map((h, i) => (
                <div key={i} className="flex-1 bg-gray-100 dark:bg-gray-800/50 rounded-t-xl md:rounded-t-2xl relative group">
                   <div 
                    style={{ height: `${h}%` }} 
                    className="absolute bottom-0 w-full bg-blue-500/30 rounded-t-xl md:rounded-t-2xl group-hover:bg-blue-500 transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                   />
                </div>
              ))}
           </div>
        </div>

        <div className="lg:col-span-4 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-neo bg-neo-bg border border-white/5">
           <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-6 md:mb-10 flex items-center gap-2">
             <History size={16} className="text-orange-500"/> Живая лента
           </h3>
           <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar pr-2">
              {(breakdowns.length > 0 || records.length > 0) ? [
                ...breakdowns.slice(0, 4).map(b => ({ type: 'breakdown', data: b })),
                ...records.slice(0, 4).map(r => ({ type: 'record', data: r }))
              ].sort((a, b) => {
                const aDate = a.type === 'breakdown' ? new Date(a.data.date).getTime() : new Date(a.data.date).getTime();
                const bDate = b.type === 'breakdown' ? new Date(b.data.date).getTime() : new Date(b.data.date).getTime();
                return bDate - aDate;
              }).slice(0, 4).map((item, i) => {
                if (item.type === 'breakdown') {
                  const b = item.data as any;
                  const partName = b.partName || '';
                  const status = b.status || '';
                  return (
                    <div key={`b-${b.id}`} className={`p-4 rounded-2xl shadow-neo-sm bg-neo-bg border-l-4 ${status === 'Исправлено' ? 'border-emerald-500' : status === 'Запчасти получены' ? 'border-emerald-500' : status === 'Запчасти заказаны' ? 'border-yellow-400' : status === 'В работе' ? 'border-blue-500' : 'border-red-500'} flex justify-between items-center group cursor-pointer hover:shadow-neo transition-all`}>
                       <div className="overflow-hidden">
                          <p className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-200 truncate">{partName}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase truncate">{status} • {equipment.find(e=>e.id===b.equipmentId)?.name}</p>
                       </div>
                       <ChevronRight size={14} className="text-gray-300 group-hover:text-red-500 shrink-0" />
                    </div>
                  );
                } else {
                  const r = item.data;
                  const recordType = 'type' in r ? r.type : '';
                  const performedBy = 'performedBy' in r ? r.performedBy : '';
                  const isBreakdownRecord = recordType.toLowerCase().includes('поломк') || recordType.toLowerCase().includes('неисправност') || recordType.toLowerCase().includes('акт');
                  return (
                    <div key={`r-${r.id}`} className={`p-4 rounded-2xl shadow-neo-sm bg-neo-bg border-l-4 ${isBreakdownRecord ? 'border-red-500' : 'border-emerald-500'} flex justify-between items-center group cursor-pointer hover:shadow-neo transition-all`}>
                       <div className="overflow-hidden">
                          <p className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-200 truncate">{recordType}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase truncate">{performedBy} • {equipment.find(e=>e.id===r.equipmentId)?.name}</p>
                       </div>
                       <ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-500 shrink-0" />
                    </div>
                  );
                }
              }) : (
                <p className="text-center py-10 text-[10px] font-black text-gray-400 uppercase">Событий нет</p>
              )}
           </div>
           <button onClick={() => onNavigate('maintenance')} className="w-full mt-6 md:mt-8 py-4 rounded-2xl shadow-neo text-[10px] font-black uppercase text-blue-500 hover:shadow-neo-inset transition-all tracking-widest border border-blue-500/10 bg-neo-bg active:scale-95">Весь журнал</button>
        </div>
      </div>
    </div>
  );
};

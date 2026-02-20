
import React from 'react';
import { Truck, Wrench, AlertTriangle, Clock, Activity, TrendingUp, History } from 'lucide-react';
import { useFleetStore } from './useFleetStore';
import { useMaintenanceStore } from './useMaintenanceStore';

export const Dashboard: React.FC<any> = ({ onNavigate }) => {
  const { equipment } = useFleetStore();
  const { breakdowns, records } = useMaintenanceStore();

  const stats = [
    { title: 'Автопарк', value: equipment.length, sub: 'Единиц техники', icon: <Truck />, color: 'text-blue-500', id: 'equipment' },
    { title: 'Нужно ТО', value: 1, sub: 'По регламенту', icon: <Clock />, color: 'text-orange-500', id: 'maintenance' },
    // Fixed comparison to match Russian BreakdownStatus
    { title: 'В ремонте', value: breakdowns.filter(b => b.status !== 'Исправлено').length, sub: 'Простой', icon: <AlertTriangle />, color: 'text-red-500', id: 'maintenance' },
    { title: 'Эффективность', value: '94%', sub: 'КПД парка', icon: <TrendingUp />, color: 'text-emerald-500', id: 'dashboard' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map(s => (
          <div key={s.title} onClick={() => onNavigate(s.id)} className="p-6 md:p-8 rounded-[2.5rem] shadow-neo bg-neo-bg cursor-pointer hover:shadow-neo-inset transition-all group text-center flex flex-col items-center justify-center">
            <div className={`p-4 rounded-2xl shadow-neo w-fit mb-6 ${s.color} group-hover:scale-110 transition-transform`}>{s.icon}</div>
            <h4 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{s.title}</h4>
            <div className="text-2xl md:text-4xl font-black tracking-tighter">{s.value}</div>
            <p className="text-[10px] font-bold text-gray-500 mt-2 uppercase">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-8 rounded-[3rem] shadow-neo bg-neo-bg">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-8 flex items-center gap-2"><Activity size={16} className="text-blue-500"/> График наработки</h3>
          <div className="h-64 flex items-end space-x-3">
             {[40, 70, 45, 90, 65, 80, 50, 85, 30, 60].map((h, i) => (
               <div key={i} className="flex-1 bg-blue-500/10 rounded-t-xl relative group shadow-neo-sm">
                  <div style={{ height: `${h}%` }} className="absolute bottom-0 w-full bg-blue-500/60 rounded-t-xl transition-all group-hover:bg-blue-500" />
               </div>
             ))}
          </div>
        </div>
        <div className="p-8 rounded-[3rem] shadow-neo bg-neo-bg">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-8 flex items-center gap-2"><History size={16} className="text-orange-500"/> Последние события</h3>
          <div className="space-y-4">
            {records.slice(0, 4).map((r, i) => (
              <div key={i} className="p-4 rounded-2xl shadow-neo-sm bg-neo-bg flex justify-between items-center border-l-4 border-emerald-500">
                <span className="text-[10px] font-black uppercase">{r.type}</span>
                <span className="text-[9px] font-bold text-gray-400">{r.date}</span>
              </div>
            ))}
            {/* Fixed comparison to match Russian BreakdownStatus */}
            {breakdowns.filter(b=>b.status!=='Исправлено').map((b, i) => (
              <div key={i} className="p-4 rounded-2xl shadow-neo-sm bg-neo-bg flex justify-between items-center border-l-4 border-red-500">
                <span className="text-[10px] font-black uppercase">{b.partName}</span>
                <span className="text-[9px] font-bold text-red-400">В РЕМОНТЕ</span>
              </div>
            ))}
            {records.length === 0 && breakdowns.length === 0 && <p className="text-center py-10 text-gray-400 text-[10px] font-black uppercase">Событий нет</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
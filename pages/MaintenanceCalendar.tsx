
import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';
import { useFleetStore } from '../store/useFleetStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useProcurementStore } from '../store/useProcurementStore';
import { Equipment, PlannedTOStatus, BreakdownStatus, BreakdownRecord } from '../types';

const statusColorMap: Record<BreakdownStatus, string> = {
  'Новая': 'bg-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.4)]',
  'Запчасти заказаны': 'bg-blue-500 text-white shadow-[0_0_8px_rgba(59,130,246,0.4)]',
  'Запчасти получены': 'bg-indigo-500 text-white shadow-[0_0_8px_rgba(99,102,241,0.4)]',
  'В работе': 'bg-orange-500 text-white shadow-[0_0_8px_rgba(249,115,22,0.4)]',
  'Исправлено': 'bg-green-500 text-white shadow-[0_0_8px_rgba(34,197,94,0.4)]',
};

export const MaintenanceCalendar: React.FC<{onNavigate?: (page: any) => void}> = ({ onNavigate }) => {
  const { equipment } = useFleetStore();
  const { plannedTOs, addPlannedTO, breakdowns, records, setSelectedMaintenanceEquipId } = useMaintenanceStore();
  const { requests } = useProcurementStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  const monthLabel = currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

  const getCalendarStatus = (b: BreakdownRecord): BreakdownStatus => {
    if (b.status === 'Запчасти заказаны') {
      const hasRequest = requests.some(r => r.breakdownId === b.id);
      return hasRequest ? 'Запчасти заказаны' : 'Новая';
    }
    return b.status;
  };

  const getDayEvents = (day: Date) => {
    const dayStr = day.toISOString().split('T')[0];
    const planned = plannedTOs.filter(t => t.date === dayStr && t.status === 'planned');
    const completed = plannedTOs.filter(t => t.date === dayStr && t.status === 'completed');
    const done = records.filter(r => r.date === dayStr);
    
    const activeBreakdowns = breakdowns.filter(b => {
      const bDate = b.date.split('T')[0];
      const fDate = b.fixedDate?.split('T')[0];
      if (b.severity === 'Низкая') return dayStr === bDate || (fDate && dayStr === fDate);
      if (fDate) return dayStr >= bDate && dayStr <= fDate;
      return dayStr >= bDate;
    });

    return { planned, completed, done, activeBreakdowns };
  };

  const handleEventClick = (equipmentId: string) => {
    setSelectedMaintenanceEquipId(equipmentId);
    if (onNavigate) onNavigate('maintenance');
  };

  return (
    <div className="space-y-4 md:space-y-6 h-full flex flex-col overflow-hidden px-1 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2 md:gap-4 justify-between sm:justify-start w-full sm:w-auto">
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2.5 md:p-3 rounded-xl shadow-neo bg-neo-bg hover:shadow-neo-inset transition-all dark:text-gray-400 active:scale-95">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-base md:text-xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight">{monthLabel}</h2>
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2.5 md:p-3 rounded-xl shadow-neo bg-neo-bg hover:shadow-neo-inset transition-all dark:text-gray-400 active:scale-95">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
           <div className="hidden lg:flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-gray-400">
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-red-500 rounded-full" /> Поломка</div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-orange-500 rounded-full" /> План ТО</div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-cyan-500 rounded-full" /> ТО выполнено</div>
           </div>
           {equipment.length > 0 && (
             <button 
               onClick={() => setIsModalOpen(true)}
               className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 md:py-3.5 rounded-xl md:rounded-2xl shadow-neo bg-blue-500 text-white font-bold text-xs uppercase hover:shadow-neo-inset transition-all tracking-widest active:scale-95"
             >
               <Plus size={18} /> <span className="inline">План ТО</span>
             </button>
           )}
        </div>
      </div>

      <div className="flex-1 bg-neo-bg rounded-[1.5rem] md:rounded-[2.5rem] shadow-neo-inset p-1.5 md:p-6 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-7 gap-1 md:gap-3 min-w-[280px]">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
            <div key={d} className="text-center text-[8px] md:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest pb-1 md:pb-3">{d}</div>
          ))}
          {Array(daysInMonth[0].getDay() === 0 ? 6 : daysInMonth[0].getDay() - 1).fill(0).map((_, i) => (
            <div key={`empty-${i}`} className="h-16 md:h-32 opacity-10"></div>
          ))}
          {daysInMonth.map(day => {
            const { planned, completed, done, activeBreakdowns } = getDayEvents(day);
            const isToday = new Date().toDateString() === day.toDateString();
            return (
              <div key={day.toISOString()} className={`h-20 md:h-36 p-1 md:p-2 rounded-lg md:rounded-2xl shadow-neo bg-neo-bg relative overflow-hidden group hover:shadow-neo-inset transition-all border border-white/5 dark:border-gray-800/50 ${isToday ? 'ring-2 ring-blue-500/30 ring-inset' : ''}`}>
                <span className={`text-[8px] md:text-[11px] font-black mb-1 block ${isToday ? 'text-blue-500' : 'text-gray-400 dark:text-gray-600'}`}>{day.getDate()}</span>
                <div className="space-y-0.5 overflow-y-auto max-h-[calc(100%-1rem)] custom-scrollbar pr-0.5">
                  {planned.map(e => (
                    <div 
                      key={e.id} onClick={() => handleEventClick(e.equipmentId)}
                      className="text-[6px] md:text-[8px] p-0.5 rounded-sm md:rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-black truncate flex items-center gap-0.5 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-800/40"
                    >
                      <Clock size={8} className="shrink-0" /> <span className="hidden md:inline">{equipment.find(eq => eq.id === e.equipmentId)?.name || 'ТО'}</span>
                    </div>
                  ))}
                  {completed.map(e => (
                    <div 
                      key={e.id} onClick={() => handleEventClick(e.equipmentId)}
                      className="text-[6px] md:text-[8px] p-0.5 rounded-sm md:rounded-md bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 font-black truncate flex items-center gap-0.5 cursor-pointer hover:bg-cyan-200 dark:hover:bg-cyan-800/40"
                    >
                      <CheckCircle2 size={8} className="shrink-0" /> <span className="hidden md:inline">{e.type}</span>
                    </div>
                  ))}
                  {done.map(r => (
                    <div 
                      key={r.id} onClick={() => handleEventClick(r.equipmentId)}
                      className="text-[6px] md:text-[8px] p-0.5 rounded-sm md:rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-black truncate flex items-center gap-0.5 cursor-pointer"
                    >
                      <CheckCircle2 size={8} className="shrink-0" /> <span className="hidden md:inline">{r.type}</span>
                    </div>
                  ))}
                  {activeBreakdowns.map(b => {
                    const displayStatus = getCalendarStatus(b);
                    return (
                      <div 
                        key={b.id} onClick={() => handleEventClick(b.equipmentId)}
                        className={`text-[6px] md:text-[8px] p-0.5 rounded-sm md:rounded-md font-black truncate flex items-center gap-0.5 cursor-pointer transition-all shadow-sm ${statusColorMap[displayStatus] || 'bg-red-500 text-white'}`}
                      >
                        <AlertTriangle size={8} className="shrink-0" /> <span className="hidden md:inline">{equipment.find(eq => eq.id === b.equipmentId)?.name || 'Поломка'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && <AddPlannedTOModal onClose={() => setIsModalOpen(false)} equipment={equipment} onAdd={addPlannedTO} />}
    </div>
  );
};

const AddPlannedTOModal: React.FC<{onClose: () => void, equipment: Equipment[], onAdd: (to: any) => void}> = ({ onClose, equipment, onAdd }) => {
  const [form, setForm] = useState({
    equipmentId: equipment[0]?.id || '',
    type: 'ТО-1',
    date: new Date().toISOString().split('T')[0],
    status: 'planned' as PlannedTOStatus
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.equipmentId) return;
    onAdd(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-neo-bg w-full max-w-lg rounded-[2rem] md:rounded-[2.5rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/10">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <h2 className="text-lg md:text-xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight flex items-center gap-3">
            <CalendarIcon size={20} className="text-blue-500" /> План ТО
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Техника</label>
            <select className="w-full p-4 rounded-xl shadow-neo-inset bg-neo-bg outline-none font-bold text-xs uppercase dark:text-gray-200 border-none appearance-none" value={form.equipmentId} onChange={e => setForm({...form, equipmentId: e.target.value})}>
              {equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Тип ТО</label>
              <select className="w-full p-4 rounded-xl shadow-neo-inset bg-neo-bg outline-none font-bold text-xs uppercase dark:text-gray-200 border-none appearance-none" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option>ТО-1</option><option>ТО-2</option><option>ТО-1000</option><option>Сезонное</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Дата</label>
              <input type="date" className="w-full p-4 rounded-xl shadow-neo-inset bg-neo-bg outline-none font-bold text-xs dark:text-gray-200 border-none" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            </div>
          </div>
          <button type="submit" className="w-full py-5 rounded-2xl bg-blue-500 shadow-neo text-white font-black uppercase text-xs hover:shadow-neo-inset transition-all tracking-widest active:scale-95 mt-4">Запланировать</button>
        </form>
      </div>
    </div>
  );
};

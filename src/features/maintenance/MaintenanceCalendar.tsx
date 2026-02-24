
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
import { useFleetStore } from '../../store/useFleetStore';
import { useMaintenanceStore } from '../../store/useMaintenanceStore';
import { useProcurementStore } from '../../store/useProcurementStore';
import { Equipment, PlannedTOStatus, BreakdownStatus, BreakdownRecord } from '../../types';

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
  const [isAllTOListOpen, setIsAllTOListOpen] = useState(false);

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
      {/* Плитка предстоящих и просроченных ТО */}
      {(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const overdueTOs = plannedTOs
          .filter(t => {
            const tDate = new Date(t.date + 'T00:00:00');
            tDate.setHours(0, 0, 0, 0);
            return tDate < today && t.status === 'planned';
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const upcomingTOs = plannedTOs
          .filter(t => {
            const tDate = new Date(t.date + 'T00:00:00');
            tDate.setHours(0, 0, 0, 0);
            return tDate >= today && t.status === 'planned';
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 5);

        return (
          <>
            {/* Просроченные ТО */}
            {overdueTOs.length > 0 && (
              <div className="bg-neo-bg rounded-2xl shadow-neo p-4 md:p-6 border-2 border-red-500/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={20} className="text-red-500"/>
                    <h3 className="text-sm md:text-base font-bold uppercase text-red-600">Просроченные ТО</h3>
                  </div>
                  <span className="text-xs font-black text-red-600 bg-red-500/20 px-3 py-1 rounded-full">{overdueTOs.length}</span>
                </div>
                <div className="space-y-2">
                  {overdueTOs.slice(0, 5).map(to => {
                    const eq = equipment.find(e => e.id === to.equipmentId);
                    const toDate = new Date(to.date + 'T00:00:00');
                    const daysOverdue = Math.ceil((today.getTime() - toDate.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <button
                        key={to.id}
                        onClick={() => {
                          setCurrentDate(new Date(to.date));
                          handleEventClick(to.equipmentId);
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-all text-left group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs md:text-sm font-semibold text-red-700 dark:text-red-400 truncate">{eq?.name || 'ТО'}</p>
                          <p className="text-[9px] md:text-[10px] text-red-500 dark:text-red-300">{to.type}</p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-xs md:text-sm font-bold text-red-700 dark:text-red-400">{to.date.split('-').reverse().join('.')}</p>
                          <p className="text-[9px] md:text-[10px] font-semibold text-red-600">
                            Просрочено на {daysOverdue} дн.
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Предстоящие ТО */}
            {upcomingTOs.length > 0 && (
              <div className="bg-neo-bg rounded-2xl shadow-neo p-4 md:p-6 border border-white/5">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarIcon size={20} className="text-blue-500"/>
                  <h3 className="text-sm md:text-base font-bold uppercase text-gray-800 dark:text-gray-100">Предстоящие ТО</h3>
                </div>
                <div className="space-y-2">
                  {upcomingTOs.map(to => {
                    const eq = equipment.find(e => e.id === to.equipmentId);
                    const toDate = new Date(to.date + 'T00:00:00');
                    const daysUntil = Math.ceil((toDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <button
                        key={to.id}
                        onClick={() => {
                          setCurrentDate(new Date(to.date));
                          handleEventClick(to.equipmentId);
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-neo-bg hover:bg-white/5 transition-all text-left group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{eq?.name || 'ТО'}</p>
                          <p className="text-[9px] md:text-[10px] text-gray-500 dark:text-gray-400">{to.type}</p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-xs md:text-sm font-bold text-gray-700 dark:text-gray-200">{to.date.split('-').reverse().join('.')}</p>
                          <p className={`text-[9px] md:text-[10px] font-semibold ${
                            daysUntil <= 3 ? 'text-red-500' : daysUntil <= 7 ? 'text-orange-500' : 'text-gray-500'
                          }`}>
                            {daysUntil === 0 ? 'Сегодня' : daysUntil === 1 ? 'Завтра' : `через ${daysUntil} дн.`}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {overdueTOs.length === 0 && upcomingTOs.length === 0 && (
              <div className="bg-neo-bg rounded-2xl shadow-neo p-6 md:p-8 border border-white/5 text-center">
                <CalendarIcon size={32} className="text-gray-400 mx-auto mb-3"/>
                <p className="text-sm font-bold text-gray-500 uppercase">Нет запланированных ТО</p>
              </div>
            )}
          </>
        );
      })()}

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
           <button
             onClick={() => setIsAllTOListOpen(true)}
             className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 md:py-3.5 rounded-xl md:rounded-2xl shadow-neo bg-neo-bg text-gray-700 dark:text-gray-300 font-bold text-xs uppercase hover:shadow-neo-inset transition-all tracking-widest active:scale-95 border border-white/10"
           >
             <CalendarIcon size={18} /> <span className="hidden sm:inline">Все ТО</span>
           </button>
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
            <div key={d} className="text-center text-[12px] md:text-[14px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest pb-1 md:pb-3">{d}</div>
          ))}
          {Array(daysInMonth[0].getDay() === 0 ? 6 : daysInMonth[0].getDay() - 1).fill(0).map((_, i) => (
            <div key={`empty-${i}`} className="h-16 md:h-32 opacity-10"></div>
          ))}
          {daysInMonth.map(day => {
            const { planned, completed, done, activeBreakdowns } = getDayEvents(day);
            const isToday = new Date().toDateString() === day.toDateString();
            return (
              <div key={day.toISOString()} className={`h-20 md:h-36 p-1 md:p-2 rounded-lg md:rounded-2xl shadow-neo bg-neo-bg relative overflow-hidden group hover:shadow-neo-inset transition-all border border-white/5 dark:border-gray-800/50 ${isToday ? 'ring-2 ring-blue-500/30 ring-inset' : ''}`}>
                <span className={`text-[12px] md:text-[15px] font-bold mb-1 block ${isToday ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`}>{day.getDate()}</span>
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
      {isAllTOListOpen && <AllTOListModal onClose={() => setIsAllTOListOpen(false)} equipment={equipment} plannedTOs={plannedTOs} records={records} onNavigate={(id: string) => { setSelectedMaintenanceEquipId(id); if (onNavigate) onNavigate('maintenance'); }} />}
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

// Модальное окно просмотра всех ТО
const AllTOListModal: React.FC<{onClose: () => void, equipment: Equipment[], plannedTOs: any[], records: any[], onNavigate: (id: string) => void}> = ({ onClose, equipment, plannedTOs, records, onNavigate }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allTOs = useMemo(() => {
    const planned = plannedTOs
      .filter(t => t.status === 'planned')
      .map(t => ({
        ...t,
        _type: 'planned' as const,
        isOverdue: new Date(t.date + 'T00:00:00') < today
      }));
    
    const completed = records
      .filter(r => r.type.includes('ТО') || r.type === 'Плановое ТО')
      .map(r => ({
        ...r,
        _type: 'completed' as const,
        isOverdue: false
      }));

    return [...planned, ...completed].sort((a, b) => {
      // Сначала просроченные, потом по дате
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [plannedTOs, records, today]);

  const overdueCount = allTOs.filter(t => t._type === 'planned' && t.isOverdue).length;
  const upcomingCount = allTOs.filter(t => t._type === 'planned' && !t.isOverdue).length;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-neo-bg w-full max-w-2xl rounded-[2.5rem] md:rounded-[3rem] shadow-neo p-6 md:p-8 animate-in zoom-in border border-white/20 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-neo bg-neo-bg text-blue-500">
              <CalendarIcon size={24}/>
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">Все ТО</h2>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                {overdueCount > 0 ? `${overdueCount} просроченных • ${upcomingCount} предстоящих` : `${upcomingCount} предстоящих`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
          {allTOs.length === 0 ? (
            <div className="text-center py-10">
              <CalendarIcon size={48} className="text-gray-400 mx-auto mb-3"/>
              <p className="text-sm font-bold text-gray-500 uppercase">Нет запланированных ТО</p>
            </div>
          ) : (
            allTOs.map((to: any) => {
              const eq = equipment.find(e => e.id === to.equipmentId);
              const toDate = new Date(to.date + 'T00:00:00');
              const daysUntil = Math.ceil((toDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isPlanned = to._type === 'planned';
              
              return (
                <button
                  key={to.id}
                  onClick={() => { onNavigate(to.equipmentId); onClose(); }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all text-left group ${
                    isPlanned && to.isOverdue 
                      ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30' 
                      : isPlanned 
                        ? 'bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      isPlanned && to.isOverdue ? 'bg-red-500 text-white' : isPlanned ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
                    }`}>
                      {isPlanned ? <CalendarIcon size={18}/> : <CheckCircle2 size={18}/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{eq?.name || 'ТО'}</p>
                      <p className="text-[9px] text-gray-500 dark:text-gray-400">{to.type}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{to.date.split('-').reverse().join('.')}</p>
                    {isPlanned && (
                      <p className={`text-[9px] font-semibold ${
                        to.isOverdue ? 'text-red-600' :
                        daysUntil <= 3 ? 'text-red-500' : daysUntil <= 7 ? 'text-orange-500' : 'text-gray-500'
                      }`}>
                        {to.isOverdue ? `Просрочено на ${Math.abs(daysUntil)} дн.` :
                         daysUntil === 0 ? 'Сегодня' : daysUntil === 1 ? 'Завтра' : `через ${daysUntil} дн.`}
                      </p>
                    )}
                    {!isPlanned && (
                      <p className="text-[9px] font-semibold text-emerald-600">Выполнено</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

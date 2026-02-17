
import React, { useState } from 'react';
import { Package, ChevronRight, Truck, LayoutGrid, List, Layers, X, CheckCircle2, ArrowRight, Wallet } from 'lucide-react';
import { useProcurementStore } from '../store/useProcurementStore';
import { useFleetStore } from '../store/useFleetStore';
import { ProcurementStatus } from '../types';

const COLUMNS: {id: ProcurementStatus, title: string, color: string}[] = [
  { id: 'Новая', title: 'Новая', color: 'bg-gray-400' },
  { id: 'Поиск', title: 'Поиск', color: 'bg-blue-400' },
  { id: 'Оплачено', title: 'Оплачено', color: 'bg-emerald-400' },
  { id: 'В пути', title: 'В пути', color: 'bg-orange-500' },
  { id: 'На складе', title: 'Склад', color: 'bg-indigo-500' },
];

export const Procurement: React.FC = () => {
  const { requests, updateRequestStatus, selectedRequestId, setSelectedRequestId } = useProcurementStore();
  const { equipment } = useFleetStore();
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'table'>('table');

  const selectedReq = requests.find(r => r.id === selectedRequestId);

  const handleStatusChange = (status: ProcurementStatus) => {
    if (selectedRequestId) {
      updateRequestStatus(selectedRequestId, status);
      setSelectedRequestId(null);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden animate-in fade-in duration-700 px-2 md:px-0">
      {/* Шапка с переключателем видов */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-6">
           <h2 className="text-2xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">Снабжение</h2>
           <div className="flex p-1.5 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/5 shrink-0">
              <button onClick={() => setViewMode('kanban')} title="Канбан-доска" className={`p-2.5 rounded-xl transition-all ${viewMode === 'kanban' ? 'bg-neo-bg shadow-neo text-blue-600' : 'text-gray-400 hover:text-blue-500'}`}><LayoutGrid size={18}/></button>
              <button onClick={() => setViewMode('list')} title="Простой список" className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-neo-bg shadow-neo text-blue-600' : 'text-gray-400 hover:text-blue-500'}`}><List size={18}/></button>
              <button onClick={() => setViewMode('table')} title="Реестр (Гант)" className={`p-2.5 rounded-xl transition-all ${viewMode === 'table' ? 'bg-neo-bg shadow-neo text-blue-600' : 'text-gray-400 hover:text-blue-500'}`}><Layers size={18}/></button>
           </div>
        </div>
      </div>

      {/* Отображение: КАНБАН */}
      {viewMode === 'kanban' && (
        <div className="flex-1 flex gap-6 overflow-x-auto pb-6 custom-scrollbar px-1">
          {COLUMNS.map(col => (
            <div key={col.id} className="w-72 md:w-85 flex flex-col shrink-0 space-y-5">
              <div className="flex items-center justify-between px-5">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${col.color}`} />
                  <h4 className="font-black text-gray-500 dark:text-gray-400 uppercase text-[11px] tracking-widest">{col.title}</h4>
                </div>
                <span className="text-[10px] font-black text-blue-500 bg-neo-bg px-2 py-1 rounded-lg shadow-neo-sm border border-white/5">{requests.filter(r=>r.status===col.id).length}</span>
              </div>
              <div className="flex-1 bg-neo-bg rounded-[2.5rem] p-4 shadow-neo-inset overflow-y-auto space-y-4 border border-white/5">
                {requests.filter(r=>r.status===col.id).map(req => (
                  <div key={req.id} onClick={() => setSelectedRequestId(req.id)} className="p-6 rounded-[2rem] shadow-neo bg-neo-bg group hover:shadow-neo-inset transition-all cursor-pointer border border-white/10 relative">
                    <h5 className="text-[11px] font-black uppercase mb-3 text-gray-700 dark:text-gray-200 tracking-tight group-hover:text-blue-600 transition-colors">{req.title}</h5>
                    <div className="flex items-center gap-2 mb-4 opacity-70">
                      <Truck size={12} className="text-blue-500"/>
                      <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase truncate">{equipment.find(e=>e.id===req.equipmentId)?.name || 'Общий'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-200/50 dark:border-gray-800">
                      <span className="text-[11px] font-black text-emerald-600">{req.cost ? `${req.cost.toLocaleString()} ₽` : 'Оценка...'}</span>
                      <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Отображение: СПИСОК */}
      {viewMode === 'list' && (
        <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1 px-1">
          {requests.map(req => (
            <div key={req.id} onClick={() => setSelectedRequestId(req.id)} className="p-6 rounded-[2rem] shadow-neo bg-neo-bg flex items-center justify-between group cursor-pointer hover:shadow-neo-inset transition-all border border-white/5">
              <div className="flex items-center gap-4 md:gap-8">
                <div className="p-4 rounded-2xl shadow-neo bg-neo-bg text-blue-500 shrink-0"><Package size={24}/></div>
                <div className="overflow-hidden">
                  <h4 className="text-sm md:text-base font-black uppercase text-gray-700 dark:text-gray-200 truncate">{req.title}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{req.status}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{equipment.find(e=>e.id===req.equipmentId)?.name}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 md:gap-10 shrink-0">
                <p className="text-base md:text-xl font-black text-emerald-600 whitespace-nowrap">{req.cost?.toLocaleString() || '—'} ₽</p>
                <div className="p-2 rounded-xl shadow-neo text-gray-300 group-hover:text-blue-600"><ChevronRight size={20}/></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Отображение: ТАБЛИЦА (ГАНТ) */}
      {viewMode === 'table' && (
        <div className="bg-neo-bg rounded-[2.5rem] shadow-neo-inset p-4 overflow-x-auto border border-white/5 flex-1 custom-scrollbar">
          <table className="w-full text-left min-w-[800px]">
            <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-8 py-5">Наименование ТМЦ</th>
                <th className="px-6 py-5">Привязка</th>
                <th className="px-6 py-5">Прогресс закупки</th>
                <th className="px-8 py-5 text-right">Бюджет (₽)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {requests.map(req => (
                <tr key={req.id} onClick={() => setSelectedRequestId(req.id)} className="hover:bg-white/5 transition-colors cursor-pointer group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-xl shadow-neo-sm bg-neo-bg text-blue-500 group-hover:scale-110 transition-transform"><Package size={18}/></div>
                      <span className="text-xs font-black uppercase text-gray-700 dark:text-gray-200 group-hover:text-blue-600 transition-colors">{req.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">{equipment.find(e=>e.id===req.equipmentId)?.name}</td>
                  <td className="px-6 py-6">
                    <div className="flex gap-1.5 h-2 w-48 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-2 shadow-inner">
                      {COLUMNS.map((c, i) => {
                        const activeIndex = COLUMNS.findIndex(col => col.id === req.status);
                        return <div key={i} className={`flex-1 transition-all duration-500 ${i <= activeIndex ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-transparent'}`} />
                      })}
                    </div>
                    <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest">{req.status}</span>
                  </td>
                  <td className="px-8 py-6 text-right font-black text-emerald-600 text-base">{req.cost?.toLocaleString() || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* МОДАЛКА УПРАВЛЕНИЯ ЗАЯВКОЙ (Смена статусов здесь) */}
      {selectedReq && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <div className="bg-neo-bg w-full max-w-xl rounded-[3rem] shadow-neo p-8 md:p-12 animate-in zoom-in border border-white/20">
              <div className="flex justify-between items-center mb-10">
                 <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl shadow-neo bg-neo-bg text-blue-500"><Package size={28}/></div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">Карточка ТМЦ</h3>
                 </div>
                 <button onClick={() => setSelectedRequestId(null)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all"><X size={24}/></button>
              </div>
              
              <div className="space-y-8">
                 <div className="p-8 rounded-[2rem] shadow-neo-inset bg-neo-bg border border-white/5">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-3 tracking-widest">Наименование позиции</p>
                    <p className="text-sm md:text-base font-black uppercase text-gray-700 dark:text-gray-300 leading-tight">{selectedReq.title}</p>
                 </div>

                 <div className="grid grid-cols-2 gap-6 md:gap-8">
                    <div className="p-6 rounded-2xl shadow-neo bg-neo-bg border border-white/5">
                       <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Объект</p>
                       <div className="flex items-center gap-2">
                          <Truck size={14} className="text-blue-500"/>
                          <p className="text-[10px] md:text-xs font-black uppercase text-gray-700 dark:text-gray-300 truncate">{equipment.find(e=>e.id===selectedReq.equipmentId)?.name || 'Общий'}</p>
                       </div>
                    </div>
                    <div className="p-6 rounded-2xl shadow-neo bg-neo-bg border border-white/5">
                       <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Бюджет</p>
                       <div className="flex items-center gap-2">
                          <Wallet size={14} className="text-emerald-500"/>
                          <p className="text-sm md:text-lg font-black text-emerald-600">{selectedReq.cost?.toLocaleString() || '0'} ₽</p>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                       <ArrowRight size={14} className="text-blue-500"/> Сменить статус закупки:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                       {COLUMNS.map(c => (
                         <button 
                            key={c.id} 
                            onClick={() => handleStatusChange(c.id)} 
                            className={`px-4 py-4 rounded-xl shadow-neo text-[9px] font-black uppercase transition-all active:scale-95 border border-white/5 tracking-widest ${selectedReq.status === c.id ? 'bg-neo-bg shadow-neo-inset text-blue-600 ring-1 ring-blue-500/20' : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:shadow-neo-inset'}`}
                         >
                           {c.title}
                         </button>
                       ))}
                    </div>
                 </div>

                 <button className="w-full py-5 rounded-2xl bg-neo-bg shadow-neo text-blue-600 font-black uppercase text-xs tracking-widest hover:shadow-neo-inset transition-all active:scale-95 border border-blue-500/10">
                    Прикрепить документы (УПД/Счет)
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

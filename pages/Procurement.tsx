
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
  const { requests, updateRequestStatus, updateRequest, selectedRequestId, setSelectedRequestId } = useProcurementStore();
  const { equipment } = useFleetStore();
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'table'>('table');

  const selectedReq = requests.find(r => r.id === selectedRequestId);
  const [editReq, setEditReq] = useState<any>(null);

  React.useEffect(() => {
    setEditReq(selectedReq ? { ...selectedReq } : null);
  }, [selectedReq]);

  // sorted for list/table: non-completed first, completed ('На складе') moved down sorted by completedAt desc
  const sortedRequests = [...requests].sort((a, b) => {
    const aDone = a.status === 'На складе' ? 1 : 0;
    const bDone = b.status === 'На складе' ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    if (aDone === 1 && bDone === 1) {
      const da = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const db = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return db - da;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

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
                {requests.filter(r=>r.status===col.id).map(req => {
                  const statusColor = COLUMNS.find(c=>c.id===req.status)?.color || 'bg-gray-400';
                  const borderColor = statusColor.replace('bg-', 'border-');
                  return (
                  <div key={req.id} onClick={() => setSelectedRequestId(req.id)} className={`p-6 rounded-[2rem] shadow-neo bg-neo-bg group hover:shadow-neo-inset transition-all cursor-pointer border-l-4 border-white/10 relative ${borderColor}`}>
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
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Отображение: СПИСОК */}
          {viewMode === 'list' && (
        <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1 px-1">
          {sortedRequests.map(req => (
            <div key={req.id} onClick={() => setSelectedRequestId(req.id)} className="p-6 rounded-[2rem] shadow-neo bg-neo-bg flex items-center justify-between group cursor-pointer hover:shadow-neo-inset transition-all border border-white/5">
              <div className="flex items-center gap-4 md:gap-8">
                <div className="p-4 rounded-2xl shadow-neo bg-neo-bg text-blue-500 shrink-0"><Package size={24}/></div>
                <div className="overflow-hidden">
                  <h4 className="text-sm md:text-base font-black uppercase text-gray-700 dark:text-gray-200 truncate">{req.title}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${COLUMNS.find(c=>c.id===req.status)?.color || 'bg-gray-300'} text-white`}>{req.status}</span>
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
              {sortedRequests.map(req => {
                const statusColor = COLUMNS.find(c=>c.id===req.status)?.color || 'bg-gray-400';
                const borderColor = statusColor.replace('bg-', 'border-');
                return (
                <tr key={req.id} onClick={() => setSelectedRequestId(req.id)} className={`border-l-4 ${borderColor} hover:bg-white/5 transition-colors cursor-pointer group`}>
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
                        const isActive = i <= activeIndex;
                        const colorClass = isActive ? c.color : 'bg-gray-300 dark:bg-gray-700';
                        return <div key={i} className={`flex-1 transition-all duration-500 ${colorClass}`} />
                      })}
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${statusColor} text-white tracking-widest`}>{req.status}</span>
                  </td>
                  <td className="px-8 py-6 text-right font-black text-emerald-600 text-base">{req.cost?.toLocaleString() || '—'}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* МОДАЛКА УПРАВЛЕНИЯ ЗАЯВКОЙ (Смена статусов здесь) */}
      {selectedReq && editReq && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <div className="bg-neo-bg w-full max-w-2xl rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/20 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-neo-bg">
                 <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl shadow-neo bg-neo-bg text-blue-500"><Package size={28}/></div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">Карточка ТМЦ</h3>
                 </div>
                 <button onClick={() => setSelectedRequestId(null)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all"><X size={24}/></button>
              </div>
              
                 <div className="space-y-6">
                   <div className="p-6 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/5 space-y-3">
                     <label className="text-xs font-bold text-gray-400">Наименование</label>
                     <input className="w-full p-3 rounded-lg bg-neo-bg outline-none app-input" value={editReq.title} onChange={e=>setEditReq({...editReq, title: e.target.value})} />

                     <div className="grid grid-cols-2 gap-3">
                       <div>
                         <label className="text-xs font-bold text-gray-400">Контрагент</label>
                         <input className="w-full p-3 rounded-lg bg-neo-bg outline-none app-input" value={editReq.contractorName || ''} onChange={e=>setEditReq({...editReq, contractorName: e.target.value})} />
                       </div>
                       <div>
                         <label className="text-xs font-bold text-gray-400">Номер счета / спецификации</label>
                         <input className="w-full p-3 rounded-lg bg-neo-bg outline-none app-input" value={editReq.invoiceNumber || ''} onChange={e=>setEditReq({...editReq, invoiceNumber: e.target.value})} />
                       </div>
                     </div>
                   </div>

                   <div className="p-6 rounded-2xl shadow-neo bg-neo-bg border border-white/5">
                     <p className="text-xs font-bold text-gray-400 mb-2">Позиции</p>
                     <div className="space-y-3">
                       {(editReq.items || []).map((it: any, idx: number) => (
                         <div key={it.id || idx} className="grid grid-cols-12 gap-2 items-center">
                           <input className="col-span-5 p-2 rounded-xl shadow-neo-inset bg-neo-bg border border-white/20 app-input" placeholder="Наименование" value={it.name} onChange={e=>{ const arr = [...editReq.items]; arr[idx].name = e.target.value; setEditReq({...editReq, items: arr}); }} />
                           <input className="col-span-2 p-2 rounded-xl shadow-neo-inset bg-neo-bg border border-white/20 app-input" placeholder="Кол-во" value={it.quantity} onChange={e=>{ const arr=[...editReq.items]; arr[idx].quantity = e.target.value; arr[idx].total = (parseFloat(arr[idx].quantity || '0') || 0) * (arr[idx].unitPriceWithVAT || 0); setEditReq({...editReq, items: arr}); }} />
                           <input className="col-span-3 p-2 rounded-xl shadow-neo-inset bg-neo-bg border border-white/20 app-input" placeholder="Цена с НДС" value={it.unitPriceWithVAT || ''} onChange={e=>{ const arr=[...editReq.items]; arr[idx].unitPriceWithVAT = parseFloat(e.target.value || '0'); arr[idx].total = (parseFloat(arr[idx].quantity || '0') || 0) * (arr[idx].unitPriceWithVAT || 0); setEditReq({...editReq, items: arr}); }} />
                           <div className="col-span-1 text-xs font-black">{(it.total || 0).toFixed(2)}</div>
                           <button className="col-span-1 text-red-500" onClick={() => { const arr = [...editReq.items]; arr.splice(idx,1); setEditReq({...editReq, items: arr}); }}>×</button>
                         </div>
                       ))}
                       <button onClick={()=> setEditReq({...editReq, items: [...(editReq.items||[]), { id: `i-${Date.now()}`, name: '', quantity: '1', unitPriceWithVAT: 0, total: 0 }]})} className="mt-2 px-3 py-2 rounded-xl bg-neo-bg border border-white/5 font-bold text-xs">Добавить позицию</button>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                     <div className="p-4 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/10">
                       <label className="text-xs font-bold text-gray-400">Перевозчик</label>
                       <input className="w-full p-2 rounded-lg shadow-neo-inset bg-neo-bg border border-white/10 outline-none app-input" value={editReq.carrierName || ''} onChange={e=>setEditReq({...editReq, carrierName: e.target.value})} />
                       <label className="text-xs font-bold text-gray-400 mt-2">Трек/накладная</label>
                       <input className="w-full p-2 rounded-lg shadow-neo-inset bg-neo-bg border border-white/10 outline-none app-input" value={editReq.trackingNumber || ''} onChange={e=>setEditReq({...editReq, trackingNumber: e.target.value})} />
                     </div>
                     <div className="p-4 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/10">
                       <label className="text-xs font-bold text-gray-400">Ответственный</label>
                       <input className="w-full p-2 rounded-lg shadow-neo-inset bg-neo-bg border border-white/10 outline-none app-input" value={editReq.responsible || ''} onChange={e=>setEditReq({...editReq, responsible: e.target.value})} />
                       <label className="text-xs font-bold text-gray-400 mt-2">Сумма всех позиций</label>
                       <div className="text-2xl font-black text-emerald-600">{((editReq.items||[]).reduce((s:any,it:any)=>s + (it.total||0),0) || 0).toFixed(2)} ₽</div>
                     </div>
                   </div>

                   <div className="p-4 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/10">
                     <label className="text-xs font-bold text-gray-400">Прикрепить счет / спецификацию</label>
                     <div className="flex items-center gap-3 mt-2">
                       <input type="file" id="req-file-input" className="hidden" onChange={(ev:any)=>{
                         const file = ev.target.files && ev.target.files[0];
                         if (!file) return;
                         const reader = new FileReader();
                         reader.onload = (e) => {
                           const url = e.target?.result as string;
                           const att = { id: `a-${Date.now()}`, name: file.name, url, type: file.type };
                           setEditReq((prev:any)=> ({ ...prev, attachments: [...(prev.attachments||[]), att] }));
                         };
                         reader.readAsDataURL(file);
                       }} />
                       <button onClick={() => { const el = document.getElementById('req-file-input'); if (el) (el as HTMLInputElement).click(); }} className="px-3 py-2 rounded-xl bg-neo-bg border border-white/5 font-bold text-xs">Загрузить файл</button>
                       <div className="flex gap-2">
                         {(editReq.attachments||[]).map((a:any)=> (
                           <a key={a.id} href={a.url} target="_blank" className="text-sm font-black text-blue-600">{a.name}</a>
                         ))}
                       </div>
                     </div>
                   </div>

                   <div className="flex gap-3">
                     <button onClick={() => {
                       // save updates
                       const totalCost = (editReq.items||[]).reduce((s:any,it:any)=> s + (it.total||0), 0);
                       updateRequest(editReq.id, { ...editReq, cost: totalCost });
                       setSelectedRequestId(null);
                     }} className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-black uppercase text-xs">Сохранить</button>
                     <button onClick={() => setSelectedRequestId(null)} className="flex-1 py-3 rounded-2xl bg-neo-bg border border-white/10 font-black uppercase text-xs">Отмена</button>
                   </div>
                 </div>
           </div>
        </div>
      )}
    </div>
  );
};

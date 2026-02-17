
import React, { useState } from 'react';
import { Wrench, AlertTriangle, History, ChevronLeft, Plus, X, ClipboardCheck, Truck } from 'lucide-react';
import { useFleetStore } from '../store/useFleetStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useAuthStore } from '../store/useAuthStore';

export const Maintenance: React.FC = () => {
  const { equipment } = useFleetStore();
  const { selectedMaintenanceEquipId, setSelectedMaintenanceEquipId, addMaintenance, addBreakdown, records } = useMaintenanceStore();
  const { user } = useAuthStore();
  
  const [isTOModalOpen, setIsTOModalOpen] = useState(false);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [breakdownForm, setBreakdownForm] = useState({
    node: 'Двигатель',
    partName: '',
    severity: 'Средняя' as any,
    description: ''
  });

  const selectedEquip = equipment.find(e => e.id === selectedMaintenanceEquipId);

  const handleFinishTO = () => {
    if (!selectedEquip) return;
    addMaintenance({
      id: Math.random().toString(),
      equipmentId: selectedEquip.id,
      date: new Date().toLocaleDateString('ru-RU'),
      type: 'Плановое ТО',
      hoursAtMaintenance: selectedEquip.hours,
      performedBy: user?.full_name || 'Механик',
      checklistItems: []
    });
    setIsTOModalOpen(false);
  };

  const handleSaveBreakdown = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquip) return;
    addBreakdown({
      equipmentId: selectedEquip.id,
      date: new Date().toISOString(),
      status: 'Новая',
      ...breakdownForm
    });
    setIsBreakdownModalOpen(false);
    setBreakdownForm({ node: 'Двигатель', partName: '', severity: 'Средняя', description: '' });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {!selectedEquip ? (
        <div className="space-y-6">
          <h2 className="text-2xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">ТО и Ремонт</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {equipment.map(e => (
              <div key={e.id} onClick={() => setSelectedMaintenanceEquipId(e.id)} className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg cursor-pointer hover:shadow-neo-inset transition-all flex items-center gap-6 border border-white/5 group">
                <div className="w-14 h-14 rounded-2xl shadow-neo bg-neo-bg flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform"><Wrench size={28}/></div>
                <div className="overflow-hidden">
                   <h3 className="font-black uppercase text-sm text-gray-700 dark:text-gray-200 truncate">{e.name}</h3>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{e.hours} м/ч</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-8 animate-in slide-in-from-left-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedMaintenanceEquipId(null)} className="p-3 rounded-xl shadow-neo text-gray-500 hover:text-blue-500 transition-all active:scale-95"><ChevronLeft size={20}/></button>
            <h2 className="text-xl md:text-2xl font-black uppercase text-gray-800 dark:text-gray-100 truncate">{selectedEquip.name}</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            <button onClick={() => setIsTOModalOpen(true)} className="p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg text-blue-600 flex flex-col items-center gap-3 md:gap-4 hover:shadow-neo-inset transition-all border border-blue-500/10 active:scale-95 group">
              <Wrench size={32} className="group-hover:rotate-12 transition-transform"/><span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">Провести ТО</span>
            </button>
            <button onClick={() => setIsBreakdownModalOpen(true)} className="p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg text-red-600 flex flex-col items-center gap-3 md:gap-4 hover:shadow-neo-inset transition-all border border-red-500/10 active:scale-95 group">
              <AlertTriangle size={32} className="group-hover:scale-110 transition-transform"/><span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">Акт поломки</span>
            </button>
            <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg flex flex-col items-center justify-center gap-1 md:gap-2 border border-white/5">
              <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase">Наработка</p>
              <p className="text-xl md:text-3xl font-black text-gray-800 dark:text-gray-100">{selectedEquip.hours} м/ч</p>
            </div>
            <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg flex flex-col items-center justify-center gap-1 md:gap-2 border border-white/5">
              <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase">Регламент</p>
              <p className="text-xl md:text-3xl font-black text-orange-600">250</p>
            </div>
          </div>

          <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-neo bg-neo-bg border border-white/5">
            <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-6 md:mb-10 flex items-center gap-2"><History size={16} className="text-blue-600"/> Архив обслуживания</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
              {records.filter(r => r.equipmentId === selectedEquip.id).map(r => (
                <div key={r.id} className="p-4 md:p-6 rounded-2xl shadow-neo-sm bg-neo-bg flex justify-between items-center border-l-4 border-emerald-500 group hover:shadow-neo transition-all">
                  <div className="overflow-hidden">
                    <p className="text-xs md:text-sm font-black uppercase text-gray-700 dark:text-gray-200 truncate">{r.type}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">{r.performedBy} • {r.hoursAtMaintenance} м/ч</p>
                  </div>
                  <span className="text-[9px] md:text-[10px] font-black text-gray-400 shrink-0 ml-4">{r.date}</span>
                </div>
              ))}
              {records.filter(r => r.equipmentId === selectedEquip.id).length === 0 && <p className="text-center py-12 md:py-20 text-gray-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">История пуста</p>}
            </div>
          </div>
        </div>
      )}

      {/* Модалка Акта поломки */}
      {isBreakdownModalOpen && selectedEquip && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <div className="bg-neo-bg w-full max-w-lg rounded-[2.5rem] md:rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/20">
              <div className="flex justify-between items-center mb-6 md:mb-10">
                 <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">Регистрация поломки</h2>
                 <button onClick={() => setIsBreakdownModalOpen(false)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all"><X size={20}/></button>
              </div>
              <form onSubmit={handleSaveBreakdown} className="space-y-5 md:space-y-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Узел техники</label>
                    <select className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none font-bold text-xs uppercase text-gray-700 dark:text-gray-200 outline-none" value={breakdownForm.node} onChange={e=>setBreakdownForm({...breakdownForm, node: e.target.value})}>
                       <option>Двигатель</option><option>Гидравлика</option><option>Ходовая часть</option><option>Электроника</option><option>Кузов</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Деталь / Запчасть</label>
                    <input className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none font-bold text-xs uppercase text-gray-700 dark:text-gray-200 outline-none" placeholder="Введите название..." value={breakdownForm.partName} onChange={e=>setBreakdownForm({...breakdownForm, partName: e.target.value})} required />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Серьезность</label>
                    <div className="flex gap-3">
                       {['Низкая', 'Средняя', 'Критическая'].map(s => (
                         <button key={s} type="button" onClick={()=>setBreakdownForm({...breakdownForm, severity: s as any})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${breakdownForm.severity === s ? 'bg-neo-bg shadow-neo-inset text-red-600 border border-red-500/20' : 'shadow-neo text-gray-400 hover:text-gray-600'}`}>{s}</button>
                       ))}
                    </div>
                 </div>
                 <button type="submit" className="w-full py-5 rounded-2xl bg-neo-bg shadow-neo text-red-600 font-black uppercase text-xs tracking-[0.2em] active:scale-95 transition-all mt-4 border border-red-500/10 hover:shadow-neo-inset">Создать акт неисправности</button>
              </form>
           </div>
        </div>
      )}

      {/* Модалка ТО */}
      {isTOModalOpen && selectedEquip && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-neo-bg w-full max-w-2xl rounded-[2.5rem] md:rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/20">
            <div className="flex justify-between items-center mb-6 md:mb-10">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">Проведение ТО</h2>
              <button onClick={()=>setIsTOModalOpen(false)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all"><X size={24}/></button>
            </div>
            <div className="space-y-6 md:space-y-8">
              <div className="p-6 md:p-8 rounded-[2rem] shadow-neo-inset bg-neo-bg text-center">
                <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Наработка при ТО (М/Ч)</p>
                <p className="text-3xl md:text-4xl font-black text-blue-600">{selectedEquip.hours}</p>
              </div>
              <button onClick={handleFinishTO} className="w-full py-5 md:py-6 rounded-[2rem] md:rounded-[2.5rem] bg-neo-bg shadow-neo text-blue-600 font-black uppercase text-xs tracking-widest mt-6 flex items-center justify-center gap-4 active:scale-95 transition-all border border-blue-500/10 hover:shadow-neo-inset">
                <ClipboardCheck size={20}/> Подтвердить и сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

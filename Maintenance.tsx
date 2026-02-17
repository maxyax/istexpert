
import React, { useState } from 'react';
/* Added Truck and X to imports from lucide-react */
import { Wrench, AlertTriangle, Clock, History, Plus, CheckCircle2, ChevronLeft, Droplet, Truck, X } from 'lucide-react';
import { useFleetStore } from './useFleetStore';
import { useMaintenanceStore } from './useMaintenanceStore';

export const Maintenance: React.FC = () => {
  const { equipment } = useFleetStore();
  const { selectedMaintenanceEquipId, setSelectedMaintenanceEquipId, addMaintenance, addBreakdown, records } = useMaintenanceStore();
  const [isTOModalOpen, setIsTOModalOpen] = useState(false);

  const selectedEquip = equipment.find(e => e.id === selectedMaintenanceEquipId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!selectedEquip ? (
        <div className="space-y-6">
          <h2 className="text-2xl font-black uppercase tracking-tight">ТО и Ремонт</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {equipment.map(e => (
              <div key={e.id} onClick={() => setSelectedMaintenanceEquipId(e.id)} className="p-6 rounded-[2rem] shadow-neo bg-neo-bg cursor-pointer hover:shadow-neo-inset transition-all border-l-4 border-blue-500/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl shadow-neo bg-neo-bg flex items-center justify-center text-blue-500"><Truck size={24}/></div>
                  <div><h3 className="font-black uppercase text-sm">{e.name}</h3><p className="text-[10px] font-black text-blue-500 uppercase">{e.hours} м/ч</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedMaintenanceEquipId(null)} className="p-3 rounded-xl shadow-neo text-gray-400"><ChevronLeft size={20}/></button>
            <h2 className="text-2xl font-black uppercase">{selectedEquip.name}</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <button onClick={() => setIsTOModalOpen(true)} className="p-8 rounded-[2.5rem] shadow-neo bg-blue-500 text-white flex flex-col items-center gap-4 hover:shadow-neo-inset transition-all"><Wrench size={32}/><span className="text-[10px] font-black uppercase tracking-widest">Провести ТО</span></button>
            <button className="p-8 rounded-[2.5rem] shadow-neo bg-red-500 text-white flex flex-col items-center gap-4 hover:shadow-neo-inset transition-all"><AlertTriangle size={32}/><span className="text-[10px] font-black uppercase tracking-widest">Акт поломки</span></button>
            <div className="p-8 rounded-[2.5rem] shadow-neo bg-neo-bg flex flex-col items-center gap-2"><p className="text-[10px] font-black text-gray-400 uppercase">Наработка</p><p className="text-3xl font-black">{selectedEquip.hours} м/ч</p></div>
            <div className="p-8 rounded-[2.5rem] shadow-neo bg-neo-bg flex flex-col items-center gap-2"><p className="text-[10px] font-black text-gray-400 uppercase">Регламент</p><p className="text-3xl font-black text-orange-500">250</p></div>
          </div>
          <div className="p-10 rounded-[3rem] shadow-neo bg-neo-bg">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-8 flex items-center gap-2"><History size={16} className="text-blue-500"/> Архив обслуживания</h3>
            <div className="space-y-4">
              {records.filter(r => r.equipmentId === selectedEquip.id).map((r, i) => (
                <div key={i} className="p-5 rounded-2xl shadow-neo-sm bg-neo-bg flex justify-between items-center border-l-4 border-emerald-500">
                  <div><p className="text-sm font-black uppercase">{r.type}</p><p className="text-[9px] font-bold text-gray-400 uppercase">{r.performedBy} • {r.hoursAtMaintenance} м/ч</p></div>
                  <span className="text-[10px] font-black text-gray-400">{r.date}</span>
                </div>
              ))}
              {records.filter(r => r.equipmentId === selectedEquip.id).length === 0 && <p className="text-center py-10 text-gray-400 text-[10px] font-black uppercase">История пуста</p>}
            </div>
          </div>
        </div>
      )}

      {isTOModalOpen && selectedEquip && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-neo-bg w-full max-w-2xl rounded-[3rem] shadow-neo p-10 animate-in zoom-in border border-white/20">
            <div className="flex justify-between mb-10"><h2 className="text-2xl font-black uppercase">Проведение ТО</h2><button onClick={()=>setIsTOModalOpen(false)}><X size={24} className="text-gray-400"/></button></div>
            <div className="space-y-6">
              <div className="p-6 rounded-2xl shadow-neo-inset bg-neo-bg"><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Наработка при ТО (М/Ч)</p><input type="number" defaultValue={selectedEquip.hours} className="bg-transparent text-2xl font-black text-blue-500 w-full outline-none" /></div>
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Расходные материалы</p>
                <div className="flex gap-4"><input placeholder="Масло 15W40" className="flex-1 p-4 rounded-xl shadow-neo-inset bg-neo-bg border-none" /><input placeholder="20л" className="w-24 p-4 rounded-xl shadow-neo-inset bg-neo-bg border-none" /></div>
              </div>
              <button onClick={() => {
                addMaintenance({ id: Math.random().toString(), equipmentId: selectedEquip.id, date: new Date().toLocaleDateString(), type: 'ТО-250', hoursAtMaintenance: selectedEquip.hours, performedBy: 'Петров А.В.', checklistItems: [] });
                setIsTOModalOpen(false);
              }} className="w-full py-5 rounded-2xl bg-blue-500 text-white font-black uppercase text-xs shadow-lg tracking-widest mt-6">Зафиксировать ТО</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


import React from 'react';
import { Package, Search, FileText, Wallet, Box, Truck, MapPin, Plus, ChevronRight } from 'lucide-react';
import { useProcurementStore } from './useProcurementStore';
import { ProcurementStatus } from './types';

// Updated IDs to match Russian ProcurementStatus defined in types.ts
const COLUMNS: {id: ProcurementStatus, title: string, color: string}[] = [
  { id: 'Новая', title: 'Новая', color: 'bg-gray-400' },
  { id: 'Поиск', title: 'Поиск', color: 'bg-blue-400' },
  { id: 'Оплачено', title: 'Оплачено', color: 'bg-emerald-400' },
  { id: 'В пути', title: 'В пути', color: 'bg-orange-500' },
  { id: 'На складе', title: 'Склад', color: 'bg-indigo-500' },
];

export const Procurement: React.FC = () => {
  const { requests, updateRequestStatus } = useProcurementStore();

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden animate-in fade-in duration-500">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-2xl font-black uppercase tracking-tight">Снабжение ТМЦ</h2>
        <button className="p-3 rounded-2xl bg-blue-500 text-white shadow-lg flex items-center gap-2"><Plus size={20}/><span className="text-[10px] font-black uppercase tracking-widest">Создать заявку</span></button>
      </div>
      <div className="flex-1 flex gap-6 overflow-x-auto pb-6 custom-scrollbar px-2">
        {COLUMNS.map(col => (
          <div key={col.id} className="w-80 flex flex-col shrink-0 space-y-4">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                <h4 className="font-black text-gray-500 uppercase text-[11px] tracking-widest">{col.title}</h4>
              </div>
              <span className="text-[10px] font-black text-blue-500">{requests.filter(r=>r.status===col.id).length}</span>
            </div>
            <div className="flex-1 bg-neo-bg rounded-[2.5rem] p-4 shadow-neo-inset overflow-y-auto space-y-4 border border-white/5">
              {requests.filter(r=>r.status===col.id).map(req => (
                <div key={req.id} className="p-5 rounded-[2rem] shadow-neo bg-neo-bg group hover:shadow-neo-inset transition-all cursor-pointer border border-white/10">
                  <h5 className="text-[11px] font-black uppercase mb-2">{req.title}</h5>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-[10px] font-black text-blue-500">{req.cost ? `${req.cost} ₽` : 'Оценка...'}</span>
                    {/* Fixed status update call to match Russian ProcurementStatus */}
                    <button onClick={()=>updateRequestStatus(req.id, 'Поиск')} className="p-2 rounded-xl shadow-neo bg-neo-bg text-gray-400 group-hover:text-blue-500"><ChevronRight size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
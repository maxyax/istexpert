
import React, { useState } from 'react';
import { Wrench, AlertTriangle, History, ChevronLeft, Plus, X, ClipboardCheck, Truck, LayoutGrid, List, Edit3, Camera } from 'lucide-react';
import { useFleetStore } from '../store/useFleetStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useProcurementStore } from '../store/useProcurementStore';
import { useAuthStore } from '../store/useAuthStore';
import { EquipStatus } from '../types';

const breakdownBorderClass = (status?: string) => {
  switch (status) {
    case 'Исправлено':
      return 'border-emerald-500';
    case 'Запчасти получены':
      return 'border-emerald-500';
    case 'Запчасти заказаны':
      return 'border-yellow-400';
    case 'В работе':
      return 'border-blue-500';
    case 'Новая':
    default:
      return 'border-red-500';
  }
};

const computeEquipmentStatus = (equipmentId: string, breakdowns: any[], plannedTOs: any[]) => {
  const activeBreakdowns = breakdowns.filter(b => b.equipmentId === equipmentId && b.status !== 'Исправлено');
  
  if (activeBreakdowns.length === 0) {
    const plannedTO = plannedTOs.filter(t => t.equipmentId === equipmentId && t.status === 'planned');
    if (plannedTO.length > 0) return EquipStatus.MAINTENANCE;
    return EquipStatus.ACTIVE;
  }
  
  // Проверка критических поломок
  const criticalBreakdowns = activeBreakdowns.filter(b => b.severity === 'Критическая');
  if (criticalBreakdowns.length > 0) return EquipStatus.REPAIR;
  
  // Проверка ожидания запчастей
  const waitingForParts = activeBreakdowns.filter(b => b.status === 'Запчасти заказаны' || b.status === 'Запчасти получены');
  if (waitingForParts.length > 0) return EquipStatus.WAITING_PARTS;
  
  // Проверка поломок в работе
  const inWork = activeBreakdowns.filter(b => b.status === 'В работе');
  if (inWork.length > 0) return EquipStatus.REPAIR;
  
  // Проверка незначительных поломок (не критические и не в работе)
  const minorBreakdowns = activeBreakdowns.filter(b => 
    b.severity !== 'Критическая' && 
    b.status !== 'В работе' && 
    b.status !== 'Запчасти заказаны' && 
    b.status !== 'Запчасти получены'
  );
  if (minorBreakdowns.length > 0) return EquipStatus.ACTIVE_WITH_RESTRICTIONS;
  
  return EquipStatus.ACTIVE;
};

export const Maintenance: React.FC = () => {
  const { equipment } = useFleetStore();
  const { selectedMaintenanceEquipId, setSelectedMaintenanceEquipId, addMaintenance, addBreakdown, records, breakdowns, plannedTOs, updateBreakdownStatus } = useMaintenanceStore();
  const { user } = useAuthStore();
  
  const [viewMode, setViewMode] = useState<'list' | 'tiles'>('list');
  const [isTOModalOpen, setIsTOModalOpen] = useState(false);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [breakdownForm, setBreakdownForm] = useState({
    node: 'Двигатель',
    partName: '',
    severity: 'Средняя' as any,
    description: '',
    date: new Date().toISOString().slice(0, 10),
    hoursAtBreakdown: undefined as number | undefined,
    mechanic: '',
    driver: '',
    photos: [] as string[]
  });

  const [isCreateRequestOpen, setIsCreateRequestOpen] = useState(false);
  const [requestItems, setRequestItems] = useState<{ sku?: string; name: string; quantity: string }[]>([]);

  const [toChecklist, setToChecklist] = useState<{ text: string; done: boolean; note?: string }[]>([]);
  const [toTypeLabel, setToTypeLabel] = useState<string>('');
  const [toHoursInput, setToHoursInput] = useState<number | ''>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<any>(null);
  const [selectedBreakdownDetail, setSelectedBreakdownDetail] = useState<any>(null);
  const [breakdownStatusForm, setBreakdownStatusForm] = useState({ status: 'Новая' as any, fixedDate: new Date().toISOString().slice(0, 10) });

  const selectedEquip = equipment.find(e => e.id === selectedMaintenanceEquipId);

  const computeNextTO = (e: any) => {
    if (!e || !e.regulations || e.regulations.length === 0) return null;
    const curr = e.hours || 0;
    const candidates = e.regulations.map((r: any) => {
      const interval = r.intervalHours || r.intervalKm || 0;
      if (!interval) return null;
      let next = Math.ceil(curr / interval) * interval;
      if (next <= curr) next += interval;
      return { reg: r, next };
    }).filter(Boolean);
    if (candidates.length === 0) return null;
    candidates.sort((a: any,b:any)=> a.next - b.next);
    const nearest = candidates[0];
    return { type: nearest.reg.type, next: nearest.next, remaining: nearest.next - curr };
  };

  const handleFinishTO = () => {
    if (!selectedMaintenanceEquipId) return;
    const equipToUpdate = equipment.find(eq => eq.id === selectedMaintenanceEquipId);
    if (!equipToUpdate) return;
    
    const hoursAt = typeof toHoursInput === 'number' && toHoursInput > 0 ? toHoursInput : equipToUpdate.hours;
    addMaintenance({
      id: Math.random().toString(),
      equipmentId: selectedMaintenanceEquipId,
      date: new Date().toISOString().split('T')[0],
      type: toTypeLabel || 'Плановое ТО',
      hoursAtMaintenance: hoursAt,
      performedBy: user?.full_name || 'Механик',
      checklistItems: toChecklist
    });
    // update equipment last hours
    useFleetStore.getState().updateEquipment(selectedMaintenanceEquipId, { hours: hoursAt });
    setIsTOModalOpen(false);
    setToChecklist([]);
    setToTypeLabel('');
    setToHoursInput('');
    setQrDataUrl('');
  };

  const openTOForEquip = (e: any) => {
    setSelectedMaintenanceEquipId(e.id);
    const n = computeNextTO(e);
    let reg = null;
    if (n) reg = e.regulations?.find((r: any) => r.type === n.type) || e.regulations[0];
    if (reg) {
      setToTypeLabel(reg.type || 'Плановое ТО');
      setToChecklist((reg.works || []).map((w: string) => ({ text: w, done: false })));
    } else {
      setToTypeLabel('Плановое ТО');
      setToChecklist([]);
    }
    setToHoursInput(e.hours || '');
    setIsTOModalOpen(true);
  };

  const openBreakdownForEquip = (e: any) => {
    setSelectedMaintenanceEquipId(e.id);
    setBreakdownForm({
      node: 'Двигатель',
      partName: '',
      severity: 'Средняя' as any,
      description: '',
      date: new Date().toISOString().slice(0, 10),
      hoursAtBreakdown: e.hours,
      photos: [] as string[],
      mechanic: user?.full_name || '',
      driver: ''
    });
    setIsBreakdownModalOpen(true);
  };

  const handleSaveBreakdown = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaintenanceEquipId) return;
    const equipToUpdate = equipment.find(eq => eq.id === selectedMaintenanceEquipId);
    if (!equipToUpdate) return;
    
    const payload: any = {
      equipmentId: selectedMaintenanceEquipId,
      date: breakdownForm.date + 'T00:00:00.000Z',
      status: 'Новая',
      ...breakdownForm
    };
    addBreakdown(payload);
    // also add to records as an entry in archive
    addMaintenance({
      id: Math.random().toString(),
      equipmentId: selectedMaintenanceEquipId,
      date: breakdownForm.date,
      type: 'Акт поломки',
      hoursAtMaintenance: (breakdownForm as any).hoursAtBreakdown || equipToUpdate.hours,
      performedBy: (breakdownForm as any).mechanic || user?.full_name || 'Механик',
      checklistItems: [{ text: `Поломка: ${breakdownForm.partName} (${breakdownForm.node})`, done: false, note: breakdownForm.description }]
    });
    setIsBreakdownModalOpen(false);
    setBreakdownForm({ node: 'Двигатель', partName: '', severity: 'Средняя', description: '', date: new Date().toISOString().slice(0, 10), hoursAtBreakdown: undefined, mechanic: '', driver: '', photos: [] });
  };

  const handleUploadBreakdownPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (ev: any) => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setBreakdownForm(prev => ({ ...prev, photos: [...(prev.photos || []), url] }));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const { addRequest } = useProcurementStore();

  const viewImage = (url: string) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      // open blob
      try {
        const base64Data = url.split(',')[1];
        const mimeType = url.split(':')[1].split(';')[0];
        const binaryString = window.atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const blob = new Blob([bytes], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } catch (err) {
        console.error(err);
        window.open(url, '_blank');
      }
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {!selectedEquip ? (
        <div className="space-y-6">
          <h2 className="text-2xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">ТО и Ремонт</h2>
          <div className="flex items-center justify-between">
            <div className="flex p-1.5 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/5">
              <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-neo-bg shadow-neo text-blue-600' : 'text-gray-400 hover:text-blue-500'}`}><List size={18}/></button>
              <button onClick={() => setViewMode('tiles')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'tiles' ? 'bg-neo-bg shadow-neo text-blue-600' : 'text-gray-400 hover:text-blue-500'}`}><LayoutGrid size={18}/></button>
            </div>
          </div>
          {viewMode === 'tiles' ? (
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
          ) : (
            <div className="space-y-3">
              {equipment.map(e => (
                <div key={e.id} className="p-4 rounded-xl shadow-neo bg-neo-bg flex items-center justify-between border border-white/5">
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelectedMaintenanceEquipId(e.id)}>
                    <div className="w-12 h-12 rounded-lg bg-neo-bg flex items-center justify-center text-blue-600"><Wrench size={22}/></div>
                    <div>
                      <div className="font-black uppercase text-sm text-gray-700">{e.name}</div>
                      <div className="text-[11px] text-gray-400">{e.make} {e.model} • {e.hours} м/ч</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => openTOForEquip(e)} className="px-4 py-2 rounded-2xl bg-neo-bg shadow-neo text-blue-600 font-black uppercase text-[10px]">Провести ТО</button>
                    <button onClick={() => openBreakdownForEquip(e)} className="px-4 py-2 rounded-2xl bg-neo-bg shadow-neo text-red-600 font-black uppercase text-[10px]">Акт поломки</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 md:space-y-8 animate-in slide-in-from-left-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedMaintenanceEquipId(null)} className="p-3 rounded-xl shadow-neo text-gray-500 hover:text-blue-500 transition-all active:scale-95"><ChevronLeft size={20}/></button>
            <h2 className="text-xl md:text-2xl font-black uppercase text-gray-800 dark:text-gray-100 truncate">{selectedEquip.name}</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            <button onClick={() => openTOForEquip(selectedEquip)} className="p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg text-blue-600 flex flex-col items-center gap-3 md:gap-4 hover:shadow-neo-inset transition-all border border-blue-500/10 active:scale-95 group">
              <Wrench size={32} className="group-hover:rotate-12 transition-transform"/><span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">Провести ТО</span>
            </button>
            <button onClick={() => openBreakdownForEquip(selectedEquip)} className="p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg text-red-600 flex flex-col items-center gap-3 md:gap-4 hover:shadow-neo-inset transition-all border border-red-500/10 active:scale-95 group">
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
              {records.filter(r => r.equipmentId === selectedEquip.id).map(r => {
                const isBreakdown = r.type.toLowerCase().includes('поломк') || r.type.toLowerCase().includes('неисправност') || r.type.toLowerCase().includes('акт');
                return (
                  <div key={r.id} onClick={() => setSelectedRecordDetail(r)} className={`p-4 md:p-6 rounded-2xl shadow-neo-sm bg-neo-bg flex justify-between items-center border-l-4 ${isBreakdown ? 'border-red-500' : 'border-emerald-500'} group hover:shadow-neo hover:cursor-pointer transition-all`}>
                    <div className="overflow-hidden">
                      <p className="text-xs md:text-sm font-black uppercase text-gray-700 dark:text-gray-200 truncate">{r.type}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">{r.performedBy} • {r.hoursAtMaintenance} м/ч</p>
                    </div>
                    <span className="text-[9px] md:text-[10px] font-black text-gray-400 shrink-0 ml-4">{r.date}</span>
                  </div>
                );
              })}
              {records.filter(r => r.equipmentId === selectedEquip.id).length === 0 && <p className="text-center py-12 md:py-20 text-gray-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">История пуста</p>}
            </div>
          </div>

          <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-neo bg-neo-bg border border-white/5">
            <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-6 md:mb-10 flex items-center gap-2"><AlertTriangle size={16} className="text-red-600"/> Список поломок</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
              {breakdowns.filter(b => b.equipmentId === selectedEquip.id).map(b => (
                <div key={b.id} onClick={() => setSelectedBreakdownDetail(b)} className={`p-4 md:p-6 rounded-2xl shadow-neo-sm bg-neo-bg flex justify-between items-center border-l-4 ${breakdownBorderClass(b.status)} group hover:shadow-neo hover:cursor-pointer transition-all`}>
                  <div className="overflow-hidden flex-1">
                    <p className="text-xs md:text-sm font-black uppercase text-gray-700 dark:text-gray-200 truncate">{b.partName}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">{b.status} • {b.node}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="text-[9px] md:text-[10px] font-black text-gray-400">{b.date.split('T')[0]}</span>
                    <Edit3 size={14} className="text-gray-400"/>
                  </div>
                </div>
              ))}
              {breakdowns.filter(b => b.equipmentId === selectedEquip.id).length === 0 && <p className="text-center py-12 md:py-20 text-gray-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Поломок нет</p>}
            </div>
          </div>
        </div>
      )}

      {/* Модалка Акта поломки */}
      {isBreakdownModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <div className="bg-neo-bg w-full max-w-lg rounded-[2.5rem] md:rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/20 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 md:mb-10 sticky top-0 bg-neo-bg">
                 <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">Регистрация поломки</h2>
                 <button onClick={() => setIsBreakdownModalOpen(false)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all"><X size={20}/></button>
              </div>
              <form onSubmit={handleSaveBreakdown} className="space-y-5 md:space-y-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Узел техники</label>
                    <select className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none text-gray-700 dark:text-gray-200 outline-none app-input" value={breakdownForm.node} onChange={e=>setBreakdownForm({...breakdownForm, node: e.target.value})}>
                       <option>Двигатель</option><option>Гидравлика</option><option>Ходовая часть</option><option>Электроника</option><option>Кузов</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Деталь / Запчасть</label>
                    <input className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none text-gray-700 dark:text-gray-200 outline-none app-input" placeholder="Введите название..." value={breakdownForm.partName} onChange={e=>setBreakdownForm({...breakdownForm, partName: e.target.value})} required />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Дата поломки</label>
                     <input type="date" value={breakdownForm.date} onChange={e=>setBreakdownForm({...breakdownForm, date: e.target.value})} className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none text-gray-700 dark:text-gray-200 outline-none app-input" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Пробег / Наработка</label>
                     <input type="number" value={breakdownForm.hoursAtBreakdown as any || ''} onChange={e=>setBreakdownForm({...breakdownForm, hoursAtBreakdown: e.target.value ? parseInt(e.target.value) : undefined})} className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none text-gray-700 dark:text-gray-200 outline-none app-input" />
                   </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <input placeholder="ФИО механика" value={breakdownForm.mechanic} onChange={e=>setBreakdownForm({...breakdownForm, mechanic: e.target.value})} className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none text-gray-700 dark:text-gray-200 outline-none app-input" />
                   <input placeholder="Кто обнаружил (водитель)" value={breakdownForm.driver} onChange={e=>setBreakdownForm({...breakdownForm, driver: e.target.value})} className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none text-gray-700 dark:text-gray-200 outline-none app-input" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Серьезность</label>
                    <div className="flex gap-3">
                       {['Низкая', 'Средняя', 'Критическая'].map(s => (
                         <button key={s} type="button" onClick={()=>setBreakdownForm({...breakdownForm, severity: s as any})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${breakdownForm.severity === s ? 'bg-neo-bg shadow-neo-inset text-red-600 border border-red-500/20' : 'shadow-neo text-gray-400 hover:text-gray-600'}`}>{s}</button>
                       ))}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Примечания</label>
                    <textarea value={breakdownForm.description} onChange={e=>setBreakdownForm({...breakdownForm, description: e.target.value})} placeholder="Описание и примечания" className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none h-24 text-gray-700 dark:text-gray-200 outline-none app-input" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Фотографии (узел/шильдик/маркировка)</label>
                    <div className="flex gap-3 items-center">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        {(breakdownForm.photos || []).map((p, i) => (
                          <div key={i} className="w-full h-20 rounded-lg overflow-hidden relative border border-white/10">
                            <img src={p} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={handleUploadBreakdownPhoto} className="p-3 rounded-xl shadow-neo text-blue-600 hover:shadow-neo-inset"><Camera size={18}/></button>
                    </div>
                 </div>
                <button type="submit" className="w-full py-5 rounded-2xl bg-neo-bg shadow-neo text-red-600 font-black uppercase text-xs tracking-[0.2em] active:scale-95 transition-all mt-4 border border-red-500/10 hover:shadow-neo-inset">Создать акт неисправности</button>
              </form>
           </div>
        </div>
      )}

      {/* Модалка деталей акта из архива */}
      {selectedRecordDetail && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-neo-bg w-full max-w-2xl rounded-[2.5rem] md:rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/20">
            <div className="flex justify-between items-center mb-6 md:mb-10">
              <h2 className="text-lg md:text-2xl font-black uppercase text-gray-800 dark:text-gray-100">Детали акта: {selectedRecordDetail.type}</h2>
              <button onClick={() => setSelectedRecordDetail(null)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-blue-500"><X size={24}/></button>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-neo-bg border border-white/10">
                  <p className="text-[9px] font-black text-gray-400 uppercase">Дата</p>
                  <p className="text-sm font-black text-gray-700 dark:text-gray-200">{selectedRecordDetail.date}</p>
                </div>
                <div className="p-4 rounded-xl bg-neo-bg border border-white/10">
                  <p className="text-[9px] font-black text-gray-400 uppercase">Наработка</p>
                  <p className="text-sm font-black text-gray-700 dark:text-gray-200">{selectedRecordDetail.hoursAtMaintenance} м/ч</p>
                </div>
                <div className="p-4 rounded-xl bg-neo-bg border border-white/10">
                  <p className="text-[9px] font-black text-gray-400 uppercase">Исполнитель</p>
                  <p className="text-sm font-black text-gray-700 dark:text-gray-200">{selectedRecordDetail.performedBy}</p>
                </div>
                <div className="p-4 rounded-xl bg-neo-bg border border-white/10">
                  <p className="text-[9px] font-black text-gray-400 uppercase">Тип</p>
                  <p className="text-sm font-black text-gray-700 dark:text-gray-200">{selectedRecordDetail.type}</p>
                </div>
              </div>
              {selectedRecordDetail.checklistItems && selectedRecordDetail.checklistItems.length > 0 && (
                <div className="p-4 md:p-6 rounded-2xl bg-neo-bg border border-white/10">
                  <h3 className="text-xs font-black text-gray-400 uppercase mb-4">Проведенные работы</h3>
                  <div className="space-y-3">
                    {selectedRecordDetail.checklistItems.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-white/5">
                        <div className="flex items-start gap-2">
                          <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center mt-0.5 ${item.done ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                            {item.done && <span className="text-white font-black text-sm">✓</span>}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-black text-gray-800 dark:text-gray-200">{item.text}</p>
                            {item.note && <p className="text-xs text-gray-500 mt-1">Примечание: {item.note}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedRecordDetail.photos && selectedRecordDetail.photos.length > 0 && (
                <div className="p-4 md:p-6 rounded-2xl bg-neo-bg border border-white/10 mt-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase mb-4">Фотографии акта</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedRecordDetail.photos.map((p: string, i: number) => (
                      <div key={i} className="rounded-xl overflow-hidden border border-white/5">
                        <img src={p} onClick={() => viewImage(p)} className="w-full h-28 object-cover cursor-pointer" />
                        <div className="p-2 flex justify-between items-center">
                          <button onClick={() => viewImage(p)} className="text-[10px] font-black text-blue-600">Открыть</button>
                          <a href={p} download={`photo-${i}.jpg`} className="text-[10px] font-black text-gray-500">Скачать</a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        

        {isCreateRequestOpen && selectedBreakdownDetail && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-neo-bg w-full max-w-xl rounded-[2.5rem] shadow-neo p-6 animate-in zoom-in border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black uppercase">Создать заявку снабжения</h3>
                <button onClick={() => setIsCreateRequestOpen(false)} className="p-2 rounded-xl text-gray-400"><X size={18}/></button>
              </div>
              <div className="space-y-3">
                {requestItems.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input className="col-span-3 p-2 rounded-xl bg-neo-bg border border-white/5" placeholder="Артикул" value={it.sku || ''} onChange={e => { const arr = [...requestItems]; arr[idx].sku = e.target.value; setRequestItems(arr); }} />
                    <input className="col-span-7 p-2 rounded-xl bg-neo-bg border border-white/5" placeholder="Наименование" value={it.name} onChange={e => { const arr=[...requestItems]; arr[idx].name = e.target.value; setRequestItems(arr); }} />
                    <input className="col-span-2 p-2 rounded-xl bg-neo-bg border border-white/5" placeholder="Кол-во" value={it.quantity} onChange={e => { const arr=[...requestItems]; arr[idx].quantity = e.target.value; setRequestItems(arr); }} />
                  </div>
                ))}
                <div className="flex gap-2">
                  <button onClick={() => setRequestItems([...requestItems, { name: '', quantity: '1' }])} className="py-2 px-3 rounded-xl bg-neo-bg border border-white/5 font-black">Добавить позицию</button>
                  <button onClick={() => setRequestItems(requestItems.slice(0, -1))} className="py-2 px-3 rounded-xl bg-neo-bg border border-white/5 font-black">Удалить позицию</button>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => {
                    // submit request
                    const title = requestItems.map(i => `${i.name} x${i.quantity}`).slice(0,3).join(', ') || `Запрос по акту ${selectedBreakdownDetail.id}`;
                    const req = {
                      id: `pr-${Math.random().toString(36).substr(2,9)}`,
                      title,
                      status: 'Новая' as any,
                      items: requestItems.map((it, idx) => ({ id: `i-${idx}-${Date.now()}`, name: it.name, quantity: it.quantity })),
                      createdAt: new Date().toISOString(),
                      equipmentId: selectedBreakdownDetail.equipmentId,
                      breakdownId: selectedBreakdownDetail.id
                    };
                    addRequest(req as any);
                    // set breakdown status to 'Запчасти заказаны'
                    updateBreakdownStatus(selectedBreakdownDetail.id, 'Запчасти заказаны');
                    setIsCreateRequestOpen(false);
                    setSelectedBreakdownDetail(null);
                  }} className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-black uppercase text-xs">Отправить в снабжение</button>
                  <button onClick={() => setIsCreateRequestOpen(false)} className="flex-1 py-3 rounded-2xl bg-neo-bg border border-white/10 font-black uppercase text-xs">Отмена</button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Модалка ТО */}
      {isTOModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-neo-bg w-full max-w-2xl rounded-[2.5rem] md:rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/20">
            <div className="flex justify-between items-center mb-6 md:mb-10">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">Проведение ТО</h2>
              <button onClick={()=>setIsTOModalOpen(false)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all"><X size={24}/></button>
            </div>
            <div className="space-y-6 md:space-y-8">
              <div className="p-4 md:p-6 rounded-[1.5rem] shadow-neo-inset bg-neo-bg">
                <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Тип ТО</p>
                <div className="font-black text-lg mb-3">{toTypeLabel || 'Плановое ТО'}</div>
                <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Наработка при ТО (М/Ч)</p>
                <input type="number" value={toHoursInput as any} onChange={e=>setToHoursInput(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full text-3xl font-black text-blue-600 bg-transparent outline-none" />
              </div>

              <div className="p-4 md:p-6 rounded-[1.5rem] shadow-neo bg-neo-bg">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Чек-лист работ</p>
                <div className="space-y-3">
                  {toChecklist.length === 0 && <p className="text-sm text-gray-400">Нет задач в регламенте — добавьте вручную.</p>}
                  {toChecklist.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <input type="checkbox" checked={item.done} onChange={e=>{
                        const arr = [...toChecklist]; arr[idx] = { ...arr[idx], done: e.target.checked }; setToChecklist(arr);
                      }} className="mt-1" />
                      <div className="flex-1">
                        <div className="font-black uppercase text-sm">{item.text}</div>
                        <input placeholder="Примечание" value={item.note || ''} onChange={e=>{ const arr=[...toChecklist]; arr[idx] = { ...arr[idx], note: e.target.value }; setToChecklist(arr); }} className="w-full p-2 mt-1 rounded-lg bg-neo-bg shadow-neo-inset text-xs font-black uppercase text-gray-700 dark:text-gray-200 outline-none" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleFinishTO} className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs shadow-lg tracking-widest mt-2">Сохранить акт ТО</button>
            </div>
          </div>
        </div>
      )}

      {selectedBreakdownDetail && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-neo-bg w-full max-w-lg rounded-[2.5rem] md:rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/20 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 md:mb-10 sticky top-0 bg-neo-bg">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">Обновить статус</h2>
              <button onClick={() => setSelectedBreakdownDetail(null)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all"><X size={20}/></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (selectedBreakdownDetail) {
                updateBreakdownStatus(selectedBreakdownDetail.id, breakdownStatusForm.status, breakdownStatusForm.fixedDate);
                setSelectedBreakdownDetail(null);
              }
            }} className="space-y-5 md:space-y-6">
              <div className="space-y-2">
                <p className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Деталь</p>
                <p className="text-sm font-black text-gray-700 dark:text-gray-200">{selectedBreakdownDetail.partName}</p>
              </div>
              {selectedBreakdownDetail.photos && selectedBreakdownDetail.photos.length > 0 && (
                <div className="p-4 rounded-xl bg-neo-bg border border-white/10">
                  <h3 className="text-xs font-black text-gray-400 uppercase mb-3">Фотографии</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedBreakdownDetail.photos.map((p: string, i: number) => (
                      <div key={i} className="rounded-lg overflow-hidden border">
                        <img src={p} onClick={() => viewImage(p)} className="w-full h-24 object-cover cursor-pointer" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsCreateRequestOpen(true)} className="py-3 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs">Создать заявку снабжения</button>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(selectedBreakdownDetail.partName || ''); alert('Название скопировано'); }} className="py-3 px-4 rounded-2xl bg-neo-bg border border-white/10 font-black uppercase text-xs">Копировать название</button>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Новый статус</label>
                <select className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none font-black text-xs uppercase text-gray-700 dark:text-gray-200 outline-none" value={breakdownStatusForm.status} onChange={e=>setBreakdownStatusForm({...breakdownStatusForm, status: e.target.value as any})}>
                  <option>Новая</option><option>Запчасти заказаны</option><option>Запчасти получены</option><option>В работе</option><option>Исправлено</option>
                </select>
              </div>
              {breakdownStatusForm.status === 'Исправлено' && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Дата ввода в эксплуатацию</label>
                  <input type="date" value={breakdownStatusForm.fixedDate} onChange={e=>setBreakdownStatusForm({...breakdownStatusForm, fixedDate: e.target.value})} className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none font-black text-xs text-gray-700 dark:text-gray-200 outline-none" />
                </div>
              )}
              <button type="submit" className="w-full py-5 rounded-2xl bg-neo-bg shadow-neo text-blue-600 font-black uppercase text-xs tracking-[0.2em] active:scale-95 transition-all mt-4 border border-blue-500/10 hover:shadow-neo-inset">Обновить</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

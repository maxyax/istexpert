
import React, { useState } from 'react';
import { Wrench, AlertTriangle, History, ChevronLeft, Plus, X, ClipboardCheck, Truck, LayoutGrid, List, Edit3, Camera, Package, CheckCircle2, Wallet } from 'lucide-react';
import { useFleetStore } from '../store/useFleetStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useProcurementStore } from '../store/useProcurementStore';
import { useAuthStore } from '../store/useAuthStore';
import { EquipStatus } from '../types';
import { formatNumber, formatMoney, formatDate, formatDateTime } from '../utils/format';

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

const computeEquipmentStatus = (equipmentId: string, breakdowns: any[], plannedTOs: any[], equipment: any[]) => {
  const activeBreakdowns = breakdowns.filter(b => b.equipmentId === equipmentId && b.status !== 'Исправлено');
  const equip = equipment.find(e => e.id === equipmentId);

  // 1. Проверка критических поломок - техника в ремонте
  const criticalBreakdowns = activeBreakdowns.filter(b => b.severity === 'Критическая');
  if (criticalBreakdowns.length > 0) return EquipStatus.REPAIR;

  // 2. Проверка поломок в работе
  const inWorkBreakdowns = activeBreakdowns.filter(b => b.status === 'В работе');
  if (inWorkBreakdowns.length > 0) return EquipStatus.REPAIR;

  // 3. Проверка ожидания запчастей
  const waitingForParts = activeBreakdowns.filter(b => b.status === 'Запчасти заказаны' || b.status === 'Запчасти получены');
  if (waitingForParts.length > 0) return EquipStatus.WAITING_PARTS;

  // 4. Проверка незначительных поломок (низкая/средняя серьезность)
  const minorBreakdowns = activeBreakdowns.filter(b =>
    (b.severity === 'Низкая' || b.severity === 'Средняя') &&
    b.status === 'Новая'
  );
  if (minorBreakdowns.length > 0) return EquipStatus.ACTIVE_WITH_RESTRICTIONS;

  // 5. Проверка просроченного ТО по пробегу/моточасам
  if (equip && equip.regulations && equip.regulations.length > 0) {
    const currHours = equip.hours || 0;
    const currKm = equip.mileage_km || 0;
    
    for (const reg of equip.regulations) {
      const intervalHours = reg.intervalHours || 0;
      const intervalKm = reg.intervalKm || 0;
      
      let nextHours = intervalHours > 0 ? Math.ceil(currHours / intervalHours) * intervalHours : Infinity;
      let nextKm = intervalKm > 0 ? Math.ceil(currKm / intervalKm) * intervalKm : Infinity;
      
      const hoursOverdue = intervalHours > 0 && currHours >= nextHours;
      const kmOverdue = intervalKm > 0 && currKm >= nextKm;
      
      if (hoursOverdue || kmOverdue) return EquipStatus.MAINTENANCE;
    }
  }

  // 6. Проверка просроченного ТО по календарю
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const overduePlannedTO = plannedTOs.filter(t => {
    if (t.equipmentId !== equipmentId || t.status !== 'planned') return false;
    const plannedDate = new Date(t.date);
    plannedDate.setHours(0, 0, 0, 0);
    return plannedDate < today;
  });
  
  if (overduePlannedTO.length > 0) return EquipStatus.MAINTENANCE;

  // 7. Проверка предстоящего планового ТО
  const upcomingPlannedTO = plannedTOs.filter(t => t.equipmentId === equipmentId && t.status === 'planned');
  if (upcomingPlannedTO.length > 0) return EquipStatus.MAINTENANCE;

  // 8. Техника в работе
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
  const [requestPhotos, setRequestPhotos] = useState<string[]>([]);

  const [toChecklist, setToChecklist] = useState<{ text: string; done: boolean; note?: string }[]>([]);
  const [toTypeLabel, setToTypeLabel] = useState<string>('');
  const [toHoursInput, setToHoursInput] = useState<number | ''>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<any>(null);
  const [selectedBreakdownDetail, setSelectedBreakdownDetail] = useState<any>(null);
  const [breakdownStatusForm, setBreakdownStatusForm] = useState({ status: 'Новая' as any, fixedDate: new Date().toISOString().slice(0, 10), hoursAtFix: undefined as number | undefined, mileageAtFix: undefined as number | undefined, fixNotes: '' as string });

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
            <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-6 md:mb-10 flex items-center gap-2"><AlertTriangle size={16} className="text-red-600"/> Список поломок</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
              {(() => {
                // Показываем только активные (не исправленные) поломки
                const activeBreakdowns = breakdowns.filter(b => 
                  b.equipmentId === selectedEquip.id && 
                  b.status !== 'Исправлено'
                );
                
                if (activeBreakdowns.length === 0) {
                  return (
                    <div className="text-center py-12 md:py-20">
                      <div className="w-16 h-16 rounded-full shadow-neo mx-auto mb-6 flex items-center justify-center text-emerald-500 bg-emerald-500/10">
                        <CheckCircle2 size={32}/>
                      </div>
                      <p className="text-[9px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest">Все поломки исправлены</p>
                      <p className="text-[8px] text-gray-400 mt-2">История доступна во вкладке "Архив обслуживания"</p>
                    </div>
                  );
                }
                
                return activeBreakdowns.map(b => {
                  const relatedRequest = useProcurementStore.getState().requests.find(r => r.breakdownId === b.id);
                  const isReadyToWork = relatedRequest?.status === 'На складе' && b.status !== 'В работе' && b.status !== 'Исправлено';
                  
                  return (
                  <div key={b.id} className={`p-4 md:p-6 rounded-2xl shadow-neo-sm bg-neo-bg flex flex-col gap-3 border-l-4 ${breakdownBorderClass(b.status)} group hover:shadow-neo transition-all ${isReadyToWork ? 'ring-2 ring-emerald-500 ring-offset-2 animate-pulse' : ''}`}>
                    {isReadyToWork && (
                      <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-3">
                        <div className="p-2 rounded-full bg-emerald-500 text-white animate-bounce">
                          <CheckCircle2 size={16}/>
                        </div>
                        <div className="flex-1">
                          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Готово к работе!</p>
                          <p className="text-xs font-bold text-emerald-600">Запчасти на складе — можно брать в работу</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedBreakdownDetail(b);
                            setBreakdownStatusForm({ status: 'В работе', fixedDate: new Date().toISOString().slice(0, 10), hoursAtFix: undefined, mileageAtFix: undefined, fixNotes: '' });
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black uppercase text-[8px] hover:bg-emerald-700 transition-all"
                        >
                          В работу
                        </button>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start">
                      <div className="overflow-hidden flex-1 cursor-pointer" onClick={() => setSelectedBreakdownDetail(b)}>
                        <p className="text-xs md:text-sm font-black uppercase text-gray-700 dark:text-gray-200 truncate">{b.partName}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">{b.status} • {b.node}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        {!relatedRequest && (
                          <button
                            onClick={() => {
                              setSelectedBreakdownDetail(b);
                              setIsCreateRequestOpen(true);
                            }}
                            className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-black uppercase text-[8px] hover:bg-emerald-700 transition-all"
                            title="Создать заявку в снабжение"
                          >
                            Заявка
                          </button>
                        )}
                        <button onClick={() => setSelectedBreakdownDetail(b)} className="p-2 rounded-xl shadow-neo text-gray-400 hover:text-blue-500 transition-all"><Edit3 size={14}/></button>
                      </div>
                    </div>

                    {/* Прогресс-бар статусов снабжения */}
                    {relatedRequest && !isReadyToWork && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-1 mb-1">
                          <div className={`flex-1 h-1.5 rounded-full ${
                            ['Новая', 'Поиск', 'Оплачено', 'В пути', 'На складе'].includes(relatedRequest.status) ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                          }`}/>
                          <div className={`flex-1 h-1.5 rounded-full ${
                            ['Поиск', 'Оплачено', 'В пути', 'На складе'].includes(relatedRequest.status) ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
                          }`}/>
                          <div className={`flex-1 h-1.5 rounded-full ${
                            ['Оплачено', 'В пути', 'На складе'].includes(relatedRequest.status) ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-700'
                          }`}/>
                          <div className={`flex-1 h-1.5 rounded-full ${
                            ['В пути', 'На складе'].includes(relatedRequest.status) ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-700'
                          }`}/>
                          <div className={`flex-1 h-1.5 rounded-full ${
                            ['На складе'].includes(relatedRequest.status) ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
                          }`}/>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`text-[7px] font-black uppercase ${
                            relatedRequest.status === 'На складе' ? 'text-emerald-600' :
                            relatedRequest.status === 'В пути' ? 'text-indigo-600' :
                            relatedRequest.status === 'Оплачено' ? 'text-orange-600' :
                            relatedRequest.status === 'Поиск' ? 'text-blue-600' :
                            'text-gray-400'
                          }`}>{relatedRequest.status}</span>
                          {relatedRequest.status === 'На складе' && (
                            <span className="text-[7px] font-black text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 size={10}/> Готово
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                });
              })()}
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
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">{r.performedBy} • {formatNumber(r.hoursAtMaintenance)} м/ч</p>
                    </div>
                    <span className="text-[9px] md:text-[10px] font-black text-gray-400 shrink-0 ml-4">{r.date}</span>
                  </div>
                );
              })}
              {records.filter(r => r.equipmentId === selectedEquip.id).length === 0 && <p className="text-center py-12 md:py-20 text-gray-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">История пуста</p>}
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
                    <label className="text-xs font-bold text-gray-400 ml-2">Узел техники</label>
                    <select className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none text-gray-700 dark:text-gray-200 outline-none app-input" value={breakdownForm.node} onChange={e=>setBreakdownForm({...breakdownForm, node: e.target.value})}>
                       <option>Двигатель</option><option>Гидравлика</option><option>Ходовая часть</option><option>Электроника</option><option>Кузов</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 ml-2">Деталь / Запчасть</label>
                    <input className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none text-gray-700 dark:text-gray-200 outline-none app-input" placeholder="Введите название..." value={breakdownForm.partName} onChange={e=>setBreakdownForm({...breakdownForm, partName: e.target.value})} required />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-400 ml-2">Дата поломки</label>
                     <input type="date" value={breakdownForm.date} onChange={e=>setBreakdownForm({...breakdownForm, date: e.target.value})} className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none text-gray-700 dark:text-gray-200 outline-none app-input" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-400 ml-2">Пробег / Наработка</label>
                     <input type="number" value={breakdownForm.hoursAtBreakdown as any || ''} onChange={e=>setBreakdownForm({...breakdownForm, hoursAtBreakdown: e.target.value ? parseInt(e.target.value) : undefined})} className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none text-gray-700 dark:text-gray-200 outline-none app-input" />
                   </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <input placeholder="ФИО механика" value={breakdownForm.mechanic} onChange={e=>setBreakdownForm({...breakdownForm, mechanic: e.target.value})} className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none text-gray-700 dark:text-gray-200 outline-none app-input" />
                   <input placeholder="Кто обнаружил (водитель)" value={breakdownForm.driver} onChange={e=>setBreakdownForm({...breakdownForm, driver: e.target.value})} className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none text-gray-700 dark:text-gray-200 outline-none app-input" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 ml-2">Серьезность</label>
                    <div className="flex gap-3">
                       {['Низкая', 'Средняя', 'Критическая'].map(s => (
                         <button key={s} type="button" onClick={()=>setBreakdownForm({...breakdownForm, severity: s as any})} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${breakdownForm.severity === s ? 'bg-neo-bg shadow-neo-inset text-red-600 border border-red-500/20' : 'shadow-neo text-gray-400 hover:text-gray-600'}`}>{s}</button>
                       ))}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 ml-2">Примечания</label>
                    <textarea value={breakdownForm.description} onChange={e=>setBreakdownForm({...breakdownForm, description: e.target.value})} placeholder="Описание и примечания" className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none h-24 text-gray-700 dark:text-gray-200 outline-none app-input" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 ml-2">Фотографии (узел/шильдик/маркировка)</label>
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
                  <p className="text-sm font-black text-gray-700 dark:text-gray-200">{formatNumber(selectedRecordDetail.hoursAtMaintenance)} м/ч</p>
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
            <div className="bg-neo-bg w-full max-w-2xl rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/20 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 md:mb-8 sticky top-0 bg-neo-bg">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-2xl shadow-neo bg-neo-bg text-blue-500"><Truck size={28}/></div>
                  <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">Заявка снабжения</h3>
                </div>
                <button onClick={() => setIsCreateRequestOpen(false)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all"><X size={20}/></button>
              </div>
              
              <div className="space-y-6">
                <div className="p-6 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/5 space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400">Номер акта</label>
                    <div className="text-xl font-black text-blue-600">{selectedBreakdownDetail.actNumber || 'АКТ-001'}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400">Наименование заявки</label>
                    <input className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none outline-none app-input" placeholder={`Запрос по акту: ${selectedBreakdownDetail.partName || 'Запчасть'}`} />
                  </div>
                </div>

                <div className="p-6 rounded-2xl shadow-neo bg-neo-bg border border-white/5">
                  <p className="text-xs font-bold text-gray-400 mb-3">Позиции</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2 items-center text-[10px] font-bold text-gray-500 mb-2">
                      <div className="col-span-4">Артикул</div>
                      <div className="col-span-4">Наименование</div>
                      <div className="col-span-3">Кол-во</div>
                      <div className="col-span-1"></div>
                    </div>
                    {requestItems.map((it, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white/5 p-3 rounded-2xl">
                        <input className="col-span-4 p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none outline-none app-input" placeholder="Артикул" value={it.sku || ''} onChange={e => { const arr = [...requestItems]; arr[idx].sku = e.target.value; setRequestItems(arr); }} />
                        <input className="col-span-4 p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none outline-none app-input" placeholder="Наименование" value={it.name} onChange={e => { const arr=[...requestItems]; arr[idx].name = e.target.value; setRequestItems(arr); }} />
                        <input type="number" className="col-span-3 p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none outline-none app-input" placeholder="Кол-во" value={it.quantity} onChange={e => { const arr=[...requestItems]; arr[idx].quantity = e.target.value; setRequestItems(arr); }} />
                        <button className="col-span-1 text-red-500 font-bold text-lg hover:text-red-600 transition-colors" onClick={() => { const arr = [...requestItems]; arr.splice(idx, 1); setRequestItems(arr); }}>×</button>
                      </div>
                    ))}
                    <button onClick={() => setRequestItems([...requestItems, { name: '', quantity: '1' }])} className="mt-3 px-4 py-3 rounded-2xl bg-neo-bg border border-white/5 font-bold text-xs shadow-neo hover:shadow-neo-inset transition-all">+ Добавить позицию</button>
                  </div>
                </div>

                <div className="p-6 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/5">
                  <label className="text-xs font-bold text-gray-400">Фотографии запчасти / шильдика / маркировки</label>
                  <div className="flex gap-3 items-center mt-3">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      {requestPhotos.map((p, i) => (
                        <div key={i} className="w-full h-20 rounded-lg overflow-hidden relative border border-white/10 cursor-pointer hover:border-blue-500 transition-colors" onClick={() => viewImage(p)}>
                          <img src={p} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e: any) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (evt) => { const url = evt.target?.result as string; setRequestPhotos([...requestPhotos, url]); }; reader.readAsDataURL(file); }; input.click(); }} className="p-3 rounded-xl shadow-neo text-blue-600 hover:shadow-neo-inset transition-all"><Camera size={20}/></button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => {
                    // submit request
                    const title = requestItems.map(i => `${i.name} x${i.quantity}`).slice(0,3).join(', ') || `Запрос по акту ${selectedBreakdownDetail.actNumber || selectedBreakdownDetail.id}`;
                    const req = {
                      id: `pr-${Math.random().toString(36).substr(2,9)}`,
                      title,
                      status: 'Новая' as any,
                      items: requestItems.map((it, idx) => ({ id: `i-${idx}-${Date.now()}`, name: it.name, quantity: it.quantity, unitPriceWithVAT: 0, total: 0 })),
                      createdAt: new Date().toISOString(),
                      equipmentId: selectedBreakdownDetail.equipmentId,
                      breakdownId: selectedBreakdownDetail.id,
                      breakdownActNumber: selectedBreakdownDetail.actNumber,
                      breakdownName: selectedBreakdownDetail.partName,
                      breakdownDescription: selectedBreakdownDetail.description,
                      breakdownNode: selectedBreakdownDetail.node,
                      breakdownPhotos: requestPhotos.map((url, i) => ({ id: `p-${i}`, name: `Фото ${i + 1} (акт)`, url, type: 'image' }))
                    };
                    addRequest(req as any);
                    // set breakdown status to 'Запчасти заказаны'
                    updateBreakdownStatus(selectedBreakdownDetail.id, 'Запчасти заказаны');
                    setIsCreateRequestOpen(false);
                    setSelectedBreakdownDetail(null);
                    setRequestItems([]);
                    setRequestPhotos([]);
                  }} className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-black uppercase text-xs shadow-neo hover:shadow-neo-inset transition-all">Отправить в снабжение</button>
                  <button onClick={() => { setIsCreateRequestOpen(false); setRequestItems([]); }} className="flex-1 py-3 rounded-2xl bg-neo-bg border border-white/10 font-black uppercase text-xs shadow-neo hover:shadow-neo-inset transition-all">Отмена</button>
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

      {selectedBreakdownDetail && (() => {
        // Найти связанную заявку снабжения
        const relatedRequest = useProcurementStore.getState().requests.find(r => r.breakdownId === selectedBreakdownDetail.id);
        const equipment = useFleetStore.getState().equipment.find(e => e.id === selectedBreakdownDetail.equipmentId);
        
        return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-neo-bg w-full max-w-2xl rounded-[2.5rem] md:rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/20 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 md:mb-8 sticky top-0 bg-neo-bg z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl shadow-neo bg-neo-bg text-red-500"><AlertTriangle size={24}/></div>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">Карточка поломки</h2>
              </div>
              <button onClick={() => setSelectedBreakdownDetail(null)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all"><X size={20}/></button>
            </div>
            
            <div className="space-y-5 md:space-y-6">
              {/* Основная информация */}
              <div className="p-5 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Номер акта</p>
                    <p className="text-lg font-black text-blue-600">{selectedBreakdownDetail.actNumber || 'АКТ-001'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Дата</p>
                    <p className="text-sm font-black text-gray-700">{formatDate(selectedBreakdownDetail.date)}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/5">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Наименование поломки</p>
                  <p className="text-base font-black text-gray-800 dark:text-gray-200">{selectedBreakdownDetail.partName}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Узел</p>
                    <p className="text-sm font-bold text-gray-700">{selectedBreakdownDetail.node}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Серьезность</p>
                    <p className={`text-sm font-black px-2 py-1 rounded-lg inline-block ${
                      selectedBreakdownDetail.severity === 'Критическая' ? 'bg-red-500/20 text-red-600' :
                      selectedBreakdownDetail.severity === 'Средняя' ? 'bg-orange-500/20 text-orange-600' :
                      'bg-green-500/20 text-green-600'
                    }`}>{selectedBreakdownDetail.severity}</p>
                  </div>
                </div>
                {selectedBreakdownDetail.description && (
                  <div className="pt-3 border-t border-white/5">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Описание</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{selectedBreakdownDetail.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Техника</p>
                    <p className="text-sm font-bold text-gray-700 truncate">{equipment?.name || 'Неизвестно'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Наработка</p>
                    <p className="text-sm font-bold text-gray-700">{selectedBreakdownDetail.hoursAtBreakdown || '—'} м/ч</p>
                  </div>
                </div>
              </div>

              {/* Статус поломки и заявка снабжения */}
              <div className="p-5 rounded-2xl shadow-neo bg-neo-bg border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Статус поломки</h3>
                  <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${
                    selectedBreakdownDetail.status === 'Исправлено' ? 'bg-emerald-500 text-white' :
                    selectedBreakdownDetail.status === 'В работе' ? 'bg-blue-500 text-white' :
                    selectedBreakdownDetail.status === 'Запчасти получены' ? 'bg-emerald-400 text-white' :
                    selectedBreakdownDetail.status === 'Запчасти заказаны' ? 'bg-yellow-500 text-white' :
                    'bg-gray-400 text-white'
                  }`}>{selectedBreakdownDetail.status}</span>
                </div>

                {relatedRequest ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-3">
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-blue-500"/>
                        <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Заявка снабжения</p>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{relatedRequest.title}</p>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                          relatedRequest.status === 'На складе' ? 'bg-indigo-500 text-white' :
                          relatedRequest.status === 'В пути' ? 'bg-orange-500 text-white' :
                          relatedRequest.status === 'Оплачено' ? 'bg-emerald-500 text-white' :
                          relatedRequest.status === 'Поиск' ? 'bg-blue-500 text-white' :
                          'bg-gray-400 text-white'
                        }`}>{relatedRequest.status}</span>
                      </div>
                      {relatedRequest.cost && (
                        <p className="text-xs font-black text-emerald-600">{formatMoney(relatedRequest.cost)}</p>
                      )}
                      
                      {/* Прогресс-бар статусов снабжения */}
                      <div className="pt-3 border-t border-blue-500/20">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3">Статус заявки</p>
                        <div className="flex items-center gap-1">
                          <div className={`flex-1 h-2 rounded-full ${
                            ['Новая', 'Поиск', 'Оплачено', 'В пути', 'На складе'].includes(relatedRequest.status) ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                          }`}/>
                          <div className={`flex-1 h-2 rounded-full ${
                            ['Поиск', 'Оплачено', 'В пути', 'На складе'].includes(relatedRequest.status) ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
                          }`}/>
                          <div className={`flex-1 h-2 rounded-full ${
                            ['Оплачено', 'В пути', 'На складе'].includes(relatedRequest.status) ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-700'
                          }`}/>
                          <div className={`flex-1 h-2 rounded-full ${
                            ['В пути', 'На складе'].includes(relatedRequest.status) ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-700'
                          }`}/>
                          <div className={`flex-1 h-2 rounded-full ${
                            ['На складе'].includes(relatedRequest.status) ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
                          }`}/>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className={`text-[7px] font-black uppercase ${relatedRequest.status === 'Новая' ? 'text-emerald-600' : 'text-gray-400'}`}>Новая</span>
                          <span className={`text-[7px] font-black uppercase ${relatedRequest.status === 'Поиск' ? 'text-blue-600' : 'text-gray-400'}`}>Поиск</span>
                          <span className={`text-[7px] font-black uppercase ${relatedRequest.status === 'Оплачено' ? 'text-orange-600' : 'text-gray-400'}`}>Оплачено</span>
                          <span className={`text-[7px] font-black uppercase ${relatedRequest.status === 'В пути' ? 'text-indigo-600' : 'text-gray-400'}`}>В пути</span>
                          <span className={`text-[7px] font-black uppercase ${relatedRequest.status === 'На складе' ? 'text-emerald-600' : 'text-gray-400'}`}>Склад</span>
                        </div>
                      </div>
                      
                      {/* Подсказка для механика */}
                      {relatedRequest.status === 'На складе' && selectedBreakdownDetail.status !== 'В работе' && selectedBreakdownDetail.status !== 'Исправлено' && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 size={16} className="text-emerald-500 mt-0.5"/>
                            <div>
                              <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Готово к работе</p>
                              <p className="text-xs text-gray-600 dark:text-gray-300">Запчасти на складе. Механик может взять поломку в работу.</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {relatedRequest.status === 'Оплачено' && (
                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                          <div className="flex items-start gap-2">
                            <Wallet size={16} className="text-blue-500 mt-0.5"/>
                            <div>
                              <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Счет оплачен</p>
                              <p className="text-xs text-gray-600 dark:text-gray-300">Запчасти оплачены, ожидаем доставку.</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {relatedRequest.status === 'В пути' && (
                        <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                          <div className="flex items-start gap-2">
                            <Truck size={16} className="text-orange-500 mt-0.5"/>
                            <div>
                              <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest mb-1">В пути</p>
                              <p className="text-xs text-gray-600 dark:text-gray-300">Запчасти в пути на склад.</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-gray-500/10 border border-gray-500/20">
                    <p className="text-sm text-gray-500">Заявка снабжения еще не создана</p>
                  </div>
                )}
              </div>

              {/* Фотографии */}
              {selectedBreakdownDetail.photos && selectedBreakdownDetail.photos.length > 0 && (
                <div className="p-5 rounded-2xl shadow-neo bg-neo-bg border border-white/5">
                  <h3 className="text-xs font-black text-gray-400 uppercase mb-3 tracking-widest">Фотографии поломки</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedBreakdownDetail.photos.map((p: string, i: number) => (
                      <div key={i} className="rounded-lg overflow-hidden border border-white/10 cursor-pointer hover:border-blue-500 transition-colors" onClick={() => viewImage(p)}>
                        <img src={p} className="w-full h-24 object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Действия */}
              <div className="flex gap-3">
                {!relatedRequest ? (
                  <button type="button" onClick={() => setIsCreateRequestOpen(true)} className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs leading-tight shadow-neo hover:shadow-neo-inset transition-all">Создать заявку снабжения</button>
                ) : (
                  <button type="button" onClick={() => {
                    setSelectedBreakdownDetail(null);
                    useProcurementStore.getState().setSelectedRequestId(relatedRequest.id);
                  }} className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs leading-tight shadow-neo hover:shadow-neo-inset transition-all">Открыть заявку снабжения</button>
                )}
                <button type="button" onClick={() => { navigator.clipboard?.writeText(selectedBreakdownDetail.partName || ''); alert('Название скопировано'); }} className="flex-1 py-4 rounded-2xl bg-neo-bg border border-white/10 font-black uppercase text-xs leading-tight shadow-neo hover:shadow-neo-inset transition-all">Копировать название</button>
              </div>
              
              {/* Кнопка редактирования статуса */}
              <div className="space-y-3">
                {/* Кнопка "Исправлено без запчастей" - доступна всегда */}
                {selectedBreakdownDetail.status !== 'Исправлено' && (
                  <button
                    type="button"
                    onClick={() => {
                      setBreakdownStatusForm({ 
                        status: 'Исправлено', 
                        fixedDate: new Date().toISOString().slice(0, 10), 
                        hoursAtFix: selectedBreakdownDetail.hoursAtBreakdown,
                        mileageAtFix: undefined,
                        fixNotes: ''
                      });
                    }}
                    className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase text-xs tracking-[0.2em] active:scale-95 transition-all hover:bg-emerald-700"
                  >
                    ✓ Исправлено без запчастей
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    setBreakdownStatusForm({ status: selectedBreakdownDetail.status, fixedDate: selectedBreakdownDetail.fixedDate || new Date().toISOString().slice(0, 10), hoursAtFix: undefined, mileageAtFix: undefined, fixNotes: '' });
                  }}
                  className="w-full py-4 rounded-2xl bg-neo-bg shadow-neo text-blue-600 font-black uppercase text-xs tracking-[0.2em] active:scale-95 transition-all border border-blue-500/10 hover:shadow-neo-inset"
                >
                  Изменить статус
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Форма обновления статуса */}
      {selectedBreakdownDetail && (
        <div className="fixed inset-0 z-[215] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md pointer-events-none">
          <div className="bg-neo-bg w-full max-w-lg rounded-[2.5rem] md:rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/20 pointer-events-auto">
            <div className="flex justify-between items-center mb-6 md:mb-10 sticky top-0 bg-neo-bg">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">Обновить статус</h2>
              <button onClick={() => setSelectedBreakdownDetail(null)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all"><X size={20}/></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (selectedBreakdownDetail) {
                updateBreakdownStatus(
                  selectedBreakdownDetail.id,
                  breakdownStatusForm.status,
                  breakdownStatusForm.fixedDate,
                  (breakdownStatusForm as any).hoursAtFix,
                  (breakdownStatusForm as any).mileageAtFix,
                  (breakdownStatusForm as any).fixNotes
                );
                setSelectedBreakdownDetail(null);
              }
            }} className="space-y-5 md:space-y-6">
              <div className="space-y-2">
                <p className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Деталь</p>
                <p className="text-sm font-black text-gray-700 dark:text-gray-200">{selectedBreakdownDetail.partName}</p>
              </div>

              {/* Проверка доступности статуса "В работе" */}
              {(() => {
                const relatedReq = useProcurementStore.getState().requests.find(r => r.breakdownId === selectedBreakdownDetail.id);
                const canTakeToWork = relatedReq && relatedReq.status === 'На складе';
                
                return (
                  <>
                    {breakdownStatusForm.status === 'В работе' && !canTakeToWork && (
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={16} className="text-red-500 mt-0.5"/>
                          <div>
                            <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-1">Недоступно</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              {relatedReq 
                                ? `Запчасти еще не на складе. Текущий статус: ${relatedReq.status}`
                                : 'Заявка в снабжение еще не создана'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {canTakeToWork && (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-emerald-500 mt-0.5"/>
                          <div>
                            <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Доступно</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">Запчасти на складе. Можно брать в работу.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Новый статус</label>
                <select
                  className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none font-black text-xs uppercase text-gray-700 dark:text-gray-200 outline-none"
                  value={breakdownStatusForm.status}
                  onChange={e => {
                    const newStatus = e.target.value as any;
                    const relatedReq = useProcurementStore.getState().requests.find(r => r.breakdownId === selectedBreakdownDetail.id);
                    // Блокируем установку "В работе" если запчасти не на складе
                    if (newStatus === 'В работе' && (!relatedReq || relatedReq.status !== 'На складе')) {
                      return;
                    }
                    setBreakdownStatusForm({...breakdownStatusForm, status: newStatus});
                  }}
                >
                  <option>Новая</option>
                  {(() => {
                    const relatedReq = useProcurementStore.getState().requests.find(r => r.breakdownId === selectedBreakdownDetail.id);
                    const canTakeToWork = relatedReq && relatedReq.status === 'На складе';
                    return <option disabled={!canTakeToWork}>В работе</option>;
                  })()}
                  <option>Исправлено</option>
                </select>
                {(() => {
                  const relatedReq = useProcurementStore.getState().requests.find(r => r.breakdownId === selectedBreakdownDetail.id);
                  const canTakeToWork = relatedReq && relatedReq.status === 'На складе';
                  return breakdownStatusForm.status === 'В работе' && !canTakeToWork && (
                    <p className="text-[8px] font-black text-orange-600">⚠ Статус "В работе" доступен только после получения запчастей со склада</p>
                  );
                })()}
              </div>
              {breakdownStatusForm.status === 'Исправлено' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Дата ввода в эксплуатацию</label>
                    <input type="date" value={breakdownStatusForm.fixedDate} onChange={e=>setBreakdownStatusForm({...breakdownStatusForm, fixedDate: e.target.value})} className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none font-black text-xs text-gray-700 dark:text-gray-200 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Наработка (м/ч)</label>
                      <input
                        type="number"
                        value={(breakdownStatusForm as any).hoursAtFix || ''}
                        onChange={e => setBreakdownStatusForm({...breakdownStatusForm, hoursAtFix: e.target.value ? parseInt(e.target.value) : undefined} as any)}
                        placeholder={selectedBreakdownDetail.hoursAtBreakdown?.toString() || '0'}
                        className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none font-black text-xs text-gray-700 dark:text-gray-200 outline-none"
                      />
                      <p className="text-[7px] text-gray-400">На момент поломки: {selectedBreakdownDetail.hoursAtBreakdown || '—'} м/ч</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Пробег (км)</label>
                      <input
                        type="number"
                        value={(breakdownStatusForm as any).mileageAtFix || ''}
                        onChange={e => setBreakdownStatusForm({...breakdownStatusForm, mileageAtFix: e.target.value ? parseInt(e.target.value) : undefined} as any)}
                        placeholder="0"
                        className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none font-black text-xs text-gray-700 dark:text-gray-200 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Примечания к исправлению</label>
                    <textarea
                      value={(breakdownStatusForm as any).fixNotes || ''}
                      onChange={e => setBreakdownStatusForm({...breakdownStatusForm, fixNotes: e.target.value} as any)}
                      placeholder="Опишите выполненные работы, замененные детали, рекомендации..."
                      className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none font-black text-xs text-gray-700 dark:text-gray-200 outline-none h-24 resize-none"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Примечание</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Заполните наработку/пробег если поломка была не критической и техника продолжала работать</p>
                  </div>
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

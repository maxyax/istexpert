
import React, { useState } from 'react';
import { Wrench, AlertTriangle, History, ChevronLeft, Plus, X, ClipboardCheck, Truck, LayoutGrid, List, Edit3, Camera, Package, CheckCircle2, Wallet, ChevronRight, Calendar } from 'lucide-react';
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

  // 2. Проверка поломок в работе - техника в ремонте
  const inWorkBreakdowns = activeBreakdowns.filter(b => b.status === 'В работе');
  if (inWorkBreakdowns.length > 0) return EquipStatus.REPAIR;

  // 3. Проверка ожидания запчастей - запчасти заказаны/в пути
  const waitingForParts = activeBreakdowns.filter(b => 
    (b.status === 'Запчасти заказаны' || b.status === 'Запчасти получены') &&
    b.severity !== 'Критическая'
  );
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

export const Maintenance: React.FC<{ onNavigate?: (page: string) => void }> = ({ onNavigate }) => {
  const { equipment } = useFleetStore();
  const { selectedMaintenanceEquipId, setSelectedMaintenanceEquipId, addMaintenance, addBreakdown, records, breakdowns, plannedTOs, updateBreakdownStatus, updatePlannedTO } = useMaintenanceStore();
  const { requests } = useProcurementStore();
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
  
  // Для выбора техники перед созданием поломки
  const [isBreakdownEquipSelectOpen, setIsBreakdownEquipSelectOpen] = useState(false);
  
  // Для выбора акта при создании заявки
  const [isBreakdownSelectOpen, setIsBreakdownSelectOpen] = useState(false);
  
  // Для выбора техники для ТО
  const [isTOEquipSelectOpen, setIsTOEquipSelectOpen] = useState(false);
  
  // Выбранная техника для заявки (из строки или сверху)
  const [requestEquipmentId, setRequestEquipmentId] = useState<string | null>(null);

  const [toChecklist, setToChecklist] = useState<{ text: string; done: boolean; note?: string }[]>([]);
  const [toTypeLabel, setToTypeLabel] = useState<string>('');
  const [toHoursInput, setToHoursInput] = useState<number | ''>('');
  const [toMileageInput, setToMileageInput] = useState<number | ''>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<any>(null);
  const [selectedBreakdownDetail, setSelectedBreakdownDetail] = useState<any>(null);
  const [breakdownStatusForm, setBreakdownStatusForm] = useState({ status: 'Новая' as any, fixedDate: new Date().toISOString().slice(0, 10), hoursAtFix: undefined as number | undefined, mileageAtFix: undefined as number | undefined, fixNotes: '' as string });
  
  // Состояние для открытия формы обновления статуса
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  
  // Последние зафиксированные значения для автозаполнения
  const [lastRecordedValues, setLastRecordedValues] = useState<{ hours?: number; mileage?: number } | null>(null);
  const [plannedTOForService, setPlannedTOForService] = useState<any>(null);

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

  // Получение последних зафиксированных значений моточасов и пробега
  const getLastRecordedValues = (equipmentId: string) => {
    // Собираем все записи с моточасами/пробегом
    const allRecords = [
      // Записи ТО
      ...records.filter(r => r.equipmentId === equipmentId).map(r => ({
        date: r.date,
        hours: r.hoursAtMaintenance,
        mileage: undefined,
        type: 'TO'
      })),
      // Записи поломок с исправлением
      ...breakdowns.filter(b => b.equipmentId === equipmentId && b.status === 'Исправлено' && b.hoursAtFix).map(b => ({
        date: b.fixedDate || b.date,
        hours: b.hoursAtFix,
        mileage: b.mileageAtFix,
        type: 'Поломка'
      })),
      // Записи заправок
      ...useMaintenanceStore.getState().fuelRecords.filter(f => f.equipmentId === equipmentId).map(f => ({
        date: f.date,
        hours: f.currentHours,
        mileage: f.currentMileage,
        type: 'Заправка'
      }))
    ];

    // Сортируем по дате (новые первые)
    allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Берем последнюю запись
    const last = allRecords[0];
    return {
      hours: last?.hours || undefined,
      mileage: last?.mileage || undefined
    };
  };

  const handleFinishTO = () => {
    if (!selectedMaintenanceEquipId) return;
    const equipToUpdate = equipment.find(eq => eq.id === selectedMaintenanceEquipId);
    if (!equipToUpdate) return;

    const hoursAt = typeof toHoursInput === 'number' && toHoursInput > 0 ? toHoursInput : equipToUpdate.hours;
    const mileageAt = typeof toMileageInput === 'number' && toMileageInput >= 0 ? toMileageInput : undefined;

    // Валидация: проверка что значения не меньше последних зафиксированных
    if (lastRecordedValues) {
      if (lastRecordedValues.hours && hoursAt < lastRecordedValues.hours) {
        alert(`Ошибка: наработка (${hoursAt} м/ч) не может быть меньше последней зафиксированной (${lastRecordedValues.hours} м/ч). Проверьте данные.`);
        return;
      }
      if (lastRecordedValues.mileage && mileageAt !== undefined && mileageAt < lastRecordedValues.mileage) {
        alert(`Ошибка: пробег (${mileageAt} км) не может быть меньше последнего зафиксированного (${lastRecordedValues.mileage} км). Проверьте данные.`);
        return;
      }
    }

    // Проверка на досрочное проведение ТО
    let isEarlyService = false;
    if (plannedTOForService) {
      const plannedDate = new Date(plannedTOForService.date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      isEarlyService = plannedDate > today;
    }

    // Предотвращение дублирования: проверяем, не было ли уже проведено ТО с этим plannedTOId
    if (plannedTOForService) {
      const alreadyCompleted = records.some(r => r.plannedTOId === plannedTOForService.id);
      if (alreadyCompleted) {
        alert('Это ТО уже было проведено ранее. Дублирование предотвращено.');
        setIsTOModalOpen(false);
        setToChecklist([]);
        setToTypeLabel('');
        setToHoursInput('');
        setToMileageInput('');
        setQrDataUrl('');
        setLastRecordedValues(null);
        setPlannedTOForService(null);
        return;
      }
    }

    addMaintenance({
      id: Math.random().toString(),
      equipmentId: selectedMaintenanceEquipId,
      date: new Date().toISOString().split('T')[0],
      type: toTypeLabel || 'Плановое ТО',
      hoursAtMaintenance: hoursAt,
      mileageAtMaintenance: mileageAt,
      performedBy: user?.full_name || 'Механик',
      checklistItems: toChecklist,
      isEarlyService: isEarlyService,
      plannedTOId: plannedTOForService?.id
    });

    // update equipment last hours
    useFleetStore.getState().updateEquipment(selectedMaintenanceEquipId, { hours: hoursAt, mileage_km: mileageAt !== undefined ? mileageAt : equipToUpdate.mileage_km });

    // Если ТО было запланировано - помечаем как выполненное
    if (plannedTOForService) {
      updatePlannedTO(plannedTOForService.id, { status: 'completed' });
    }

    setIsTOModalOpen(false);
    setToChecklist([]);
    setToTypeLabel('');
    setToHoursInput('');
    setToMileageInput('');
    setQrDataUrl('');
    setLastRecordedValues(null);
    setPlannedTOForService(null);
  };

  const openTOForEquip = (e: any, plannedTO?: any) => {
    setSelectedMaintenanceEquipId(e.id);
    
    // Получаем последние зафиксированные значения
    const lastValues = getLastRecordedValues(e.id);
    setLastRecordedValues(lastValues);
    setPlannedTOForService(plannedTO || null);
    
    const n = computeNextTO(e);
    let reg = null;
    if (plannedTO) {
      // Если ТО запланировано - используем его тип
      reg = e.regulations?.find((r: any) => r.type === plannedTO.type) || e.regulations?.[0];
    } else if (n) {
      reg = e.regulations?.find((r: any) => r.type === n.type) || e.regulations[0];
    }
    
    if (reg) {
      setToTypeLabel(reg.type || 'Плановое ТО');
      setToChecklist((reg.works || []).map((w: string) => ({ text: w, done: false })));
    } else {
      setToTypeLabel('Плановое ТО');
      setToChecklist([]);
    }
    
    // Автозаполнение: последние зафиксированные значения или текущие
    setToHoursInput(lastValues.hours !== undefined ? lastValues.hours : (e.hours || ''));
    setToMileageInput(lastValues.mileage !== undefined ? lastValues.mileage : (e.mileage_km || ''));
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
    setSelectedMaintenanceEquipId(null);
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
          
          {/* Быстрые действия */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <button
              onClick={() => {
                setSelectedMaintenanceEquipId(null);
                setIsBreakdownEquipSelectOpen(true);
              }}
              className="p-3 md:p-4 rounded-2xl shadow-[6px_6px_12px_rgba(0,0,0,0.3),-6px_-6px_12px_rgba(255,255,255,0.1)] hover:shadow-[8px_8px_16px_rgba(0,0,0,0.4),-8px_-8px_16px_rgba(255,255,255,0.15)] hover:-translate-y-0.5 transition-all group active:scale-95 bg-gradient-to-br from-red-500 to-red-600 text-white"
            >
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2.5 md:p-3 rounded-xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]">
                  <AlertTriangle size={20} className="md:w-6 md:h-6 drop-shadow-lg"/>
                </div>
                <div className="text-left">
                  <h4 className="text-sm md:text-base font-bold uppercase drop-shadow-md">Акт</h4>
                  <p className="text-[9px] md:text-[10px] font-medium text-white/90 uppercase drop-shadow-sm">Поломки</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setIsTOEquipSelectOpen(true)}
              className="p-3 md:p-4 rounded-2xl shadow-[6px_6px_12px_rgba(0,0,0,0.3),-6px_-6px_12px_rgba(255,255,255,0.1)] hover:shadow-[8px_8px_16px_rgba(0,0,0,0.4),-8px_-8px_16px_rgba(255,255,255,0.15)] hover:-translate-y-0.5 transition-all group active:scale-95 bg-gradient-to-br from-blue-500 to-blue-600 text-white"
            >
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2.5 md:p-3 rounded-xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]">
                  <Wrench size={20} className="md:w-6 md:h-6 drop-shadow-lg"/>
                </div>
                <div className="text-left">
                  <h4 className="text-sm md:text-base font-bold uppercase drop-shadow-md">ТО</h4>
                  <p className="text-[9px] md:text-[10px] font-medium text-white/90 uppercase drop-shadow-sm">Обслуживание</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setIsBreakdownSelectOpen(true)}
              className="p-3 md:p-4 rounded-2xl shadow-[6px_6px_12px_rgba(0,0,0,0.3),-6px_-6px_12px_rgba(255,255,255,0.1)] hover:shadow-[8px_8px_16px_rgba(0,0,0,0.4),-8px_-8px_16px_rgba(255,255,255,0.15)] hover:-translate-y-0.5 transition-all group active:scale-95 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
            >
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-2.5 md:p-3 rounded-xl bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.1)]">
                  <Package size={20} className="md:w-6 md:h-6 drop-shadow-lg"/>
                </div>
                <div className="text-left">
                  <h4 className="text-sm md:text-base font-bold uppercase drop-shadow-md">Заявка</h4>
                  <p className="text-[9px] md:text-[10px] font-medium text-white/90 uppercase drop-shadow-sm">Снабжение</p>
                </div>
              </div>
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex p-1.5 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/5">
              <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-neo-bg shadow-neo text-blue-600' : 'text-gray-400 hover:text-blue-500'}`}><List size={18}/></button>
              <button onClick={() => setViewMode('tiles')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'tiles' ? 'bg-neo-bg shadow-neo text-blue-600' : 'text-gray-400 hover:text-blue-500'}`}><LayoutGrid size={18}/></button>
            </div>
          </div>
          {viewMode === 'tiles' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {equipment.map(e => {
                // Находим все активные заявки по этой технике
                const relatedRequests = requests.filter(r => {
                  const breakdown = breakdowns.find(b => b.id === r.breakdownId);
                  return breakdown?.equipmentId === e.id && breakdown.status !== 'Исправлено';
                });

                return (
                <div key={e.id} onClick={() => setSelectedMaintenanceEquipId(e.id)} className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo-inset bg-neo-bg cursor-pointer hover:shadow-neo transition-all flex flex-col justify-between group">
                  <div>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 rounded-2xl shadow-neo bg-neo-bg flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform shrink-0">
                        <Wrench size={30} strokeWidth={2.5}/>
                      </div>
                      <div className="overflow-hidden flex-1">
                         <h3 className="font-bold uppercase text-base text-gray-800 dark:text-gray-200 truncate">{e.name}</h3>
                      </div>
                    </div>
                    <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-gray-400 uppercase w-16 shrink-0">Марка:</span>
                        <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate">{e.make} {e.model}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-gray-400 uppercase w-16 shrink-0">VIN:</span>
                        <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate font-mono">{e.vin}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-gray-400 uppercase w-16 shrink-0">Год:</span>
                        <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{e.year}</p>
                      </div>
                    </div>
                    {/* Прогресс-бары по заявкам */}
                    {relatedRequests.length > 0 && (
                      <div className="space-y-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                        {relatedRequests.map(req => {
                          const breakdown = breakdowns.find(b => b.id === req.breakdownId);
                          if (!breakdown) return null;
                          const statusOrder = ['Новая', 'Поиск', 'Оплачено', 'В пути', 'На складе'];
                          const currentIndex = statusOrder.indexOf(req.status);
                          return (
                            <div key={req.id}>
                              <p className="text-[9px] font-bold text-gray-600 dark:text-gray-300 mb-1 truncate">{breakdown.partName}</p>
                              <div className="flex gap-0.5 mb-1">
                                <div className={`flex-1 h-1.5 rounded-full ${
                                  currentIndex >= 0 ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}/>
                                <div className={`flex-1 h-1.5 rounded-full ${
                                  currentIndex >= 1 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}/>
                                <div className={`flex-1 h-1.5 rounded-full ${
                                  currentIndex >= 2 ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}/>
                                <div className={`flex-1 h-1.5 rounded-full ${
                                  currentIndex >= 3 ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}/>
                                <div className={`flex-1 h-1.5 rounded-full ${
                                  currentIndex >= 4 ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}/>
                              </div>
                              <div className="flex justify-between text-[8px] font-semibold">
                                <span className={`${currentIndex >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`}>Новая</span>
                                <span className={`${currentIndex >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>Поиск</span>
                                <span className={`${currentIndex >= 2 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500'}`}>Оплачено</span>
                                <span className={`${currentIndex >= 3 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>В пути</span>
                                <span className={`${currentIndex >= 4 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>Склад</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <span className="text-[9px] font-black text-gray-400 uppercase">Наработка:</span>
                    <p className="text-sm font-black text-gray-800 dark:text-gray-200">{e.hours} м/ч</p>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3 overflow-x-auto scrollbar-hide pb-2">
              {equipment.map(e => {
                // Находим все активные поломки и заявки по этой технике
                const equipBreakdowns = breakdowns.filter(b => b.equipmentId === e.id && b.status !== 'Исправлено');
                const relatedRequests = requests.filter(r => {
                  const breakdown = breakdowns.find(b => b.id === r.breakdownId);
                  return breakdown?.equipmentId === e.id;
                });

                return (
                <div key={e.id} className="p-4 rounded-xl shadow-neo-inset bg-neo-bg flex flex-col gap-3 min-w-[280px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedMaintenanceEquipId(e.id)}>
                      <div className="w-12 h-12 rounded-xl shadow-neo bg-neo-bg flex items-center justify-center text-blue-600 shrink-0">
                        <Wrench size={22} strokeWidth={2.5}/>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{e.name}</div>
                        <div className="text-[9px] font-medium text-gray-500 dark:text-gray-400 truncate">{e.vin}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => { setSelectedMaintenanceEquipId(e.id); openTOForEquip(e); }} className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-xs text-center shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                        <Wrench size={14}/>
                        <span className="hidden md:inline">ТО</span>
                      </button>
                      <button onClick={() => { setSelectedMaintenanceEquipId(e.id); setBreakdownForm({ node: 'Двигатель', partName: '', severity: 'Средняя', description: '', date: new Date().toISOString().slice(0, 10), hoursAtBreakdown: e.hours, photos: [], mechanic: user?.full_name || '', driver: '' }); setIsBreakdownModalOpen(true); }} className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white font-semibold text-xs text-center shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                        <AlertTriangle size={14}/>
                        <span className="hidden md:inline">Акт</span>
                      </button>
                      <button onClick={() => { setRequestEquipmentId(e.id); setIsBreakdownSelectOpen(true); }} className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-semibold text-xs text-center shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                        <Package size={14}/>
                        <span className="hidden md:inline">Заявка</span>
                      </button>
                    </div>
                  </div>
                  {/* Прогресс-бары по заявкам */}
                  {relatedRequests.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                      {relatedRequests
                        .filter(req => {
                          const breakdown = breakdowns.find(b => b.id === req.breakdownId);
                          // Показываем только если поломка не исправлена
                          return breakdown && breakdown.status !== 'Исправлено';
                        })
                        .map(req => {
                          const breakdown = breakdowns.find(b => b.id === req.breakdownId);
                          if (!breakdown) return null;
                          const statusOrder = ['Новая', 'Поиск', 'Оплачено', 'В пути', 'На складе'];
                          const currentIndex = statusOrder.indexOf(req.status);

                          const handleProgressClick = () => {
                            if (req.status === 'На складе') {
                              // Если запчасти на складе - открываем модальное окно смены статуса
                              setSelectedMaintenanceEquipId(e.id);
                              setSelectedBreakdownDetail(breakdown);
                            } else {
                              // Если запчасти еще не на складе - открываем карточку техники
                              setSelectedMaintenanceEquipId(e.id);
                            }
                          };

                          return (
                            <div key={req.id} onClick={handleProgressClick} className="group cursor-pointer">
                              {/* Название детали слева */}
                              <p className="text-[11px] md:text-[12px] font-bold text-gray-700 dark:text-gray-200 mb-2">{breakdown.partName}</p>
                              {/* Разделенная шкала статусов */}
                              <div className="flex gap-0.5 mb-2">
                                <div className={`flex-1 h-1.5 rounded-full ${
                                  currentIndex >= 0 ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}/>
                                <div className={`flex-1 h-1.5 rounded-full ${
                                  currentIndex >= 1 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}/>
                                <div className={`flex-1 h-1.5 rounded-full ${
                                  currentIndex >= 2 ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}/>
                                <div className={`flex-1 h-1.5 rounded-full ${
                                  currentIndex >= 3 ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}/>
                                <div className={`flex-1 h-1.5 rounded-full ${
                                  currentIndex >= 4 ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}/>
                              </div>
                              {/* Подписи под каждым сегментом */}
                              <div className="flex justify-between text-[10px] md:text-[11px] font-semibold">
                                <span className={`${
                                  currentIndex >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'
                                }`}>Новая</span>
                                <span className={`${
                                  currentIndex >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                                }`}>Поиск</span>
                                <span className={`${
                                  currentIndex >= 2 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500'
                                }`}>Оплачено</span>
                                <span className={`${
                                  currentIndex >= 3 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
                                }`}>В пути</span>
                                <span className={`${
                                  currentIndex >= 4 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
                                }`}>Склад</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
                );
              })}
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
            <button onClick={() => setIsTOEquipSelectOpen(true)} className="p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg text-blue-600 flex flex-col items-center gap-3 md:gap-4 hover:shadow-neo-inset transition-all border border-blue-500/10 active:scale-95 group">
              <Wrench size={32} className="group-hover:rotate-12 transition-transform"/><span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">Провести ТО</span>
            </button>
            <button onClick={() => setIsBreakdownEquipSelectOpen(true)} className="p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg text-red-600 flex flex-col items-center gap-3 md:gap-4 hover:shadow-neo-inset transition-all border border-red-500/10 active:scale-95 group">
              <AlertTriangle size={32} className="group-hover:scale-110 transition-transform"/><span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">Акт поломки</span>
            </button>
            <button
              onClick={() => {
                setRequestEquipmentId(selectedEquip.id);
                setIsBreakdownSelectOpen(true);
              }}
              className="p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg text-emerald-600 flex flex-col items-center gap-3 md:gap-4 hover:shadow-neo-inset transition-all border border-emerald-500/10 active:scale-95 group"
            >
              <Package size={32} className="group-hover:scale-110 transition-transform"/><span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">Заявка снабжения</span>
            </button>
            <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg flex flex-col items-center justify-center gap-1 md:gap-2 border border-white/5">
              <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase">Наработка</p>
              <p className="text-xl md:text-3xl font-black text-gray-800 dark:text-gray-100">{selectedEquip.hours} м/ч</p>
            </div>
          </div>

          {/* Задачи ТО */}
          <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-neo bg-neo-bg border border-white/5 mb-6">
            <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-blue-600"/> Задачи ТО
            </h3>
            {(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              // Находим все запланированные ТО для этой техники
              const equipPlannedTOs = plannedTOs.filter(t => 
                t.equipmentId === selectedEquip.id && 
                t.status === 'planned'
              );
              
              // Просроченные ТО
              const overdueTOs = equipPlannedTOs.filter(t => {
                const tDate = new Date(t.date + 'T00:00:00');
                tDate.setHours(0, 0, 0, 0);
                return tDate < today;
              }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              
              // ТО на сегодня
              const todayTOs = equipPlannedTOs.filter(t => {
                const tDate = new Date(t.date + 'T00:00:00');
                tDate.setHours(0, 0, 0, 0);
                return tDate.getTime() === today.getTime();
              });
              
              // Предстоящие ТО (в будущем)
              const upcomingTOs = equipPlannedTOs.filter(t => {
                const tDate = new Date(t.date + 'T00:00:00');
                tDate.setHours(0, 0, 0, 0);
                return tDate > today;
              }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 3);

              if (overdueTOs.length === 0 && todayTOs.length === 0 && upcomingTOs.length === 0) {
                return (
                  <div className="text-center py-8">
                    <Calendar size={32} className="text-gray-400 mx-auto mb-3"/>
                    <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase">Нет запланированных ТО</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {/* Просроченные ТО */}
                  {overdueTOs.map(to => {
                    const daysOverdue = Math.ceil((today.getTime() - new Date(to.date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <button
                        key={to.id}
                        onClick={() => openTOForEquip(selectedEquip, to)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-all text-left group border border-red-500/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-red-500 text-white">
                            <AlertTriangle size={16}/>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-red-700 dark:text-red-400">{to.type}</p>
                            <p className="text-[9px] text-red-500">Просрочено на {daysOverdue} дн.</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-red-700">{to.date.split('-').reverse().join('.')}</p>
                          <ChevronRight size={16} className="text-red-500 ml-auto"/>
                        </div>
                      </button>
                    );
                  })}
                  
                  {/* ТО на сегодня */}
                  {todayTOs.map(to => (
                    <button
                      key={to.id}
                      onClick={() => openTOForEquip(selectedEquip, to)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-left group border border-emerald-500/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500 text-white">
                          <CheckCircle2 size={16}/>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{to.type}</p>
                          <p className="text-[9px] text-emerald-600">Провести сегодня</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-emerald-700">{to.date.split('-').reverse().join('.')}</p>
                        <ChevronRight size={16} className="text-emerald-500 ml-auto"/>
                      </div>
                    </button>
                  ))}
                  
                  {/* Предстоящие ТО */}
                  {upcomingTOs.map(to => {
                    const daysUntil = Math.ceil((new Date(to.date + 'T00:00:00').getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <button
                        key={to.id}
                        onClick={() => openTOForEquip(selectedEquip, to)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 transition-all text-left group border border-blue-500/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-500 text-white">
                            <Calendar size={16}/>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-blue-700 dark:text-blue-400">{to.type}</p>
                            <p className="text-[9px] text-blue-500">{daysUntil === 0 ? 'Сегодня' : daysUntil === 1 ? 'Завтра' : `через ${daysUntil} дн.`}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-blue-700">{to.date.split('-').reverse().join('.')}</p>
                          <ChevronRight size={16} className="text-blue-500 ml-auto"/>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
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
                          <p className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">Готово к работе!</p>
                          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-500">Запчасти на складе — можно брать в работу</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedBreakdownDetail(b);
                            setBreakdownStatusForm({ status: 'В работе', fixedDate: new Date().toISOString().slice(0, 10), hoursAtFix: undefined, mileageAtFix: undefined, fixNotes: '' });
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold uppercase text-[8px] hover:bg-emerald-700 transition-all"
                        >
                          В работу
                        </button>
                      </div>
                    )}

                    <div className="flex justify-between items-start gap-3">
                      <div className="overflow-hidden flex-1 cursor-pointer" onClick={() => setSelectedBreakdownDetail(b)}>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">{b.partName}</p>
                          <span className={`text-[9px] md:text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                            b.severity === 'Критическая' ? 'bg-red-500 text-white' :
                            b.severity === 'Средняя' ? 'bg-orange-500 text-white' :
                            'bg-yellow-500 text-white'
                          }`}>{b.severity}</span>
                        </div>
                        <p className="text-sm md:text-base font-medium text-gray-600 dark:text-gray-300">{b.status} • {b.node}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!relatedRequest && (
                          <button
                            onClick={() => {
                              setSelectedBreakdownDetail(b);
                              setIsCreateRequestOpen(true);
                            }}
                            className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-semibold uppercase text-[9px] hover:bg-emerald-700 transition-all"
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
                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="mb-3">
                          {/* Единая линия прогресса */}
                          <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                              relatedRequest.status === 'На складе' ? 'w-full bg-emerald-500' :
                              relatedRequest.status === 'В пути' ? 'w-[80%] bg-indigo-500' :
                              relatedRequest.status === 'Оплачено' ? 'w-[60%] bg-orange-500' :
                              relatedRequest.status === 'Поиск' ? 'w-[40%] bg-blue-500' :
                              'w-[20%] bg-purple-500'
                            }`}/>
                          </div>
                          {/* Подписи стадий */}
                          <div className="flex justify-between mt-2 text-[10px] font-semibold uppercase">
                            <span className={`${
                              ['Новая', 'Поиск', 'Оплачено', 'В пути', 'На складе'].includes(relatedRequest.status) ? 'text-purple-500' : 'text-gray-500 dark:text-gray-400'
                            }`}>Новая</span>
                            <span className={`${
                              ['Поиск', 'Оплачено', 'В пути', 'На складе'].includes(relatedRequest.status) ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
                            }`}>Поиск</span>
                            <span className={`${
                              ['Оплачено', 'В пути', 'На складе'].includes(relatedRequest.status) ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'
                            }`}>Оплачено</span>
                            <span className={`${
                              ['В пути', 'На складе'].includes(relatedRequest.status) ? 'text-indigo-500' : 'text-gray-500 dark:text-gray-400'
                            }`}>В пути</span>
                            <span className={`${
                              ['На складе'].includes(relatedRequest.status) ? 'text-emerald-500' : 'text-gray-500 dark:text-gray-400'
                            }`}>Склад</span>
                          </div>
                        </div>
                        {relatedRequest.status === 'На складе' && (
                          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 size={14}/> Готово к работе
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  );
                });
              })()}
            </div>
          </div>

          <div className="p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-neo bg-neo-bg border border-white/5">
            <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-6 md:mb-10 flex items-center gap-2"><History size={16} className="text-blue-600"/> История обслуживания</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
              {records.filter(r => r.equipmentId === selectedEquip.id).map(r => {
                const isBreakdown = r.type.toLowerCase().includes('поломк') || r.type.toLowerCase().includes('неисправност') || r.type.toLowerCase().includes('акт');
                return (
                  <div key={r.id} onClick={() => setSelectedRecordDetail(r)} className={`p-4 md:p-5 rounded-xl shadow-[inset_3px_3px_6px_rgba(0,0,0,0.05),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),inset_-3px_-3px_6px_rgba(60,75,95,0.2)] bg-neo-bg flex justify-between items-center border-l-4 ${isBreakdown ? 'border-red-500' : 'border-emerald-500'} group hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,1)] dark:hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.4),inset_-4px_-4px_8px_rgba(60,75,95,0.25)] hover:cursor-pointer transition-all`}>
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

      {/* Модальное окно выбора техники для акта поломки */}
      {isBreakdownEquipSelectOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-neo-bg w-full max-w-2xl rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/20 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl shadow-neo bg-neo-bg text-red-500">
                  <AlertTriangle size={24}/>
                </div>
                <h2 className="text-xl font-black uppercase text-gray-800 dark:text-gray-100">Выберите технику для акта</h2>
              </div>
              <button onClick={() => setIsBreakdownEquipSelectOpen(false)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all">
                <X size={20}/>
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-500 text-center py-4">Выберите технику для фиксации поломки:</p>
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                {equipment.map(e => (
                  <button
                    key={e.id}
                    onClick={() => {
                      setSelectedMaintenanceEquipId(e.id);
                      setIsBreakdownEquipSelectOpen(false);
                      setIsBreakdownModalOpen(true);
                    }}
                    className="w-full p-4 rounded-2xl bg-neo-bg shadow-[inset_3px_3px_6px_rgba(0,0,0,0.1),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),inset_-3px_-3px_6px_rgba(60,75,95,0.2)] hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15),inset_-4px_-4px_8px_rgba(255,255,255,1)] dark:hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.4),inset_-4px_-4px_8px_rgba(60,75,95,0.25)] transition-all flex justify-between items-center group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                        <Truck size={20}/>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black uppercase text-gray-800 dark:text-gray-100">{e.name}</p>
                        <p className="text-[9px] md:text-[10px] font-bold text-gray-700 dark:text-gray-300">{e.vin} • {e.hours} м/ч</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-400 group-hover:text-red-500 transition-colors"/>
                  </button>
                ))}
              </div>
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
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-2">Техника</label>
                    <select
                      className="w-full p-4 rounded-2xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(60,75,95,0.2)] bg-neo-bg text-gray-900 dark:text-gray-200 outline-none app-input font-semibold border border-transparent"
                      value={selectedMaintenanceEquipId || ''}
                      onChange={e => setSelectedMaintenanceEquipId(e.target.value)}
                      required
                    >
                      <option value="">Выберите технику...</option>
                      {equipment.map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.name} ({eq.vin})</option>
                      ))}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-2">Узел техники</label>
                    <select className="w-full p-4 rounded-2xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(60,75,95,0.2)] bg-neo-bg text-gray-900 dark:text-gray-200 outline-none app-input font-semibold border border-transparent" value={breakdownForm.node} onChange={e=>setBreakdownForm({...breakdownForm, node: e.target.value})}>
                       <option>Двигатель</option><option>Гидравлика</option><option>Ходовая часть</option><option>Электроника</option><option>Кузов</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-2">Деталь / Запчасть</label>
                    <input className="w-full p-4 rounded-2xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(60,75,95,0.2)] bg-neo-bg text-gray-900 dark:text-gray-200 outline-none app-input font-semibold placeholder-gray-500" placeholder="Введите название..." value={breakdownForm.partName} onChange={e=>setBreakdownForm({...breakdownForm, partName: e.target.value})} required />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-2">Дата поломки</label>
                     <input type="date" value={breakdownForm.date} onChange={e=>setBreakdownForm({...breakdownForm, date: e.target.value})} className="w-full p-4 rounded-2xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(60,75,95,0.2)] bg-neo-bg text-gray-900 dark:text-gray-200 outline-none app-input font-semibold" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-2">Пробег / Наработка</label>
                     <input type="number" value={breakdownForm.hoursAtBreakdown as any || ''} onChange={e=>setBreakdownForm({...breakdownForm, hoursAtBreakdown: e.target.value ? parseInt(e.target.value) : undefined})} className="w-full p-4 rounded-2xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(60,75,95,0.2)] bg-neo-bg text-gray-900 dark:text-gray-200 outline-none app-input font-semibold" />
                   </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <input placeholder="ФИО механика" value={breakdownForm.mechanic} onChange={e=>setBreakdownForm({...breakdownForm, mechanic: e.target.value})} className="w-full p-4 rounded-2xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(60,75,95,0.2)] bg-neo-bg text-gray-900 dark:text-gray-200 outline-none app-input font-semibold placeholder-gray-500" />
                   <input placeholder="Кто обнаружил (водитель)" value={breakdownForm.driver} onChange={e=>setBreakdownForm({...breakdownForm, driver: e.target.value})} className="w-full p-4 rounded-2xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(60,75,95,0.2)] bg-neo-bg text-gray-900 dark:text-gray-200 outline-none app-input font-semibold placeholder-gray-500" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-2">Серьезность</label>
                    <div className="flex gap-3">
                       {['Низкая', 'Средняя', 'Критическая'].map(s => (
                         <button key={s} type="button" onClick={()=>setBreakdownForm({...breakdownForm, severity: s as any})} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                           breakdownForm.severity === s
                             ? s === 'Критическая' ? 'bg-red-500 text-white shadow-lg'
                               : s === 'Средняя' ? 'bg-orange-500 text-white shadow-lg'
                               : 'bg-yellow-500 text-white shadow-lg'
                             : s === 'Критическая' ? 'bg-red-100 text-red-700 hover:bg-red-200'
                               : s === 'Средняя' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                               : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                         }`}>{s}</button>
                       ))}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-2">Примечания</label>
                    <textarea value={breakdownForm.description} onChange={e=>setBreakdownForm({...breakdownForm, description: e.target.value})} placeholder="Описание и примечания" className="w-full p-4 rounded-2xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(60,75,95,0.2)] bg-neo-bg text-gray-900 dark:text-gray-200 outline-none app-input font-semibold placeholder-gray-500 h-24 resize-none" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 ml-2">Фотографии (узел/шильдик/маркировка)</label>
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
                <button type="submit" className="w-full py-5 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white font-semibold uppercase text-sm shadow-lg hover:shadow-xl active:scale-95 transition-all mt-4">Создать акт неисправности</button>
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

      {/* Модальное окно выбора акта для заявки снабжения */}
      {isBreakdownSelectOpen && (
        <div className="fixed inset-0 z-[215] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-neo-bg w-full max-w-3xl rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/20 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl shadow-neo bg-neo-bg text-blue-500">
                  <Package size={24}/>
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase text-gray-800 dark:text-gray-100">
                    {requestEquipmentId ? 'Выберите акт или создайте заявку' : 'Выберите технику для заявки'}
                  </h2>
                  {requestEquipmentId && (
                    <p className="text-[8px] font-black text-gray-400 uppercase">
                      Техника: {equipment.find(e => e.id === requestEquipmentId)?.name}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => { setIsBreakdownSelectOpen(false); setRequestEquipmentId(null); }} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all">
                <X size={20}/>
              </button>
            </div>

            <div className="space-y-4">
              {/* Выбор техники если не задана */}
              {!requestEquipmentId && (
                <>
                  <p className="text-sm text-gray-500 text-center py-4">Выберите технику для создания заявки:</p>
                  <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                    {equipment.map(e => (
                      <button
                        key={e.id}
                        onClick={() => setRequestEquipmentId(e.id)}
                        className="w-full p-4 rounded-2xl bg-neo-bg shadow-[inset_3px_3px_6px_rgba(0,0,0,0.1),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),inset_-3px_-3px_6px_rgba(60,75,95,0.2)] hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15),inset_-4px_-4px_8px_rgba(255,255,255,1)] dark:hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.4),inset_-4px_-4px_8px_rgba(60,75,95,0.25)] transition-all flex justify-between items-center group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                            <Truck size={20}/>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-black uppercase text-gray-800 dark:text-gray-100">{e.name}</p>
                            <p className="text-[9px] md:text-[10px] font-bold text-gray-700 dark:text-gray-300">{e.vin} • {e.hours} м/ч</p>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors"/>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Выбор акта для выбранной техники */}
              {requestEquipmentId && (
                <>
                  <p className="text-sm text-gray-500 text-center py-4">Акты для {equipment.find(e => e.id === requestEquipmentId)?.name}:</p>
                  <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                    {(() => {
                      // Фильтруем акты только для выбранной техники
                      const equipmentBreakdowns = breakdowns.filter(b => 
                        b.equipmentId === requestEquipmentId && 
                        b.status !== 'Исправлено'
                      );
                      
                      // Проверяем есть ли акты без заявок
                      const availableBreakdowns = equipmentBreakdowns.filter(b => {
                        const hasRequest = useProcurementStore.getState().requests.some(r => r.breakdownId === b.id);
                        return !hasRequest;
                      });
                      
                      return (
                        <>
                          {availableBreakdowns.length > 0 && (
                            <>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Акты поломки:</p>
                              {availableBreakdowns.map(b => (
                                <button
                                  key={b.id}
                                  onClick={() => {
                                    setSelectedBreakdownDetail(b);
                                    setIsBreakdownSelectOpen(false);
                                    setIsCreateRequestOpen(true);
                                  }}
                                  className="w-full p-4 rounded-2xl bg-neo-bg shadow-[inset_3px_3px_6px_rgba(0,0,0,0.1),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),inset_-3px_-3px_6px_rgba(60,75,95,0.2)] hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15),inset_-4px_-4px_8px_rgba(255,255,255,1)] dark:hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.4),inset_-4px_-4px_8px_rgba(60,75,95,0.25)] transition-all flex justify-between items-center group"
                                >
                                  <div className="flex items-center gap-4 flex-1">
                                    <div className="p-3 rounded-xl text-red-600 group-hover:scale-110 transition-transform">
                                      <AlertTriangle size={20}/>
                                    </div>
                                    <div className="text-left flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-black uppercase text-gray-800 dark:text-gray-100">{b.partName}</p>
                                        <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded ${
                                          b.severity === 'Критическая' ? 'bg-red-500 text-white' :
                                          b.severity === 'Средняя' ? 'bg-orange-500 text-white' :
                                          'bg-yellow-500 text-white'
                                        }`}>{b.severity}</span>
                                      </div>
                                      <p className="text-[8px] text-gray-500 dark:text-gray-400">{b.node}</p>
                                      <p className="text-[7px] text-gray-500 dark:text-gray-400">Акт: {b.actNumber || 'АКТ-001'} • {formatDate(b.date)}</p>
                                    </div>
                                  </div>
                                  <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors"/>
                                </button>
                              ))}
                            </>
                          )}
                          
                          {/* Кнопка создания заявки без акта (для ТО на склад) */}
                          <button
                            onClick={() => {
                              // Если техника уже выбрана, используем ее
                              if (requestEquipmentId) {
                                setSelectedMaintenanceEquipId(requestEquipmentId);
                              }
                              setIsBreakdownSelectOpen(false);
                              setIsCreateRequestOpen(true);
                              setSelectedBreakdownDetail(null);
                            }}
                            className="w-full p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-black uppercase text-xs shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-emerald-700 transition-all mt-4"
                          >
                            + Создать заявку без акта (для ТО / на склад)
                          </button>

                          <button
                            onClick={() => {
                              setRequestEquipmentId(null);
                              setSelectedMaintenanceEquipId(null);
                            }}
                            className="w-full p-4 rounded-2xl bg-neo-bg shadow-[inset_3px_3px_6px_rgba(0,0,0,0.1),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),inset_-3px_-3px_6px_rgba(60,75,95,0.2)] hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15),inset_-4px_-4px_8px_rgba(255,255,255,1)] font-black uppercase text-xs transition-all"
                          >
                            ← Назад к выбору техники
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно выбора техники для ТО */}
      {isTOEquipSelectOpen && (
        <div className="fixed inset-0 z-[215] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-neo-bg w-full max-w-3xl rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/20 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl shadow-neo bg-neo-bg text-blue-500">
                  <Wrench size={24}/>
                </div>
                <h2 className="text-xl font-black uppercase text-gray-800 dark:text-gray-100">Выберите технику для ТО</h2>
              </div>
              <button onClick={() => setIsTOEquipSelectOpen(false)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all">
                <X size={20}/>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-500 text-center py-4">Выберите технику для проведения ТО:</p>
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                {equipment.map(e => (
                  <button
                    key={e.id}
                    onClick={() => {
                      openTOForEquip(e);
                      setIsTOEquipSelectOpen(false);
                    }}
                    className="w-full p-4 rounded-2xl bg-neo-bg shadow-[inset_3px_3px_6px_rgba(0,0,0,0.1),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),inset_-3px_-3px_6px_rgba(60,75,95,0.2)] hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15),inset_-4px_-4px_8px_rgba(255,255,255,1)] dark:hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.4),inset_-4px_-4px_8px_rgba(60,75,95,0.25)] transition-all flex justify-between items-center group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                        <Truck size={20}/>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black uppercase text-gray-800 dark:text-gray-100">{e.name}</p>
                        <p className="text-[9px] md:text-[10px] font-bold text-gray-700 dark:text-gray-300">{e.vin} • {e.hours} м/ч</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors"/>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateRequestOpen && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-neo-bg w-full max-w-2xl rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/20 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 md:mb-8 sticky top-0 bg-neo-bg">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-2xl shadow-neo bg-neo-bg text-blue-500"><Truck size={28}/></div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">Заявка снабжения</h3>
                    {selectedBreakdownDetail && (
                      <p className="text-[8px] font-black text-gray-400 uppercase">Акт: {selectedBreakdownDetail.actNumber || 'АКТ-001'}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => { setIsCreateRequestOpen(false); setRequestItems([]); setRequestPhotos([]); }} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all"><X size={20}/></button>
              </div>

              <div className="space-y-6">
                {/* Выбор техники ТОЛЬКО если заявка создается из вкладки Снабжение (без привязки) */}
                {!selectedBreakdownDetail && !requestEquipmentId && (
                  <div className="p-6 rounded-2xl shadow-neo-inset bg-neo-bg border border-blue-500/20 space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400">Техника</label>
                      <select
                        className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none text-gray-700 outline-none"
                        value={selectedMaintenanceEquipId || ''}
                        onChange={e => setSelectedMaintenanceEquipId(e.target.value)}
                        required
                      >
                        <option value="">Выберите технику...</option>
                        {equipment.map(eq => (
                          <option key={eq.id} value={eq.id}>{eq.name} ({eq.vin})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <div className="p-6 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/5 space-y-3">
                  {selectedBreakdownDetail && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400">Номер акта</label>
                        <div className="text-xl font-black text-blue-600">{selectedBreakdownDetail.actNumber || 'АКТ-001'}</div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400">Наименование заявки</label>
                        <input className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none outline-none app-input" placeholder={`Запрос по акту: ${selectedBreakdownDetail.partName || 'Запчасть'}`} />
                      </div>
                    </>
                  )}
                  {!selectedBreakdownDetail && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400">Наименование заявки</label>
                      <input className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none outline-none app-input" placeholder="Например: Комплект фильтров ТО-1000" />
                    </div>
                  )}
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
                      equipmentId: selectedBreakdownDetail ? selectedBreakdownDetail.equipmentId : selectedMaintenanceEquipId,
                      breakdownId: selectedBreakdownDetail ? selectedBreakdownDetail.id : undefined,
                      breakdownActNumber: selectedBreakdownDetail ? selectedBreakdownDetail.actNumber : undefined,
                      breakdownName: selectedBreakdownDetail ? selectedBreakdownDetail.partName : undefined,
                      breakdownDescription: selectedBreakdownDetail ? selectedBreakdownDetail.description : undefined,
                      breakdownNode: selectedBreakdownDetail ? selectedBreakdownDetail.node : undefined,
                      breakdownPhotos: requestPhotos.map((url, i) => ({ id: `p-${i}`, name: `Фото ${i + 1} (акт)`, url, type: 'image' }))
                    };
                    addRequest(req as any);
                    // set breakdown status to 'Запчасти заказаны' if linked to breakdown
                    if (selectedBreakdownDetail) {
                      updateBreakdownStatus(selectedBreakdownDetail.id, 'Запчасти заказаны');
                    }
                    setIsCreateRequestOpen(false);
                    setSelectedBreakdownDetail(null);
                    setSelectedMaintenanceEquipId(null);
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
              {/* Информация о запланированном ТО */}
              {plannedTOForService && (
                <div className={`p-4 md:p-6 rounded-[1.5rem] shadow-neo-inset bg-neo-bg border-2 ${
                  new Date(plannedTOForService.date + 'T00:00:00') > new Date() 
                    ? 'border-orange-500/30 bg-orange-500/5' 
                    : new Date(plannedTOForService.date + 'T00:00:00').getTime() === new Date().setHours(0,0,0,0)
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-red-500/30 bg-red-500/5'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={18} className={
                      new Date(plannedTOForService.date + 'T00:00:00') > new Date() 
                        ? 'text-orange-500' 
                        : new Date(plannedTOForService.date + 'T00:00:00').getTime() === new Date().setHours(0,0,0,0)
                          ? 'text-emerald-500'
                          : 'text-red-500'
                    }/>
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">
                      {new Date(plannedTOForService.date + 'T00:00:00') > new Date() 
                        ? 'ДОСРОЧНОЕ ПРОВЕДЕНИЕ' 
                        : new Date(plannedTOForService.date + 'T00:00:00').getTime() === new Date().setHours(0,0,0,0)
                          ? 'ТО ЗАПЛАНИРОВАНО НА СЕГОДНЯ'
                          : 'ПРОСРОЧЕНО'}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                    Запланировано на: <span className="font-black">{plannedTOForService.date.split('-').reverse().join('.')}</span>
                  </p>
                </div>
              )}

              <div className="p-4 md:p-6 rounded-[1.5rem] shadow-neo-inset bg-neo-bg">
                <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Тип ТО</p>
                <div className="font-black text-lg mb-3">{toTypeLabel || 'Плановое ТО'}</div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Наработка (М/Ч)</p>
                    <input 
                      type="number" 
                      value={toHoursInput as any} 
                      onChange={e=>setToHoursInput(e.target.value === '' ? '' : parseInt(e.target.value))} 
                      className="w-full text-2xl md:text-3xl font-black text-blue-600 bg-transparent outline-none" 
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Пробег (КМ)</p>
                    <input 
                      type="number" 
                      value={toMileageInput as any} 
                      onChange={e=>setToMileageInput(e.target.value === '' ? '' : parseInt(e.target.value))} 
                      className="w-full text-2xl md:text-3xl font-black text-blue-600 bg-transparent outline-none" 
                      placeholder="0"
                    />
                  </div>
                </div>
                
                {/* Информация о последних значениях */}
                {lastRecordedValues && (lastRecordedValues.hours !== undefined || lastRecordedValues.mileage !== undefined) && (
                  <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-[8px] font-black text-blue-400 uppercase mb-2">Последние зафиксированные значения</p>
                    <div className="flex gap-4 text-xs">
                      {lastRecordedValues.hours !== undefined && (
                        <p className="text-gray-600 dark:text-gray-300">
                          Наработка: <span className="font-bold text-gray-800 dark:text-gray-100">{lastRecordedValues.hours} м/ч</span>
                        </p>
                      )}
                      {lastRecordedValues.mileage !== undefined && (
                        <p className="text-gray-600 dark:text-gray-300">
                          Пробег: <span className="font-bold text-gray-800 dark:text-gray-100">{lastRecordedValues.mileage} км</span>
                        </p>
                      )}
                    </div>
                    <p className="text-[8px] text-gray-500 mt-2">Введите значения не меньше указанных</p>
                  </div>
                )}
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
                  <button
                    type="button"
                    onClick={() => setIsBreakdownSelectOpen(true)}
                    className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs leading-tight shadow-neo hover:shadow-neo-inset transition-all"
                  >
                    Создать заявку снабжения
                  </button>
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
                      setIsStatusModalOpen(true);
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
                    setIsStatusModalOpen(true);
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
      {isStatusModalOpen && selectedBreakdownDetail && (
        <div className="fixed inset-0 z-[215] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-neo-bg w-full max-w-lg rounded-[2.5rem] md:rounded-[3rem] shadow-neo p-4 md:p-6 animate-in zoom-in border border-white/20 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-neo-bg z-10 pb-2">
              <h2 className="text-base md:text-lg font-bold uppercase text-gray-800 dark:text-gray-100">Обновить статус</h2>
              <button onClick={() => setIsStatusModalOpen(false)} className="p-2 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all"><X size={18}/></button>
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
                setIsStatusModalOpen(false);
                setSelectedBreakdownDetail(null);
              }
            }} className="space-y-3 pb-4">
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
                <label className="text-[9px] font-bold text-gray-700 dark:text-gray-300 ml-2">Новый статус</label>
                <select
                  className="w-full p-3 rounded-xl shadow-[inset_3px_3px_6px_rgba(0,0,0,0.15),inset_-3px_-3px_6px_rgba(255,255,255,0.8)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),inset_-3px_-3px_6px_rgba(60,75,95,0.2)] bg-neo-bg font-bold text-sm uppercase text-gray-900 dark:text-gray-200 outline-none"
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
                  const isFixed = breakdownStatusForm.status === 'Исправлено';
                  const notOnWarehouse = !relatedReq || relatedReq.status !== 'На складе';
                  
                  // Предупреждение если "Исправлено" но запчасти нет на складе
                  if (isFixed && notOnWarehouse) {
                    return (
                      <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={14} className="text-orange-500 mt-0.5"/>
                          <div>
                            <p className="text-[7px] font-black text-orange-400 uppercase tracking-widest mb-1">Внимание</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              Запчасти еще нет на складе ({relatedReq?.status || 'заявка не создана'}). 
                              Вы подтверждаете что поломка исправлена альтернативным способом?
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return breakdownStatusForm.status === 'В работе' && !canTakeToWork && (
                    <p className="text-[8px] font-black text-orange-600">⚠ Статус "В работе" доступен только после получения запчастей со склада</p>
                  );
                })()}
              </div>
              {breakdownStatusForm.status === 'Исправлено' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-gray-700 dark:text-gray-300 ml-2">Дата ввода в эксплуатацию</label>
                    <input type="date" value={breakdownStatusForm.fixedDate} onChange={e=>setBreakdownStatusForm({...breakdownStatusForm, fixedDate: e.target.value})} className="w-full p-3 rounded-xl shadow-[inset_3px_3px_6px_rgba(0,0,0,0.15),inset_-3px_-3px_6px_rgba(255,255,255,0.8)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),inset_-3px_-3px_6px_rgba(60,75,95,0.2)] bg-neo-bg font-bold text-sm text-gray-900 dark:text-gray-200 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-gray-700 dark:text-gray-300 ml-2">Наработка (м/ч)</label>
                      <input
                        type="number"
                        value={(breakdownStatusForm as any).hoursAtFix || ''}
                        onChange={e => setBreakdownStatusForm({...breakdownStatusForm, hoursAtFix: e.target.value ? parseInt(e.target.value) : undefined} as any)}
                        placeholder={selectedBreakdownDetail.hoursAtBreakdown?.toString() || '0'}
                        className="w-full p-3 rounded-xl shadow-[inset_3px_3px_6px_rgba(0,0,0,0.15),inset_-3px_-3px_6px_rgba(255,255,255,0.8)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),inset_-3px_-3px_6px_rgba(60,75,95,0.2)] bg-neo-bg font-bold text-sm text-gray-900 dark:text-gray-200 outline-none"
                      />
                      <p className="text-[8px] text-gray-500">На момент поломки: {selectedBreakdownDetail.hoursAtBreakdown || '—'} м/ч</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-gray-700 dark:text-gray-300 ml-2">Пробег (км)</label>
                      <input
                        type="number"
                        value={(breakdownStatusForm as any).mileageAtFix || ''}
                        onChange={e => setBreakdownStatusForm({...breakdownStatusForm, mileageAtFix: e.target.value ? parseInt(e.target.value) : undefined} as any)}
                        placeholder="0"
                        className="w-full p-3 rounded-xl shadow-[inset_3px_3px_6px_rgba(0,0,0,0.15),inset_-3px_-3px_6px_rgba(255,255,255,0.8)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),inset_-3px_-3px_6px_rgba(60,75,95,0.2)] bg-neo-bg font-bold text-sm text-gray-900 dark:text-gray-200 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-gray-700 dark:text-gray-300 ml-2">Примечания к исправлению</label>
                    <textarea
                      value={(breakdownStatusForm as any).fixNotes || ''}
                      onChange={e => setBreakdownStatusForm({...breakdownStatusForm, fixNotes: e.target.value} as any)}
                      placeholder="Опишите выполненные работы, замененные детали, рекомендации..."
                      className="w-full p-3 rounded-xl shadow-[inset_3px_3px_6px_rgba(0,0,0,0.15),inset_-3px_-3px_6px_rgba(255,255,255,0.8)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),inset_-3px_-3px_6px_rgba(60,75,95,0.2)] bg-neo-bg font-bold text-sm text-gray-900 dark:text-gray-200 outline-none h-20 resize-none"
                    />
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-[9px] font-bold text-blue-400 uppercase">Примечание</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Заполните наработку/пробег если поломка была не критической и техника продолжала работать</p>
                  </div>
                </div>
              )}
              <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold uppercase text-sm shadow-lg hover:shadow-xl active:scale-95 transition-all">Сохранить</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

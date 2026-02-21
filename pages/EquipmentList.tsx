
import React, { useState, useEffect } from 'react';
import {
  Search, Plus, Truck, X, QrCode, Zap, Gauge, Edit3, Save, Camera, FileText, User, ChevronRight, History, Upload, LayoutGrid, List, Clock, Trash2, AlertTriangle, CheckCircle2, Package
} from 'lucide-react';
import { useFleetStore } from '../store/useFleetStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useProcurementStore } from '../store/useProcurementStore';
import { EquipStatus, Equipment, MaintenanceRegulation } from '../types';
import { formatNumber, formatDate, formatDateTime } from '../utils/format';
import QRCode from 'qrcode';

// Функция проверки срока страховки
const parseDateFlexible = (s?: string): Date | null => {
  if (!s) return null;
  // dd.mm.yyyy
  const ddmmy = s.trim();
  const dotMatch = ddmmy.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const d = parseInt(dotMatch[1], 10);
    const m = parseInt(dotMatch[2], 10) - 1;
    const y = parseInt(dotMatch[3], 10);
    return new Date(y, m, d);
  }
  // try ISO / other
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return dt;
  return null;
};

const formatToDDMMYYYY = (s?: string) => {
  const d = parseDateFlexible(s);
  if (!d) return s || '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

const getInsuranceStatus = (insuranceEnd?: string): { status: 'expired' | 'warning' | 'critical' | 'ok', daysLeft: number, message: string } => {
  if (!insuranceEnd) return { status: 'ok', daysLeft: 999, message: '' };

  const today = new Date();
  const endDate = parseDateFlexible(insuranceEnd) || new Date(insuranceEnd);
  const diffTime = endDate.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { status: 'expired', daysLeft, message: `Страховка истекла ${Math.abs(daysLeft)} дн. назад` };
  } else if (daysLeft <= 7) {
    return { status: 'critical', daysLeft, message: `Осталось ${daysLeft} дн.` };
  } else if (daysLeft <= 30) {
    return { status: 'warning', daysLeft, message: `Осталось ${daysLeft} дн.` };
  }

  return { status: 'ok', daysLeft, message: `Действительна` };
};

const computeEquipmentStatus = (equipmentId: string, breakdowns: any[], plannedTOs: any[], equipment: any[]) => {
  const activeBreakdowns = breakdowns.filter(b => b.equipmentId === equipmentId && b.status !== 'Исправлено');
  const equip = equipment.find(e => e.id === equipmentId);

  // 1. Проверка критических поломок - техника в ремонте
  const criticalBreakdowns = activeBreakdowns.filter(b => b.severity === 'Критическая');
  if (criticalBreakdowns.length > 0) {
    return {
      status: EquipStatus.REPAIR,
      reason: `Критическая поломка: ${criticalBreakdowns[0].partName}`
    };
  }

  // 2. Проверка поломок в работе
  const inWorkBreakdowns = activeBreakdowns.filter(b => b.status === 'В работе');
  if (inWorkBreakdowns.length > 0) {
    return {
      status: EquipStatus.REPAIR,
      reason: `В ремонте: ${inWorkBreakdowns[0].partName}`
    };
  }

  // 3. Проверка ожидания запчастей
  const waitingForParts = activeBreakdowns.filter(b => b.status === 'Запчасти заказаны' || b.status === 'Запчасти получены');
  if (waitingForParts.length > 0) {
    return {
      status: EquipStatus.WAITING_PARTS,
      reason: `Ожидание запчастей: ${waitingForParts[0].partName}`
    };
  }

  // 4. Проверка незначительных поломок (низкая/средняя серьезность)
  const minorBreakdowns = activeBreakdowns.filter(b =>
    (b.severity === 'Низкая' || b.severity === 'Средняя') &&
    b.status === 'Новая'
  );
  if (minorBreakdowns.length > 0) {
    return {
      status: EquipStatus.ACTIVE_WITH_RESTRICTIONS,
      reason: `Неисправности: ${minorBreakdowns.map(b => b.partName).join(', ')}`
    };
  }

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
      
      if (hoursOverdue || kmOverdue) {
        const overdueHours = hoursOverdue ? currHours - nextHours + intervalHours : 0;
        const overdueKm = kmOverdue ? currKm - nextKm + intervalKm : 0;
        
        return {
          status: EquipStatus.MAINTENANCE,
          reason: hoursOverdue 
            ? `ТО просрочено на ${overdueHours} м/ч (${reg.type})`
            : `ТО просрочено на ${overdueKm} км (${reg.type})`
        };
      }
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
  
  if (overduePlannedTO.length > 0) {
    const overdueTO = overduePlannedTO[0];
    const plannedDate = new Date(overdueTO.date);
    const daysOverdue = Math.floor((today.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      status: EquipStatus.MAINTENANCE,
      reason: `ТО просрочено на ${daysOverdue} дн. (${overdueTO.type})`
    };
  }

  // 7. Проверка предстоящего планового ТО
  const upcomingPlannedTO = plannedTOs.filter(t => t.equipmentId === equipmentId && t.status === 'planned');
  if (upcomingPlannedTO.length > 0) {
    return {
      status: EquipStatus.MAINTENANCE,
      reason: `Запланировано ${upcomingPlannedTO[0].type} на ${formatDate(upcomingPlannedTO[0].date)}`
    };
  }

  // 8. Техника в работе
  return {
    status: EquipStatus.ACTIVE,
    reason: 'В работе'
  };
};

interface EquipmentListProps {
  onNavigate?: (page: string) => void;
}

export const EquipmentList: React.FC<EquipmentListProps> = ({ onNavigate }) => {
  const { equipment, selectEquipment, selectedEquipmentId, updateEquipment, deleteEquipment, addEquipment } = useFleetStore();
  const { records, breakdowns, plannedTOs } = useMaintenanceStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isEditing, setIsEditing] = useState(false);
  const [qrBase64, setQrBase64] = useState('');
  const [activeTab, setActiveTab] = useState<'main' | 'docs' | 'history' | 'regulations'>('main')
  const [isNewEquipment, setIsNewEquipment] = useState(false);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<any>(null);

  const selectedItem = equipment.find(e => e.id === selectedEquipmentId);
  const [editForm, setEditForm] = useState<Partial<Equipment>>({});

  useEffect(() => {
    if (selectedItem) {
      const qrData = `${window.location.origin}/?equipment=${selectedItem.id}`;
      QRCode.toDataURL(qrData, { width: 300, margin: 2 }).then(setQrBase64);
      setEditForm(selectedItem);
    }
  }, [selectedItem]);

  const handleSave = () => {
    if (selectedItem) {
      const updatedData = {
        ...editForm,
        name: editForm.make && editForm.model ? `${editForm.make} ${editForm.model}` : editForm.name
      };
      updateEquipment(selectedItem.id, updatedData);
      setIsEditing(false);
      setIsNewEquipment(false);
    }
  };

  const handleDelete = () => {
    if (selectedItem) {
      deleteEquipment(selectedItem.id);
      selectEquipment(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleAddNew = () => {
    const newEquipment: Equipment = {
      id: Date.now().toString(),
      name: 'Новая техника',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      vin: '',
      license_plate: '',
      hours: 0,
      status: EquipStatus.ACTIVE,
      driver: '',
      image: 'https://picsum.photos/seed/tech/800/600'
    };
    addEquipment(newEquipment);
    selectEquipment(newEquipment.id);
    setIsEditing(true);
    setIsNewEquipment(true);
  };

  const handleUploadDocument = (docType: 'sts' | 'osago' | 'diagnostic' | 'catalog' | 'manual' | 'other') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.txt';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const fileUrl = event.target?.result as string;
          // Сохраняем документ в массив documents
          setEditForm(prev => {
            const docs = prev.documents || [];
            const existingIndex = docs.findIndex(d => d.type === docType);
            const newDocs = existingIndex >= 0 
              ? docs.map((d, i) => i === existingIndex ? { name: file.name, url: fileUrl, type: docType } : d)
              : [...docs, { name: file.name, url: fileUrl, type: docType }];
            return { ...prev, documents: newDocs };
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleUploadPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageUrl = event.target?.result as string;
          setEditForm({...editForm, image: imageUrl});
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const filtered = equipment.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.vin.toLowerCase().includes(search.toLowerCase())
  );

  const statusColorClass = (s: EquipStatus) => {
    switch (s) {
      case EquipStatus.ACTIVE:
        return 'bg-green-50 text-green-700 border border-green-200';
      case EquipStatus.REPAIR:
        return 'bg-red-50 text-red-700 border border-red-200';
      case EquipStatus.MAINTENANCE:
        return 'bg-orange-50 text-orange-700 border border-orange-200';
      case EquipStatus.WAITING_PARTS:
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case EquipStatus.IDLE:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
      default:
        return 'bg-white/3 text-gray-300';
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20 px-4 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
           <h2 className="text-2xl font-black uppercase tracking-tight text-gray-800">Автопарк</h2>
           <div className="flex p-1.5 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/5">
              <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-neo-bg shadow-neo text-blue-600' : 'text-gray-400 hover:text-blue-500'}`}><LayoutGrid size={18}/></button>
              <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-neo-bg shadow-neo text-blue-600' : 'text-gray-400 hover:text-blue-500'}`}><List size={18}/></button>
           </div>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Поиск по VIN..." className="pl-12 pr-6 py-4 rounded-2xl bg-neo-bg shadow-neo-inset outline-none text-sm w-full md:w-80 border-none text-gray-700" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={handleAddNew} className="p-4 rounded-2xl bg-neo-bg shadow-neo text-blue-600 hover:shadow-neo-inset active:scale-95 transition-all border border-blue-500/10"><Plus size={24} /></button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(e => {
            const insuranceStatus = getInsuranceStatus(e.insurance_end);
            const computedStatus = computeEquipmentStatus(e.id, breakdowns, plannedTOs, equipment);
            return (
            <div key={e.id} onClick={() => selectEquipment(e.id)} className="p-8 rounded-[2.5rem] shadow-neo bg-neo-bg group hover:shadow-neo-inset transition-all cursor-pointer border border-white/10 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-2 h-full ${
                computedStatus.status === EquipStatus.ACTIVE ? 'bg-green-500' :
                computedStatus.status === EquipStatus.REPAIR ? 'bg-red-500' :
                computedStatus.status === EquipStatus.MAINTENANCE ? 'bg-orange-500' :
                computedStatus.status === EquipStatus.WAITING_PARTS ? 'bg-yellow-500' :
                'bg-blue-500'
              }`} />
              <div className="flex items-start justify-between mb-6">
                <div className="p-4 rounded-2xl shadow-neo bg-neo-bg text-blue-600 group-hover:scale-110 transition-transform"><Truck size={32} /></div>
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{e.year} г.в.</span>
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-gray-700 dark:text-gray-200 group-hover:text-blue-600 transition-colors">{e.name}</h3>
              <p className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase mt-1 tracking-widest">{e.make} {e.model}</p>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg inline-block ${
                  computedStatus.status === EquipStatus.ACTIVE ? 'bg-green-100 text-green-700' :
                  computedStatus.status === EquipStatus.REPAIR ? 'bg-red-100 text-red-700' :
                  computedStatus.status === EquipStatus.MAINTENANCE ? 'bg-orange-100 text-orange-700' :
                  computedStatus.status === EquipStatus.WAITING_PARTS ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {computedStatus.status}
                </div>
                {computedStatus.reason && computedStatus.status !== EquipStatus.ACTIVE && (
                  <p className="text-[8px] text-gray-500 mt-1 truncate">{computedStatus.reason}</p>
                )}
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 space-y-4">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                    <div className="flex items-center gap-2"><Gauge size={14} className="text-blue-600"/> Наработка</div>
                    <span className="text-gray-800 font-bold">{formatNumber(e.hours)} м/ч</span>
                 </div>
                 {e.insurance_end && (
                   <div className={`flex justify-between items-center text-[10px] font-black uppercase p-3 rounded-xl ${
                     insuranceStatus.status === 'expired' ? 'bg-red-500/10 text-red-600' :
                     insuranceStatus.status === 'critical' ? 'bg-orange-500/10 text-orange-600' :
                     insuranceStatus.status === 'warning' ? 'bg-yellow-500/10 text-yellow-600' :
                     'bg-green-500/10 text-green-600'
                   }`}>
                      <div className="flex items-center gap-2">ОСАГО</div>
                      <span className="font-bold">{formatToDDMMYYYY(e.insurance_end)}</span>
                   </div>
                 )}
              </div>
            </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-neo-bg rounded-[2.5rem] shadow-neo-inset p-4 overflow-hidden border border-white/10">
           <table className="w-full text-left min-w-[600px]">
              <thead className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-800">
                 <tr>
                    <th className="px-3 md:px-6 py-4 md:py-5">Единица техники</th>
                    <th className="px-3 md:px-4 py-4 md:py-5 w-28 md:w-48">Статус</th>
                    <th className="px-3 md:px-4 py-4 md:py-5 hidden md:table-cell">Наработка</th>
                    <th className="px-3 md:px-4 py-4 md:py-5 hidden lg:table-cell">Водитель</th>
                    <th className="px-3 md:px-4 py-4 md:py-5 hidden md:table-cell">ОСАГО</th>
                    <th className="px-3 md:px-4 py-4 md:py-5"></th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                 {filtered.map(e => {
                   const computedStatus = computeEquipmentStatus(e.id, breakdowns, plannedTOs, equipment);
                   const insuranceStatus = getInsuranceStatus(e.insurance_end);
                   return (
                   <tr key={e.id} onClick={() => selectEquipment(e.id)} className="hover:bg-white/5 transition-colors cursor-pointer group">
                      <td className="px-3 md:px-6 py-4 md:py-6 flex items-center gap-3 md:gap-4 min-w-[180px]">
                         <div className="p-2 md:p-3 rounded-xl shadow-neo-sm bg-neo-bg text-blue-600 group-hover:scale-110 transition-transform shrink-0"><Truck size={18} className="md:w-5 md:h-5"/></div>
                         <div className="min-w-0 flex-1">
                            <p className="text-xs md:text-sm font-black uppercase text-gray-800 group-hover:text-blue-600 transition-colors truncate">{e.name}</p>
                            <p className="text-[8px] md:text-[9px] text-gray-400 uppercase font-bold truncate">{e.vin}</p>
                         </div>
                      </td>
                      <td className="px-3 md:px-4 py-4 md:py-6">
                        <div className="space-y-1.5">
                          <span className={`text-[9px] md:text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full shadow-sm ${
                            computedStatus.status === EquipStatus.ACTIVE ? 'bg-green-500 text-white' :
                            computedStatus.status === EquipStatus.REPAIR ? 'bg-red-500 text-white' :
                            computedStatus.status === EquipStatus.MAINTENANCE ? 'bg-orange-500 text-white' :
                            computedStatus.status === EquipStatus.WAITING_PARTS ? 'bg-yellow-400 text-yellow-900' :
                            'bg-blue-500 text-white'
                          }`}>{computedStatus.status.length > 15 ? computedStatus.status.substring(0, 15) + '...' : computedStatus.status}</span>
                          {computedStatus.reason && computedStatus.status !== EquipStatus.ACTIVE && (
                            <p className="text-[9px] md:text-[10px] text-gray-600 dark:text-gray-300 truncate max-w-[150px]">{computedStatus.reason}</p>
                          )}
                          {/* Прогресс-бар по заявке */}
                          {(() => {
                            const relatedRequest = useProcurementStore.getState().requests.find(r => {
                              const reqBreakdown = useMaintenanceStore.getState().breakdowns.find(b => b.id === r.breakdownId);
                              return reqBreakdown?.equipmentId === e.id;
                            });
                            if (relatedRequest) {
                              const statusOrder = ['Новая', 'Поиск', 'Оплачено', 'В пути', 'На складе'];
                              const currentIndex = statusOrder.indexOf(relatedRequest.status);
                              const progressPercent = (currentIndex + 1) * 20;
                              return (
                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                  {/* Разделенная шкала статусов */}
                                  <div className="flex gap-0.5 mb-1">
                                    <div className={`flex-1 h-1.5 rounded-full ${
                                      currentIndex >= 0 ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-700'
                                    }`}/>
                                    <div className={`flex-1 h-1.5 rounded-full ${
                                      currentIndex >= 1 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
                                    }`}/>
                                    <div className={`flex-1 h-1.5 rounded-full ${
                                      currentIndex >= 2 ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-700'
                                    }`}/>
                                    <div className={`flex-1 h-1.5 rounded-full ${
                                      currentIndex >= 3 ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-700'
                                    }`}/>
                                    <div className={`flex-1 h-1.5 rounded-full ${
                                      currentIndex >= 4 ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                                    }`}/>
                                  </div>
                                  <p className="text-[8px] md:text-[9px] font-semibold uppercase mt-1 text-gray-500 dark:text-gray-400">
                                    Заявка: <span className={
                                      relatedRequest.status === 'На складе' ? 'text-emerald-500' :
                                      relatedRequest.status === 'В пути' ? 'text-indigo-500' :
                                      relatedRequest.status === 'Оплачено' ? 'text-orange-500' :
                                      relatedRequest.status === 'Поиск' ? 'text-blue-500' :
                                      'text-purple-500'
                                    }>{relatedRequest.status}</span>
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>
                      <td className="px-3 md:px-4 py-4 md:py-6 text-xs md:text-sm font-black text-gray-700 whitespace-nowrap hidden md:table-cell">{formatNumber(e.hours)} м/ч</td>
                      <td className="px-3 md:px-4 py-4 md:py-6 text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase whitespace-nowrap hidden lg:table-cell">{e.driver || '—'}</td>
                      <td className="px-3 md:px-4 py-4 md:py-6 hidden md:table-cell">
                        {e.insurance_end ? (() => {
                          const insuranceStatus = getInsuranceStatus(e.insurance_end);
                          return (
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`text-[9px] md:text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full inline-block w-fit ${
                                insuranceStatus.status === 'expired' ? 'bg-red-500 text-white' :
                                insuranceStatus.status === 'critical' ? 'bg-orange-500 text-white' :
                                insuranceStatus.status === 'warning' ? 'bg-yellow-500 text-white' :
                                'bg-green-500 text-white'
                              }`}>
                                {formatToDDMMYYYY(e.insurance_end)}
                              </span>
                              {insuranceStatus.status === 'expired' && (
                                <span className="text-[9px] md:text-[10px] font-semibold text-red-500">Просрочено</span>
                              )}
                              {insuranceStatus.status === 'critical' && (
                                <span className="text-[9px] md:text-[10px] font-semibold text-orange-500">{insuranceStatus.daysLeft} дн.</span>
                              )}
                            </div>
                          );
                        })() : <span className="text-[9px] md:text-[10px] text-gray-400">—</span>}
                      </td>
                      <td className="px-3 md:px-4 py-4 md:py-6 text-right"><ChevronRight size={16} className="md:w-4 md:h-4 text-gray-400 group-hover:text-blue-600 transition-all"/></td>
                   </tr>
                   );
                 })}
              </tbody>
           </table>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-md">
          <div className="fixed inset-0 md:relative md:w-[95%] md:max-w-7xl bg-neo-bg md:h-[90vh] md:rounded-[3rem] shadow-neo overflow-y-auto flex flex-col border-0 md:border md:border-white/20 animate-in zoom-in duration-300">
            {/* Паспорт - Хедер */}
            <div className="p-4 md:p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start md:items-center bg-neo-bg shrink-0">
              <div className="flex items-start md:items-center gap-3 md:gap-8 flex-1 min-w-0">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl shadow-neo bg-neo-bg flex items-center justify-center text-blue-600 border border-blue-500/10 shrink-0"><Truck size={24} className="md:w-8 md:h-8"/></div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base md:text-2xl font-black uppercase leading-none text-gray-800 dark:text-gray-200 tracking-tight truncate">{selectedItem.name}</h2>
                  <div className="flex gap-2 md:gap-8 mt-3 md:mt-5 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                     <button onClick={() => setActiveTab('main')} className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'main' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-400 hover:text-blue-400'}`}>Основное</button>
                     <button onClick={() => setActiveTab('docs')} className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'docs' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-400 hover:text-blue-400'}`}>Документы</button>
                     <button onClick={() => setActiveTab('regulations')} className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'regulations' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-400 hover:text-blue-400'}`}>Регламент ТО</button>
                     <button onClick={() => setActiveTab('history')} className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all whitespace-nowrap flex-shrink-0 ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-400 hover:text-blue-400'}`}>История</button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 ml-2">
                {isEditing ? (
                  <button onClick={handleSave} className="p-2 md:p-4 rounded-xl md:rounded-2xl shadow-neo-inset text-emerald-600 font-black uppercase text-[8px] md:text-[10px] flex items-center gap-1 md:gap-2 transition-all"><Save size={16} className="md:w-5 md:h-5"/><span className="hidden md:inline">Сохранить</span></button>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="p-2 md:p-4 rounded-xl md:rounded-2xl shadow-neo text-blue-600 hover:shadow-neo-inset transition-all"><Edit3 size={16} className="md:w-5 md:h-5"/></button>
                )}
                <button onClick={() => {
                  if (isNewEquipment && selectedItem) {
                    deleteEquipment(selectedItem.id);
                    setIsNewEquipment(false);
                  }
                  selectEquipment(null);
                }} className="p-2 md:p-4 rounded-xl md:rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-neo transition-all z-50"><X size={20} className="md:w-6 md:h-6"/></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar bg-neo-bg">
              {activeTab === 'main' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-4 space-y-8">
                    <div className="aspect-[4/3] rounded-[2.5rem] shadow-neo bg-neo-bg overflow-hidden relative border-4 border-white/50">
                      <img src={editForm.image || 'https://picsum.photos/seed/tech/800/600'} className="w-full h-full object-cover" />
                      {isEditing && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm"><button onClick={handleUploadPhoto} className="p-5 rounded-2xl bg-neo-bg shadow-neo text-blue-600"><Camera size={32}/></button></div>
                      )}
                    </div>
                    <div className="p-8 rounded-[2.5rem] shadow-neo bg-neo-bg text-center space-y-6 border border-white/5">
                      <img src={qrBase64} className="w-36 h-36 mx-auto p-4 bg-white rounded-[2rem] shadow-neo-inset" />
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Цифровой QR-паспорт</p>
                    </div>
                  </div>
                  <div className="lg:col-span-8 space-y-10">
                    <div className="p-4 rounded-2xl bg-neo-bg border border-white/5 flex items-center justify-between gap-4">
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.12em]">Операционный статус</h3>
                      <div className="flex items-center gap-2">
                        {[EquipStatus.ACTIVE, EquipStatus.REPAIR, EquipStatus.MAINTENANCE, EquipStatus.WAITING_PARTS].map(s => (
                          <button
                            key={s}
                            onClick={() => isEditing && setEditForm({...editForm, status: s})}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-colors ${editForm.status === s ? statusColorClass(s) : 'bg-white/3 text-gray-300 hover:bg-white/5'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <EditableBlock label="Марка" value={editForm.make} isEditing={isEditing} onChange={(v:string) => setEditForm({...editForm, make: v})} />
                      <EditableBlock label="Модель" value={editForm.model} isEditing={isEditing} onChange={(v:string) => setEditForm({...editForm, model: v})} />
                      <EditableBlock label="Гос. номер" value={editForm.license_plate} isEditing={isEditing} onChange={(v:string) => setEditForm({...editForm, license_plate: v})} />
                      <EditableBlock label="VIN (Заводской №)" value={editForm.vin} isEditing={isEditing} font="font-mono" onChange={(v:string) => setEditForm({...editForm, vin: v})} />
                      <EditableBlock label="Год выпуска" value={editForm.year} isEditing={isEditing} type="number" onChange={(v:string) => setEditForm({...editForm, year: parseInt(v)})} />
                      <EditableBlock label="Наработка" value={editForm.hours} isEditing={isEditing} type="number" onChange={(v:string) => setEditForm({...editForm, hours: parseInt(v)})} highlight suffix=" м/ч" />
                      <EditableBlock label="Водитель" value={editForm.driver} isEditing={isEditing} onChange={(v:string) => setEditForm({...editForm, driver: v})} />
                      <EditableBlock label="Контрагент/Продавец" value={editForm.supplier} isEditing={isEditing} onChange={(v:string) => setEditForm({...editForm, supplier: v})} />
                      <EditableBlock label="Телефон контрагента" value={editForm.supplierPhone} isEditing={isEditing} onChange={(v:string) => setEditForm({...editForm, supplierPhone: v})} />
                      <EditableBlock label="Email контрагента" value={editForm.supplierEmail} isEditing={isEditing} onChange={(v:string) => setEditForm({...editForm, supplierEmail: v})} />
                    </div>
                    <div className="p-10 rounded-[2.5rem] shadow-neo-inset bg-neo-bg border border-blue-500/10">
                       <div className="flex items-center justify-between mb-6">
                         <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Данные страхования</h3>
                         {editForm.insurance_end && (() => {
                           const status = getInsuranceStatus(editForm.insurance_end);
                           return (
                             <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${
                               status.status === 'expired' ? 'bg-red-500 text-white' :
                               status.status === 'critical' ? 'bg-orange-500 text-white' :
                               status.status === 'warning' ? 'bg-yellow-500 text-white' :
                               'bg-green-500 text-white'
                             }`}>
                               {status.message}
                             </div>
                           );
                         })()}
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <EditableBlock label="Страховая компания" value={editForm.insuranceCompany} isEditing={isEditing} onChange={(v:string) => setEditForm({...editForm, insuranceCompany: v})} />
                         <EditableBlock label="Номер страховки" value={editForm.insuranceNumber} isEditing={isEditing} onChange={(v:string) => setEditForm({...editForm, insuranceNumber: v})} />
                         <EditableBlock label="Дата начала" value={editForm.insuranceStart} isEditing={isEditing} type="text" onChange={(v:string) => setEditForm({...editForm, insuranceStart: v})} />
                         <EditableBlock label="Дата окончания" value={editForm.insurance_end} isEditing={isEditing} type="text" onChange={(v:string) => setEditForm({...editForm, insurance_end: v})} highlight />
                       </div>
                    </div>
                    {isEditing && (
                      <div className="p-8 rounded-[2.5rem] shadow-neo bg-neo-bg text-center border border-red-500/20">
                        <button onClick={() => setShowDeleteConfirm(true)} className="px-10 py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-neo text-[10px] font-black uppercase transition-all active:scale-95 flex items-center gap-2 mx-auto"><Trash2 size={16}/>Удалить технику</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'docs' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     <DocCard label="СТС / ПТС" isEditing={isEditing} onUpload={() => handleUploadDocument('sts')} documentUrl={editForm.documents?.find(d => d.type === 'sts')?.url} />
                     <DocCard label="Страховка ОСАГО" isEditing={isEditing} onUpload={() => handleUploadDocument('osago')} documentUrl={editForm.documents?.find(d => d.type === 'osago')?.url} />
                     <DocCard label="Диагностическая карта" isEditing={isEditing} onUpload={() => handleUploadDocument('diagnostic')} documentUrl={editForm.documents?.find(d => d.type === 'diagnostic')?.url} />
                     <DocCard label="Каталог" isEditing={isEditing} onUpload={() => handleUploadDocument('catalog')} documentUrl={editForm.documents?.find(d => d.type === 'catalog')?.url} />
                     <DocCard label="Инструкция" isEditing={isEditing} onUpload={() => handleUploadDocument('manual')} documentUrl={editForm.documents?.find(d => d.type === 'manual')?.url} />
                     <DocCard label="Другое" isEditing={isEditing} onUpload={() => handleUploadDocument('other')} documentUrl={editForm.documents?.find(d => d.type === 'other')?.url} />
                  </div>
                  {isEditing && (
                    <div className="p-8 rounded-[2.5rem] shadow-neo bg-neo-bg text-center border border-red-500/20">
                      <button onClick={() => setShowDeleteConfirm(true)} className="px-10 py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-neo text-[10px] font-black uppercase transition-all active:scale-95 flex items-center gap-2 mx-auto"><Trash2 size={16}/>Удалить технику</button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'regulations' && (
                <div className="space-y-8">
                  <div className="p-10 rounded-[2.5rem] shadow-neo bg-neo-bg border border-blue-500/10">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Регламент технического обслуживания</h3>
                      {isEditing && (
                        <button onClick={() => {
                          const newReg: MaintenanceRegulation = {
                            id: Date.now().toString(),
                            type: 'ТО-' + ((editForm.regulations?.length || 0) + 1),
                            intervalHours: 250,
                            intervalKm: 1000,
                            works: ['Замена масла'],
                            fluids: [{ name: 'Моторное масло', quantity: '10 л' }]
                          };
                          setEditForm({
                            ...editForm,
                            regulations: [...(editForm.regulations || []), newReg]
                          });
                        }} className="px-6 py-3 rounded-2xl shadow-neo text-blue-600 hover:shadow-neo-inset transition-all text-[10px] font-black uppercase flex items-center gap-2">
                          <Plus size={16}/> Добавить ТО
                        </button>
                      )}
                    </div>
                    
                    {(!editForm.regulations || editForm.regulations.length === 0) ? (
                      <div className="p-20 rounded-[2.5rem] shadow-neo-inset bg-neo-bg text-center">
                        <div className="w-20 h-20 rounded-full shadow-neo mx-auto mb-8 flex items-center justify-center text-gray-300"><Clock size={40}/></div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Регламент ТО не настроен</p>
                        {isEditing && (
                          <p className="text-[10px] text-gray-500 mt-4">Нажмите "Добавить ТО" чтобы создать график обслуживания</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {editForm.regulations
                          .sort((a, b) => {
                            const aInterval = a.intervalKm || a.intervalHours || 0;
                            const bInterval = b.intervalKm || b.intervalHours || 0;
                            return aInterval - bInterval;
                          })
                          .map((reg, idx) => {
                            const currentValue = editForm.mileage_km || editForm.hours || 0;
                            const interval = reg.intervalKm || reg.intervalHours || 0;
                            const nextService = Math.ceil(currentValue / interval) * interval;
                            const isOverdue = currentValue >= nextService;
                            
                            return (
                              <div key={reg.id} className={`p-8 rounded-[2.5rem] shadow-neo bg-neo-bg border ${isOverdue ? 'border-orange-500/30' : 'border-white/5'}`}>
                                <div className="flex items-start justify-between mb-6">
                                  <div className="flex-1">
                                    {isEditing ? (
                                      <input 
                                        type="text" 
                                        value={reg.type} 
                                        onChange={(e) => {
                                          const updated = [...(editForm.regulations || [])];
                                          updated[idx] = { ...updated[idx], type: e.target.value };
                                          setEditForm({ ...editForm, regulations: updated });
                                        }}
                                        className="text-lg font-black uppercase text-blue-600 bg-neo-bg shadow-neo-inset px-4 py-2 rounded-xl border-none outline-none"
                                      />
                                    ) : (
                                      <h4 className="text-lg font-black uppercase text-gray-800">{reg.type}</h4>
                                    )}
                                    <div className="flex gap-6 mt-4">
                                      {reg.intervalKm && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-black text-gray-400 uppercase">Пробег:</span>
                                          {isEditing ? (
                                            <input 
                                              type="number" 
                                              value={reg.intervalKm} 
                                              onChange={(e) => {
                                                const updated = [...(editForm.regulations || [])];
                                                updated[idx] = { ...updated[idx], intervalKm: parseInt(e.target.value) };
                                                setEditForm({ ...editForm, regulations: updated });
                                              }}
                                              className="w-24 text-sm font-black text-blue-600 bg-neo-bg shadow-neo-inset px-3 py-1 rounded-lg border-none outline-none"
                                            />
                                          ) : (
                                            <span className="text-sm font-black text-gray-700">{formatNumber(reg.intervalKm)} км</span>
                                          )}
                                        </div>
                                      )}
                                      {reg.intervalHours && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-black text-gray-400 uppercase">Моточасы:</span>
                                          {isEditing ? (
                                            <input 
                                              type="number" 
                                              value={reg.intervalHours} 
                                              onChange={(e) => {
                                                const updated = [...(editForm.regulations || [])];
                                                updated[idx] = { ...updated[idx], intervalHours: parseInt(e.target.value) };
                                                setEditForm({ ...editForm, regulations: updated });
                                              }}
                                              className="w-24 text-sm font-black text-blue-600 bg-neo-bg shadow-neo-inset px-3 py-1 rounded-lg border-none outline-none"
                                            />
                                          ) : (
                                            <span className="text-sm font-black text-gray-700">{reg.intervalHours} м/ч</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {!isEditing && (
                                      <div className={`mt-4 px-4 py-2 rounded-xl inline-block text-[10px] font-black uppercase ${
                                        isOverdue ? 'bg-orange-500/20 text-orange-600' : 'bg-green-500/20 text-green-600'
                                      }`}>
                                        {isOverdue ? `Требуется при ${nextService}` : `Следующее: ${nextService}`} {reg.intervalKm ? 'км' : 'м/ч'}
                                      </div>
                                    )}
                                  </div>
                                  {isEditing && (
                                    <button 
                                      onClick={() => {
                                        const updated = editForm.regulations?.filter((_, i) => i !== idx);
                                        setEditForm({ ...editForm, regulations: updated });
                                      }}
                                      className="p-3 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-all"
                                    >
                                      <Trash2 size={16}/>
                                    </button>
                                  )}
                                </div>
                                
                                <div className="space-y-4">
                                  <div>
                                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Состав работ:</h5>
                                    <div className="space-y-2">
                                      {reg.works.map((work, workIdx) => (
                                        <div key={workIdx} className="flex items-center gap-3">
                                          <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                          {isEditing ? (
                                            <input 
                                              type="text" 
                                              value={work} 
                                              onChange={(e) => {
                                                const updated = [...(editForm.regulations || [])];
                                                const updatedWorks = [...updated[idx].works];
                                                updatedWorks[workIdx] = e.target.value;
                                                updated[idx] = { ...updated[idx], works: updatedWorks };
                                                setEditForm({ ...editForm, regulations: updated });
                                              }}
                                              className="flex-1 text-sm text-gray-700 bg-neo-bg shadow-neo-inset px-3 py-2 rounded-lg border-none outline-none"
                                            />
                                          ) : (
                                            <span className="text-sm text-gray-700">{work}</span>
                                          )}
                                          {isEditing && (
                                            <button 
                                              onClick={() => {
                                                const updated = [...(editForm.regulations || [])];
                                                updated[idx].works = updated[idx].works.filter((_, i) => i !== workIdx);
                                                setEditForm({ ...editForm, regulations: updated });
                                              }}
                                              className="p-1 text-red-500 hover:text-red-700"
                                            >
                                              <X size={14}/>
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                      {isEditing && (
                                        <button 
                                          onClick={() => {
                                            const updated = [...(editForm.regulations || [])];
                                            updated[idx].works = [...updated[idx].works, 'Новая работа'];
                                            setEditForm({ ...editForm, regulations: updated });
                                          }}
                                          className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 flex items-center gap-2 mt-2"
                                        >
                                          <Plus size={12}/> Добавить работу
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {reg.fluids && reg.fluids.length > 0 && (
                                    <div>
                                      <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Замена жидкостей:</h5>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {reg.fluids.map((fluid, fluidIdx) => (
                                          <div key={fluidIdx} className="p-4 rounded-xl shadow-neo-inset bg-neo-bg flex items-center justify-between">
                                            {isEditing ? (
                                              <>
                                                <input 
                                                  type="text" 
                                                  value={fluid.name} 
                                                  onChange={(e) => {
                                                    const updated = [...(editForm.regulations || [])];
                                                    const updatedFluids = [...(updated[idx].fluids || [])];
                                                    updatedFluids[fluidIdx] = { ...updatedFluids[fluidIdx], name: e.target.value };
                                                    updated[idx] = { ...updated[idx], fluids: updatedFluids };
                                                    setEditForm({ ...editForm, regulations: updated });
                                                  }}
                                                  className="flex-1 text-xs font-bold text-gray-700 bg-transparent border-none outline-none"
                                                  placeholder="Название"
                                                />
                                                <input 
                                                  type="text" 
                                                  value={fluid.quantity} 
                                                  onChange={(e) => {
                                                    const updated = [...(editForm.regulations || [])];
                                                    const updatedFluids = [...(updated[idx].fluids || [])];
                                                    updatedFluids[fluidIdx] = { ...updatedFluids[fluidIdx], quantity: e.target.value };
                                                    updated[idx] = { ...updated[idx], fluids: updatedFluids };
                                                    setEditForm({ ...editForm, regulations: updated });
                                                  }}
                                                  className="w-20 text-xs font-bold text-blue-600 bg-transparent border-none outline-none text-right"
                                                  placeholder="Кол-во"
                                                />
                                                <button 
                                                  onClick={() => {
                                                    const updated = [...(editForm.regulations || [])];
                                                    updated[idx].fluids = updated[idx].fluids?.filter((_, i) => i !== fluidIdx);
                                                    setEditForm({ ...editForm, regulations: updated });
                                                  }}
                                                  className="ml-2 p-1 text-red-500 hover:text-red-700"
                                                >
                                                  <X size={14}/>
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                <span className="text-xs font-bold text-gray-700">{fluid.name}</span>
                                                <span className="text-xs font-black text-blue-600">{fluid.quantity}</span>
                                              </>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                      {isEditing && (
                                        <button 
                                          onClick={() => {
                                            const updated = [...(editForm.regulations || [])];
                                            updated[idx].fluids = [...(updated[idx].fluids || []), { name: 'Новая жидкость', quantity: '0 л' }];
                                            setEditForm({ ...editForm, regulations: updated });
                                          }}
                                          className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 flex items-center gap-2 mt-3"
                                        >
                                          <Plus size={12}/> Добавить жидкость
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <div className="p-8 rounded-[2.5rem] shadow-neo bg-neo-bg text-center border border-red-500/20">
                      <button onClick={() => setShowDeleteConfirm(true)} className="px-10 py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-neo text-[10px] font-black uppercase transition-all active:scale-95 flex items-center gap-2 mx-auto"><Trash2 size={16}/>Удалить технику</button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-6">
                   {(() => {
                     // Показываем ТОЛЬКО поломки + ТО, без дублирования актов поломок
                     const equipBreakdowns = breakdowns.filter(b => b.equipmentId === selectedItem?.id);
                     const equipTORecords = records.filter(r => 
                       r.equipmentId === selectedItem?.id && 
                       !r.type.toLowerCase().includes('поломк') && 
                       !r.type.toLowerCase().includes('неисправност') && 
                       !r.type.toLowerCase().includes('акт')
                     );

                     // Создаем объединенный список (только ТО + поломки, без дублей)
                     const allHistory = [
                       ...equipTORecords.map(r => ({ ...r, _type: 'maintenance' as const })),
                       ...equipBreakdowns.map(b => ({ ...b, _type: 'breakdown' as const }))
                     ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                     if (allHistory.length === 0) {
                       return (
                         <div className="p-20 rounded-[3rem] shadow-neo-inset bg-neo-bg text-center">
                            <div className="w-20 h-20 rounded-full shadow-neo mx-auto mb-8 flex items-center justify-center text-gray-300"><History size={40}/></div>
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">История обслуживания пока пуста</p>
                            <button className="mt-8 px-10 py-4 rounded-2xl shadow-neo text-[10px] font-black uppercase text-blue-600 hover:shadow-neo-inset transition-all active:scale-95 border border-blue-500/10">Скачать отчет PDF</button>
                         </div>
                       );
                     }

                     return (
                       <div className="space-y-4">
                         {allHistory.map((item) => {
                           const isBreakdown = item._type === 'breakdown';
                           const status = (item as any).status;
                           // Найти связанную заявку снабжения для поломки
                           const relatedRequest = isBreakdown ? useProcurementStore.getState().requests.find(r => r.breakdownId === item.id) : null;

                           return (
                             <div
                               key={item.id}
                               onClick={() => setSelectedHistoryRecord(item)}
                               className={`p-4 md:p-6 rounded-2xl shadow-neo-sm bg-neo-bg flex flex-col gap-3 border-l-4 ${
                                 isBreakdown
                                   ? status === 'Исправлено' ? 'border-emerald-500'
                                   : status === 'В работе' ? 'border-blue-500'
                                   : status === 'Запчасти заказаны' ? 'border-yellow-500'
                                   : 'border-red-500'
                                   : 'border-emerald-500'
                               } group hover:shadow-neo hover:cursor-pointer transition-all`}
                             >
                               <div className="flex justify-between items-start">
                                 <div className="overflow-hidden flex-1">
                                   <div className="flex items-center gap-2">
                                     <p className="text-xs md:text-sm font-black uppercase text-gray-700 dark:text-gray-200 truncate">
                                       {isBreakdown ? (item as any).partName || 'Поломка' : (item as any).type}
                                     </p>
                                     {isBreakdown && (
                                       <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                                         status === 'Исправлено' ? 'bg-emerald-500 text-white' :
                                         status === 'В работе' ? 'bg-blue-500 text-white' :
                                         status === 'Запчасти заказаны' ? 'bg-yellow-400 text-yellow-900' :
                                         'bg-red-500 text-white'
                                       }`}>{status}</span>
                                     )}
                                   </div>
                                   <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">
                                     {isBreakdown
                                       ? `${(item as any).node || 'Узел'} • ${(item as any).severity || ''}`
                                       : `${(item as any).performedBy} • ${(item as any).hoursAtMaintenance} м/ч`
                                     }
                                   </p>
                                 </div>
                                 <span className="text-[9px] md:text-[10px] font-black text-gray-400 shrink-0 ml-4">{formatDate(item.date)}</span>
                               </div>
                               
                               {/* Прогресс-бар статусов снабжения для поломок */}
                               {isBreakdown && relatedRequest && (
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
                                     {relatedRequest.status === 'На складе' && status !== 'В работе' && status !== 'Исправлено' && (
                                       <span className="text-[7px] font-black text-emerald-600 flex items-center gap-1">
                                         <CheckCircle2 size={10}/> Готово
                                       </span>
                                     )}
                                   </div>
                                 </div>
                               )}
                             </div>
                           );
                         })}
                       </div>
                     );
                   })()}
                   {isEditing && (
                     <div className="p-8 rounded-[2.5rem] shadow-neo bg-neo-bg text-center border border-red-500/20">
                       <button onClick={() => setShowDeleteConfirm(true)} className="px-10 py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-neo text-[10px] font-black uppercase transition-all active:scale-95">Удалить технику</button>
                     </div>
                   )}
                </div>
              )}
            </div>

            {showDeleteConfirm && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 rounded-[3rem]">
                <div className="bg-neo-bg p-10 rounded-[2.5rem] shadow-neo max-w-md mx-4 border border-white/20">
                  <h3 className="text-xl font-black uppercase text-gray-800 mb-4">Подтвердите удаление</h3>
                  <p className="text-sm text-gray-600 mb-8">Вы уверены, что хотите удалить технику "{selectedItem?.name}"? Это действие нельзя отменить.</p>
                  <div className="flex gap-4">
                    <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-6 py-3 rounded-2xl shadow-neo text-gray-600 hover:shadow-neo-inset transition-all font-black uppercase text-[10px]">Отмена</button>
                    <button onClick={handleDelete} className="flex-1 px-6 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-neo transition-all font-black uppercase text-[10px]">Удалить</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedHistoryRecord && (() => {
        // Найти связанную заявку снабжения для поломки
        const relatedRequest = selectedHistoryRecord._type === 'breakdown' 
          ? useProcurementStore.getState().requests.find(r => r.breakdownId === selectedHistoryRecord.id) 
          : null;
        
        return (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-neo-bg rounded-[3rem] shadow-neo max-w-3xl w-full p-8 md:p-12 border border-white/20 max-h-[90vh] overflow-y-auto animate-in zoom-in duration-300">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-3">
                {selectedHistoryRecord._type === 'breakdown' ? (
                  <div className="p-3 rounded-xl shadow-neo bg-neo-bg text-red-500"><AlertTriangle size={24}/></div>
                ) : (
                  <div className="p-3 rounded-xl shadow-neo bg-neo-bg text-emerald-500"><CheckCircle2 size={24}/></div>
                )}
                <div>
                  <h3 className="text-xl md:text-2xl font-black uppercase text-gray-800 dark:text-gray-200 mb-1">
                    {selectedHistoryRecord._type === 'breakdown'
                      ? (selectedHistoryRecord.partName || 'Поломка')
                      : (selectedHistoryRecord.type || 'Обслуживание')
                    }
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {formatDate(selectedHistoryRecord.date)}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedHistoryRecord(null)} className="p-2 rounded-xl shadow-neo-inset text-gray-400 hover:text-red-500 transition-all"><X size={24}/></button>
            </div>

            {selectedHistoryRecord._type === 'breakdown' ? (
              // Детали поломки
              <div className="space-y-5">
                {/* Кнопки перехода */}
                {relatedRequest && (
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package size={18} className="text-blue-500"/>
                        <p className="text-sm font-black text-blue-400 uppercase">Заявка снабжения №{relatedRequest.id.slice(-6)}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedHistoryRecord(null);
                          // Переключаемся на вкладку снабжения
                          if (onNavigate) {
                            onNavigate('procurement');
                          }
                          // Устанавливаем заявку и режим только для просмотра
                          useProcurementStore.getState().setSelectedRequestId(relatedRequest.id);
                          // Сохраняем флаг readOnlyMode в store (нужно добавить)
                          setTimeout(() => {
                            const event = new CustomEvent('procurement-readonly', { detail: true });
                            window.dispatchEvent(event);
                          }, 100);
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase hover:bg-blue-700 transition-all"
                      >
                        Открыть заявку
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-[8px] font-black text-gray-400 uppercase">
                      <span>Статус: <span className="text-blue-400">{relatedRequest.status}</span></span>
                      <span>•</span>
                      <span>Создана: <span className="text-blue-400">{formatDate(relatedRequest.createdAt)}</span></span>
                    </div>
                  </div>
                )}
                
                <div className="p-5 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/5 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Номер акта</p>
                      <button
                        onClick={() => {
                          // Переключаемся на вкладку ТО и ремонт
                          if (onNavigate) {
                            onNavigate('maintenance');
                          }
                        }}
                        className="text-lg font-black text-blue-600 hover:text-blue-700 hover:underline transition-all"
                        title="Перейти к акту во вкладке ТО и ремонт"
                      >
                        {selectedHistoryRecord.actNumber || 'АКТ-001'}
                      </button>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Статус</p>
                      <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${
                        selectedHistoryRecord.status === 'Исправлено' ? 'bg-emerald-500 text-white' :
                        selectedHistoryRecord.status === 'В работе' ? 'bg-blue-500 text-white' :
                        selectedHistoryRecord.status === 'Запчасти получены' ? 'bg-emerald-400 text-white' :
                        selectedHistoryRecord.status === 'Запчасти заказаны' ? 'bg-yellow-400 text-yellow-900' :
                        'bg-gray-400 text-white'
                      }`}>{selectedHistoryRecord.status}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Узел</p>
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{selectedHistoryRecord.node || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Серьезность</p>
                    <p className={`text-sm font-black px-2 py-1 rounded-lg inline-block ${
                      selectedHistoryRecord.severity === 'Критическая' ? 'bg-red-500/20 text-red-600' :
                      selectedHistoryRecord.severity === 'Средняя' ? 'bg-orange-500/20 text-orange-600' :
                      'bg-green-500/20 text-green-600'
                    }`}>{selectedHistoryRecord.severity}</p>
                  </div>
                  {selectedHistoryRecord.description && (
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Описание</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{selectedHistoryRecord.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Наработка (м/ч)</p>
                      <p className="text-sm font-black text-gray-700">{selectedHistoryRecord.hoursAtBreakdown || '—'}</p>
                    </div>
                    {selectedHistoryRecord.reportedBy && (
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Кто сообщил</p>
                        <p className="text-sm font-black text-gray-700">{selectedHistoryRecord.reportedBy}</p>
                      </div>
                    )}
                    {(selectedHistoryRecord as any).hoursAtFix && (
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Наработка при исправлении</p>
                        <p className="text-sm font-black text-emerald-600">{(selectedHistoryRecord as any).hoursAtFix} м/ч</p>
                      </div>
                    )}
                    {(selectedHistoryRecord as any).mileageAtFix && (
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Пробег при исправлении</p>
                        <p className="text-sm font-black text-emerald-600">{(selectedHistoryRecord as any).mileageAtFix} км</p>
                      </div>
                    )}
                  </div>
                  {(selectedHistoryRecord as any).fixNotes && (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-2">Примечания к исправлению</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{(selectedHistoryRecord as any).fixNotes}</p>
                    </div>
                  )}
                </div>

                {/* Лог изменений */}
                <div className="p-5 rounded-2xl shadow-neo bg-neo-bg border border-white/5">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">История изменений</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"/>
                      <div className="flex-1">
                        <p className="text-xs font-black text-gray-700 dark:text-gray-200">Акт поломки создан</p>
                        <p className="text-[8px] text-gray-400">{formatDateTime(selectedHistoryRecord.date)}</p>
                      </div>
                    </div>
                    {relatedRequest && (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"/>
                          <div className="flex-1">
                            <p className="text-xs font-black text-gray-700 dark:text-gray-200">Заявка в снабжение создана</p>
                            <p className="text-[8px] text-gray-400">{formatDateTime(relatedRequest.createdAt)}</p>
                          </div>
                        </div>
                        {(relatedRequest.statusHistory || []).map((entry, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0"/>
                            <div className="flex-1">
                              <p className="text-xs font-black text-gray-700 dark:text-gray-200">Статус изменен на "{entry.status}"</p>
                              <p className="text-[8px] text-gray-400">{formatDateTime(entry.date)}{entry.user ? ` • ${entry.user}` : ''}</p>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {selectedHistoryRecord.photos && selectedHistoryRecord.photos.length > 0 && (
                  <div className="p-5 rounded-2xl shadow-neo bg-neo-bg border border-white/5">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Фотографии поломки</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedHistoryRecord.photos.map((p: string, i: number) => (
                        <div key={i} className="rounded-lg overflow-hidden border border-white/10 cursor-pointer hover:border-blue-500 transition-colors" onClick={() => window.open(p, '_blank')}>
                          <img src={p} className="w-full h-24 object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Детали обслуживания
              <>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-6 rounded-2xl shadow-neo bg-neo-bg border border-white/5">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-2 tracking-widest">Исполнитель</p>
                    <p className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase">{selectedHistoryRecord.performedBy || '—'}</p>
                  </div>
                  <div className="p-6 rounded-2xl shadow-neo bg-neo-bg border border-white/5">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-2 tracking-widest">Наработка (м/ч)</p>
                    <p className="text-sm font-black text-gray-800 dark:text-gray-200">{selectedHistoryRecord.hoursAtMaintenance || '—'}</p>
                  </div>
                </div>

                {selectedHistoryRecord.checklistItems && selectedHistoryRecord.checklistItems.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Контрольный список</h4>
                    <div className="space-y-3">
                      {selectedHistoryRecord.checklistItems.map((item: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-xl shadow-neo-sm bg-neo-bg border-l-4 border-emerald-500 flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 ${item.done ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                            {item.done && <span className="text-xs font-black">✓</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-black uppercase ${item.done ? 'text-emerald-600 line-through' : 'text-gray-800 dark:text-gray-200'}`}>{item.text}</p>
                            {item.note && <p className="text-[9px] text-gray-500 mt-2 italic">Примечание: {item.note}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedHistoryRecord.notes && (
                  <div className="mb-8">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Примечания</h4>
                    <div className="p-6 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/5">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedHistoryRecord.notes}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            <button onClick={() => setSelectedHistoryRecord(null)} className="w-full px-8 py-4 rounded-2xl shadow-neo bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] transition-all">Закрыть</button>
          </div>
        </div>
        );
      })()}
    </div>
  );
};

const EditableBlock = ({ label, value, isEditing, onChange, type = "text", highlight = false, font = "", suffix = "" }: any) => (
  <div className="p-6 rounded-2xl shadow-neo bg-neo-bg border border-white/5">
    <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest">{label}</p>
    {isEditing ? (
      <input type={type} className={`w-full bg-neo-bg shadow-neo-inset p-3 rounded-xl border-none outline-none text-xs font-black uppercase text-blue-600 dark:text-blue-400 ${font}`} value={value} onChange={e => onChange(e.target.value)} />
    ) : (
      <p className={`text-sm font-black uppercase tracking-tight ${font} ${highlight ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>{value || '—'}{suffix}</p>
    )}
  </div>
);

const DocCard = ({ label, isEditing, onUpload, documentUrl }: any) => {
  const handleViewDocument = (e: React.MouseEvent) => {
    if (!isEditing && documentUrl) {
      e.stopPropagation();
      // Если это base64 data URL, конвертируем в blob для просмотра
      if (documentUrl.startsWith('data:')) {
        try {
          // Извлекаем base64 данные
          const base64Data = documentUrl.split(',')[1];
          const mimeType = documentUrl.split(':')[1].split(';')[0];
          
          // Конвертируем base64 в binary
          const binaryString = window.atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Создаем blob и URL для просмотра
          const blob = new Blob([bytes], { type: mimeType });
          const blobUrl = URL.createObjectURL(blob);
          
          // Открываем в новой вкладке для просмотра
          window.open(blobUrl, '_blank');
          
          // Освобождаем память через 1 минуту
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } catch (error) {
          console.error('Error opening document:', error);
          alert('Ошибка при открытии документа');
        }
      } else {
        // Если это обычный URL, открываем напрямую
        window.open(documentUrl, '_blank');
      }
    }
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpload();
  };

  return (
    <div onClick={handleViewDocument} className={`p-10 rounded-[2.5rem] shadow-neo bg-neo-bg flex flex-col items-center gap-8 group hover:shadow-neo-inset transition-all border border-white/5 ${documentUrl && !isEditing ? 'cursor-pointer' : ''}`}>
       <div className="w-16 h-16 rounded-2xl shadow-neo bg-neo-bg flex items-center justify-center text-blue-600"><FileText size={32}/></div>
       <div className="text-center">
          <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 text-gray-700">{label}</h4>
          <p className={`text-[8px] font-bold uppercase opacity-60 ${documentUrl ? 'text-green-600' : 'text-gray-400'}`}>{documentUrl ? 'Файл загружен' : 'Файл не загружен'}</p>
       </div>
       {isEditing && <button onClick={handleUploadClick} className="p-4 rounded-xl shadow-neo text-blue-600 hover:shadow-neo-inset transition-all"><Upload size={18}/></button>}
    </div>
  );
};

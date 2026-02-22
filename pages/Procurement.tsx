
import React, { useState } from 'react';
import { Package, ChevronRight, Truck, LayoutGrid, List, Layers, X, CheckCircle2, ArrowRight, Wallet, AlertTriangle, Plus } from 'lucide-react';
import { useProcurementStore } from '../store/useProcurementStore';
import { useFleetStore } from '../store/useFleetStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useAuthStore } from '../store/useAuthStore';
import { ProcurementStatus } from '../types';
import { formatNumber, formatMoney, formatDate, formatDateTime } from '../utils/format';

const COLUMNS: {id: ProcurementStatus, title: string, color: string}[] = [
  { id: 'Новая', title: 'Новая', color: 'bg-purple-500' },
  { id: 'Поиск', title: 'Поиск', color: 'bg-blue-500' },
  { id: 'Оплачено', title: 'Оплачено', color: 'bg-orange-500' },
  { id: 'В пути', title: 'В пути', color: 'bg-indigo-500' },
  { id: 'На складе', title: 'Склад', color: 'bg-emerald-600' },
];

export const Procurement: React.FC<{ onNavigate?: (page: string) => void }> = ({ onNavigate }) => {
  const { requests, updateRequestStatus, updateRequest, selectedRequestId, setSelectedRequestId, addRequest } = useProcurementStore();
  const { equipment, selectEquipment } = useFleetStore();
  const { breakdowns, updateBreakdownStatus } = useMaintenanceStore();
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'table'>('table');
  const [readOnlyMode, setReadOnlyMode] = useState(false);

  // Списки контрагентов и перевозчиков (извлекаем из всех заявок)
  const [contractors, setContractors] = useState<string[]>(() => {
    const unique = new Set(requests.map(r => r.contractorName).filter(Boolean));
    return Array.from(unique).sort();
  });
  const [carriers, setCarriers] = useState<string[]>(() => {
    const unique = new Set(requests.map(r => r.carrierName).filter(Boolean));
    return Array.from(unique).sort();
  });

  // Для создания новой заявки
  const [isCreateRequestOpen, setIsCreateRequestOpen] = useState(false);
  const [isBreakdownSelectOpen, setIsBreakdownSelectOpen] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState<any>(null);
  const [newRequestForm, setNewRequestForm] = useState({
    title: '',
    contractorName: '',
    carrierName: '',
    items: [{ sku: '', name: '', quantity: '1', unitPriceWithVAT: 0 }]
  });

  const selectedReq = requests.find(r => r.id === selectedRequestId);
  const [editReq, setEditReq] = useState<any>(null);

  React.useEffect(() => {
    if (selectedReq) {
      setEditReq({ ...selectedReq });
      setReadOnlyMode(false);
    } else {
      setEditReq(null);
    }
  }, [selectedReq]);

  // Прослушивание события для режима только для просмотра
  React.useEffect(() => {
    const handleReadOnly = (e: any) => {
      if (e.detail === true) {
        setReadOnlyMode(true);
      }
    };
    window.addEventListener('procurement-readonly', handleReadOnly);
    return () => {
      window.removeEventListener('procurement-readonly', handleReadOnly);
    };
  }, []);

  // Сброс режима при закрытии модального окна
  React.useEffect(() => {
    if (!selectedRequestId) {
      setReadOnlyMode(false);
    }
  }, [selectedRequestId]);

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

  // Функция для просмотра файлов
  const viewFile = (url: string, name: string) => {
    if (!url) return;
    
    // Проверяем тип файла
    const isImage = url.startsWith('data:image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
    const isPDF = url.startsWith('data:application/pdf') || /\.pdf$/i.test(name);
    
    if (isImage) {
      // Для изображений открываем в модальном окне
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md';
      modal.innerHTML = `
        <div class="relative max-w-5xl max-h-[90vh]">
          <button class="absolute -top-10 right-0 p-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all" onclick="this.closest('.fixed').remove()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <img src="${url}" alt="${name}" class="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" />
          <a href="${url}" download="${name}" class="absolute -bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-black uppercase text-xs hover:bg-emerald-700 transition-all">
            Скачать
          </a>
        </div>
      `;
      document.body.appendChild(modal);
    } else if (isPDF) {
      // Для PDF открываем в новой вкладке с возможностью скачать
      const newWindow = window.open(url, '_blank');
      if (newWindow) {
        setTimeout(() => {
          const downloadBtn = document.createElement('a');
          downloadBtn.href = url;
          downloadBtn.download = name;
          downloadBtn.style.display = 'none';
          document.body.appendChild(downloadBtn);
          downloadBtn.click();
          document.body.removeChild(downloadBtn);
        }, 1000);
      }
    } else {
      // Для остальных файлов - скачивание
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Управление контрагентами
  const [isContractorsPanelOpen, setIsContractorsPanelOpen] = useState(false);
  const [newContractor, setNewContractor] = useState({ name: '', category: 'Поставщики запчастей' });
  const [newCarrier, setNewCarrier] = useState({ name: '', category: 'Транспортные компании' });
  
  // Для автокомплита
  const [contractorFilter, setContractorFilter] = useState('');
  const [carrierFilter, setCarrierFilter] = useState('');
  const [showContractorSuggestions, setShowContractorSuggestions] = useState(false);
  const [showCarrierSuggestions, setShowCarrierSuggestions] = useState(false);
  
  const contractorCategories = ['Поставщики запчастей', 'Поставщики ГСМ', 'Сервисные центры', 'Арендодатели', 'Другие'];
  const carrierCategories = ['Транспортные компании', 'Курьерские службы', 'Грузоперевозки', 'Другие'];

  // Фильтрация для автокомплита
  const filteredContractors = contractors.filter(c => 
    c.toLowerCase().includes(contractorFilter.toLowerCase())
  );
  const filteredCarriers = carriers.filter(c => 
    c.toLowerCase().includes(carrierFilter.toLowerCase())
  );

  const addContractor = () => {
    if (newContractor.name && !contractors.includes(newContractor.name)) {
      setContractors([...contractors, newContractor.name].sort());
      setNewContractor({ name: '', category: 'Поставщики запчастей' });
    }
  };

  const addCarrier = () => {
    if (newCarrier.name && !carriers.includes(newCarrier.name)) {
      setCarriers([...carriers, newCarrier.name].sort());
      setNewCarrier({ name: '', category: 'Транспортные компании' });
    }
  };

  const removeContractor = (name: string) => {
    setContractors(contractors.filter(c => c !== name));
  };

  const removeCarrier = (name: string) => {
    setCarriers(carriers.filter(c => c !== name));
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden animate-in fade-in duration-700 px-2 md:px-0">
      {/* Шапка с переключателем видов и панелью контрагентов */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-6">
           <h2 className="text-2xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">Снабжение</h2>
           <div className="flex p-1.5 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/5 shrink-0">
              <button onClick={() => setViewMode('kanban')} title="Канбан-доска" className={`p-2.5 rounded-xl transition-all ${viewMode === 'kanban' ? 'bg-neo-bg shadow-neo text-blue-600' : 'text-gray-400 hover:text-blue-500'}`}><LayoutGrid size={18}/></button>
              <button onClick={() => setViewMode('list')} title="Простой список" className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-neo-bg shadow-neo text-blue-600' : 'text-gray-400 hover:text-blue-500'}`}><List size={18}/></button>
              <button onClick={() => setViewMode('table')} title="Реестр (Гант)" className={`p-2.5 rounded-xl transition-all ${viewMode === 'table' ? 'bg-neo-bg shadow-neo text-blue-600' : 'text-gray-400 hover:text-blue-500'}`}><Layers size={18}/></button>
           </div>
           <button
             onClick={() => setIsContractorsPanelOpen(true)}
             className="px-4 py-2.5 rounded-2xl bg-neo-bg border border-white/10 text-gray-700 dark:text-gray-300 font-bold text-xs uppercase hover:shadow-neo-inset transition-all flex items-center gap-2"
           >
             <Wallet size={16}/> Контрагенты
           </button>
        </div>
        <button
          onClick={() => {
            if (onNavigate) onNavigate('maintenance');
          }}
          className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black uppercase text-xs shadow-neo hover:bg-emerald-700 transition-all flex items-center gap-2"
        >
          <Plus size={18}/>
          Создать заявку
        </button>
      </div>

      {/* Панель управления контрагентами */}
      {isContractorsPanelOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-neo-bg w-full max-w-4xl rounded-[3rem] shadow-neo p-8 animate-in zoom-in border border-white/20 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl shadow-neo bg-neo-bg text-blue-500">
                  <Wallet size={24}/>
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">Контрагенты и перевозчики</h2>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Управление справочниками</p>
                </div>
              </div>
              <button onClick={() => setIsContractorsPanelOpen(false)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all"><X size={20}/></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Контрагенты */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"/> Контрагенты ({contractors.length})
                </h3>
                
                {/* Добавление контрагента */}
                <div className="p-4 rounded-2xl shadow-neo-inset bg-neo-bg space-y-3">
                  <input
                    className="w-full p-3 rounded-xl shadow-neo-inset bg-neo-bg border border-white/20 outline-none text-sm font-bold"
                    placeholder="Название организации"
                    value={newContractor.name}
                    onChange={e => setNewContractor({...newContractor, name: e.target.value})}
                  />
                  <select
                    className="w-full p-3 rounded-xl shadow-neo-inset bg-neo-bg border border-white/20 outline-none text-sm font-bold"
                    value={newContractor.category}
                    onChange={e => setNewContractor({...newContractor, category: e.target.value})}
                  >
                    {contractorCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button
                    onClick={addContractor}
                    className="w-full py-3 rounded-xl bg-blue-500 text-white font-black uppercase text-xs hover:bg-blue-600 transition-all"
                  >
                    + Добавить контрагента
                  </button>
                </div>

                {/* Список контрагентов */}
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                  {contractors.map(c => (
                    <div key={c} className="flex items-center justify-between p-3 rounded-xl bg-neo-bg border border-white/5 group hover:border-blue-500/30">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{c}</span>
                      <button
                        onClick={() => removeContractor(c)}
                        className="p-2 rounded-lg bg-red-500/20 text-red-600 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      >
                        <X size={14}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Перевозчики */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"/> Перевозчики ({carriers.length})
                </h3>
                
                {/* Добавление перевозчика */}
                <div className="p-4 rounded-2xl shadow-neo-inset bg-neo-bg space-y-3">
                  <input
                    className="w-full p-3 rounded-xl shadow-neo-inset bg-neo-bg border border-white/20 outline-none text-sm font-bold"
                    placeholder="Название компании"
                    value={newCarrier.name}
                    onChange={e => setNewCarrier({...newCarrier, name: e.target.value})}
                  />
                  <select
                    className="w-full p-3 rounded-xl shadow-neo-inset bg-neo-bg border border-white/20 outline-none text-sm font-bold"
                    value={newCarrier.category}
                    onChange={e => setNewCarrier({...newCarrier, category: e.target.value})}
                  >
                    {carrierCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button
                    onClick={addCarrier}
                    className="w-full py-3 rounded-xl bg-emerald-500 text-white font-black uppercase text-xs hover:bg-emerald-600 transition-all"
                  >
                    + Добавить перевозчика
                  </button>
                </div>

                {/* Список перевозчиков */}
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                  {carriers.map(c => (
                    <div key={c} className="flex items-center justify-between p-3 rounded-xl bg-neo-bg border border-white/5 group hover:border-emerald-500/30">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{c}</span>
                      <button
                        onClick={() => removeCarrier(c)}
                        className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      >
                        <X size={14}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <div key={req.id} onClick={() => setSelectedRequestId(req.id)} className={`p-4 md:p-6 rounded-[2rem] shadow-neo bg-neo-bg group hover:shadow-neo-inset transition-all cursor-pointer border-l-4 border-white/10 relative ${borderColor}`}>
                    <h5 className="text-[10px] md:text-[11px] font-black uppercase mb-2 md:mb-3 text-gray-700 dark:text-gray-200 tracking-tight group-hover:text-blue-600 transition-colors line-clamp-2">{req.title}</h5>
                    <div className="flex items-center gap-2 mb-4 opacity-70">
                      <Truck size={12} className="text-blue-500"/>
                      <span className="text-[8px] md:text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase truncate">{equipment.find(e=>e.id===req.equipmentId)?.name || 'Общий'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-200/50 dark:border-gray-800">
                      <span className="text-[9px] md:text-[11px] font-black text-emerald-600">{req.cost ? formatMoney(req.cost) : 'Оценка...'}</span>
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
        <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1 px-1">
          {sortedRequests.map(req => (
            <div key={req.id} onClick={() => setSelectedRequestId(req.id)} className="p-4 md:p-6 rounded-[2rem] bg-neo-bg shadow-[inset_3px_3px_6px_rgba(0,0,0,0.1),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.3),inset_-3px_-3px_6px_rgba(60,75,95,0.2)] hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15),inset_-4px_-4px_8px_rgba(255,255,255,1)] dark:hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.4),inset_-4px_-4px_8px_rgba(60,75,95,0.25)] transition-all flex flex-col gap-3 group cursor-pointer min-w-0">
              <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                <div className="p-3 md:p-4 rounded-2xl shadow-neo bg-neo-bg text-blue-500 shrink-0"><Package size={20} className="md:w-6 md:h-6"/></div>
                <div className="overflow-hidden flex-1 min-w-0">
                  <h4 className="text-xs md:text-sm font-black uppercase text-gray-800 dark:text-gray-100 truncate line-clamp-2">{req.title}</h4>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-[7px] md:text-[9px] font-bold uppercase px-2 py-0.5 rounded ${COLUMNS.find(c=>c.id===req.status)?.color || 'bg-gray-300'} text-white`}>{req.status}</span>
                    <span className="text-[9px] md:text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate flex-1 min-w-0">{equipment.find(e=>e.id===req.equipmentId)?.name || 'Общий'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 md:gap-10">
                <p className="text-sm md:text-lg font-black text-emerald-600 whitespace-nowrap">{req.cost ? formatMoney(req.cost) : '—'}</p>
                <div className="p-2 rounded-xl text-gray-400 group-hover:text-blue-600"><ChevronRight size={18} className="md:w-5 md:h-5"/></div>
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
                      <div className="p-2.5 rounded-xl shadow-neo bg-neo-bg text-blue-500 group-hover:scale-110 transition-transform"><Package size={18}/></div>
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
                  <td className="px-8 py-6 text-right font-black text-emerald-600 text-base">{req.cost ? formatMoney(req.cost) : '—'}</td>
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
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">
                        {readOnlyMode ? 'Просмотр заявки' : 'Карточка ТМЦ'}
                      </h3>
                      {readOnlyMode && (
                        <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest">
                          Режим только для просмотра
                        </p>
                      )}
                    </div>
                 </div>
                 <button onClick={() => { setSelectedRequestId(null); setReadOnlyMode(false); }} className="p-3 rounded-xl shadow-neo text-gray-600 dark:text-gray-300 hover:text-red-500 transition-all"><X size={24}/></button>
              </div>
              
                 <div className="space-y-6">
                   {/* Информация о поломке */}
                   {editReq.breakdownActNumber && (
                     <div className="p-6 rounded-2xl shadow-neo-inset bg-neo-bg border border-red-500/20 space-y-3">
                       <div className="flex items-center gap-2">
                         <AlertTriangle size={18} className="text-red-500"/>
                         <p className="text-[8px] font-black text-red-400 uppercase tracking-widest">Акт поломки</p>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                           <label className="text-xs font-bold text-gray-400">Номер акта</label>
                           <div className="text-lg font-black text-blue-600">{editReq.breakdownActNumber}</div>
                         </div>
                         <div>
                           <label className="text-xs font-bold text-gray-400">Узел</label>
                           <div className="text-sm font-bold text-gray-700 dark:text-gray-200">{editReq.breakdownNode || '—'}</div>
                         </div>
                       </div>
                       <div>
                         <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Наименование поломки</label>
                         <div className="text-base font-black text-gray-800 dark:text-gray-200">{editReq.breakdownName || editReq.title}</div>
                       </div>
                       {editReq.breakdownDescription && (
                         <div>
                           <label className="text-xs font-bold text-gray-400">Описание</label>
                           <p className="text-sm text-gray-600 dark:text-gray-300">{editReq.breakdownDescription}</p>
                         </div>
                       )}
                     </div>
                   )}

                   <div className="p-6 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/5 space-y-4">
                     <div className="space-y-2">
                       <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Наименование</label>
                       <input disabled={readOnlyMode} className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none outline-none app-input disabled:opacity-50 disabled:cursor-not-allowed" value={editReq.title} onChange={e=>setEditReq({...editReq, title: e.target.value})} />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       <div className="space-y-2 relative">
                         <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Контрагент</label>
                         <input
                           disabled={readOnlyMode}
                           className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/20 outline-none app-input disabled:opacity-50 disabled:cursor-not-allowed"
                           placeholder="Введите название"
                           value={editReq.contractorName || ''}
                           onFocus={() => {
                             setContractorFilter(editReq.contractorName || '');
                             setShowContractorSuggestions(true);
                           }}
                           onChange={e => {
                             setEditReq({...editReq, contractorName: e.target.value});
                             setContractorFilter(e.target.value);
                             setShowContractorSuggestions(true);
                           }}
                           onBlur={() => setTimeout(() => setShowContractorSuggestions(false), 200)}
                         />
                         {editReq.contractorName && !contractors.includes(editReq.contractorName) && (
                           <p className="text-[9px] text-orange-500 font-bold">* Будет добавлен в список при сохранении</p>
                         )}
                         {/* Выпадающий список с подсказками */}
                         {showContractorSuggestions && filteredContractors.length > 0 && (
                           <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-xl shadow-neo bg-neo-bg border border-white/10">
                             {filteredContractors.map((c, i) => (
                               <button
                                 key={i}
                                 type="button"
                                 className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-blue-500/10 transition-all"
                                 onMouseDown={() => {
                                   setEditReq({...editReq, contractorName: c});
                                   setShowContractorSuggestions(false);
                                 }}
                               >
                                 {c}
                               </button>
                             ))}
                           </div>
                         )}
                       </div>
                       <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Номер счета / спецификации</label>
                         <input disabled={readOnlyMode} className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/20 outline-none app-input disabled:opacity-50 disabled:cursor-not-allowed" value={editReq.invoiceNumber || ''} onChange={e=>setEditReq({...editReq, invoiceNumber: e.target.value})} />
                       </div>
                     </div>

                     <div className="space-y-3">
                       <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Статус заявки</label>
                       <div className="flex flex-wrap gap-2">
                         {COLUMNS.map(col => (
                           <button
                             key={col.id}
                             type="button"
                             disabled={readOnlyMode}
                             onClick={()=>setEditReq({...editReq, status: col.id})}
                             className={`px-4 py-3 rounded-2xl font-bold text-xs uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed ${editReq.status === col.id ? `${col.color} text-white shadow-neo` : 'bg-neo-bg border border-white/10 text-gray-400 shadow-neo hover:shadow-neo-inset'}`}
                           >
                             {col.title}
                           </button>
                         ))}
                       </div>
                     </div>
                   </div>

                   <div className="p-6 rounded-2xl shadow-neo bg-neo-bg border border-white/5">
                     <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-4">Позиции</p>
                     <div className="space-y-3">
                       {/* Позиции - 2 ряда: Артикул+Наименование / Кол-во+Цена+Сумма */}
                       {(editReq.items || []).map((it: any, idx: number) => {
                         const total = (parseFloat(it.quantity) || 0) * (it.unitPriceWithVAT || 0);
                         return (
                         <div key={it.id || idx} className="p-4 rounded-2xl shadow-neo-sm bg-neo-bg space-y-2">
                           {/* Верхний ряд: Артикул + Наименование + Кнопка удаления */}
                           <div className="grid grid-cols-[60px_1fr_auto] md:grid-cols-[80px_1fr_auto] gap-2 items-center">
                             <input
                               className="w-full h-[36px] md:h-[38px] px-1.5 md:px-2 rounded-xl shadow-neo-inset bg-neo-bg border-none text-[11px] md:text-xs font-bold text-center text-gray-700 outline-none"
                               placeholder="Артикул"
                               value={it.sku || ''}
                               onChange={e => {
                                 const arr = [...editReq.items];
                                 arr[idx].sku = e.target.value;
                                 arr[idx].total = (parseFloat(arr[idx].quantity || '0') || 0) * (arr[idx].unitPriceWithVAT || 0);
                                 setEditReq({...editReq, items: arr});
                               }}
                             />
                             <input
                               className="w-full h-[36px] md:h-[38px] px-2 md:px-3 rounded-xl shadow-neo-inset bg-neo-bg border-none text-[11px] md:text-xs font-bold text-gray-700 outline-none"
                               placeholder="Наименование"
                               value={it.name}
                               onChange={e => {
                                 const arr = [...editReq.items];
                                 arr[idx].name = e.target.value;
                                 arr[idx].total = (parseFloat(arr[idx].quantity || '0') || 0) * (arr[idx].unitPriceWithVAT || 0);
                                 setEditReq({...editReq, items: arr});
                               }}
                             />
                             <button
                               type="button"
                               onClick={() => {
                                 const arr = [...editReq.items];
                                 arr.splice(idx, 1);
                                 setEditReq({...editReq, items: arr});
                               }}
                               className="w-[32px] h-[32px] md:w-[38px] md:h-[38px] flex items-center justify-center rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all shrink-0"
                             >
                               <X size={16}/>
                             </button>
                           </div>
                           {/* Нижний ряд: Кол-во + Цена + Сумма */}
                           <div className="grid grid-cols-[50px_90px_1fr] md:grid-cols-[60px_100px_1fr] gap-2 items-center">
                             <input
                               type="number"
                               className="w-full h-[36px] md:h-[38px] px-1.5 md:px-2 rounded-xl shadow-neo-inset bg-neo-bg border-none text-[11px] md:text-xs font-bold text-center text-gray-700 outline-none"
                               placeholder="Кол-во"
                               value={it.quantity}
                               onChange={e => {
                                 const arr = [...editReq.items];
                                 arr[idx].quantity = e.target.value;
                                 arr[idx].total = (parseFloat(arr[idx].quantity || '0') || 0) * (arr[idx].unitPriceWithVAT || 0);
                                 setEditReq({...editReq, items: arr});
                               }}
                             />
                             <input
                               type="number"
                               step="0.01"
                               className="w-full h-[36px] md:h-[38px] px-1.5 md:px-2 rounded-xl shadow-neo-inset bg-neo-bg border-none text-[11px] md:text-xs font-bold text-right text-gray-700 outline-none"
                               placeholder="Цена с НДС"
                               value={it.unitPriceWithVAT || ''}
                               onChange={e => {
                                 const arr = [...editReq.items];
                                 arr[idx].unitPriceWithVAT = parseFloat(e.target.value || '0') || 0;
                                 arr[idx].total = (parseFloat(arr[idx].quantity || '0') || 0) * (arr[idx].unitPriceWithVAT || 0);
                                 setEditReq({...editReq, items: arr});
                               }}
                             />
                             <div className="h-[36px] md:h-[38px] px-2 md:px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-end shrink-0">
                               <span className="text-[11px] md:text-xs font-black text-emerald-600">{total > 0 ? formatMoney(total) : '—'}</span>
                             </div>
                           </div>
                         </div>
                         );
                       })}
                       <button onClick={()=> setEditReq({...editReq, items: [...(editReq.items||[]), { id: `i-${Date.now()}`, sku: '', name: '', quantity: '1', unitPriceWithVAT: 0, total: 0 }]})} className="mt-2 px-6 py-3 rounded-xl bg-neo-bg border border-white/5 font-bold text-xs shadow-neo hover:shadow-neo-inset transition-all">+ Добавить позицию</button>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                     <div className="p-6 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/10">
                       <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Перевозчик</label>
                       <div className="relative">
                         <input
                           className="w-full p-3 rounded-xl shadow-neo-inset bg-neo-bg border border-white/10 outline-none app-input"
                           placeholder="Введите название"
                           value={editReq.carrierName || ''}
                           onFocus={() => {
                             setCarrierFilter(editReq.carrierName || '');
                             setShowCarrierSuggestions(true);
                           }}
                           onChange={e => {
                             setEditReq({...editReq, carrierName: e.target.value});
                             setCarrierFilter(e.target.value);
                             setShowCarrierSuggestions(true);
                           }}
                           onBlur={() => setTimeout(() => setShowCarrierSuggestions(false), 200)}
                         />
                         {editReq.carrierName && !carriers.includes(editReq.carrierName) && (
                           <p className="text-[9px] text-orange-500 font-bold mt-1">* Будет добавлен в список при сохранении</p>
                         )}
                         {/* Выпадающий список с подсказками */}
                         {showCarrierSuggestions && filteredCarriers.length > 0 && (
                           <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-xl shadow-neo bg-neo-bg border border-white/10">
                             {filteredCarriers.map((c, i) => (
                               <button
                                 key={i}
                                 type="button"
                                 className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-emerald-500/10 transition-all"
                                 onMouseDown={() => {
                                   setEditReq({...editReq, carrierName: c});
                                   setShowCarrierSuggestions(false);
                                 }}
                               >
                                 {c}
                               </button>
                             ))}
                           </div>
                         )}
                       </div>
                       <label className="text-xs font-bold text-gray-600 dark:text-gray-300 mt-3">Трек/накладная</label>
                       <input className="w-full p-3 rounded-xl shadow-neo-inset bg-neo-bg border border-white/10 outline-none app-input" value={editReq.trackingNumber || ''} onChange={e=>setEditReq({...editReq, trackingNumber: e.target.value})} />
                     </div>
                     <div className="p-6 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/10 flex flex-col justify-between">
                       <div>
                         <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Ответственный</label>
                         <input className="w-full p-3 rounded-xl shadow-neo-inset bg-neo-bg border border-white/10 outline-none app-input" value={editReq.responsible || ''} onChange={e=>setEditReq({...editReq, responsible: e.target.value})} />
                       </div>
                       <div className="mt-4">
                         <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Сумма всех позиций</label>
                         <div className="text-3xl font-black text-emerald-600 mt-2">{formatMoney((editReq.items||[]).reduce((s:any,it:any)=>s + (it.total||0),0) || 0)}</div>
                       </div>
                     </div>
                   </div>

                   <div className="p-6 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/5">
                     <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Фотографии запчастей (из акта поломки №{editReq.breakdownActNumber})</label>
                     <div className="flex gap-3 items-center mt-3">
                       <div className="flex-1 grid grid-cols-3 gap-2">
                         {(editReq.breakdownPhotos||[]).map((p:any, i:number) => (
                           <div key={p.id || i} className="w-full h-20 rounded-lg overflow-hidden relative border border-white/10 cursor-pointer hover:border-blue-500 transition-colors group" onClick={() => viewFile(p.url, p.name || `Фото ${i + 1}`)}>
                             <img src={p.url} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                               <div className="text-center">
                                 <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-bold block">Просмотр</span>
                                 <span className="text-white/80 opacity-0 group-hover:opacity-100 text-[7px] block">кликните</span>
                               </div>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   </div>

                   <div className="p-6 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/5">
                     <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Счета / Спецификации / Документы</label>
                     <div className="flex items-center gap-3 mt-3">
                       <input type="file" id="req-file-input" className="hidden" onChange={(ev:any)=>{
                         const file = ev.target.files && ev.target.files[0];
                         if (!file) return;
                         const reader = new FileReader();
                         reader.onload = (e) => {
                           const url = e.target?.result as string;
                           const att = { id: `a-${Date.now()}`, name: file.name, url, type: file.type };
                           setEditReq((prev:any)=> ({ ...prev, invoiceFiles: [...(prev.invoiceFiles||[]), att] }));
                         };
                         reader.readAsDataURL(file);
                       }} />
                       <button onClick={() => { const el = document.getElementById('req-file-input'); if (el) (el as HTMLInputElement).click(); }} className="px-4 py-3 rounded-2xl bg-neo-bg border border-white/5 font-bold text-xs shadow-neo hover:shadow-neo-inset transition-all">+ Добавить документ</button>
                       <div className="flex-1 flex flex-col gap-2">
                         {(editReq.invoiceFiles||[]).map((a:any)=> (
                           <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 group hover:border-blue-500/50 transition-all">
                             <button onClick={() => viewFile(a.url, a.name)} className="flex-1 text-left text-sm font-black text-blue-600 hover:text-blue-500 truncate flex items-center gap-2">
                               <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase">{a.name.split('.').pop()}</span>
                               {a.name}
                             </button>
                             <div className="flex items-center gap-2">
                               <a href={a.url} download={a.name} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all" title="Скачать">
                                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                   <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                   <polyline points="7 10 12 15 17 10"></polyline>
                                   <line x1="12" y1="15" x2="12" y2="3"></line>
                                 </svg>
                               </a>
                               <button onClick={() => { const arr = [...(editReq.invoiceFiles||[])]; arr.splice(arr.indexOf(a), 1); setEditReq({...editReq, invoiceFiles: arr}); }} className="p-2 rounded-lg bg-red-500/20 text-red-600 hover:bg-red-500 hover:text-white transition-all" title="Удалить">
                                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                   <polyline points="3 6 5 6 21 6"></polyline>
                                   <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                 </svg>
                               </button>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   </div>

                   {readOnlyMode ? (
                     <div className="flex gap-3 pt-4">
                       <button
                         onClick={() => setReadOnlyMode(false)}
                         className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs hover:bg-blue-700 transition-all"
                       >
                         Перейти к редактированию
                       </button>
                       <button
                         onClick={() => { setSelectedRequestId(null); setReadOnlyMode(false); }}
                         className="flex-1 py-3 rounded-2xl bg-neo-bg border border-white/10 font-black uppercase text-xs"
                       >
                         Закрыть
                       </button>
                     </div>
                   ) : (
                     <div className="flex gap-3">
                       <button onClick={() => {
                         // save updates
                         const totalCost = (editReq.items||[]).reduce((s:any,it:any)=> s + (it.total||0), 0);
                         const statusChanged = selectedReq.status !== editReq.status;

                         // Добавляем новых контрагентов и перевозчиков в списки
                         if (editReq.contractorName && !contractors.includes(editReq.contractorName)) {
                           setContractors([...contractors, editReq.contractorName].sort());
                         }
                         if (editReq.carrierName && !carriers.includes(editReq.carrierName)) {
                           setCarriers([...carriers, editReq.carrierName].sort());
                         }

                         // Сначала обновляем остальные поля (кроме статуса)
                         updateRequest(editReq.id, {
                           title: editReq.title,
                           contractorName: editReq.contractorName,
                           invoiceNumber: editReq.invoiceNumber,
                           carrierName: editReq.carrierName,
                           trackingNumber: editReq.trackingNumber,
                           responsible: editReq.responsible,
                           items: editReq.items,
                           invoiceFiles: editReq.invoiceFiles,
                           cost: totalCost
                         });

                         // Затем, если статус изменился, вызываем updateRequestStatus для триггеров
                         if (statusChanged) {
                           updateRequestStatus(editReq.id, editReq.status);
                         }

                         setSelectedRequestId(null);
                       }} className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-black uppercase text-xs">Сохранить</button>
                       <button onClick={() => setSelectedRequestId(null)} className="flex-1 py-3 rounded-2xl bg-neo-bg border border-white/10 font-black uppercase text-xs">Отмена</button>
                     </div>
                   )}
                 </div>
           </div>
        </div>
      )}

      {/* Модальное окно выбора акта для новой заявки */}
      {isBreakdownSelectOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-neo-bg w-full max-w-3xl rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/20 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl shadow-neo bg-neo-bg text-blue-500">
                  <Package size={24}/>
                </div>
                <h2 className="text-xl font-black uppercase text-gray-800 dark:text-gray-100">Выберите акт поломки</h2>
              </div>
              <button onClick={() => setIsBreakdownSelectOpen(false)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all">
                <X size={20}/>
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-500 text-center py-4">Выберите акт для создания заявки в снабжение:</p>
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                {(() => {
                  // Показываем только активные поломки без созданных заявок
                  const activeBreakdowns = breakdowns.filter(b => {
                    const hasRequest = requests.some(r => r.breakdownId === b.id);
                    return b.status !== 'Исправлено' && !hasRequest;
                  });
                  
                  if (activeBreakdowns.length === 0) {
                    return (
                      <div className="text-center py-10">
                        <p className="text-sm text-gray-500">Нет активных актов без заявок</p>
                      </div>
                    );
                  }
                  
                  return activeBreakdowns.map(b => {
                    const equip = equipment.find(e => e.id === b.equipmentId);
                    return (
                      <button
                        key={b.id}
                        onClick={() => {
                          setSelectedBreakdown(b);
                          // Передаем все позиции из акта если они есть
                          const items = b.items && b.items.length > 0 
                            ? b.items.map(item => ({ ...item, unitPriceWithVAT: 0 }))
                            : [{ sku: '', name: b.partName, quantity: '1', unitPriceWithVAT: 0 }];
                          
                          setNewRequestForm({
                            title: `Заявка по акту ${b.actNumber || 'АКТ-001'} от ${new Date(b.date).toLocaleDateString('ru-RU')} (${b.partName})`,
                            contractorName: '',
                            carrierName: '',
                            items: items
                          });
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
                            <p className="text-[9px] md:text-[10px] font-bold text-gray-700 dark:text-gray-300">{equip?.name || 'Техника'} • {b.node}</p>
                            <p className="text-[8px] md:text-[9px] font-bold text-gray-600 dark:text-gray-400">Акт: {b.actNumber || 'АКТ-001'} • {formatDate(b.date)}</p>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors"/>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания новой заявки */}
      {isCreateRequestOpen && selectedBreakdown && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-6xl bg-neo-bg rounded-[3rem] shadow-neo overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl shadow-neo bg-neo-bg text-blue-500"><Package size={28}/></div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">Заявка снабжения</h3>
                  <p className="text-[8px] font-black text-gray-400 uppercase">Акт: {selectedBreakdown.actNumber || 'АКТ-001'}</p>
                </div>
              </div>
              <button onClick={() => { setIsCreateRequestOpen(false); setSelectedBreakdown(null); }} className="p-3 rounded-xl shadow-neo text-gray-600 dark:text-gray-300 hover:text-red-500 transition-all">
                <X size={20}/>
              </button>
            </div>

            <form className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar" onSubmit={(e) => {
              e.preventDefault();
              const totalCost = newRequestForm.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (item.unitPriceWithVAT || 0), 0);
              const requestNumber = `З-${String(requests.length + 1).padStart(4, '0')}`;

              // Добавляем новых контрагентов и перевозчиков в списки
              if (newRequestForm.contractorName && !contractors.includes(newRequestForm.contractorName)) {
                setContractors([...contractors, newRequestForm.contractorName].sort());
              }
              if (newRequestForm.carrierName && !carriers.includes(newRequestForm.carrierName)) {
                setCarriers([...carriers, newRequestForm.carrierName].sort());
              }

              addRequest({
                id: `pr-${Date.now()}`,
                title: `${requestNumber}: ${newRequestForm.title}`,
                status: 'Новая',
                items: newRequestForm.items.map(item => ({
                  id: `i-${Date.now()}-${item.sku || item.name}`,
                  sku: item.sku,
                  name: item.name,
                  quantity: item.quantity,
                  unitPriceWithVAT: item.unitPriceWithVAT,
                  total: (parseFloat(item.quantity) || 0) * (item.unitPriceWithVAT || 0)
                })),
                cost: totalCost,
                createdAt: new Date().toISOString(),
                equipmentId: selectedBreakdown.equipmentId,
                breakdownId: selectedBreakdown.id,
                breakdownActNumber: selectedBreakdown.actNumber,
                breakdownName: selectedBreakdown.partName,
                breakdownDescription: selectedBreakdown.description,
                breakdownNode: selectedBreakdown.node,
                statusHistory: [{ status: 'Новая', date: new Date().toISOString(), user: useAuthStore.getState().user?.full_name }]
              });
              
              // Обновляем статус поломки
              updateBreakdownStatus(selectedBreakdown.id, 'Запчасти заказаны');

              // Формируем наименование заявки с номером акта и датой
              const actNumber = selectedBreakdown.actNumber || '001';
              const actDate = selectedBreakdown.date ? new Date(selectedBreakdown.date).toLocaleDateString('ru-RU') : new Date().toLocaleDateString('ru-RU');
              const breakdownName = selectedBreakdown.partName || '';
              const title = `Заявка по акту поломки №${actNumber} от ${actDate} (${breakdownName})`;

              setNewRequestForm({ title: title, contractorName: '', carrierName: '', items: [{ sku: '', name: breakdownName, quantity: '1', unitPriceWithVAT: 0 }] });
              setSelectedBreakdown(null);
              setIsCreateRequestOpen(false);
            }}>
              {/* Информация о поломке */}
              <div className="p-6 rounded-2xl shadow-neo-inset bg-neo-bg border border-red-500/20 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-500"/>
                  <p className="text-[8px] font-black text-red-400 uppercase tracking-widest">Акт поломки</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[8px] font-black text-gray-400">Техника</p>
                    <p className="text-sm font-black text-gray-700">{equipment.find(e => e.id === selectedBreakdown.equipmentId)?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-gray-400">Узел</p>
                    <p className="text-sm font-black text-gray-700">{selectedBreakdown.node}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[8px] font-black text-gray-400">Наименование поломки</p>
                  <p className="text-base font-black text-gray-800">{selectedBreakdown.partName}</p>
                </div>
                {selectedBreakdown.description && (
                  <div>
                    <p className="text-[8px] font-black text-gray-400">Описание</p>
                    <p className="text-sm text-gray-600">{selectedBreakdown.description}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 ml-2">Наименование заявки</label>
                <input
                  className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none text-gray-700 outline-none"
                  value={newRequestForm.title}
                  onChange={e => setNewRequestForm({...newRequestForm, title: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-300 ml-2">Контрагент</label>
                  <input
                    className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/20 outline-none text-gray-700"
                    placeholder="Введите название"
                    value={newRequestForm.contractorName}
                    onChange={e => setNewRequestForm({...newRequestForm, contractorName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-300 ml-2">Перевозчик</label>
                  <input
                    className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/20 outline-none text-gray-700"
                    placeholder="Введите название"
                    value={newRequestForm.carrierName}
                    onChange={e => setNewRequestForm({...newRequestForm, carrierName: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-300 ml-2">Позиции</label>
                  <button
                    type="button"
                    onClick={() => setNewRequestForm({
                      ...newRequestForm,
                      items: [...newRequestForm.items, { sku: '', name: '', quantity: '1', unitPriceWithVAT: 0 }]
                    })}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[8px] font-black uppercase hover:bg-emerald-700"
                  >
                    + Добавить
                  </button>
                </div>

                {newRequestForm.items.map((item, idx) => {
                  const total = (parseFloat(item.quantity) || 0) * (item.unitPriceWithVAT || 0);
                  return (
                  <div key={idx} className="p-4 rounded-2xl shadow-neo-sm bg-neo-bg space-y-2">
                    {/* Верхний ряд: Артикул + Наименование */}
                    <div className="grid grid-cols-[60px_1fr_auto] md:grid-cols-[80px_1fr_auto] gap-2 items-center">
                      <input
                        className="w-full h-[36px] md:h-[38px] px-1.5 md:px-2 rounded-xl shadow-neo-inset bg-neo-bg border-none text-[11px] md:text-xs font-bold text-center text-gray-700 outline-none"
                        placeholder="Артикул"
                        value={item.sku}
                        onChange={e => {
                          const newItems = [...newRequestForm.items];
                          newItems[idx].sku = e.target.value;
                          setNewRequestForm({...newRequestForm, items: newItems});
                        }}
                      />
                      <input
                        className="w-full h-[36px] md:h-[38px] px-2 md:px-3 rounded-xl shadow-neo-inset bg-neo-bg border-none text-[11px] md:text-xs font-bold text-gray-700 outline-none"
                        placeholder="Наименование запчасти"
                        value={item.name}
                        onChange={e => {
                          const newItems = [...newRequestForm.items];
                          newItems[idx].name = e.target.value;
                          setNewRequestForm({...newRequestForm, items: newItems});
                        }}
                        required
                      />
                      {newRequestForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = newRequestForm.items.filter((_, i) => i !== idx);
                            setNewRequestForm({...newRequestForm, items: newItems});
                          }}
                          className="w-[32px] h-[32px] md:w-[38px] md:h-[38px] flex items-center justify-center rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all shrink-0"
                        >
                          <X size={16}/>
                        </button>
                      )}
                    </div>
                    {/* Нижний ряд: Кол-во + Цена + Сумма */}
                    <div className="grid grid-cols-[50px_80px_1fr] md:grid-cols-[60px_100px_1fr] gap-2 items-center">
                      <div className="relative">
                        <input
                          type="number"
                          className="w-full h-[36px] md:h-[38px] px-1.5 md:px-2 rounded-xl shadow-neo-inset bg-neo-bg border-none text-[11px] md:text-xs font-bold text-center text-gray-700 outline-none"
                          placeholder="Кол-во"
                          value={item.quantity}
                          onChange={e => {
                            const newItems = [...newRequestForm.items];
                            newItems[idx].quantity = e.target.value;
                            setNewRequestForm({...newRequestForm, items: newItems});
                          }}
                          min="1"
                          required
                        />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full h-[36px] md:h-[38px] px-1.5 md:px-2 rounded-xl shadow-neo-inset bg-neo-bg border-none text-[11px] md:text-xs font-bold text-right text-gray-700 outline-none"
                        placeholder="Цена"
                        value={item.unitPriceWithVAT || ''}
                        onChange={e => {
                          const newItems = [...newRequestForm.items];
                          newItems[idx].unitPriceWithVAT = parseFloat(e.target.value) || 0;
                          setNewRequestForm({...newRequestForm, items: newItems});
                        }}
                      />
                      <div className="h-[36px] md:h-[38px] px-2 md:px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-end shrink-0">
                        <span className="text-[11px] md:text-xs font-black text-emerald-600">{total > 0 ? formatMoney(total) : '—'}</span>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsCreateRequestOpen(false); setSelectedBreakdown(null); }}
                  className="flex-1 py-4 rounded-2xl bg-neo-bg border border-white/10 font-black uppercase text-xs"
                >
                  Назад
                </button>
                <button type="submit" className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase text-xs tracking-[0.2em] active:scale-95 transition-all">
                  Отправить в снабжение
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

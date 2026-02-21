
import React from 'react';
import {
  Truck, AlertTriangle, Clock, Activity, History,
  ChevronRight, Fuel, TrendingUp, CheckCircle2, Wrench, Package, Calendar, X
} from 'lucide-react';
import { useFleetStore } from '../store/useFleetStore';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useProcurementStore } from '../store/useProcurementStore';
import { useAuthStore } from '../store/useAuthStore';
import { EquipStatus } from '../types';
import { formatDate } from '../utils/format';

const computeEquipmentStatus = (equipmentId: string, breakdowns: any[], plannedTOs: any[], equipment: any[]) => {
  const activeBreakdowns = breakdowns.filter(b => b.equipmentId === equipmentId && b.status !== 'Исправлено');
  const equip = equipment.find(e => e.id === equipmentId);

  // 1. Критические поломки
  const criticalBreakdowns = activeBreakdowns.filter(b => b.severity === 'Критическая');
  if (criticalBreakdowns.length > 0) return EquipStatus.REPAIR;

  // 2. Поломки в работе
  const inWorkBreakdowns = activeBreakdowns.filter(b => b.status === 'В работе');
  if (inWorkBreakdowns.length > 0) return EquipStatus.REPAIR;

  // 3. Ожидание запчастей
  const waitingForParts = activeBreakdowns.filter(b => b.status === 'Запчасти заказаны' || b.status === 'Запчасти получены');
  if (waitingForParts.length > 0) return EquipStatus.WAITING_PARTS;

  // 4. Неисправности (низкая/средняя)
  const minorBreakdowns = activeBreakdowns.filter(b =>
    (b.severity === 'Низкая' || b.severity === 'Средняя') && b.status === 'Новая'
  );
  if (minorBreakdowns.length > 0) return EquipStatus.ACTIVE_WITH_RESTRICTIONS;

  // 5. Просроченное ТО
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overduePlannedTO = plannedTOs.filter(t => {
    if (t.equipmentId !== equipmentId || t.status !== 'planned') return false;
    const plannedDate = new Date(t.date);
    plannedDate.setHours(0, 0, 0, 0);
    return plannedDate < today;
  });
  if (overduePlannedTO.length > 0) return EquipStatus.MAINTENANCE;

  // 6. Плановое ТО
  const upcomingPlannedTO = plannedTOs.filter(t => t.equipmentId === equipmentId && t.status === 'planned');
  if (upcomingPlannedTO.length > 0) return EquipStatus.MAINTENANCE;

  return EquipStatus.ACTIVE;
};

export const Dashboard: React.FC<any> = ({ onNavigate }) => {
  const { equipment } = useFleetStore();
  const { breakdowns, records, fuelRecords, plannedTOs } = useMaintenanceStore();
  const { requests } = useProcurementStore();
  
  // Состояния для быстрых форм
  const [isQuickBreakdownOpen, setIsQuickBreakdownOpen] = React.useState(false);
  const [isQuickTOOpen, setIsQuickTOOpen] = React.useState(false);
  const [isQuickProcurementOpen, setIsQuickProcurementOpen] = React.useState(false);
  
  // Форма быстрой заявки снабжения
  const [quickProcurementStep, setQuickProcurementStep] = React.useState<'select' | 'form'>('select');
  const [quickProcurementForm, setQuickProcurementForm] = React.useState({
    equipmentId: '',
    title: '',
    items: [{ sku: '', name: '', quantity: '1', unitPriceWithVAT: 0 }]
  });
  
  // Форма быстрой поломки
  const [quickBreakdownStep, setQuickBreakdownStep] = React.useState<'select' | 'form'>('select');
  const [quickBreakdownForm, setQuickBreakdownForm] = React.useState({
    equipmentId: '',
    partName: '',
    node: 'Двигатель',
    severity: 'Средняя' as any,
    description: ''
  });
  
  // Подсчет статистики
  const activeBreakdowns = breakdowns.filter(b => b.status !== 'Исправлено');
  const criticalBreakdowns = activeBreakdowns.filter(b => b.severity === 'Критическая');
  const readyToWork = activeBreakdowns.filter(b => {
    const req = requests.find(r => r.breakdownId === b.id);
    return req?.status === 'На складе' && b.status !== 'В работе' && b.status !== 'Исправлено';
  });
  const overdueTO = plannedTOs.filter(t => {
    const plannedDate = new Date(t.date);
    return t.status === 'planned' && plannedDate < new Date();
  });
  const activeProcurement = requests.filter(r => r.status !== 'На складе');

  // Обработка быстрой поломки
  const handleQuickBreakdown = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBreakdownForm.equipmentId || !quickBreakdownForm.partName) return;
    
    const equip = equipment.find(eq => eq.id === quickBreakdownForm.equipmentId);
    useMaintenanceStore.getState().addBreakdown({
      equipmentId: quickBreakdownForm.equipmentId,
      date: new Date().toISOString(),
      partName: quickBreakdownForm.partName,
      node: quickBreakdownForm.node,
      description: quickBreakdownForm.description,
      status: 'Новая',
      severity: quickBreakdownForm.severity,
      hoursAtBreakdown: equip?.hours || 0
    });
    
    setQuickBreakdownForm({ equipmentId: '', partName: '', node: 'Двигатель', severity: 'Средняя', description: '' });
    setQuickBreakdownStep('select');
    setIsQuickBreakdownOpen(false);
  };
  
  // Обработка быстрой заявки снабжения
  const handleQuickProcurement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProcurementForm.equipmentId || !quickProcurementForm.title) return;
    
    const totalCost = quickProcurementForm.items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (item.unitPriceWithVAT || 0);
    }, 0);
    
    // Генерируем номер заявки
    const currentRequests = useProcurementStore.getState().requests;
    const requestNumber = `З-${String(currentRequests.length + 1).padStart(4, '0')}`;
    
    useProcurementStore.getState().addRequest({
      id: `pr-${Date.now()}`,
      title: `${requestNumber}: ${quickProcurementForm.title}`,
      status: 'Новая',
      items: quickProcurementForm.items.map(item => ({
        id: `i-${Date.now()}-${item.sku || item.name}`,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unitPriceWithVAT: item.unitPriceWithVAT,
        total: (parseFloat(item.quantity) || 0) * (item.unitPriceWithVAT || 0)
      })),
      cost: totalCost,
      createdAt: new Date().toISOString(),
      equipmentId: quickProcurementForm.equipmentId,
      statusHistory: [{ status: 'Новая', date: new Date().toISOString(), user: useAuthStore.getState().user?.full_name }]
    });
    
    setQuickProcurementForm({ equipmentId: '', title: '', items: [{ sku: '', name: '', quantity: '1', unitPriceWithVAT: 0 }] });
    setQuickProcurementStep('select');
    setIsQuickProcurementOpen(false);
  };

  const stats = [
    {
      title: 'Автопарк',
      value: equipment.length,
      sub: `${equipment.filter(e => computeEquipmentStatus(e.id, breakdowns, plannedTOs, equipment) === EquipStatus.ACTIVE).length} в работе`,
      icon: <Truck size={24}/>,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      id: 'equipment'
    },
    {
      title: 'Готово к работе',
      value: readyToWork.length,
      sub: 'Запчасти на складе',
      icon: <CheckCircle2 size={24}/>,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      id: 'maintenance',
      highlight: readyToWork.length > 0
    },
    {
      title: 'Ремонты',
      value: activeBreakdowns.length,
      sub: `${criticalBreakdowns.length} критических`,
      icon: <AlertTriangle size={24}/>,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      id: 'maintenance'
    },
    {
      title: 'Нужно ТО',
      value: overdueTO.length,
      sub: overdueTO.length > 0 ? 'Просрочено!' : 'Плановые',
      icon: <Wrench size={24}/>,
      color: overdueTO.length > 0 ? 'text-orange-600' : 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      id: 'calendar',
      highlight: overdueTO.length > 0
    },
  ];

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700">
      {/* Быстрые действия */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <button
          onClick={() => setIsQuickBreakdownOpen(true)}
          className="p-6 rounded-[2rem] shadow-neo bg-gradient-to-br from-red-500 to-red-600 text-white hover:shadow-neo-inset transition-all group active:scale-95"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-white/20 group-hover:scale-110 transition-transform">
              <AlertTriangle size={24}/>
            </div>
            <div className="text-left">
              <h4 className="text-sm font-black uppercase tracking-widest">Акт поломки</h4>
              <p className="text-[8px] font-bold text-white/80 uppercase">Зафиксировать неисправность</p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => setIsQuickTOOpen(true)}
          className="p-6 rounded-[2rem] shadow-neo bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-neo-inset transition-all group active:scale-95"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-white/20 group-hover:scale-110 transition-transform">
              <Wrench size={24}/>
            </div>
            <div className="text-left">
              <h4 className="text-sm font-black uppercase tracking-widest">Провести ТО</h4>
              <p className="text-[8px] font-bold text-white/80 uppercase">Плановое обслуживание</p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => setIsQuickProcurementOpen(true)}
          className="p-6 rounded-[2rem] shadow-neo bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:shadow-neo-inset transition-all group active:scale-95"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-white/20 group-hover:scale-110 transition-transform">
              <Package size={24}/>
            </div>
            <div className="text-left">
              <h4 className="text-sm font-black uppercase tracking-widest">Заявка снабжения</h4>
              <p className="text-[8px] font-bold text-white/80 uppercase">Заказать запчасти</p>
            </div>
          </div>
        </button>
      </div>
      
      {/* Карточки статистики */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map(s => (
          <div
            key={s.title}
            onClick={() => onNavigate(s.id)}
            className={`p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg cursor-pointer hover:shadow-neo-inset transition-all group border border-white/5 ${s.highlight ? 'ring-2 ring-offset-2 ' + (s.color.replace('text-', 'ring-')) + ' animate-pulse' : ''}`}
          >
            <div className={`p-4 rounded-2xl shadow-neo w-fit mb-4 md:mb-6 ${s.color} ${s.bgColor} group-hover:scale-110 transition-transform`}>{s.icon}</div>
            <h4 className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">{s.title}</h4>
            <div className="text-2xl md:text-3xl font-black tracking-tighter text-gray-800 dark:text-gray-100">{s.value}</div>
            <p className={`text-[9px] md:text-[10px] font-bold mt-2 uppercase ${s.highlight ? 'text-red-600 font-black' : 'text-gray-500'}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* График наработки */}
        <div className="lg:col-span-8 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-neo bg-neo-bg border border-white/5 overflow-hidden">
           <div className="flex justify-between items-center mb-6 md:mb-10">
              <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} className="text-blue-500"/> Наработка парка (м/ч)
              </h3>
              <button onClick={() => onNavigate('equipment')} className="text-[8px] font-black text-blue-600 uppercase hover:underline flex items-center gap-1">
                Автопарк <ChevronRight size={12}/>
              </button>
           </div>
           <div className="h-48 md:h-64 flex items-end space-x-2 md:space-x-5 px-2">
              {equipment.slice(0, 12).map((e, i) => {
                const maxHours = Math.max(...equipment.map(eq => eq.hours));
                const height = maxHours > 0 ? (e.hours / maxHours) * 100 : 0;
                const status = computeEquipmentStatus(e.id, breakdowns, plannedTOs, equipment);
                return (
                  <div key={e.id} className="flex-1 bg-gray-100 dark:bg-gray-800/50 rounded-t-xl md:rounded-t-2xl relative group">
                     <div
                      style={{ height: `${height}%` }}
                      className={`absolute bottom-0 w-full rounded-t-xl md:rounded-t-2xl group-hover:opacity-80 transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)] ${
                        status === EquipStatus.REPAIR ? 'bg-red-500' :
                        status === EquipStatus.MAINTENANCE ? 'bg-orange-500' :
                        status === EquipStatus.WAITING_PARTS ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}
                     />
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-neo-bg shadow-neo px-2 py-1 rounded-lg border border-white/10 pointer-events-none whitespace-nowrap z-10">
                       <p className="text-[8px] font-black text-gray-400 uppercase">{e.name}</p>
                       <p className="text-[9px] font-black text-gray-700">{e.hours} м/ч</p>
                     </div>
                  </div>
                );
              })}
           </div>
           <div className="flex justify-between mt-4 text-[7px] font-black text-gray-400 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"/> В работе
                <span className="w-2 h-2 rounded-full bg-red-500"/> Ремонт
                <span className="w-2 h-2 rounded-full bg-orange-500"/> ТО
                <span className="w-2 h-2 rounded-full bg-yellow-500"/> Ожидание
              </div>
           </div>
        </div>

        {/* Живая лента событий */}
        <div className="lg:col-span-4 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-neo bg-neo-bg border border-white/5">
           <h3 className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-6 md:mb-10 flex items-center gap-2">
             <History size={16} className="text-orange-500"/> Живая лента
           </h3>
           <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
              {(() => {
                // Объединяем поломки и ТО, сортируем по дате
                const allEvents = [
                  ...breakdowns.map(b => ({ type: 'breakdown' as const, data: b, date: new Date(b.date).getTime() })),
                  ...records.map(r => ({ type: 'record' as const, data: r, date: new Date(r.date).getTime() }))
                ].sort((a, b) => b.date - a.date).slice(0, 6);

                if (allEvents.length === 0) {
                  return <p className="text-center py-10 text-[10px] font-black text-gray-400 uppercase">Событий нет</p>;
                }

                return allEvents.map((item) => {
                  if (item.type === 'breakdown') {
                    const b = item.data as any;
                    const req = requests.find(r => r.breakdownId === b.id);
                    const status = b.status || '';
                    const equip = equipment.find(e=>e.id===b.equipmentId);
                    
                    return (
                      <div
                        key={`b-${b.id}`}
                        className={`p-4 rounded-2xl shadow-neo-sm bg-neo-bg border-l-4 ${
                          status === 'Исправлено' ? 'border-emerald-500' :
                          status === 'Запчасти получены' ? 'border-emerald-500' :
                          status === 'Запчасти заказаны' ? 'border-yellow-400' :
                          status === 'В работе' ? 'border-blue-500' :
                          'border-red-500'
                        } flex flex-col gap-2 group cursor-pointer hover:shadow-neo transition-all`}
                        onClick={() => onNavigate('maintenance')}
                      >
                         <div className="flex justify-between items-start">
                            <div className="overflow-hidden flex-1">
                               <p className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-200 truncate">{b.partName || 'Поломка'}</p>
                               <p className="text-[8px] font-bold text-gray-400 uppercase truncate">{equip?.name || 'Техника'}</p>
                            </div>
                            <ChevronRight size={14} className="text-gray-300 group-hover:text-red-500 shrink-0" />
                         </div>
                         <div className="flex justify-between items-center">
                           <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded ${
                             status === 'Исправлено' ? 'bg-emerald-500 text-white' :
                             status === 'В работе' ? 'bg-blue-500 text-white' :
                             status === 'Запчасти заказаны' ? 'bg-yellow-500 text-white' :
                             'bg-red-500 text-white'
                           }`}>{status}</span>
                           <span className="text-[7px] text-gray-400">{formatDate(b.date)}</span>
                         </div>
                         {req && (
                           <div className="flex items-center gap-1 mt-1">
                             <Package size={10} className="text-blue-500"/>
                             <span className="text-[7px] font-black text-blue-400 uppercase">{req.status}</span>
                           </div>
                         )}
                      </div>
                    );
                  } else {
                    const r = item.data;
                    const recordType = 'type' in r ? r.type : '';
                    const performedBy = 'performedBy' in r ? r.performedBy : '';
                    const isBreakdownRecord = recordType.toLowerCase().includes('поломк') || recordType.toLowerCase().includes('неисправност') || recordType.toLowerCase().includes('акт');
                    const equip = equipment.find(e=>e.id===r.equipmentId);
                    
                    return (
                      <div
                        key={`r-${r.id}`}
                        className={`p-4 rounded-2xl shadow-neo-sm bg-neo-bg border-l-4 ${isBreakdownRecord ? 'border-red-500' : 'border-emerald-500'} flex flex-col gap-2 group cursor-pointer hover:shadow-neo transition-all`}
                        onClick={() => onNavigate('maintenance')}
                      >
                         <div className="flex justify-between items-start">
                            <div className="overflow-hidden flex-1">
                               <p className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-200 truncate">{recordType}</p>
                               <p className="text-[8px] font-bold text-gray-400 uppercase truncate">{equip?.name || 'Техника'}</p>
                            </div>
                            <ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-500 shrink-0" />
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-[7px] font-bold text-gray-500 uppercase">{performedBy}</span>
                           <span className="text-[7px] text-gray-400">{formatDate(r.date)}</span>
                         </div>
                      </div>
                    );
                  }
                });
              })()}
           </div>
           <button onClick={() => onNavigate('maintenance')} className="w-full mt-6 md:mt-8 py-4 rounded-2xl shadow-neo text-[10px] font-black uppercase text-blue-500 hover:shadow-neo-inset transition-all tracking-widest border border-blue-500/10 bg-neo-bg active:scale-95">Весь журнал</button>
        </div>
      </div>

      {/* Дополнительные виджеты */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Просроченное ТО */}
        {overdueTO.length > 0 && (
          <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-orange-500/30">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] md:text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle size={16}/> Просроченное ТО
              </h3>
              <button onClick={() => onNavigate('calendar')} className="text-[8px] font-black text-blue-600 uppercase hover:underline">Календарь</button>
            </div>
            <div className="space-y-3">
              {overdueTO.slice(0, 3).map(to => {
                const equip = equipment.find(e => e.id === to.equipmentId);
                const daysOverdue = Math.floor((new Date().getTime() - new Date(to.date).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={to.id} className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black text-orange-600 uppercase">{to.type}</p>
                      <p className="text-[8px] font-bold text-gray-500">{equip?.name || 'Техника'}</p>
                    </div>
                    <span className="text-[8px] font-black text-orange-600 bg-orange-500/20 px-2 py-1 rounded">
                      {daysOverdue} дн.
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Активные заявки снабжения */}
        {activeProcurement.length > 0 && (
          <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-neo bg-neo-bg border border-blue-500/30">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] md:text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                <Package size={16}/> Заявки в работе
              </h3>
              <button onClick={() => onNavigate('procurement')} className="text-[8px] font-black text-blue-600 uppercase hover:underline">Снабжение</button>
            </div>
            <div className="space-y-3">
              {activeProcurement.slice(0, 3).map(req => {
                const equip = equipment.find(e => e.id === req.equipmentId);
                return (
                  <div key={req.id} className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex justify-between items-center">
                    <div className="overflow-hidden flex-1">
                      <p className="text-[9px] font-black text-blue-600 uppercase truncate">{req.title}</p>
                      <p className="text-[8px] font-bold text-gray-500">{equip?.name || 'Техника'}</p>
                    </div>
                    <span className={`text-[7px] font-black uppercase px-2 py-1 rounded ${
                      req.status === 'На складе' ? 'bg-indigo-500 text-white' :
                      req.status === 'В пути' ? 'bg-orange-500 text-white' :
                      req.status === 'Оплачено' ? 'bg-emerald-500 text-white' :
                      'bg-blue-500 text-white'
                    }`}>{req.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Модальное окно быстрой поломки */}
      {isQuickBreakdownOpen && (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-neo-bg w-full max-w-2xl rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/20 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-neo bg-neo-bg text-red-500">
              <AlertTriangle size={24}/>
            </div>
            <h2 className="text-xl font-black uppercase text-gray-800 dark:text-gray-100">
              {quickBreakdownStep === 'select' ? 'Выберите технику' : 'Акт поломки'}
            </h2>
          </div>
          <button onClick={() => { setIsQuickBreakdownOpen(false); setQuickBreakdownStep('select'); }} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all">
            <X size={20}/>
          </button>
        </div>
        
        {quickBreakdownStep === 'select' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 text-center py-4">Выберите технику для фиксации поломки:</p>
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
              {equipment.map(e => (
                <button
                  key={e.id}
                  onClick={() => {
                    setQuickBreakdownForm({...quickBreakdownForm, equipmentId: e.id});
                    setQuickBreakdownStep('form');
                  }}
                  className="w-full p-4 rounded-2xl shadow-neo bg-neo-bg border border-white/5 hover:border-red-500/50 transition-all flex justify-between items-center group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-neo-bg text-blue-600 group-hover:scale-110 transition-transform">
                      <Truck size={20}/>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black uppercase text-gray-700 dark:text-gray-200">{e.name}</p>
                      <p className="text-[8px] text-gray-400">{e.vin} • {e.hours} м/ч</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-red-500"/>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleQuickBreakdown} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 ml-2">Техника</label>
              <div className="p-4 rounded-2xl shadow-neo-inset bg-neo-bg text-sm font-black text-gray-700">
                {equipment.find(e => e.id === quickBreakdownForm.equipmentId)?.name || '—'}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 ml-2">Узел</label>
              <select
                className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none text-gray-700 outline-none"
                value={quickBreakdownForm.node}
                onChange={e => setQuickBreakdownForm({...quickBreakdownForm, node: e.target.value})}
              >
                <option>Двигатель</option>
                <option>Гидравлика</option>
                <option>Ходовая часть</option>
                <option>Электроника</option>
                <option>Кузов</option>
                <option>Трансмиссия</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 ml-2">Деталь / Запчасть</label>
              <input
                className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none text-gray-700 outline-none"
                placeholder="Введите название..."
                value={quickBreakdownForm.partName}
                onChange={e => setQuickBreakdownForm({...quickBreakdownForm, partName: e.target.value})}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 ml-2">Серьезность</label>
              <div className="flex gap-3">
                {['Низкая', 'Средняя', 'Критическая'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuickBreakdownForm({...quickBreakdownForm, severity: s})}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
                      quickBreakdownForm.severity === s
                        ? 'bg-red-500 text-white shadow-neo'
                        : 'bg-neo-bg shadow-neo text-gray-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 ml-2">Описание</label>
              <textarea
                className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none text-gray-700 outline-none h-24"
                placeholder="Опишите неисправность..."
                value={quickBreakdownForm.description}
                onChange={e => setQuickBreakdownForm({...quickBreakdownForm, description: e.target.value})}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setQuickBreakdownStep('select')}
                className="flex-1 py-4 rounded-2xl bg-neo-bg border border-white/10 font-black uppercase text-xs"
              >
                Назад
              </button>
              <button type="submit" className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-black uppercase text-xs tracking-[0.2em] active:scale-95 transition-all">
                Создать акт
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )}
  
  {/* Модальное окно быстрого ТО */}
  {isQuickTOOpen && (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-neo-bg w-full max-w-2xl rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/20 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-neo bg-neo-bg text-blue-500">
              <Wrench size={24}/>
            </div>
            <h2 className="text-xl font-black uppercase text-gray-800 dark:text-gray-100">Выберите технику для ТО</h2>
          </div>
          <button onClick={() => setIsQuickTOOpen(false)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all">
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
                  setIsQuickTOOpen(false);
                  // Переходим в ТО и выбираем технику
                  onNavigate('maintenance');
                  // Небольшая задержка чтобы вкладка успела открыться
                  setTimeout(() => {
                    // Здесь можно было бы установить выбранную технику
                    // но для этого нужно передавать setSelectedMaintenanceEquipId через контекст
                  }, 100);
                }}
                className="w-full p-4 rounded-2xl shadow-neo bg-neo-bg border border-white/5 hover:border-blue-500/50 transition-all flex justify-between items-center group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-neo-bg text-blue-600 group-hover:scale-110 transition-transform">
                    <Truck size={20}/>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black uppercase text-gray-700 dark:text-gray-200">{e.name}</p>
                    <p className="text-[8px] text-gray-400">{e.vin} • {e.hours} м/ч</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500"/>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )}
  
  {/* Модальное окно быстрой заявки снабжения */}
  {isQuickProcurementOpen && (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-neo-bg w-full max-w-3xl rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/20 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-neo bg-neo-bg text-emerald-500">
              <Package size={24}/>
            </div>
            <h2 className="text-xl font-black uppercase text-gray-800 dark:text-gray-100">
              {quickProcurementStep === 'select' ? 'Выберите технику' : 'Заявка снабжения'}
            </h2>
          </div>
          <button onClick={() => { setIsQuickProcurementOpen(false); setQuickProcurementStep('select'); }} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all">
            <X size={20}/>
          </button>
        </div>
        
        {quickProcurementStep === 'select' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 text-center py-4">Выберите технику для создания заявки:</p>
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
              {equipment.map(e => (
                <button
                  key={e.id}
                  onClick={() => {
                    setQuickProcurementForm({...quickProcurementForm, equipmentId: e.id});
                    setQuickProcurementStep('form');
                  }}
                  className="w-full p-4 rounded-2xl shadow-neo bg-neo-bg border border-white/5 hover:border-emerald-500/50 transition-all flex justify-between items-center group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-neo-bg text-emerald-600 group-hover:scale-110 transition-transform">
                      <Truck size={20}/>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black uppercase text-gray-700 dark:text-gray-200">{e.name}</p>
                      <p className="text-[8px] text-gray-400">{e.vin} • {e.hours} м/ч</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-emerald-500"/>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleQuickProcurement} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 ml-2">Техника</label>
              <div className="p-4 rounded-2xl shadow-neo-inset bg-neo-bg text-sm font-black text-gray-700">
                {equipment.find(e => e.id === quickProcurementForm.equipmentId)?.name || '—'}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 ml-2">Наименование заявки</label>
              <input
                className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg border-none text-gray-700 outline-none"
                placeholder="Например: Комплект фильтров ТО-1000"
                value={quickProcurementForm.title}
                onChange={e => setQuickProcurementForm({...quickProcurementForm, title: e.target.value})}
                required
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 ml-2">Позиции</label>
                <button
                  type="button"
                  onClick={() => setQuickProcurementForm({
                    ...quickProcurementForm,
                    items: [...quickProcurementForm.items, { sku: '', name: '', quantity: '1', unitPriceWithVAT: 0 }]
                  })}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[8px] font-black uppercase hover:bg-emerald-700"
                >
                  + Добавить
                </button>
              </div>
              
              {quickProcurementForm.items.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl shadow-neo-sm bg-neo-bg space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className="p-3 rounded-xl shadow-neo-inset bg-neo-bg border-none text-sm text-gray-700 outline-none"
                      placeholder="Артикул / каталожный №"
                      value={item.sku}
                      onChange={e => {
                        const newItems = [...quickProcurementForm.items];
                        newItems[idx].sku = e.target.value;
                        setQuickProcurementForm({...quickProcurementForm, items: newItems});
                      }}
                    />
                    <input
                      type="number"
                      className="p-3 rounded-xl shadow-neo-inset bg-neo-bg border-none text-sm text-gray-700 outline-none"
                      placeholder="Цена с НДС"
                      value={item.unitPriceWithVAT || ''}
                      onChange={e => {
                        const newItems = [...quickProcurementForm.items];
                        newItems[idx].unitPriceWithVAT = parseFloat(e.target.value) || 0;
                        setQuickProcurementForm({...quickProcurementForm, items: newItems});
                      }}
                    />
                  </div>
                  <div className="flex gap-3">
                    <input
                      className="flex-1 p-3 rounded-xl shadow-neo-inset bg-neo-bg border-none text-sm text-gray-700 outline-none"
                      placeholder="Наименование запчасти"
                      value={item.name}
                      onChange={e => {
                        const newItems = [...quickProcurementForm.items];
                        newItems[idx].name = e.target.value;
                        setQuickProcurementForm({...quickProcurementForm, items: newItems});
                      }}
                      required
                    />
                    <input
                      type="number"
                      className="w-24 p-3 rounded-xl shadow-neo-inset bg-neo-bg border-none text-sm text-gray-700 outline-none"
                      placeholder="Кол-во"
                      value={item.quantity}
                      onChange={e => {
                        const newItems = [...quickProcurementForm.items];
                        newItems[idx].quantity = e.target.value;
                        setQuickProcurementForm({...quickProcurementForm, items: newItems});
                      }}
                      min="1"
                      required
                    />
                    {quickProcurementForm.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = quickProcurementForm.items.filter((_, i) => i !== idx);
                          setQuickProcurementForm({...quickProcurementForm, items: newItems});
                        }}
                        className="p-3 rounded-xl bg-red-500 text-white hover:bg-red-600"
                      >
                        <X size={18}/>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setQuickProcurementStep('select')}
                className="flex-1 py-4 rounded-2xl bg-neo-bg border border-white/10 font-black uppercase text-xs"
              >
                Назад
              </button>
              <button type="submit" className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase text-xs tracking-[0.2em] active:scale-95 transition-all">
                Отправить в снабжение
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )}
    </div>
  );
};

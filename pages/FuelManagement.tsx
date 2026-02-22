
import React, { useMemo, useState } from 'react';
import {
  Fuel, Coins, TrendingUp, Search, Clock, Droplet, Plus, X, Save, Truck
} from 'lucide-react';
import { formatNumber, formatMoney } from '../utils/format';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useFleetStore } from '../store/useFleetStore';
import { FuelRecord } from '../types';

export const FuelManagement: React.FC = () => {
  const { fuelRecords, addFuelRecord } = useMaintenanceStore();
  const { equipment } = useFleetStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFuelDetail, setSelectedFuelDetail] = useState<any>(null);
  const [newFuel, setNewFuel] = useState<Partial<FuelRecord>>({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    station: '',
    quantity: 0,
    pricePerLiter: 0,
    fuelType: 'ДТ',
    paymentMethod: 'Топливная карта',
    currentHours: 0,
    currentMileage: 0,
    performedBy: ''
  });

  const stats = useMemo(() => {
    const total = fuelRecords.reduce((acc, r) => acc + r.quantity, 0);
    const cost = fuelRecords.reduce((acc, r) => acc + r.totalCost, 0);
    return { total, cost };
  }, [fuelRecords]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFuel.equipmentId || !newFuel.quantity) return;
    const equip = equipment.find(e => e.id === newFuel.equipmentId);
    const record = {
      ...newFuel,
      id: Math.random().toString(36).substr(2, 9),
      totalCost: (newFuel.quantity || 0) * (newFuel.pricePerLiter || 0),
      currentHours: newFuel.currentHours || equip?.hours || 0,
      currentMileage: newFuel.currentMileage || equip?.mileage_km || 0,
      performedBy: newFuel.performedBy || 'Не указан'
    } as FuelRecord;
    addFuelRecord(record);
    setIsModalOpen(false);
    setNewFuel({ 
      ...newFuel, 
      quantity: 0, 
      pricePerLiter: 0, 
      station: '',
      time: new Date().toTimeString().slice(0, 5),
      currentHours: 0,
      currentMileage: 0,
      performedBy: ''
    });
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700 px-4 md:px-0">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight whitespace-nowrap">Мониторинг Топлива</h2>
          <button onClick={() => setIsModalOpen(true)} className="px-6 md:px-10 py-4 md:py-5 rounded-[2.5rem] bg-blue-500 text-white font-black uppercase text-[10px] md:text-xs shadow-xl flex items-center gap-2 md:gap-4 active:scale-95 transition-all tracking-[0.15em] md:tracking-[0.2em] hover:scale-105 whitespace-nowrap">
            <Plus size={18} className="md:w-5 md:h-5"/> <span className="hidden sm:inline">Регистрация</span> Заправки
          </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <StatCard label="Объем за месяц" value={`${formatNumber(stats.total)} л`} icon={<Droplet size={24} className="text-blue-500"/>} />
          <StatCard label="Финансовые затраты" value={formatMoney(stats.cost)} icon={<Coins size={24} className="text-emerald-500"/>} />
          <StatCard label="Средняя цена ДТ" value="65.40 ₽" icon={<TrendingUp size={24} className="text-indigo-500"/>} />
       </div>

       <div className="bg-neo-bg rounded-[3rem] shadow-neo-inset p-10 overflow-hidden border border-white/5 relative">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
               <Clock size={16} className="text-blue-500"/> Журнал операций ГСМ
            </h3>
            <button className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline transition-all">Экспорт в Excel</button>
          </div>
          <div className="space-y-6 max-h-[550px] overflow-y-auto custom-scrollbar pr-4">
            {fuelRecords.length === 0 ? (
               <div className="text-center py-24 space-y-4">
                  <Fuel size={64} className="text-gray-200 mx-auto" />
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Журнал заправок пуст</p>
               </div>
            ) : fuelRecords.map(r => (
              <div 
                key={r.id} 
                onClick={() => setSelectedFuelDetail(r)}
                className="p-6 md:p-8 rounded-[2.5rem] bg-neo-bg flex flex-col md:flex-row justify-between md:items-center gap-4 border-l-4 border-blue-500 group hover:bg-neo-bg/80 transition-all cursor-pointer border border-white/5 hover:shadow-neo hover:scale-[1.01]"
              >
                <div className="flex items-center gap-4 md:gap-8 min-w-0 flex-1">
                   <div className="p-3 md:p-4 rounded-2xl shadow-neo bg-neo-bg text-blue-500 group-hover:scale-110 transition-transform flex-shrink-0"><Fuel size={24} className="md:w-7 md:h-7"/></div>
                   <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm font-black uppercase tracking-tight text-gray-800 dark:text-gray-100 truncate">{equipment.find(e=>e.id===r.equipmentId)?.name || 'Неизвестно'}</p>
                      <p className="text-[9px] md:text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest truncate">{r.station} • {new Date(r.date).toLocaleDateString('ru-RU')}</p>
                   </div>
                </div>
                <div className="text-left md:text-right flex-shrink-0">
                   <p className="text-xl md:text-2xl font-black text-blue-500 whitespace-nowrap">+{r.quantity} л</p>
                   <p className="text-[10px] md:text-[11px] font-black text-emerald-500 tracking-widest whitespace-nowrap">{formatMoney(r.totalCost)}</p>
                </div>
              </div>
            ))}
          </div>
       </div>

       {/* Модалка заправки */}
       {isModalOpen && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-neo-bg w-full max-w-2xl rounded-[3rem] shadow-neo p-8 md:p-10 animate-in zoom-in border border-white/10 max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center mb-8 sticky top-0 bg-neo-bg pb-4 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl shadow-neo bg-neo-bg text-emerald-500">
                      <Fuel size={24}/>
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Регистрация выдачи топлива</h3>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Заполните все поля</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all active:scale-95"><X size={24}/></button>
               </div>
               <form onSubmit={handleSave} className="space-y-6">
                  {/* Техника */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-4 tracking-widest">Объект / Техника</label>
                    <select
                      className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-xs font-black border-none uppercase appearance-none"
                      onChange={e => {
                        const equip = equipment.find(eq => eq.id === e.target.value);
                        setNewFuel({
                          ...newFuel, 
                          equipmentId: e.target.value,
                          currentHours: equip?.hours || 0,
                          currentMileage: equip?.mileage_km || 0
                        });
                      }}
                      required
                    >
                      <option value="">-- Выбрать из списка --</option>
                      {equipment.map(e => <option key={e.id} value={e.id}>{e.name} ({e.vin})</option>)}
                    </select>
                  </div>
                  
                  {/* Дата и время */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-4 tracking-widest">Дата</label>
                      <input
                        type="date"
                        className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-sm font-black border-none"
                        value={newFuel.date}
                        onChange={e => setNewFuel({...newFuel, date: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-4 tracking-widest">Время</label>
                      <input
                        type="time"
                        className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-sm font-black border-none"
                        value={newFuel.time}
                        onChange={e => setNewFuel({...newFuel, time: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Объём и цена */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-4 tracking-widest">Объём (л)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-lg font-black text-blue-600 border-none"
                        value={newFuel.quantity || ''}
                        placeholder="0.0"
                        onChange={e => setNewFuel({...newFuel, quantity: parseFloat(e.target.value)})}
                        required
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-4 tracking-widest">Цена за 1 л (₽)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-lg font-black text-emerald-600 border-none"
                        value={newFuel.pricePerLiter || ''}
                        placeholder="0.00"
                        onChange={e => setNewFuel({...newFuel, pricePerLiter: parseFloat(e.target.value)})}
                        required
                      />
                    </div>
                  </div>
                  
                  {/* Сумма */}
                  <div className="p-4 rounded-2xl shadow-neo-inset bg-emerald-500/10 border border-emerald-500/30">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Итого</p>
                    <p className="text-2xl font-black text-emerald-600">{formatMoney((newFuel.quantity || 0) * (newFuel.pricePerLiter || 0))}</p>
                  </div>
                  
                  {/* АЗС и вид топлива */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-4 tracking-widest">АЗС / Станция</label>
                      <input
                        type="text"
                        className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-sm font-black border-none uppercase"
                        value={newFuel.station}
                        onChange={e => setNewFuel({...newFuel, station: e.target.value})}
                        placeholder="ЛУКОЙЛ"
                        required
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-4 tracking-widest">Вид топлива</label>
                      <select
                        className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-sm font-black border-none uppercase"
                        value={newFuel.fuelType}
                        onChange={e => setNewFuel({...newFuel, fuelType: e.target.value})}
                      >
                        <option>ДТ</option>
                        <option>АИ-92</option>
                        <option>АИ-95</option>
                        <option>АИ-100</option>
                        <option>Газ</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Способ оплаты */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-4 tracking-widest">Способ оплаты</label>
                    <select
                      className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-sm font-black border-none uppercase"
                      value={newFuel.paymentMethod}
                      onChange={e => setNewFuel({...newFuel, paymentMethod: e.target.value})}
                    >
                      <option>Топливная карта</option>
                      <option>Наличные</option>
                      <option>Банковская карта</option>
                      <option>Корпоративный счёт</option>
                    </select>
                  </div>
                  
                  {/* Пробег и моточасы */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-4 tracking-widest">Пробег (км)</label>
                      <input
                        type="number"
                        className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-sm font-black border-none"
                        value={newFuel.currentMileage || ''}
                        placeholder="0"
                        onChange={e => setNewFuel({...newFuel, currentMileage: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-4 tracking-widest">Моточасы (м/ч)</label>
                      <input
                        type="number"
                        className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-sm font-black border-none"
                        value={newFuel.currentHours || ''}
                        placeholder="0"
                        onChange={e => setNewFuel({...newFuel, currentHours: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  
                  {/* Кто заправлял */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-4 tracking-widest">Кто заправлял (ФИО)</label>
                    <input
                      type="text"
                      className="w-full p-4 rounded-2xl shadow-neo-inset bg-neo-bg outline-none text-sm font-black border-none uppercase"
                      value={newFuel.performedBy}
                      onChange={e => setNewFuel({...newFuel, performedBy: e.target.value})}
                      placeholder="ИВАНОВ И.И."
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full py-5 rounded-[2rem] bg-blue-500 text-white font-black uppercase text-xs shadow-lg tracking-[0.2em] flex items-center justify-center gap-4 active:scale-95 transition-all hover:shadow-xl"
                  >
                    <Save size={20}/> Сохранить в журнал
                  </button>
               </form>
            </div>
         </div>
       )}

       {/* Модальное окно просмотра заправки */}
       {selectedFuelDetail && (
         <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-neo-bg w-full max-w-lg rounded-[2.5rem] md:rounded-[3rem] shadow-neo p-6 md:p-8 animate-in zoom-in border border-white/20 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-neo-bg z-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl shadow-neo bg-neo-bg text-emerald-500">
                    <Fuel size={24}/>
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight text-gray-800 dark:text-gray-100">Заправка</h2>
                    <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                      {selectedFuelDetail.date ? new Date(selectedFuelDetail.date + 'T00:00:00').toLocaleDateString('ru-RU') : ''} {selectedFuelDetail.time || ''}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedFuelDetail(null)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:text-red-500 transition-all"><X size={20}/></button>
              </div>

              <div className="space-y-4">
                {/* Основная информация */}
                <div className="p-4 rounded-2xl shadow-neo-inset bg-neo-bg border border-emerald-500/20 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase">Дата</p>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                        {selectedFuelDetail.date ? new Date(selectedFuelDetail.date + 'T00:00:00').toLocaleDateString('ru-RU') : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase">Время</p>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                        {selectedFuelDetail.time || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase">Объём</p>
                      <p className="text-lg font-black text-emerald-600">{selectedFuelDetail.quantity} л</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase">Сумма</p>
                      <p className="text-lg font-black text-emerald-600">{formatMoney(selectedFuelDetail.totalCost)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase">Цена/л</p>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{formatMoney(selectedFuelDetail.pricePerLiter)}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase">Вид топлива</p>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{selectedFuelDetail.fuelType || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Пробег и моточасы */}
                <div className="p-4 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase">Пробег</p>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{selectedFuelDetail.currentMileage || '—'} км</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase">Моточасы</p>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{selectedFuelDetail.currentHours || '—'} м/ч</p>
                    </div>
                  </div>
                </div>

                {/* АЗС и оплата */}
                <div className="p-4 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/5 space-y-3">
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase">АЗС</p>
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{selectedFuelDetail.station || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase">Способ оплаты</p>
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{selectedFuelDetail.paymentMethod || '—'}</p>
                  </div>
                </div>

                {/* Кто заправлял */}
                {selectedFuelDetail.performedBy && (
                  <div className="p-4 rounded-2xl shadow-neo-inset bg-neo-bg border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck size={16} className="text-blue-500"/>
                      <p className="text-[8px] font-black text-blue-400 uppercase">Заправлял</p>
                    </div>
                    <p className="text-base font-black text-gray-800 dark:text-gray-100">{selectedFuelDetail.performedBy}</p>
                  </div>
                )}

                {/* Техника */}
                <div className="p-4 rounded-2xl shadow-neo-inset bg-neo-bg border border-white/5">
                  <p className="text-[8px] font-black text-gray-400 uppercase mb-2">Техника</p>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                    {equipment.find(e => e.id === selectedFuelDetail.equipmentId)?.name || '—'}
                  </p>
                </div>
              </div>
            </div>
         </div>
       )}
    </div>
  );
};

const StatCard = ({ label, value, icon }: any) => (
  <div className="p-10 rounded-[3rem] shadow-neo bg-neo-bg flex flex-col justify-between border border-white/5 min-h-[180px] group hover:shadow-neo-inset transition-all">
     <div className="p-4 rounded-2xl shadow-neo bg-neo-bg w-fit mb-6 group-hover:scale-110 transition-transform">{icon}</div>
     <div>
        <p className="text-[10px] font-black text-gray-600 dark:text-gray-300 uppercase mb-2 tracking-[0.2em]">{label}</p>
        <p className="text-3xl font-black text-gray-800 dark:text-gray-100 tracking-tighter">{value}</p>
     </div>
  </div>
);

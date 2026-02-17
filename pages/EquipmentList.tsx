
import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Truck, X, QrCode, Zap, Gauge, Edit3, Save, Camera, FileText, User, ChevronRight, History, Upload, LayoutGrid, List, Clock
} from 'lucide-react';
import { useFleetStore } from '../store/useFleetStore';
import { EquipStatus, Equipment } from '../types';
import QRCode from 'qrcode';

export const EquipmentList: React.FC = () => {
  const { equipment, selectEquipment, selectedEquipmentId, updateEquipment } = useFleetStore();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isEditing, setIsEditing] = useState(false);
  const [qrBase64, setQrBase64] = useState('');
  const [activeTab, setActiveTab] = useState<'main' | 'docs' | 'history'>('main');

  const selectedItem = equipment.find(e => e.id === selectedEquipmentId);
  const [editForm, setEditForm] = useState<Partial<Equipment>>({});

  useEffect(() => {
    if (selectedItem) {
      QRCode.toDataURL(`asset:${selectedItem.id}`).then(setQrBase64);
      setEditForm(selectedItem);
    }
  }, [selectedItem]);

  const handleSave = () => {
    if (selectedItem) {
      updateEquipment(selectedItem.id, editForm);
      setIsEditing(false);
    }
  };

  const filtered = equipment.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.vin.toLowerCase().includes(search.toLowerCase())
  );

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
          <button className="p-4 rounded-2xl bg-neo-bg shadow-neo text-blue-600 hover:shadow-neo-inset active:scale-95 transition-all border border-blue-500/10"><Plus size={24} /></button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(e => (
            <div key={e.id} onClick={() => selectEquipment(e.id)} className="p-8 rounded-[2.5rem] shadow-neo bg-neo-bg group hover:shadow-neo-inset transition-all cursor-pointer border border-white/10 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-2 h-full ${e.status === EquipStatus.ACTIVE ? 'bg-green-500' : 'bg-red-500'}`} />
              <div className="flex items-start justify-between mb-6">
                <div className="p-4 rounded-2xl shadow-neo bg-neo-bg text-blue-600 group-hover:scale-110 transition-transform"><Truck size={32} /></div>
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{e.year} г.в.</span>
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-gray-800 group-hover:text-blue-600 transition-colors">{e.name}</h3>
              <p className="text-[11px] font-black text-gray-400 uppercase mt-1 tracking-widest">{e.make} {e.model}</p>
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 space-y-4">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                    <div className="flex items-center gap-2"><Gauge size={14} className="text-blue-600"/> Наработка</div>
                    <span className="text-gray-800 font-bold">{e.hours} м/ч</span>
                 </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-neo-bg rounded-[2.5rem] shadow-neo-inset p-4 overflow-hidden border border-white/10">
           <table className="w-full text-left">
              <thead className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-800">
                 <tr>
                    <th className="px-8 py-5">Единица техники</th>
                    <th className="px-6 py-5">Статус</th>
                    <th className="px-6 py-5">Наработка</th>
                    <th className="px-6 py-5">Водитель</th>
                    <th className="px-6 py-5"></th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                 {filtered.map(e => (
                   <tr key={e.id} onClick={() => selectEquipment(e.id)} className="hover:bg-white/5 transition-colors cursor-pointer group">
                      <td className="px-8 py-6 flex items-center gap-4">
                         <div className="p-3 rounded-xl shadow-neo-sm bg-neo-bg text-blue-600 group-hover:scale-110 transition-transform"><Truck size={20}/></div>
                         <div>
                            <p className="text-sm font-black uppercase text-gray-800 group-hover:text-blue-600 transition-colors">{e.name}</p>
                            <p className="text-[9px] text-gray-400 uppercase font-bold">{e.vin}</p>
                         </div>
                      </td>
                      <td className="px-6 py-6"><span className={`text-[9px] font-black uppercase px-4 py-1.5 rounded-full shadow-neo-sm ${e.status === EquipStatus.ACTIVE ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{e.status}</span></td>
                      <td className="px-6 py-6 text-sm font-black text-gray-700">{e.hours} м/ч</td>
                      <td className="px-6 py-6 text-sm font-black text-gray-400 uppercase">{e.driver || '—'}</td>
                      <td className="px-6 py-6 text-right"><ChevronRight size={18} className="text-gray-300 group-hover:text-blue-600 transition-all"/></td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-neo-bg w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-neo overflow-hidden flex flex-col border border-white/20 animate-in zoom-in duration-300">
            {/* Паспорт - Хедер */}
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-neo-bg">
              <div className="flex items-center gap-8">
                <div className="w-16 h-16 rounded-2xl shadow-neo bg-neo-bg flex items-center justify-center text-blue-600 border border-blue-500/10"><Truck size={32}/></div>
                <div>
                  <h2 className="text-2xl font-black uppercase leading-none text-gray-800 tracking-tight">{selectedItem.name}</h2>
                  <div className="flex gap-8 mt-5">
                     <button onClick={() => setActiveTab('main')} className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'main' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-400 hover:text-blue-400'}`}>Основное</button>
                     <button onClick={() => setActiveTab('docs')} className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'docs' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-400 hover:text-blue-400'}`}>Документы</button>
                     <button onClick={() => setActiveTab('history')} className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-400 hover:text-blue-400'}`}>История обслуживания</button>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                {isEditing ? (
                  <button onClick={handleSave} className="p-4 rounded-2xl shadow-neo-inset text-emerald-600 font-black uppercase text-[10px] flex items-center gap-2 transition-all"><Save size={20}/> Сохранить</button>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="p-4 rounded-2xl shadow-neo text-blue-600 hover:shadow-neo-inset transition-all"><Edit3 size={20}/></button>
                )}
                <button onClick={() => selectEquipment(null)} className="p-4 rounded-2xl shadow-neo text-gray-400 hover:text-red-500 transition-all"><X size={20}/></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-neo-bg">
              {activeTab === 'main' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-4 space-y-8">
                    <div className="aspect-[4/3] rounded-[2.5rem] shadow-neo bg-neo-bg overflow-hidden relative border-4 border-white/50">
                      <img src={editForm.image || 'https://picsum.photos/seed/tech/800/600'} className="w-full h-full object-cover" />
                      {isEditing && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm"><button className="p-5 rounded-2xl bg-neo-bg shadow-neo text-blue-600"><Camera size={32}/></button></div>
                      )}
                    </div>
                    <div className="p-8 rounded-[2.5rem] shadow-neo bg-neo-bg text-center space-y-6 border border-white/5">
                      <img src={qrBase64} className="w-36 h-36 mx-auto p-4 bg-white rounded-[2rem] shadow-neo-inset" />
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Цифровой QR-паспорт</p>
                    </div>
                  </div>
                  <div className="lg:col-span-8 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <EditableBlock label="Марка / Модель" value={`${editForm.make} ${editForm.model}`} isEditing={isEditing} onChange={(v:string) => setEditForm({...editForm, model: v})} />
                      <EditableBlock label="Гос. номер" value={editForm.license_plate} isEditing={isEditing} onChange={(v:string) => setEditForm({...editForm, license_plate: v})} />
                      <EditableBlock label="VIN (Заводской №)" value={editForm.vin} isEditing={isEditing} font="font-mono" onChange={(v:string) => setEditForm({...editForm, vin: v})} />
                      <EditableBlock label="Год выпуска" value={editForm.year} isEditing={isEditing} type="number" onChange={(v:string) => setEditForm({...editForm, year: parseInt(v)})} />
                      <EditableBlock label="Наработка" value={`${editForm.hours} м/ч`} isEditing={isEditing} type="number" onChange={(v:string) => setEditForm({...editForm, hours: parseInt(v)})} highlight />
                      <EditableBlock label="Водитель" value={editForm.driver} isEditing={isEditing} onChange={(v:string) => setEditForm({...editForm, driver: v})} />
                    </div>
                    <div className="p-10 rounded-[2.5rem] shadow-neo-inset bg-neo-bg border border-white/5">
                       <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-8">Операционный статус</h3>
                       <div className="flex flex-wrap gap-4">
                          {[EquipStatus.ACTIVE, EquipStatus.REPAIR, EquipStatus.MAINTENANCE, EquipStatus.WAITING_PARTS].map(s => (
                            <button key={s} onClick={() => isEditing && setEditForm({...editForm, status: s})} className={`px-8 py-3.5 rounded-2xl font-black uppercase text-[10px] transition-all tracking-widest ${editForm.status === s ? 'bg-neo-bg shadow-neo-inset text-blue-600' : 'shadow-neo text-gray-400 hover:text-gray-600'}`}>{s}</button>
                          ))}
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'docs' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                   <DocCard label="СТС / ПТС" isEditing={isEditing} />
                   <DocCard label="Страховка ОСАГО" isEditing={isEditing} />
                   <DocCard label="Диагностическая карта" isEditing={isEditing} />
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-6">
                   <div className="p-20 rounded-[3rem] shadow-neo-inset bg-neo-bg text-center">
                      <div className="w-20 h-20 rounded-full shadow-neo mx-auto mb-8 flex items-center justify-center text-gray-300"><History size={40}/></div>
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">История обслуживания пока пуста</p>
                      <button className="mt-8 px-10 py-4 rounded-2xl shadow-neo text-[10px] font-black uppercase text-blue-600 hover:shadow-neo-inset transition-all active:scale-95 border border-blue-500/10">Скачать отчет PDF</button>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EditableBlock = ({ label, value, isEditing, onChange, type = "text", highlight = false, font = "" }: any) => (
  <div className="p-6 rounded-2xl shadow-neo bg-neo-bg border border-white/5">
    <p className="text-[9px] font-black text-gray-400 uppercase mb-2 tracking-widest">{label}</p>
    {isEditing ? (
      <input type={type} className={`w-full bg-neo-bg shadow-neo-inset p-3 rounded-xl border-none outline-none text-xs font-black uppercase text-blue-600 ${font}`} value={value} onChange={e => onChange(e.target.value)} />
    ) : (
      <p className={`text-sm font-black uppercase tracking-tight ${font} ${highlight ? 'text-blue-600' : 'text-gray-800'}`}>{value || '—'}</p>
    )}
  </div>
);

const DocCard = ({ label, isEditing }: any) => (
  <div className="p-10 rounded-[2.5rem] shadow-neo bg-neo-bg flex flex-col items-center gap-8 group hover:shadow-neo-inset transition-all cursor-pointer border border-white/5">
     <div className="w-16 h-16 rounded-2xl shadow-neo bg-neo-bg flex items-center justify-center text-blue-600"><FileText size={32}/></div>
     <div className="text-center">
        <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 text-gray-700">{label}</h4>
        <p className="text-[8px] font-bold text-gray-400 uppercase opacity-60">Файл не загружен</p>
     </div>
     {isEditing && <button className="p-4 rounded-xl shadow-neo text-blue-600 hover:shadow-neo-inset transition-all"><Upload size={18}/></button>}
  </div>
);

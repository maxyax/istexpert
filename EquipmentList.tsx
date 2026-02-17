
import React, { useState, useEffect } from 'react';
/* Added Clock to imports from lucide-react */
import { Search, Plus, Truck, X, QrCode, Zap, Activity, Save, Edit3, Camera, FileText, Clock, Trash2, Upload, Download, Image as ImageIcon } from 'lucide-react';
import { useFleetStore } from './useFleetStore';
import { EquipStatus, Equipment } from './types';
import { GoogleGenAI, Type } from "@google/genai";
import QRCode from 'qrcode';

export const EquipmentList: React.FC = () => {
  const { equipment, selectEquipment, selectedEquipmentId, updateEquipment, updateRegulations, addEquipment, deleteEquipment } = useFleetStore();
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [qrBase64, setQrBase64] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'docs' | 'photos'>('info');

  const selectedItem = equipment.find(e => e.id === selectedEquipmentId);

  useEffect(() => {
    if (selectedItem) {
      QRCode.toDataURL(`asset:${selectedItem.id}`).then(setQrBase64);
    }
  }, [selectedItem]);

  const filtered = equipment.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.vin.includes(search));

  const handleGenerateAI = async () => {
    if (!selectedItem) return;
    setIsGeneratingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Создай регламент ТО (3 этапа) для ${selectedItem.make} ${selectedItem.model}. Верни JSON: type, intervalHours, works[].`;
      const res = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(res.text || "[]");
      updateRegulations(selectedItem.id, data.map((r:any)=>({...r, id: Math.random().toString()})));
    } finally { setIsGeneratingAI(false); }
  };

  const handleDeleteEquipment = () => {
    if (selectedItem) {
      deleteEquipment(selectedItem.id);
      selectEquipment(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleAddDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedItem || !e.target.files) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const newDoc = { name: file.name, url: reader.result as string, type: file.type };
      const docs = selectedItem.documents || [];
      updateEquipment(selectedItem.id, { documents: [...docs, newDoc] });
    };
    reader.readAsDataURL(file);
  };

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedItem || !e.target.files) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const photos = selectedItem.photos || [];
      updateEquipment(selectedItem.id, { photos: [...photos, reader.result as string] });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateReport = () => {
    if (!selectedItem) return;
    const reportContent = `
      ОТЧЕТ ПО РАБОТЕ ТЕХНИКИ\n
      Техника: ${selectedItem.name}\n
      Марка/Модель: ${selectedItem.make} ${selectedItem.model}\n
      VIN: ${selectedItem.vin}\n
      Наработка: ${selectedItem.hours} м/ч\n
      Статус: ${selectedItem.status}\n
      \n
      РЕГЛАМЕНТ ТО:\n
      ${selectedItem.regulations?.map(r => `${r.type} (${r.intervalHours} м/ч):\n${r.works.map(w => `  - ${w}`).join('\n')}`).join('\n\n') || 'Нет данных'}\n
    `;
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${selectedItem.name}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h2 className="text-2xl font-black uppercase tracking-tight">Автопарк</h2>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Поиск по VIN..." className="pl-12 pr-6 py-3 rounded-2xl bg-neo-bg shadow-neo-inset outline-none text-sm w-full md:w-80 border-none" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setShowAddForm(true)} className="p-3 rounded-2xl bg-blue-500 text-white shadow-lg hover:shadow-neo transition-all"><Plus size={24} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(e => (
          <div key={e.id} onClick={() => selectEquipment(e.id)} className="p-8 rounded-[2.5rem] shadow-neo bg-neo-bg group hover:shadow-neo-inset transition-all cursor-pointer border border-white/10">
            <div className="flex items-start justify-between mb-6">
              <div className="p-4 rounded-2xl shadow-neo bg-neo-bg text-blue-500 group-hover:scale-110 transition-transform"><Truck size={32} /></div>
              <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase shadow-neo-sm ${e.status === EquipStatus.ACTIVE ? 'text-green-500' : 'text-orange-500'}`}>{e.status}</span>
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight">{e.name}</h3>
            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mt-1 tracking-widest">{e.make} {e.model}</p>
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <div className="flex justify-between text-[10px] font-black uppercase text-gray-400"><span>VIN</span> <span className="text-gray-700 dark:text-gray-300 font-mono">{e.vin}</span></div>
              <div className="flex justify-between text-[10px] font-black uppercase text-gray-400"><span>Наработка</span> <span className="text-gray-700 dark:text-gray-300">{e.hours} М/Ч</span></div>
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-neo-bg w-full max-w-5xl h-[90vh] rounded-[3rem] shadow-neo overflow-hidden flex flex-col border border-white/20 animate-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl shadow-neo bg-blue-500 flex items-center justify-center text-white"><Truck size={28}/></div>
                <div><h2 className="text-2xl font-black uppercase leading-none">{selectedItem.name}</h2><p className="text-[10px] font-black text-blue-500 uppercase mt-2 tracking-widest">Цифровой паспорт объекта</p></div>
              </div>
              <div className="flex gap-4">
                <button onClick={handleGenerateReport} className="p-4 rounded-2xl shadow-neo text-green-500 hover:shadow-neo-inset transition-all" title="Скачать отчет"><Download size={20}/></button>
                <button onClick={handleGenerateAI} className="p-4 rounded-2xl shadow-neo text-blue-500 hover:shadow-neo-inset transition-all" title="Генерация ТО"><Zap size={20}/></button>
                <button onClick={() => setShowDeleteConfirm(true)} className="p-4 rounded-2xl shadow-neo text-red-500 hover:shadow-neo-inset transition-all" title="Удалить"><Trash2 size={20}/></button>
                <button onClick={() => selectEquipment(null)} className="p-4 rounded-2xl shadow-neo text-gray-400 hover:shadow-neo-inset transition-all"><X size={20}/></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-4 space-y-8">
                  <div className="aspect-square rounded-[2.5rem] shadow-neo bg-gray-200 dark:bg-gray-800 overflow-hidden border-4 border-white/50"><img src={selectedItem.image || 'https://picsum.photos/seed/tech/400/400'} className="w-full h-full object-cover" /></div>
                  <div className="p-6 rounded-[2.5rem] shadow-neo bg-neo-bg text-center">
                    <img src={qrBase64} className="w-32 h-32 mx-auto mb-4 p-2 bg-white rounded-2xl shadow-neo-inset" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">QR для мгновенного ТО</p>
                  </div>
                </div>
                <div className="lg:col-span-8 space-y-10">
                  <section className="grid grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl shadow-neo-inset bg-neo-bg"><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Наработка</p><p className="text-2xl font-black text-blue-500">{selectedItem.hours} М/Ч</p></div>
                    <div className="p-6 rounded-2xl shadow-neo-inset bg-neo-bg"><p className="text-[9px] font-black text-gray-400 uppercase mb-2">Статус</p><p className="text-2xl font-black text-emerald-500 uppercase">{selectedItem.status}</p></div>
                  </section>
                  
                  <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
                    <button onClick={() => setActiveTab('info')} className={`px-6 py-3 font-black uppercase text-xs transition-all ${activeTab === 'info' ? 'text-blue-500 border-b-4 border-blue-500' : 'text-gray-400'}`}>Регламент ТО</button>
                    <button onClick={() => setActiveTab('docs')} className={`px-6 py-3 font-black uppercase text-xs transition-all ${activeTab === 'docs' ? 'text-blue-500 border-b-4 border-blue-500' : 'text-gray-400'}`}>Документы</button>
                    <button onClick={() => setActiveTab('photos')} className={`px-6 py-3 font-black uppercase text-xs transition-all ${activeTab === 'photos' ? 'text-blue-500 border-b-4 border-blue-500' : 'text-gray-400'}`}>Фото</button>
                  </div>

                  {activeTab === 'info' && (
                    <section className="space-y-6">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Zap size={16} className="text-blue-500"/> Регламент обслуживания</h3>
                      {selectedItem.regulations?.map(r => (
                        <div key={r.id} className="p-6 rounded-3xl shadow-neo bg-neo-bg border-l-8 border-blue-500">
                          <div className="flex justify-between mb-4"><h4 className="font-black uppercase">{r.type} — {r.intervalHours} м/ч</h4><Clock size={16} className="text-gray-400"/></div>
                          <ul className="text-[11px] font-bold text-gray-500 uppercase space-y-1">{r.works.map((w,i)=><li key={i}>• {w}</li>)}</ul>
                        </div>
                      ))}
                    </section>
                  )}

                  {activeTab === 'docs' && (
                    <section className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><FileText size={16} className="text-blue-500"/> Документы</h3>
                        <label className="p-3 rounded-2xl bg-blue-500 text-white shadow-lg hover:shadow-neo transition-all cursor-pointer">
                          <Upload size={20} />
                          <input type="file" onChange={handleAddDocument} className="hidden" accept=".pdf,.doc,.docx,.txt" />
                        </label>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {selectedItem.documents?.map((doc, i) => (
                          <div key={i} className="p-6 rounded-3xl shadow-neo bg-neo-bg flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <FileText size={24} className="text-blue-500" />
                              <span className="font-bold">{doc.name}</span>
                            </div>
                            <a href={doc.url} download={doc.name} className="p-2 rounded-xl shadow-neo text-blue-500 hover:shadow-neo-inset transition-all">
                              <Download size={18} />
                            </a>
                          </div>
                        ))}
                        {(!selectedItem.documents || selectedItem.documents.length === 0) && (
                          <p className="text-center text-gray-400 py-8">Нет загруженных документов</p>
                        )}
                      </div>
                    </section>
                  )}

                  {activeTab === 'photos' && (
                    <section className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><ImageIcon size={16} className="text-blue-500"/> Фотографии</h3>
                        <label className="p-3 rounded-2xl bg-blue-500 text-white shadow-lg hover:shadow-neo transition-all cursor-pointer">
                          <Camera size={20} />
                          <input type="file" onChange={handleAddPhoto} className="hidden" accept="image/*" />
                        </label>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedItem.photos?.map((photo, i) => (
                          <div key={i} className="aspect-square rounded-2xl shadow-neo bg-gray-200 dark:bg-gray-800 overflow-hidden">
                            <img src={photo} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
                          </div>
                        ))}
                        {(!selectedItem.photos || selectedItem.photos.length === 0) && (
                          <p className="col-span-full text-center text-gray-400 py-8">Нет загруженных фотографий</p>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-neo-bg p-10 rounded-[3rem] shadow-neo max-w-md w-full border border-white/20 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black uppercase mb-6 text-center">Удалить технику?</h3>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-8">Вы уверены, что хотите удалить <strong>{selectedItem?.name}</strong>?</p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 p-4 rounded-2xl shadow-neo text-gray-600 dark:text-gray-400 hover:shadow-neo-inset transition-all font-black uppercase">Отмена</button>
              <button onClick={handleDeleteEquipment} className="flex-1 p-4 rounded-2xl bg-red-500 text-white shadow-lg hover:shadow-neo transition-all font-black uppercase">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-neo-bg p-10 rounded-[3rem] shadow-neo max-w-2xl w-full border border-white/20 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black uppercase mb-8 text-center">Добавить технику</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newEquipment: Equipment = {
                id: Math.random().toString(36).substr(2, 9),
                name: formData.get('name') as string,
                make: formData.get('make') as string,
                model: formData.get('model') as string,
                vin: formData.get('vin') as string,
                status: EquipStatus.ACTIVE,
                hours: parseInt(formData.get('hours') as string) || 0,
                year: parseInt(formData.get('year') as string) || new Date().getFullYear(),
              };
              addEquipment(newEquipment);
              setShowAddForm(false);
            }} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">Название</label>
                  <input type="text" name="name" required className="w-full p-4 rounded-2xl bg-neo-bg shadow-neo-inset outline-none" placeholder="Бульдозер Б-01" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">VIN</label>
                  <input type="text" name="vin" required className="w-full p-4 rounded-2xl bg-neo-bg shadow-neo-inset outline-none" placeholder="LB-736-XYZ" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">Марка</label>
                  <input type="text" name="make" required className="w-full p-4 rounded-2xl bg-neo-bg shadow-neo-inset outline-none" placeholder="Liebherr" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">Модель</label>
                  <input type="text" name="model" required className="w-full p-4 rounded-2xl bg-neo-bg shadow-neo-inset outline-none" placeholder="PR 736" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">Наработка (м/ч)</label>
                  <input type="number" name="hours" required className="w-full p-4 rounded-2xl bg-neo-bg shadow-neo-inset outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">Год выпуска</label>
                  <input type="number" name="year" className="w-full p-4 rounded-2xl bg-neo-bg shadow-neo-inset outline-none" placeholder="2023" />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 p-4 rounded-2xl shadow-neo text-gray-600 dark:text-gray-400 hover:shadow-neo-inset transition-all font-black uppercase">Отмена</button>
                <button type="submit" className="flex-1 p-4 rounded-2xl bg-blue-500 text-white shadow-lg hover:shadow-neo transition-all font-black uppercase">Добавить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

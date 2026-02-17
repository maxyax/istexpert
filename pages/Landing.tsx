
import React, { useState } from 'react';
import { Truck, ShieldCheck, Zap, Activity, QrCode, ArrowRight, Gauge, Layers, PlayCircle, X, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface FeatureDetail {
  title: string;
  icon: React.ReactNode;
  desc: string;
  fullDesc: string;
  points: string[];
}

const FEATURES: FeatureDetail[] = [
  {
    title: "QR-Паспорта",
    icon: <QrCode size={32}/>,
    desc: "Мгновенный доступ к истории каждой единицы техники.",
    fullDesc: "Система генерирует уникальный QR-код для каждой машины. Сканирование открывает цифровой паспорт с историей ТО, списком запчастей и электронными документами прямо в браузере.",
    points: ["Доступ без установки приложений", "Моментальная подача заявки на ремонт", "Электронные копии СТС и ПТС всегда под рукой"]
  },
  {
    title: "Учет наработки",
    icon: <Gauge size={32}/>,
    desc: "Автоматический расчет моточасов и интервалов ТО.",
    fullDesc: "Забудьте о ручных журналах. Система отслеживает наработку и автоматически высчитывает, когда наступит время следующего обслуживания.",
    points: ["Контроль реальной работы двигателя", "Прогноз даты следующего ТО", "Снижение риска пропуска регламентных работ"]
  },
  {
    title: "ИИ Механик",
    icon: <Zap size={32}/>,
    desc: "Генерация регламентов ТО через Gemini AI.",
    fullDesc: "Наш ИИ анализирует модель вашей техники и за секунды создает точный чек-лист обслуживания на основе заводских стандартов (250/500/1000 м/ч).",
    points: ["Поддержка всех брендов (CAT, Komatsu, Liebherr)", "Автоматическое создание списка запчастей", "Учет условий эксплуатации"]
  },
  {
    title: "Ремонты",
    icon: <Layers size={32}/>,
    desc: "Полный цикл учета поломок и запчастей.",
    fullDesc: "Единая цепочка: от фиксации неисправности водителем до закупки запчастей снабженцем и финального подтверждения механиком.",
    points: ["Kanban-доска для контроля статуса", "Учет стоимости каждой детали", "Аналитика простоев в деньгах"]
  }
];

export const Landing: React.FC<{onStart: () => void}> = ({ onStart }) => {
  const { demoLogin } = useAuthStore();
  const [selectedFeature, setSelectedFeature] = useState<FeatureDetail | null>(null);

  return (
    <div className="min-h-screen bg-neo-bg text-gray-800 dark:text-gray-100 selection:bg-blue-500 selection:text-white font-sans">
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-6 bg-neo-bg/80 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl shadow-neo flex items-center justify-center bg-blue-500 text-white"><Truck size={24}/></div>
              <span className="text-xl font-black uppercase tracking-tight">ISTExpert</span>
           </div>
           <div className="flex gap-4">
              <button onClick={demoLogin} className="hidden sm:flex px-6 py-3 rounded-2xl shadow-neo text-blue-600 font-black text-[10px] uppercase tracking-widest hover:shadow-neo-inset transition-all items-center gap-2">
                <PlayCircle size={16}/> Демо-вход
              </button>
              <button onClick={onStart} className="px-8 py-3 rounded-2xl shadow-neo bg-neo-bg text-gray-600 font-black text-[10px] uppercase tracking-widest hover:shadow-neo-inset transition-all">Вход</button>
           </div>
        </div>
      </nav>

      <section className="pt-48 pb-32 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10 animate-in slide-in-from-left duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-neo-sm bg-neo-bg text-blue-500">
               <Zap size={14} className="fill-current"/>
               <span className="text-[10px] font-black uppercase tracking-widest">Цифровизация автопарка 2.0</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black uppercase leading-[1.1] tracking-tighter">
              Система контроля <br/> 
              <span className="text-blue-500 text-shadow-glow">Спецтехники</span>
            </h1>
            <p className="text-xl text-gray-500 font-medium max-w-lg leading-relaxed">
              Автоматизируйте ТО, снабжение и учет наработки. Все документы и история ремонтов в одном месте.
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              <button onClick={onStart} className="px-12 py-6 rounded-[2.5rem] bg-blue-500 text-white font-black uppercase text-sm shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-4 group">
                Начать работу <ArrowRight className="group-hover:translate-x-2 transition-transform" />
              </button>
              <button onClick={demoLogin} className="px-10 py-6 rounded-[2.5rem] shadow-neo bg-neo-bg text-blue-500 font-black uppercase text-sm hover:shadow-neo-inset transition-all">
                Демо-доступ
              </button>
            </div>
          </div>
          <div className="relative animate-in zoom-in duration-1000 hidden lg:block">
             <div className="w-full aspect-square rounded-[4rem] shadow-neo bg-neo-bg flex items-center justify-center p-12 border-8 border-white/50">
                <Truck size={200} className="text-blue-500 drop-shadow-2xl animate-pulse" />
             </div>
          </div>
        </div>
      </section>

      <section className="py-32 px-6 bg-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {FEATURES.map((f, i) => (
            <button 
              key={i} 
              onClick={() => setSelectedFeature(f)}
              className="p-10 rounded-[3rem] shadow-neo bg-neo-bg space-y-6 hover:shadow-neo-inset transition-all text-left group"
            >
              <div className="p-4 rounded-2xl shadow-neo w-fit text-blue-500 group-hover:scale-110 transition-transform">{f.icon}</div>
              <h3 className="text-xl font-black uppercase tracking-tight">{f.title}</h3>
              <p className="text-sm text-gray-500 font-semibold uppercase opacity-80 leading-relaxed">{f.desc}</p>
              <div className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-2 pt-2">
                Узнать как это работает <ArrowRight size={12}/>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Модалка описания функции */}
      {selectedFeature && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-neo-bg w-full max-w-2xl rounded-[3rem] shadow-neo p-8 md:p-12 border border-white/20 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-6">
                <div className="p-4 rounded-2xl shadow-neo bg-neo-bg text-blue-500">{selectedFeature.icon}</div>
                <h3 className="text-2xl font-black uppercase tracking-tight">{selectedFeature.title}</h3>
              </div>
              <button onClick={() => setSelectedFeature(null)} className="p-3 rounded-xl shadow-neo text-gray-400 hover:shadow-neo-inset transition-all"><X size={20}/></button>
            </div>
            <div className="space-y-10">
              <div className="p-8 rounded-[2rem] shadow-neo-inset bg-neo-bg">
                <p className="text-gray-600 dark:text-gray-300 font-semibold leading-relaxed">{selectedFeature.fullDesc}</p>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Преимущества:</p>
                <div className="grid grid-cols-1 gap-4">
                  {selectedFeature.points.map((p, i) => (
                    <div key={i} className="flex items-center gap-4 p-5 rounded-2xl shadow-neo bg-neo-bg">
                       <CheckCircle2 size={20} className="text-emerald-500 shrink-0"/>
                       <span className="text-[11px] font-black uppercase text-gray-700 dark:text-gray-200">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={onStart} className="w-full py-6 rounded-[2rem] bg-blue-500 text-white font-black uppercase text-xs shadow-lg tracking-widest flex items-center justify-center gap-3">
                Перейти к системе <ArrowRight size={18}/>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

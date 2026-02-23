import React, { useState, useEffect } from 'react';
import {
  Truck,
  ShieldCheck,
  Zap,
  QrCode,
  ArrowRight,
  Gauge,
  PlayCircle,
  CheckCircle2,
  Wrench,
  FileText,
  TrendingUp,
  Clock,
  Users,
  Package,
  ChevronRight,
  Moon,
  Sun,
  X,
  Calendar,
  BarChart3,
  Bell
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  desc: string;
  fullDesc: string;
  benefits: string[];
}

const FEATURES: FeatureCard[] = [
  {
    icon: <QrCode size={28} />,
    title: 'QR-Паспорта',
    desc: 'Мгновенный доступ к истории техники по QR-коду',
    fullDesc: 'Система генерирует уникальный QR-код для каждой единицы техники. При сканировании открывается цифровой паспорт с полной историей обслуживания, ремонтами, заменами запчастей и документами.',
    benefits: [
      'Доступ без установки приложений — просто отсканируйте камеру телефона',
      'Моментальная подача заявки на ремонт прямо из карточки',
      'Электронные копии СТС, ПТС и других документов всегда под рукой',
      'История всех работ за весь период эксплуатации'
    ]
  },
  {
    icon: <Gauge size={28} />,
    title: 'Учет наработки',
    desc: 'Автоматический расчет моточасов и интервалов ТО',
    fullDesc: 'Забудьте о ручных журналах учета. Система автоматически отслеживает наработку каждой единицы техники в моточасах и рассчитывает оптимальные интервалы для проведения технического обслуживания.',
    benefits: [
      'Контроль реальной работы двигателя, а не просто времени в работе',
      'Автоматический прогноз даты следующего ТО',
      'Снижение риска пропуска регламентных работ',
      'Точный учет для списания ГСМ и запчастей'
    ]
  },
  {
    icon: <Wrench size={28} />,
    title: 'Планирование ТО',
    desc: 'Автоматические регламенты и календарь обслуживания',
    fullDesc: 'Система автоматически создает календарь технического обслуживания на основе наработки и календарных интервалов. Вы всегда будете знать, когда и какое ТО предстоит.',
    benefits: [
      'Автоматическое создание задач по ТО за 30 дней до срока',
      'Напоминания о предстоящем обслуживании',
      'Готовые чек-листы работ для каждого типа ТО',
      'Учет условий эксплуатации при расчете интервалов'
    ]
  },
  {
    icon: <Package size={28} />,
    title: 'Снабжение',
    desc: 'Kanban-доска для закупок запчастей',
    fullDesc: 'Единая цепочка снабжения от заявки механика до получения запчасти на складе. Статусы в реальном времени, контроль стоимости и сроков поставки.',
    benefits: [
      'Прозрачный статус каждой заявки: поиск, оплата, доставка, получение',
      'Учет стоимости каждой детали с НДС',
      'Контроль сроков поставки и ответственных',
      'История закупок для анализа расходов'
    ]
  },
  {
    icon: <FileText size={28} />,
    title: 'Документы',
    desc: 'Электронные паспорта, страховки, акты',
    fullDesc: 'Все документы по технике хранятся в электронном виде. Быстрый доступ к СТС, ПТС, страховкам, диагностическим картам, актам поломок и другим документам.',
    benefits: [
      'Загрузка документов в форматах PDF, DOC, DOCX',
      'Просмотр документов прямо в браузере',
      'Автоматическое напоминание об окончании страховки',
      'История всех документов по каждой единице техники'
    ]
  },
  {
    icon: <BarChart3 size={28} />,
    title: 'Аналитика',
    desc: 'Статистика расходов и простоев',
    fullDesc: 'Полная аналитика по автопарку: расходы на ТО и ремонты, простой техники, затраты на запчасти и ГСМ. Принимайте обоснованные решения на основе данных.',
    benefits: [
      'Дашборд с ключевыми показателями автопарка',
      'Анализ простоев по каждой единице техники',
      'Расчет стоимости владения каждой машиной',
      'Сравнение расходов по периодам'
    ]
  }
];

const STATS = [
  { value: '100%', label: 'Контроль автопарка', icon: <Truck size={24} /> },
  { value: '24/7', label: 'Мониторинг состояния', icon: <Clock size={24} /> },
  { value: '0', label: 'Потерь данных', icon: <ShieldCheck size={24} /> },
  { value: '+30%', label: 'Эффективность парка', icon: <TrendingUp size={24} /> }
];

export const Landing: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  const { demoLogin } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureCard | null>(null);

  useEffect(() => {
    // Проверяем сохраненную тему
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDark(shouldUseDark);
    if (shouldUseDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="min-h-screen bg-neo-bg text-gray-800 font-sans">
      {/* Навигация */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-neo-bg/95 backdrop-blur-sm' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-neo-bg shadow-neo flex items-center justify-center text-blue-600">
                <Truck size={24} />
              </div>
              <div>
                <span className="text-xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-200">
                  ISTExpert
                </span>
                <p className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest -mt-1">
                  Система управления автопарком
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-3 rounded-xl shadow-neo cursor-pointer hover:shadow-neo-inset transition-all text-gray-600 dark:text-gray-300"
              >
                <Moon size={20} className="dark:hidden" />
                <Sun size={20} className="hidden dark:block" />
              </button>
              <button
                onClick={demoLogin}
                className="hidden sm:flex px-6 py-3 rounded-2xl bg-neo-bg shadow-neo text-blue-600 font-black text-[10px] uppercase tracking-widest hover:shadow-neo-inset transition-all items-center gap-2"
              >
                <PlayCircle size={16} /> Демо
              </button>
              <button
                onClick={onStart}
                className="px-8 py-3 rounded-2xl bg-neo-bg shadow-neo text-gray-600 font-black text-[10px] uppercase tracking-widest hover:shadow-neo-inset transition-all"
              >
                Вход
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Герой-секция */}
      <section className="pt-48 pb-20 px-6 relative overflow-hidden">
        {/* Фоновые анимированные элементы */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-10 animate-in slide-in-from-left duration-1000">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-neo-sm bg-neo-bg dark:bg-gray-800 text-blue-500 animate-in zoom-in duration-700">
              <Zap size={14} className="fill-current animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Цифровизация автопарка 2.0
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black uppercase leading-[1.1] tracking-tighter text-gray-800 dark:text-gray-200">
              <span className="block animate-in slide-in-from-bottom duration-700">Система</span>
              <span className="block text-blue-500 animate-in slide-in-from-bottom duration-700 delay-100">управления</span>
              <span className="block animate-in slide-in-from-bottom duration-700 delay-200">автопарком</span>
            </h1>

            <p className="text-xl text-gray-500 dark:text-gray-400 font-medium max-w-lg leading-relaxed animate-in slide-in-from-bottom duration-700 delay-300">
              Автоматизируйте ТО, ремонты, снабжение и документооборот.
              Полный контроль над каждой единицей техники в режиме реального времени.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 animate-in slide-in-from-bottom duration-700 delay-400">
              <button
                onClick={onStart}
                className="group px-12 py-6 rounded-[2.5rem] bg-blue-500 text-white font-black uppercase text-sm shadow-xl hover:scale-105 hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-4"
              >
                Начать работу
                <ArrowRight
                  size={20}
                  className="group-hover:translate-x-2 transition-transform"
                />
              </button>
              <button
                onClick={demoLogin}
                className="px-10 py-6 rounded-[2.5rem] shadow-neo bg-neo-bg dark:bg-gray-800 text-blue-500 dark:text-blue-400 font-black uppercase text-sm hover:shadow-neo-inset transition-all duration-300 hover:scale-105"
              >
                Демо-доступ
              </button>
            </div>

            {/* Быстрые преимущества */}
            <div className="flex flex-wrap gap-3 pt-4 animate-in slide-in-from-bottom duration-700 delay-500">
              {[
                'Без установки',
                'Работает в браузере',
                'Мобильная версия'
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-4 py-2 rounded-full shadow-neo-sm bg-neo-bg dark:bg-gray-800 animate-in zoom-in duration-500"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Правая часть - визуализация с анимацией */}
          <div className="relative animate-in zoom-in duration-1000 delay-300 hidden lg:block">
            <div className="w-full aspect-square rounded-[4rem] shadow-neo bg-neo-bg dark:bg-gray-800 flex items-center justify-center p-12 border-8 border-white/50 dark:border-gray-700/50 relative">
              {/* Анимированные кольца */}
              <div className="absolute inset-4 border-2 border-dashed border-blue-300/20 dark:border-blue-500/10 rounded-full animate-spin-slow" />
              <div className="absolute inset-8 border-2 border-dashed border-indigo-300/20 dark:border-indigo-500/10 rounded-full animate-spin-slow-reverse" />
              
              <div className="text-center space-y-6 relative z-10">
                <div className="w-32 h-32 mx-auto rounded-3xl bg-neo-bg dark:bg-gray-700 shadow-neo flex items-center justify-center text-blue-600 dark:text-blue-400 animate-float">
                  <Truck size={64} />
                </div>
                <div>
                  <h3 className="text-3xl font-black uppercase text-gray-800 dark:text-gray-200">
                    ISTExpert
                  </h3>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-2">
                    Fleet Management
                  </p>
                </div>
                <div className="flex gap-3 justify-center flex-wrap">
                  <div className="px-4 py-2 rounded-2xl shadow-neo bg-neo-bg dark:bg-gray-700 text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 hover:scale-110 transition-transform">
                    ТО
                  </div>
                  <div className="px-4 py-2 rounded-2xl shadow-neo bg-neo-bg dark:bg-gray-700 text-[10px] font-black uppercase text-orange-600 dark:text-orange-400 hover:scale-110 transition-transform">
                    Ремонт
                  </div>
                  <div className="px-4 py-2 rounded-2xl shadow-neo bg-neo-bg dark:bg-gray-700 text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 hover:scale-110 transition-transform">
                    Снабжение
                  </div>
                </div>
              </div>
              
              {/* Плавающие иконки по углам */}
              <div className="absolute top-8 right-8 w-14 h-14 rounded-2xl bg-neo-bg dark:bg-gray-700 shadow-neo flex items-center justify-center text-blue-500 animate-float" style={{ animationDelay: '0s' }}>
                <QrCode size={24} />
              </div>
              <div className="absolute top-8 left-8 w-14 h-14 rounded-2xl bg-neo-bg dark:bg-gray-700 shadow-neo flex items-center justify-center text-orange-500 animate-float" style={{ animationDelay: '0.5s' }}>
                <Wrench size={24} />
              </div>
              <div className="absolute bottom-8 right-8 w-14 h-14 rounded-2xl bg-neo-bg dark:bg-gray-700 shadow-neo flex items-center justify-center text-purple-500 animate-float" style={{ animationDelay: '1s' }}>
                <Package size={24} />
              </div>
              <div className="absolute bottom-8 left-8 w-14 h-14 rounded-2xl bg-neo-bg dark:bg-gray-700 shadow-neo flex items-center justify-center text-emerald-500 animate-float" style={{ animationDelay: '1.5s' }}>
                <Calendar size={24} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Статистика */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {STATS.map((stat, i) => (
              <div
                key={i}
                className="group p-6 md:p-8 rounded-[2rem] shadow-neo bg-neo-bg dark:bg-gray-800 text-center space-y-4 hover:shadow-neo-inset transition-all duration-500 hover:scale-105 animate-in slide-in-from-bottom"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex justify-center text-blue-500 group-hover:scale-110 transition-transform duration-300">
                  {stat.icon}
                </div>
                <div className="text-3xl md:text-5xl font-black text-blue-500">
                  {stat.value}
                </div>
                <div className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Преимущества */}
      <section className="py-32 px-6 bg-white/5 dark:bg-gray-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-800 dark:text-gray-200 mb-4">
              Всё что нужно
              <br />
              <span className="text-blue-500">для управления автопарком</span>
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 font-medium max-w-2xl mx-auto">
              Полный набор инструментов для эффективной работы автопарка
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                onClick={() => setSelectedFeature(feature)}
                className="group p-10 rounded-[3rem] shadow-neo bg-neo-bg dark:bg-gray-800 space-y-6 hover:shadow-neo-inset transition-all duration-500 animate-in slide-in-from-bottom cursor-pointer"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="p-4 rounded-2xl shadow-neo w-fit text-blue-500 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-200">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold uppercase mt-2 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
                <div className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-2 pt-2 group-hover:translate-x-2 transition-all duration-300">
                  <span>Подробнее</span>
                  <ChevronRight size={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Модальное окно с подробностями */}
      {selectedFeature && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setSelectedFeature(null)}
        >
          <div
            className="bg-neo-bg dark:bg-gray-800 w-full max-w-2xl rounded-[3rem] shadow-neo p-8 md:p-12 border border-white/20 animate-in zoom-in duration-300 overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Фоновый декоративный элемент */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="flex items-center gap-6">
                <div className="p-4 rounded-2xl shadow-neo bg-neo-bg dark:bg-gray-700 text-blue-500">
                  {selectedFeature.icon}
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight text-gray-800 dark:text-gray-200">
                  {selectedFeature.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFeature(null)}
                className="p-3 rounded-xl shadow-neo text-gray-400 hover:shadow-neo-inset transition-all hover:rotate-90"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-8 relative z-10">
              <div className="p-6 rounded-[2rem] shadow-neo-inset bg-neo-bg dark:bg-gray-700">
                <p className="text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                  {selectedFeature.fullDesc}
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Преимущества
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {selectedFeature.benefits.map((benefit, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 p-4 rounded-2xl shadow-neo bg-neo-bg dark:bg-gray-700 hover:shadow-neo-inset transition-all duration-300 hover:scale-[1.02]"
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-200 font-medium leading-relaxed">
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                onClick={() => {
                  setSelectedFeature(null);
                  onStart();
                }}
                className="w-full py-5 rounded-[2rem] bg-blue-500 text-white font-black uppercase text-xs shadow-lg tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all"
              >
                Попробовать сейчас
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CTA секция */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative p-12 md:p-20 rounded-[3rem] shadow-neo bg-neo-bg dark:bg-gray-800 overflow-hidden">
            <div className="relative z-10 text-center space-y-8">
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-gray-800 dark:text-gray-200">
                Готовы оптимизировать
                <br />
                <span className="text-blue-500">ваш автопарк?</span>
              </h2>
              <p className="text-xl text-gray-500 dark:text-gray-400 font-medium max-w-2xl mx-auto">
                Начните использовать ISTExpert прямо сейчас и получите полный контроль над вашей техникой
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={onStart}
                  className="px-12 py-6 rounded-[2.5rem] bg-blue-500 text-white font-black uppercase text-sm shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3"
                >
                  Начать бесплатно
                  <ArrowRight size={20} />
                </button>
                <button
                  onClick={demoLogin}
                  className="px-12 py-6 rounded-[2.5rem] shadow-neo bg-neo-bg dark:bg-gray-700 text-blue-500 dark:text-blue-400 font-black uppercase text-sm hover:shadow-neo-inset transition-all"
                >
                  Демо-режим
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Футер */}
      <footer className="py-12 px-6 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neo-bg shadow-neo dark:bg-gray-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Truck size={20} />
            </div>
            <div>
              <span className="text-lg font-black uppercase tracking-tight text-gray-800 dark:text-gray-200">
                ISTExpert
              </span>
              <p className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                Система управления автопарком
              </p>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <a
              href="#"
              className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Документация
            </a>
            <a
              href="#"
              className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Поддержка
            </a>
            <a
              href="#"
              className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Контакты
            </a>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            © 2026 ISTExpert. Все права защищены.
          </p>
        </div>
      </footer>

      {/* Глобальные стили для анимаций */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-slow-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 30s linear infinite;
        }
        .animate-spin-slow-reverse {
          animation: spin-slow-reverse 20s linear infinite;
        }
      `}</style>
    </div>
  );
};

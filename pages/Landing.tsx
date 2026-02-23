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
  Sun
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

const FEATURES: FeatureCard[] = [
  {
    icon: <QrCode size={28} />,
    title: 'QR-Паспорта',
    desc: 'Мгновенный доступ к истории техники по QR-коду'
  },
  {
    icon: <Gauge size={28} />,
    title: 'Учет наработки',
    desc: 'Автоматический расчет моточасов и интервалов ТО'
  },
  {
    icon: <Wrench size={28} />,
    title: 'Планирование ТО',
    desc: 'Автоматические регламенты и календарь обслуживания'
  },
  {
    icon: <Package size={28} />,
    title: 'Снабжение',
    desc: 'Kanban-доска для закупок запчастей'
  },
  {
    icon: <FileText size={28} />,
    title: 'Документы',
    desc: 'Электронные паспорта, страховки, акты'
  },
  {
    icon: <TrendingUp size={28} />,
    title: 'Аналитика',
    desc: 'Статистика расходов и простоев'
  }
];

const STATS = [
  { value: '98%', label: 'Снижение простоев' },
  { value: '40%', label: 'Экономия на ТО' },
  { value: '24/7', label: 'Контроль автопарка' },
  { value: '100+', label: 'Компаний доверяют' }
];

export const Landing: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  const { demoLogin } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);

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
      <section className="pt-48 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-10 animate-in slide-in-from-left duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-neo-sm bg-neo-bg text-blue-500">
              <Zap size={14} className="fill-current" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Цифровизация автопарка 2.0
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black uppercase leading-[1.1] tracking-tighter text-gray-800 dark:text-gray-200">
              Система <br />
              <span className="text-blue-500">управления</span> <br />
              автопарком
            </h1>

            <p className="text-xl text-gray-500 dark:text-gray-400 font-medium max-w-lg leading-relaxed">
              Автоматизируйте ТО, ремонты, снабжение и документооборот.
              Полный контроль над каждой единицей техники в режиме реального времени.
            </p>

            <div className="flex flex-col sm:flex-row gap-6">
              <button
                onClick={onStart}
                className="px-12 py-6 rounded-[2.5rem] bg-blue-500 text-white font-black uppercase text-sm shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-4 group"
              >
                Начать работу
                <ArrowRight
                  size={20}
                  className="group-hover:translate-x-2 transition-transform"
                />
              </button>
              <button
                onClick={demoLogin}
                className="px-10 py-6 rounded-[2.5rem] shadow-neo bg-neo-bg text-blue-500 font-black uppercase text-sm hover:shadow-neo-inset transition-all dark:text-blue-400"
              >
                Демо-доступ
              </button>
            </div>

            {/* Быстрые преимущества */}
            <div className="flex flex-wrap gap-3 pt-4">
              {[
                'Без установки',
                'Работает в браузере',
                'Мобильная версия'
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-4 py-2 rounded-full shadow-neo-sm bg-neo-bg"
                >
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Правая часть - визуализация */}
          <div className="relative animate-in zoom-in duration-1000 hidden lg:block">
            <div className="w-full aspect-square rounded-[4rem] shadow-neo bg-neo-bg dark:bg-gray-800 flex items-center justify-center p-12 border-8 border-white/50 dark:border-gray-700/50">
              <div className="text-center space-y-6">
                <div className="w-32 h-32 mx-auto rounded-3xl bg-neo-bg shadow-neo dark:bg-gray-700 flex items-center justify-center text-blue-600 dark:text-blue-400">
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
                <div className="flex gap-3 justify-center">
                  <div className="px-4 py-2 rounded-2xl shadow-neo bg-neo-bg dark:bg-gray-700 text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">
                    ТО
                  </div>
                  <div className="px-4 py-2 rounded-2xl shadow-neo bg-neo-bg dark:bg-gray-700 text-[10px] font-black uppercase text-orange-600 dark:text-orange-400">
                    Ремонт
                  </div>
                  <div className="px-4 py-2 rounded-2xl shadow-neo bg-neo-bg dark:bg-gray-700 text-[10px] font-black uppercase text-purple-600 dark:text-purple-400">
                    Снабжение
                  </div>
                </div>
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
                className="p-6 md:p-8 rounded-[2rem] shadow-neo bg-neo-bg dark:bg-gray-800 text-center space-y-3 hover:shadow-neo-inset transition-all"
              >
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
                className="group p-10 rounded-[3rem] shadow-neo bg-neo-bg dark:bg-gray-800 space-y-6 hover:shadow-neo-inset transition-all"
              >
                <div className="p-4 rounded-2xl shadow-neo w-fit text-blue-500 group-hover:scale-110 transition-transform">
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
                <div className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-2 pt-2">
                  <span>Подробнее</span>
                  <ChevronRight size={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
    </div>
  );
};

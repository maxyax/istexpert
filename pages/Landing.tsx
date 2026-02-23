import React, { useState, useEffect } from 'react';
import {
  Truck,
  ShieldCheck,
  Zap,
  Activity,
  QrCode,
  ArrowRight,
  Gauge,
  Layers,
  PlayCircle,
  X,
  CheckCircle2,
  Wrench,
  FileText,
  TrendingUp,
  Clock,
  Users,
  Package,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
}

const FEATURES: FeatureCard[] = [
  {
    icon: <QrCode size={28} />,
    title: 'QR-Паспорта',
    desc: 'Мгновенный доступ к истории техники по QR-коду',
    color: 'from-blue-500 to-cyan-400'
  },
  {
    icon: <Gauge size={28} />,
    title: 'Учет наработки',
    desc: 'Автоматический расчет моточасов и интервалов ТО',
    color: 'from-emerald-500 to-teal-400'
  },
  {
    icon: <Wrench size={28} />,
    title: 'Планирование ТО',
    desc: 'Автоматические регламенты и календарь обслуживания',
    color: 'from-orange-500 to-amber-400'
  },
  {
    icon: <Package size={28} />,
    title: 'Снабжение',
    desc: 'Kanban-доска для закупок запчастей',
    color: 'from-purple-500 to-pink-400'
  },
  {
    icon: <FileText size={28} />,
    title: 'Документы',
    desc: 'Электронные паспорта, страховки, акты',
    color: 'from-indigo-500 to-blue-400'
  },
  {
    icon: <TrendingUp size={28} />,
    title: 'Аналитика',
    desc: 'Статистика расходов и простоев',
    color: 'from-rose-500 to-red-400'
  }
];

const STATS = [
  { value: '98%', label: 'Снижение простоев', icon: <TrendingUp size={20} /> },
  { value: '40%', label: 'Экономия на ТО', icon: <ShieldCheck size={20} /> },
  { value: '24/7', label: 'Контроль автопарка', icon: <Clock size={20} /> },
  { value: '100+', label: 'Компаний доверяют', icon: <Users size={20} /> }
];

export const Landing: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  const { demoLogin } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [activeStat, setActiveStat] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStat((prev) => (prev + 1) % STATS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-gray-800 font-sans overflow-hidden">
      {/* Навигация */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-white/90 backdrop-blur-xl shadow-lg shadow-blue-500/10'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
                <Truck size={24} />
              </div>
              <div>
                <span className="text-xl font-black uppercase tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  ISTExpert
                </span>
                <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest -mt-1">
                  Система управления автопарком
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={demoLogin}
                className="hidden sm:flex px-6 py-3 rounded-2xl bg-white/80 backdrop-blur-sm text-blue-600 font-bold text-xs uppercase tracking-wide hover:bg-white hover:shadow-lg transition-all items-center gap-2 border border-blue-200"
              >
                <PlayCircle size={16} /> Демо
              </button>
              <button
                onClick={onStart}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-xs uppercase tracking-wide hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:scale-105"
              >
                Войти
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Герой-секция */}
      <section className="relative pt-40 pb-20 px-6 min-h-screen flex items-center">
        {/* Фоновые элементы */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-400/15 to-blue-400/15 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-indigo-400/10 to-purple-400/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-8 animate-in slide-in-from-left duration-1000">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/80 backdrop-blur-sm shadow-lg shadow-blue-500/10 border border-blue-200">
              <Zap size={14} className="text-blue-500 fill-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                Цифровизация автопарка 2.0
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase leading-[1.05] tracking-tighter">
              <span className="bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                Система
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                управления
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 bg-clip-text text-transparent drop-shadow-lg">
                автопарком
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 font-medium max-w-xl leading-relaxed">
              Автоматизируйте ТО, ремонты, снабжение и документооборот.
              Полный контроль над каждой единицей техники в режиме реального времени.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onStart}
                className="group px-10 py-5 rounded-[2rem] bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black uppercase text-sm shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 transition-all hover:scale-105 flex items-center justify-center gap-3"
              >
                Начать работу
                <ArrowRight
                  size={20}
                  className="group-hover:translate-x-2 transition-transform"
                />
              </button>
              <button
                onClick={demoLogin}
                className="px-10 py-5 rounded-[2rem] bg-white/80 backdrop-blur-sm text-blue-600 font-black uppercase text-sm shadow-xl hover:shadow-2xl transition-all hover:scale-105 border-2 border-blue-200"
              >
                Демо-доступ
              </button>
            </div>

            {/* Быстрые преимущества */}
            <div className="flex flex-wrap gap-3 pt-4">
              {['Без установки', 'Работает в браузере', 'Мобильная версия'].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/50"
                >
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-bold text-gray-600 uppercase">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Правая часть - интерактивная визуализация */}
          <div className="relative hidden lg:block animate-in zoom-in duration-1000 delay-300">
            <div className="relative w-full aspect-square">
              {/* Центральная карточка */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-80 h-96 rounded-[3rem] bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-xl shadow-2xl shadow-blue-500/20 border border-white/60 p-8 flex flex-col items-center justify-center gap-6 animate-float">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/40">
                    <Truck size={48} />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-black uppercase text-gray-800">
                      ISTExpert
                    </h3>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
                      Fleet Management
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-[10px] font-black uppercase">
                      ТО
                    </div>
                    <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white text-[10px] font-black uppercase">
                      Ремонт
                    </div>
                    <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-400 text-white text-[10px] font-black uppercase">
                      Снабжение
                    </div>
                  </div>
                </div>
              </div>

              {/* Плавающие иконки */}
              {[
                { icon: <QrCode size={24} />, pos: 'top-0 right-0', delay: '0s' },
                { icon: <Wrench size={24} />, pos: 'top-1/4 left-0', delay: '0.5s' },
                { icon: <Package size={24} />, pos: 'bottom-1/4 right-0', delay: '1s' },
                { icon: <Calendar size={24} />, pos: 'bottom-0 left-0', delay: '1.5s' }
              ].map((item, i) => (
                <div
                  key={i}
                  className={`absolute ${item.pos} w-16 h-16 rounded-2xl bg-white/90 backdrop-blur-sm shadow-xl flex items-center justify-center text-blue-500 animate-float`}
                  style={{ animationDelay: item.delay }}
                >
                  {item.icon}
                </div>
              ))}

              {/* Декоративные кольца */}
              <div className="absolute inset-0 border-2 border-dashed border-blue-300/30 rounded-full animate-spin-slow" />
              <div className="absolute inset-8 border-2 border-dashed border-indigo-300/30 rounded-full animate-spin-slow-reverse" />
            </div>
          </div>
        </div>
      </section>

      {/* Статистика */}
      <section className="py-20 px-6 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {STATS.map((stat, i) => (
              <div
                key={i}
                className={`group p-6 md:p-8 rounded-[2rem] bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 border border-white/60 ${
                  activeStat === i ? 'ring-2 ring-blue-500 ring-offset-4' : ''
                }`}
              >
                <div className="flex items-center gap-3 mb-3 text-blue-500">
                  {stat.icon}
                </div>
                <div className="text-3xl md:text-5xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Преимущества */}
      <section className="py-32 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/50 to-transparent" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16 animate-in slide-in-from-bottom duration-700">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
              <span className="bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                Всё что нужно
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                для управления автопарком
              </span>
            </h2>
            <p className="text-lg text-gray-500 font-medium max-w-2xl mx-auto">
              Полный набор инструментов для эффективной работы автопарка
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="group relative p-8 rounded-[2.5rem] bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] border border-white/60 overflow-hidden animate-in slide-in-from-bottom"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Градиентный фон при наведении */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-all duration-500`}
                />

                <div className="relative z-10 space-y-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-white shadow-lg flex items-center justify-center text-gray-700 group-hover:scale-110 group-hover:shadow-xl transition-all duration-500">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-gray-800 group-hover:text-white transition-colors duration-500">
                      {feature.title}
                    </h3>
                    <p className="text-sm md:text-base text-gray-500 font-medium mt-2 group-hover:text-white/90 transition-colors duration-500">
                      {feature.desc}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500 group-hover:text-white transition-colors duration-500">
                    <span>Подробнее</span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA секция */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative p-12 md:p-20 rounded-[3rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-2xl shadow-blue-500/30 overflow-hidden">
            {/* Декоративные элементы */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

            <div className="relative z-10 text-center space-y-8">
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">
                Готовы оптимизировать<br />ваш автопарк?
              </h2>
              <p className="text-xl text-white/80 font-medium max-w-2xl mx-auto">
                Начните использовать ISTExpert прямо сейчас и получите полный контроль над вашей техникой
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={onStart}
                  className="px-12 py-6 rounded-[2.5rem] bg-white text-blue-600 font-black uppercase text-sm shadow-2xl hover:shadow-white/40 transition-all hover:scale-105 flex items-center justify-center gap-3"
                >
                  Начать бесплатно
                  <ArrowRight size={20} />
                </button>
                <button
                  onClick={demoLogin}
                  className="px-12 py-6 rounded-[2.5rem] bg-white/10 backdrop-blur-sm text-white font-black uppercase text-sm border-2 border-white/30 hover:bg-white/20 transition-all hover:scale-105"
                >
                  Демо-режим
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Футер */}
      <footer className="py-12 px-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Truck size={20} />
            </div>
            <div>
              <span className="text-lg font-black uppercase tracking-tight text-gray-800">
                ISTExpert
              </span>
              <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest">
                Система управления автопарком
              </p>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <a href="#" className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors">
              Документация
            </a>
            <a href="#" className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors">
              Поддержка
            </a>
            <a href="#" className="text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors">
              Контакты
            </a>
          </div>
          <p className="text-xs text-gray-400 font-medium">
            © 2026 ISTExpert. Все права защищены.
          </p>
        </div>
      </footer>

      {/* Глобальные стили для анимаций */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
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
          animation: spin-slow 20s linear infinite;
        }
        .animate-spin-slow-reverse {
          animation: spin-slow-reverse 15s linear infinite;
        }
      `}</style>
    </div>
  );
};

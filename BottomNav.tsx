import React from 'react';
import { useApp } from '../context/AppContext';
import { Home, Bot, Utensils, Dumbbell, User, Baby, Crown } from 'lucide-react';
import { AppTab } from '../types';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, user, t, isPremium } = useApp();

  const isMom = Boolean(user?.profile?.isMomMode);

  const navItems: { id: AppTab; label: string; icon: React.FC<{ className?: string }> }[] = isMom
    ? [
        { id: 'home', label: t.nav.home, icon: Home },
        { id: 'mom', label: t.nav.mom || 'Для мам', icon: Baby },
        { id: 'ai_trainer', label: t.nav.aiTrainer, icon: Bot },
        { id: 'nutrition', label: t.nav.nutrition, icon: Utensils },
        { id: 'profile', label: t.nav.profile, icon: User },
      ]
    : [
        { id: 'home', label: t.nav.home, icon: Home },
        { id: 'ai_trainer', label: t.nav.aiTrainer, icon: Bot },
        { id: 'nutrition', label: t.nav.nutrition, icon: Utensils },
        { id: 'workouts', label: t.nav.workouts, icon: Dumbbell },
        { id: 'profile', label: t.nav.profile, icon: User },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800/80 px-2 py-2">
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1 items-center">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          const isAi = item.id === 'ai_trainer';
          const isMomTab = item.id === 'mom';

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 ${
                isActive
                  ? isAi
                    ? 'text-teal-400 font-bold scale-105'
                    : isMomTab
                    ? 'text-rose-400 font-bold scale-105'
                    : 'text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isAi && (
                <div
                  className={`absolute -top-1 w-8 h-8 rounded-full blur-md transition-opacity ${
                    isActive ? 'bg-teal-500/40 opacity-100' : 'bg-teal-500/10 opacity-30'
                  }`}
                />
              )}
              {isMomTab && (
                <div
                  className={`absolute -top-1 w-8 h-8 rounded-full blur-md transition-opacity ${
                    isActive ? 'bg-rose-500/30 opacity-100' : 'bg-rose-500/5 opacity-10'
                  }`}
                />
              )}

              <div
                className={`relative p-1 rounded-lg transition-transform ${
                  isActive && isAi ? 'bg-teal-500/20' : isActive && isMomTab ? 'bg-rose-500/20' : ''
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110' : 'scale-100'
                  } ${isAi ? 'text-teal-400' : isMomTab ? 'text-rose-400' : ''}`}
                />
                {isMomTab && !isPremium && (
                  <div className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 p-0.5 rounded-full shadow-sm">
                    <Crown className="w-2.5 h-2.5 fill-slate-950" />
                  </div>
                )}
              </div>

              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-full">
                {item.label}
              </span>

              {isActive && (
                <div
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 animate-pulse ${
                    isMomTab ? 'bg-rose-400' : isAi ? 'bg-teal-400' : 'bg-emerald-400'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

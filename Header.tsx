import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Crown, Flame, Globe, Sparkles, ChevronDown, ShieldAlert } from 'lucide-react';
import { Language } from '../types';

export const Header: React.FC = () => {
  const { user, language, setLanguage, isPremium, premiumUntilFormatted, openPaywall, todayActivity, setActiveTab } = useApp();
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const langOptions: { code: Language; label: string; flag: string }[] = [
    { code: 'uz', label: "O‘zbekcha", flag: '🇺🇿' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  const currentFlag = langOptions.find((l) => l.code === language)?.flag || '🇷🇺';

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand & Streak */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-lg shadow-md shadow-emerald-500/20">
            F
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-slate-950 rounded-full flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">FitAI</span>
              {isPremium ? (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold tracking-wider flex items-center gap-0.5">
                  <Crown className="w-2.5 h-2.5 fill-amber-400" />
                  PRO
                </span>
              ) : (
                <button
                  onClick={openPaywall}
                  className="px-2 py-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold tracking-wider animate-pulse transition"
                >
                  GET PRO
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {user?.firstName || 'FitAI Athlete'}
            </p>
          </div>
        </div>

        {/* Right controls: Streak & Language & Premium status */}
        <div className="flex items-center gap-2">
          {/* Quick Admin Portal Button for Verified Admins */}
          {user?.isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-extrabold text-amber-300 shadow-sm transition animate-in fade-in"
              title="Панель администратора"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Админ</span>
            </button>
          )}

          {/* Streak indicator */}
          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-amber-400 text-xs font-bold">
            <Flame className="w-3.5 h-3.5 fill-amber-400" />
            <span>{todayActivity?.streakCount || 1}</span>
          </div>

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition"
            >
              <span>{currentFlag}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {langMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setLangMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-36 bg-slate-900 border border-slate-750 rounded-2xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95">
                  {langOptions.map((opt) => (
                    <button
                      key={opt.code}
                      onClick={() => {
                        setLanguage(opt.code);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2.5 transition ${
                        language === opt.code
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-base">{opt.flag}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

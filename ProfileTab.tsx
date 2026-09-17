import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  User,
  Crown,
  Bell,
  Globe,
  Download,
  Trash2,
  ShieldAlert,
  Edit3,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Smartphone,
  Baby,
  Heart,
  Lock,
} from 'lucide-react';
import { Language } from '../types';

export const ProfileTab: React.FC = () => {
  const {
    user,
    language,
    setLanguage,
    isPremium,
    premiumUntilFormatted,
    openPaywall,
    setOnboardingOpen,
    setActiveTab,
    token,
    t,
    showToast,
    switchDemoUser,
    refreshUser,
  } = useApp();

  const [waterReminder, setWaterReminder] = useState(true);
  const [workoutReminder, setWorkoutReminder] = useState(true);
  const [mealReminder, setMealReminder] = useState(true);

  const [isUpdatingMom, setIsUpdatingMom] = useState(false);
  const [adminTapCount, setAdminTapCount] = useState(0);

  const handleSecretAdminTap = () => {
    const next = adminTapCount + 1;
    if (next >= 5) {
      setAdminTapCount(5);
      showToast('Доступ к панели администратора активирован');
      setActiveTab('admin');
    } else {
      setAdminTapCount(next);
      if (next >= 3) {
        showToast(`Осталось нажатий для входа: ${5 - next}`);
      }
    }
  };

  const handleToggleMomMode = async () => {
    if (!isPremium) {
      openPaywall();
      showToast('Раздел «Для мам» доступен только подписчикам FitAI Premium');
      return;
    }

    try {
      setIsUpdatingMom(true);
      const newMode = !user?.profile?.isMomMode;
      const res = await fetch('/api/mom/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isMomMode: newMode }),
      });
      const data = await res.json();
      if (data.ok) {
        await refreshUser();
        showToast(newMode ? 'Режим «Для мам» активирован!' : 'Режим «Для мам» отключен');
      } else if (data.require_premium) {
        openPaywall();
        showToast(data.message || 'Требуется подписка FitAI Premium');
      }
    } catch {
      showToast('Ошибка при переключении режима');
    } finally {
      setIsUpdatingMom(false);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await fetch('/api/user/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(data.export, null, 2)
        )}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', `FitAI_Data_${user?.telegramId || 'user'}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast(t.profile.exportSuccess);
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm(t.profile.deleteConfirm)) return;
    try {
      await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      localStorage.clear();
      window.location.reload();
    } catch {
      // ignore
    }
  };

  const p = user?.profile;

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-24 text-white">
      {/* User Header Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-md shadow-emerald-500/20">
              {user?.firstName?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-extrabold text-white">
                  {user?.firstName || 'FitAI Athlete'} {user?.lastName || ''}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                {user?.username ? `@${user.username}` : `ID: ${user?.telegramId || '998901234567'}`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setOnboardingOpen(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 transition"
            title={t.profile.editParameters}
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>

        {/* Body Stats Chips */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Рост</span>
            <span className="text-xs font-bold text-white mt-0.5 block">{p?.height || 176} см</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Текущий</span>
            <span className="text-xs font-bold text-white mt-0.5 block">{p?.weight || 82} кг</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">Цель</span>
            <span className="text-xs font-bold text-emerald-400 mt-0.5 block">
              {p?.targetWeight || 72} кг
            </span>
          </div>
        </div>
      </div>

      {/* Subscription Card */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-4.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Crown className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 block">
                {t.profile.subscriptionStatus}
              </span>
              <span className="text-sm font-extrabold text-white">
                {isPremium ? 'FitAI PRO (Активен)' : 'Базовый тариф (Free)'}
              </span>
            </div>
          </div>

          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isPremium
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isPremium ? 'PREMIUM' : 'FREE'}
          </span>
        </div>

        {isPremium ? (
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {t.profile.premiumUntil} <strong className="text-white">{premiumUntilFormatted}</strong>
            </span>
            <button
              onClick={openPaywall}
              className="text-xs text-amber-400 font-bold hover:underline"
            >
              {t.profile.renewSubscription}
            </button>
          </div>
        ) : (
          <button
            onClick={openPaywall}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition"
          >
            {t.profile.getSubscription}
          </button>
        )}
      </div>

      {/* Mom Mode Toggle Card */}
      <div className="rounded-3xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border border-rose-500/30 p-4.5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <Baby className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400 block">Специальный режим</span>
                {isPremium ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500/20 text-rose-300">
                    PREMIUM
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5 fill-amber-300" />
                    PRO
                  </span>
                )}
              </div>
              <span className="text-sm font-extrabold text-white">
                Раздел «Для мам»
              </span>
            </div>
          </div>

          <button
            onClick={handleToggleMomMode}
            disabled={isUpdatingMom}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              user?.profile?.isMomMode && isPremium ? 'bg-rose-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                user?.profile?.isMomMode && isPremium ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Идеи ужина из того, что есть дома, игры с детьми ({user?.profile?.childAge || '3-4 года'}), семейное меню и оптимизация бюджета.
        </p>

        {!isPremium ? (
          <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>Только для FitAI Premium</span>
            </div>
            <button
              onClick={() => openPaywall()}
              className="py-1 px-3 rounded-xl bg-amber-400 text-slate-950 text-xs font-black shadow-md shadow-amber-400/20 active:scale-95 transition flex items-center gap-1"
            >
              <Crown className="w-3 h-3 fill-slate-950" />
              <span>Разблокировать</span>
            </button>
          </div>
        ) : (
          user?.profile?.isMomMode && (
            <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between">
              <span className="text-[11px] text-rose-300 font-medium">
                Режим активен в меню и профиле
              </span>
              <button
                onClick={() => setActiveTab('mom')}
                className="py-1.5 px-3 rounded-xl bg-rose-500 text-slate-950 text-xs font-black shadow-md shadow-rose-500/20 active:scale-95 transition flex items-center gap-1"
              >
                <span>Открыть раздел</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        )}
      </div>

      {/* Reminders / Notifications */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4.5 space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {t.profile.notifications}
        </h4>

        <div className="space-y-2.5">
          {[
            { label: t.profile.waterReminder, state: waterReminder, setter: setWaterReminder },
            { label: t.profile.workoutReminder, state: workoutReminder, setter: setWorkoutReminder },
            { label: t.profile.mealReminder, state: mealReminder, setter: setMealReminder },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-slate-200">{item.label}</span>
              <button
                onClick={() => item.setter(!item.state)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  item.state ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    item.state ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Language Selector */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4.5 space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" />
          <span>{t.profile.language}</span>
        </h4>

        <div className="grid grid-cols-3 gap-2">
          {[
            { code: 'uz' as Language, label: "O‘zbekcha", flag: '🇺🇿' },
            { code: 'ru' as Language, label: 'Русский', flag: '🇷🇺' },
            { code: 'en' as Language, label: 'English', flag: '🇬🇧' },
          ].map((l) => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              className={`py-2 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${
                language === l.code
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold'
                  : 'border-slate-800 bg-slate-950 text-slate-400'
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Data Export & Admin & Danger Zone */}
      <div className="space-y-2">
        <button
          onClick={handleExportData}
          className="w-full py-3 px-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-200 transition flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" />
            <span>{t.profile.exportData}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Admin Portal Entrance - ONLY visible to verified admins, token holders or secret tap */}
        {(user?.isAdmin || localStorage.getItem('fitai_admin_token') || adminTapCount >= 3) && (
          <button
            onClick={() => setActiveTab('admin')}
            className="w-full py-3 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-xs font-bold text-amber-300 transition flex items-center justify-between shadow-sm animate-in fade-in"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>{t.profile.adminPanelBtn}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-950 uppercase tracking-wide">
                Admin
              </span>
              <ChevronRight className="w-4 h-4 text-amber-400/80" />
            </div>
          </button>
        )}

        {/* Delete Account */}
        <button
          onClick={handleDeleteAccount}
          className="w-full py-3 px-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-bold text-rose-400 transition flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>{t.profile.deleteAccount}</span>
        </button>

        {/* Version / Hidden Admin trigger footer */}
        <div 
          onClick={handleSecretAdminTap}
          className="text-center pt-2 pb-6 text-[11px] text-slate-600 select-none cursor-pointer active:opacity-60 transition"
          title="FitAI"
        >
          <span>FitAI v2.4.0 • Telegram Mini App</span>
        </div>
      </div>
    </div>
  );
};

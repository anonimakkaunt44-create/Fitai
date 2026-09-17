import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { persistentStorage } from '../utils/persistentStorage';
import {
  ShieldAlert,
  Users,
  CreditCard,
  Settings,
  Bot,
  Send,
  Lock,
  LogOut,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  AlertCircle,
  Sparkles,
  DollarSign,
  TrendingUp,
  KeyRound,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { PaymentSettings } from '../types';

export const AdminPanel: React.FC = () => {
  const { setActiveTab, t, showToast, haptic, user, token } = useApp();

  const [adminToken, setAdminToken] = useState<string | null>(() =>
    localStorage.getItem('fitai_admin_token')
  );
  const [adminUser, setAdminUser] = useState<any>(null);

  // Login form state - blank by default, never prefilled
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Active Admin Sub-tab
  const [adminTab, setAdminTab] = useState<
    'dashboard' | 'users' | 'payments' | 'settings' | 'ai' | 'broadcast' | 'security'
  >('dashboard');

  // Real-time Live sync state
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => new Date().toLocaleTimeString('ru-RU'));
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(false);
  const prevPendingPaymentsRef = useRef<number>(0);
  const autoLoginAttemptedRef = useRef<boolean>(false);

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersQuery, setUsersQuery] = useState('');
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  // Settings state
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    cardNumber: '',
    cardHolder: '',
    bankName: '',
    instructions: '',
    instructionsUz: '',
    instructionsEn: '',
    price1Month: 149000,
    price3Months: 349000,
    price1Year: 799000,
    currency: 'UZS',
    updatedAt: '',
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // AI Settings state
  const [aiSettings, setAiSettings] = useState<any>({
    enabled: true,
    modelName: 'gemini-3.8-flash',
    dailyLimitPerUser: 50,
  });

  // Broadcast state
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'premium' | 'free'>('all');
  const [broadcastLang, setBroadcastLang] = useState<string>('all');
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);

  // Security state
  const [newPassword, setNewPassword] = useState('');

  // 1-Click Telegram Admin Login for verified admins
  const handleTelegramAdminLogin = async () => {
    setLoginLoading(true);
    setLoginError(null);

    try {
      const userToken = token || (await persistentStorage.getItem('fitai_token')) || localStorage.getItem('fitai_token');
      const res = await fetch('/api/admin/telegram-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      });

      const data = await res.json();
      if (data.ok && data.token) {
        setAdminToken(data.token);
        setAdminUser(data.admin);
        await persistentStorage.setItem('fitai_admin_token', data.token);
        haptic('success');
        showToast('Вход в панель администратора выполнен');
      } else {
        setLoginError(data.error || 'Доступ разрешен только верифицированному администратору бота');
      }
    } catch {
      setLoginError('Ошибка соединения с сервером');
    } finally {
      setLoginLoading(false);
    }
  };

  // Seamless auto-login: If Telegram account is confirmed admin, enter directly
  useEffect(() => {
    if (!adminToken && user?.isAdmin && !autoLoginAttemptedRef.current) {
      autoLoginAttemptedRef.current = true;
      handleTelegramAdminLogin();
    }
  }, [adminToken, user?.isAdmin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.trim(), password: passwordInput }),
      });

      const data = await res.json();
      if (data.ok && data.token) {
        setAdminToken(data.token);
        setAdminUser(data.admin);
        await persistentStorage.setItem('fitai_admin_token', data.token);
        haptic('success');
        showToast('Добро пожаловать в панель администратора');
      } else {
        setLoginError(data.error || 'Неверный логин или пароль');
      }
    } catch {
      setLoginError('Ошибка связи с сервером');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    persistentStorage.removeItem('fitai_admin_token');
    autoLoginAttemptedRef.current = false;
  };

  const activeToken = adminToken || localStorage.getItem('fitai_admin_token') || token || localStorage.getItem('fitai_token');
  const authHeaders = {
    Authorization: `Bearer ${activeToken}`,
    'Content-Type': 'application/json',
  };

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/admin/dashboard', { headers: authHeaders });
      const data = await res.json();
      if (data.ok) setStats(data.stats);
    } catch {}
  };

  const loadUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(usersQuery)}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.ok) setUsersList(data.users);
    } catch {}
  };

  const loadPayments = async () => {
    try {
      const res = await fetch('/api/admin/payments', { headers: authHeaders });
      const data = await res.json();
      if (data.ok && Array.isArray(data.payments)) {
        setPaymentsList(data.payments);
        const pend = data.payments.filter((p: any) => p.status === 'pending').length;
        prevPendingPaymentsRef.current = pend;
      }
    } catch {}
  };

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/admin/payment-settings', { headers: authHeaders });
      const data = await res.json();
      if (data.ok && data.settings) {
        const savedSettingsStr = await persistentStorage.getItem('fitai_admin_payment_settings');
        if (savedSettingsStr) {
          try {
            const saved = JSON.parse(savedSettingsStr);
            if (saved.cardNumber && saved.cardNumber !== '8600 4912 3456 7890' && data.settings.cardNumber === '8600 4912 3456 7890') {
              // Server restarted and reset to default, re-sync admin card automatically!
              await fetch('/api/admin/payment-settings', {
                method: 'PUT',
                headers: authHeaders,
                body: JSON.stringify(saved),
              });
              setPaymentSettings(saved);
              return;
            }
          } catch {}
        }
        setPaymentSettings(data.settings);
      }
    } catch {} finally {
      setSettingsLoading(false);
    }
  };

  const loadAi = async () => {
    try {
      const res = await fetch('/api/admin/ai-settings', { headers: authHeaders });
      const data = await res.json();
      if (data.ok && data.settings) setAiSettings(data.settings);
    } catch {}
  };

  // Initial load when logged in
  useEffect(() => {
    if (adminToken || user?.isAdmin) {
      loadDashboard();
      loadPayments();
      loadSettings();
      loadAi();
    }
  }, [adminToken, user?.isAdmin]);

  // Tab switch loader
  useEffect(() => {
    if (!adminToken && !user?.isAdmin) return;
    if (adminTab === 'dashboard') loadDashboard();
    if (adminTab === 'users') loadUsers();
    if (adminTab === 'payments') loadPayments();
    if (adminTab === 'settings') loadSettings();
    if (adminTab === 'ai') loadAi();
  }, [adminTab]);

  // LIVE ONLINE BACKGROUND SYNC (every 6 seconds, does not disrupt active inputs)
  useEffect(() => {
    if (!adminToken && !user?.isAdmin) return;

    const livePoll = async () => {
      try {
        setIsLiveSyncing(true);
        const [dRes, pRes] = await Promise.all([
          fetch('/api/admin/dashboard', { headers: authHeaders }),
          fetch('/api/admin/payments', { headers: authHeaders }),
        ]);

        if (dRes.ok) {
          const dData = await dRes.json();
          if (dData.ok) setStats(dData.stats);
        }

        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.ok && Array.isArray(pData.payments)) {
            setPaymentsList(pData.payments);
            const currentPending = pData.payments.filter((p: any) => p.status === 'pending').length;
            if (prevPendingPaymentsRef.current > 0 && currentPending > prevPendingPaymentsRef.current) {
              haptic('notification');
              showToast('🔔 Новая заявка на оплату! Чек поступил в систему.');
            }
            prevPendingPaymentsRef.current = currentPending;
          }
        }

        setLastSyncTime(new Date().toLocaleTimeString('ru-RU'));
      } catch (err) {
        console.error('Live sync poll err:', err);
      } finally {
        setIsLiveSyncing(false);
      }
    };

    const timer = setInterval(livePoll, 6000);
    return () => clearInterval(timer);
  }, [adminToken, user?.isAdmin, token]);

  // Review Payment (Approve or Reject)
  const handleReviewPayment = async (paymentId: string, status: 'approved' | 'rejected') => {
    haptic('medium');
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/review`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(status === 'approved' ? 'Платеж подтвержден! Premium активирован.' : 'Платеж отклонен');
        loadPayments();
        loadDashboard();
      }
    } catch {}
  };

  // Toggle user premium manually
  const handleUserPremium = async (userId: string, isPremium: boolean, daysToAdd?: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/premium`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ isPremium, daysToAdd }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Статус подписки обновлен');
        loadUsers();
      }
    } catch {}
  };

  // Save Payment Settings with validation
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentSettings.cardNumber.trim() || !paymentSettings.cardHolder.trim()) {
      haptic('error');
      showToast('⚠️ Введите номер карты и имя держателя');
      return;
    }

    try {
      const res = await fetch('/api/admin/payment-settings', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(paymentSettings),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.settings) {
          setPaymentSettings(data.settings);
          await persistentStorage.setItem('fitai_admin_payment_settings', JSON.stringify(data.settings));
        }
        haptic('success');
        showToast('✅ Реквизиты сохранены и защищены от сброса');
      } else {
        showToast(data.error || 'Ошибка при сохранении');
      }
    } catch {
      showToast('Ошибка сети при сохранении');
    }
  };

  // Save AI Settings
  const handleSaveAi = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(aiSettings),
      });
      if (res.ok) {
        showToast('Настройки AI сохранены');
      }
    } catch {}
  };

  // Send Broadcast
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;

    setBroadcastSending(true);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          targetAudience: broadcastTarget,
          language: broadcastLang,
          messageText: broadcastText,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Рассылка отправлена: ${data.sent} доставлено, ${data.failed} ошибок`);
        setBroadcastText('');
      }
    } catch {} finally {
      setBroadcastSending(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return;

    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Пароль успешно изменен');
        setNewPassword('');
      }
    } catch {}
  };

  // Pending count calculations
  const pendingCount = paymentsList.filter((p) => p.status === 'pending').length;
  const approvedCount = paymentsList.filter((p) => p.status === 'approved').length;
  const rejectedCount = paymentsList.filter((p) => p.status === 'rejected').length;

  const filteredPayments = paymentsList.filter((p) => {
    if (paymentFilter === 'all') return true;
    return p.status === paymentFilter;
  });

  // IF NOT LOGGED IN: SHOW ADMIN LOGIN FORM OR AUTO-LOGIN SPINNER
  if (!adminToken) {
    if (user?.isAdmin && loginLoading) {
      return (
        <div className="max-w-md mx-auto px-4 py-16 text-white min-h-[60vh] flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">Вход в панель администратора...</h3>
          <p className="text-xs text-slate-400">Синхронизация учетной записи Telegram @{user.username || user.firstName}</p>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto px-4 py-8 text-white min-h-[80vh] flex flex-col justify-center">
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-500/30">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white">{t.admin.loginTitle}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Доступ строго ограничен для владельца и администрации
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* 1-Click login if authenticated Telegram account is an admin */}
          {user?.isAdmin && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2.5">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Вы авторизованы как администратор ({user.username ? `@${user.username}` : user.firstName})</span>
              </div>
              <button
                type="button"
                onClick={handleTelegramAdminLogin}
                disabled={loginLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>{loginLoading ? t.common.loading : 'Быстрый вход через Telegram'}</span>
              </button>
            </div>
          )}

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              {user?.isAdmin ? 'Или вход по паролю' : 'Авторизация'}
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-3" autoComplete="off">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {t.admin.username}
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                placeholder="Логин администратора"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {t.admin.password}
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                placeholder="Секретный пароль"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading || !usernameInput.trim() || !passwordInput}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs tracking-wide shadow-md active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{loginLoading ? t.common.loading : t.admin.loginBtn}</span>
            </button>
          </form>

          <button
            onClick={() => setActiveTab('home')}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-300 pt-2 transition"
          >
            ← Вернуться в приложение
          </button>
        </div>
      </div>
    );
  }

  // LOGGED IN ADMIN PORTAL
  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-24 text-white">
      {/* Admin Top Header with LIVE online indicator */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white">{t.admin.title}</h2>
              <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Онлайн
              </span>
            </div>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              Синхронизировано: {lastSyncTime}
              {isLiveSyncing && <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-400" />}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('home')}
            className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold"
          >
            В App
          </button>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition"
            title={t.admin.logout}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Admin Subtabs Bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {[
          { id: 'dashboard', label: t.admin.tabDashboard, icon: TrendingUp },
          { id: 'users', label: t.admin.tabUsers, icon: Users },
          { id: 'payments', label: t.admin.tabPayments, icon: CreditCard, badge: pendingCount },
          { id: 'settings', label: t.admin.tabPaymentSettings, icon: Settings },
          { id: 'ai', label: t.admin.tabAiSettings, icon: Bot },
          { id: 'broadcast', label: t.admin.tabBroadcast, icon: Send },
          { id: 'security', label: t.admin.tabSecurity, icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = adminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    isActive ? 'bg-slate-950 text-amber-400' : 'bg-amber-400 text-slate-950 animate-pulse'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. DASHBOARD */}
      {adminTab === 'dashboard' && stats && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {t.admin.statsUsers}
              </span>
              <span className="text-xl font-black text-white mt-1 block">
                {stats.totalUsers}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">
                +{stats.newUsersToday} {t.admin.statsNewToday}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {t.admin.statsActivePremium}
              </span>
              <span className="text-xl font-black text-amber-400 mt-1 block">
                {stats.activePremiumUsers ?? stats.activePremium ?? 0}
              </span>
              <span className="text-[10px] text-slate-400">
                Истекло: {stats.expiredPremiumUsers ?? stats.expiredPremium ?? 0}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {t.admin.statsPayments}
              </span>
              <span className="text-xl font-black text-white mt-1 block">
                {stats.approvedPaymentsCount ?? stats.totalPayments ?? 0}
              </span>
              <span className="text-[10px] text-amber-400 font-semibold">
                В ожидании: {stats.pendingPaymentsCount ?? 0}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {t.admin.statsRevenue}
              </span>
              <span className="text-base font-black text-emerald-400 mt-1 block">
                {(stats.totalRevenue ?? 0).toLocaleString()} {stats.currency || 'UZS'}
              </span>
            </div>
          </div>

          {/* AI Stats */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">{t.admin.statsAiRequests}:</span>
              <span className="font-bold text-white">{stats.totalAiRequests}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">{t.admin.statsAiErrors}:</span>
              <span className="font-bold text-rose-400">{stats.totalAiErrors}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. USERS MANAGEMENT */}
      {adminTab === 'users' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={t.admin.searchUsers}
              value={usersQuery}
              onChange={(e) => setUsersQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-2">
            {usersList.map((u) => (
              <div
                key={u.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {u.firstName} {u.lastName || ''}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      TG: {u.telegramId} {u.username ? `(@${u.username})` : ''}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.isPremium
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {u.isPremium ? 'PRO' : 'FREE'}
                  </span>
                </div>

                {u.premiumUntil && (
                  <div className="text-[10px] text-slate-400">
                    Premium до: <strong>{new Date(u.premiumUntil).toLocaleDateString('ru-RU')}</strong>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => handleUserPremium(u.id, true, 30)}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] transition"
                  >
                    +30 дней PRO
                  </button>

                  {u.isPremium && (
                    <button
                      onClick={() => handleUserPremium(u.id, false)}
                      className="py-1.5 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-[11px] transition"
                    >
                      Отключить
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. PAYMENTS & CHECKS REVIEW */}
      {adminTab === 'payments' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white">Заявки на оплату</span>
              <span className="text-[10px] text-slate-500 font-mono">({paymentsList.length})</span>
            </div>
            <button
              onClick={() => {
                loadPayments();
                haptic('light');
              }}
              disabled={isLiveSyncing}
              className="text-amber-400 flex items-center gap-1 font-bold active:scale-95 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLiveSyncing ? 'animate-spin' : ''}`} />
              <span>Обновить</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-bold">
            <button
              onClick={() => setPaymentFilter('pending')}
              className={`py-1.5 rounded-lg transition ${
                paymentFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ожидают ({pendingCount})
            </button>
            <button
              onClick={() => setPaymentFilter('approved')}
              className={`py-1.5 rounded-lg transition ${
                paymentFilter === 'approved'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Одобрено ({approvedCount})
            </button>
            <button
              onClick={() => setPaymentFilter('rejected')}
              className={`py-1.5 rounded-lg transition ${
                paymentFilter === 'rejected'
                  ? 'bg-rose-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Отказ ({rejectedCount})
            </button>
            <button
              onClick={() => setPaymentFilter('all')}
              className={`py-1.5 rounded-lg transition ${
                paymentFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Все ({paymentsList.length})
            </button>
          </div>

          {filteredPayments.length === 0 && (
            <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800 space-y-2">
              <CreditCard className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-medium">Заявок в этой категории нет</p>
              <p className="text-[10px] text-slate-500">
                Новые платежи от пользователей отображаются здесь в режиме реального времени
              </p>
            </div>
          )}

          <div className="space-y-3">
            {filteredPayments.map((pay) => (
              <div
                key={pay.id}
                className={`p-4 rounded-2xl border space-y-2.5 transition ${
                  pay.status === 'pending'
                    ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                    : pay.status === 'approved'
                    ? 'bg-slate-900 border-emerald-500/30'
                    : 'bg-slate-900 border-rose-500/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-white">{pay.fullName}</h4>
                      {pay.username && (
                        <a
                          href={`https://t.me/${pay.username}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-amber-400 font-semibold hover:underline flex items-center gap-0.5"
                        >
                          @{pay.username}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                      TG ID: {pay.telegramId} • {pay.planName}
                    </span>
                    <div className="text-xs font-extrabold text-emerald-400 mt-1">
                      {pay.amount.toLocaleString()} {pay.currency}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      pay.status === 'pending'
                        ? 'bg-amber-500 text-slate-950 animate-pulse'
                        : pay.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {pay.status === 'pending'
                      ? 'Ожидает проверки'
                      : pay.status === 'approved'
                      ? 'Одобрено'
                      : 'Отклонено'}
                  </span>
                </div>

                {/* Receipt Image Thumbnail & Zoom */}
                {pay.receiptImage && (
                  <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <img
                      src={pay.receiptImage}
                      alt="Чек"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-700 cursor-pointer hover:opacity-80 transition"
                      onClick={() => setSelectedReceipt(pay.receiptImage)}
                    />
                    <div className="flex-1">
                      <button
                        onClick={() => setSelectedReceipt(pay.receiptImage)}
                        className="text-xs text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Нажмите, чтобы открыть чек
                      </button>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Отправлен: {new Date(pay.createdAt).toLocaleString('ru-RU')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action buttons if pending */}
                {pay.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleReviewPayment(pay.id, 'approved')}
                      className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t.admin.approvePayment}</span>
                    </button>
                    <button
                      onClick={() => handleReviewPayment(pay.id, 'rejected')}
                      className="py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{t.admin.rejectPayment}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. PAYMENT SETTINGS WITH CARD PREVIEW */}
      {adminTab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="p-4.5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">{t.admin.cardSettingsTitle}</h3>
            {settingsLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />}
          </div>

          {/* Visual Card Preview Mockup */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-slate-800 to-slate-950 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold uppercase">
              <span>{paymentSettings.bankName || 'Банк UzCard / Humo'}</span>
              <span>FitAI Pay</span>
            </div>
            <div className="text-sm font-mono font-black text-white tracking-widest py-1">
              {paymentSettings.cardNumber || '8600 •••• •••• ••••'}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span>Держатель карты</span>
              <span className="text-white font-bold">{paymentSettings.cardHolder || 'FITAI OWNER'}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">{t.payment.cardNumber} *</label>
            <input
              type="text"
              required
              placeholder="8600 0000 0000 0000"
              value={paymentSettings.cardNumber}
              onChange={(e) => setPaymentSettings({ ...paymentSettings, cardNumber: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">{t.payment.cardHolder} *</label>
            <input
              type="text"
              required
              placeholder="Имя Фамилия (как на карте)"
              value={paymentSettings.cardHolder}
              onChange={(e) => setPaymentSettings({ ...paymentSettings, cardHolder: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">{t.payment.bank}</label>
            <input
              type="text"
              placeholder="Название банка (TBC, Ipak Yoli, Click, Payme)"
              value={paymentSettings.bankName}
              onChange={(e) => setPaymentSettings({ ...paymentSettings, bankName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Tariffs and Prices */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">1 мес (UZS)</label>
              <input
                type="number"
                value={paymentSettings.price1Month}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, price1Month: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">3 мес (UZS)</label>
              <input
                type="number"
                value={paymentSettings.price3Months}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, price3Months: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">1 год (UZS)</label>
              <input
                type="number"
                value={paymentSettings.price1Year}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, price1Year: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs active:scale-95 transition shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            {t.admin.saveSettings}
          </button>
        </form>
      )}

      {/* 5. AI CONTROLS */}
      {adminTab === 'ai' && (
        <form
          onSubmit={handleSaveAi}
          className="p-4.5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3.5"
        >
          <h3 className="text-sm font-bold text-white">{t.admin.tabAiSettings}</h3>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">{t.admin.aiToggle}</span>
            <input
              type="checkbox"
              checked={aiSettings.enabled}
              onChange={(e) => setAiSettings({ ...aiSettings, enabled: e.target.checked })}
              className="w-5 h-5 rounded text-amber-500 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">{t.admin.aiModel}</label>
            <input
              type="text"
              disabled
              value={aiSettings.modelName || 'gemini-3.8-flash'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
          >
            {t.common.save}
          </button>
        </form>
      )}

      {/* 6. TELEGRAM BROADCAST */}
      {adminTab === 'broadcast' && (
        <form
          onSubmit={handleSendBroadcast}
          className="p-4.5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3.5"
        >
          <h3 className="text-sm font-bold text-white">{t.admin.broadcastTitle}</h3>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">{t.admin.targetAudience}</label>
              <select
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
              >
                <option value="all">{t.admin.allUsers}</option>
                <option value="premium">{t.admin.premiumOnly}</option>
                <option value="free">{t.admin.freeOnly}</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">{t.admin.filterLanguage}</label>
              <select
                value={broadcastLang}
                onChange={(e) => setBroadcastLang(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
              >
                <option value="all">{t.admin.allLangs}</option>
                <option value="uz">🇺🇿 O‘zbekcha</option>
                <option value="ru">🇷🇺 Русский</option>
                <option value="en">🇬🇧 English</option>
              </select>
            </div>
          </div>

          <div>
            <textarea
              rows={4}
              required
              placeholder={t.admin.broadcastMsgPlaceholder}
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <button
            type="submit"
            disabled={broadcastSending || !broadcastText.trim()}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            {broadcastSending ? (
              <span>{t.admin.sendingBroadcast}</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{t.admin.sendBroadcastBtn}</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* 7. SECURITY & PASSWORD */}
      {adminTab === 'security' && (
        <form
          onSubmit={handleChangePassword}
          className="p-4.5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3.5"
        >
          <h3 className="text-sm font-bold text-white">{t.admin.changePasswordTitle}</h3>

          <div>
            <label className="block text-xs text-slate-400 mb-1">{t.admin.newPassword}</label>
            <input
              type="password"
              required
              placeholder="Минимум 6 символов"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <button
            type="submit"
            disabled={newPassword.length < 6}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs disabled:opacity-50"
          >
            {t.admin.savePassword}
          </button>
        </form>
      )}

      {/* RECEIPT ZOOM MODAL */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedReceipt(null)}
        >
          <div className="relative max-w-sm max-h-[85vh] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 p-2 shadow-2xl">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/80 text-white z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedReceipt}
              alt="Чек крупно"
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

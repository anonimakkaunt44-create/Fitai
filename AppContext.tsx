import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Language, AppTab, DailyActivity } from '../types';
import { translations } from '../i18n/translations';
import { persistentStorage } from '../utils/persistentStorage';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        themeParams?: {
          bg_color?: string;
          text_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
      };
    };
  }
}

interface AppContextType {
  user: User | null;
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: typeof translations.ru;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  token: string | null;
  loading: boolean;
  isPremium: boolean;
  premiumUntilFormatted: string;
  paywallOpen: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
  paymentOpen: boolean;
  selectedPlanId: '1month' | '3months' | '1year';
  openPayment: (planId?: '1month' | '3months' | '1year') => void;
  closePayment: () => void;
  onboardingOpen: boolean;
  setOnboardingOpen: (open: boolean) => void;
  todayActivity: DailyActivity | null;
  addWater: (amountMl?: number) => Promise<void>;
  refreshUser: () => Promise<void>;
  haptic: (type?: 'light' | 'medium' | 'success') => void;
  showToast: (msg: string) => void;
  toastMessage: string | null;
  switchDemoUser: (id: string, name: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('fitai_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [language, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('fitai_lang') as Language) || 'ru';
  });
  const [activeTab, setActiveTabState] = useState<AppTab>('home');
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('fitai_token'));
  const [loading, setLoading] = useState(true);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<'1month' | '3months' | '1year'>('1month');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [todayActivity, setTodayActivity] = useState<DailyActivity | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = translations[language] || translations.ru;

  const haptic = (type: 'light' | 'medium' | 'success' = 'light') => {
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        if (type === 'success') {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        } else {
          window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
        }
      }
    } catch {
      // ignore
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Initialize Telegram WebApp & Auth
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      } catch {
        // ignore
      }
    }
    initAuth();
  }, []);

  const initAuth = async (simulatedUser?: any) => {
    setLoading(true);
    try {
      const [
        storedToken,
        storedTelegramId,
        storedOnboarded,
        storedIsPremium,
        storedPremiumUntil,
        storedSettings,
        storedPayments,
      ] = await Promise.all([
        persistentStorage.getItem('fitai_token'),
        persistentStorage.getItem('fitai_telegram_id'),
        persistentStorage.getItem('fitai_onboarded'),
        persistentStorage.getItem('fitai_is_premium'),
        persistentStorage.getItem('fitai_premium_until'),
        persistentStorage.getItem('fitai_admin_payment_settings'),
        persistentStorage.getItem('fitai_my_payments'),
      ]);

      const savedToken = token || storedToken || localStorage.getItem('fitai_token');
      const savedTelegramId = storedTelegramId || localStorage.getItem('fitai_telegram_id');
      const savedOnboarded = storedOnboarded || localStorage.getItem('fitai_onboarded');
      const savedIsPremium = storedIsPremium || localStorage.getItem('fitai_is_premium');
      const savedPremiumUntil = storedPremiumUntil || localStorage.getItem('fitai_premium_until');

      let parsedSettings = undefined;
      try {
        if (storedSettings) parsedSettings = JSON.parse(storedSettings);
      } catch {}

      let parsedPayments = undefined;
      try {
        if (storedPayments) parsedPayments = JSON.parse(storedPayments);
      } catch {}

      const clientState = {
        isPremium: savedIsPremium === 'true',
        premiumUntil: savedPremiumUntil || undefined,
        onboardingCompleted: savedOnboarded === 'true',
        cachedPaymentSettings: parsedSettings,
        myPayments: parsedPayments,
      };

      // 1. If we already have a saved token, verify it first with /api/user/me
      if (savedToken && !simulatedUser) {
        try {
          const checkRes = await fetch('/api/user/me', {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          const checkData = await checkRes.json();
          if (checkData.ok && checkData.user) {
            const resolvedUser = { ...checkData.user };
            if (resolvedUser.isAdmin) {
              resolvedUser.isPremium = true;
              resolvedUser.onboardingCompleted = true;
            } else if (savedIsPremium === 'true' && !resolvedUser.isPremium) {
              resolvedUser.isPremium = true;
              if (savedPremiumUntil) resolvedUser.premiumUntil = savedPremiumUntil;
            }

            setUser(resolvedUser);
            setToken(savedToken);

            await Promise.all([
              persistentStorage.setItem('fitai_token', savedToken),
              persistentStorage.setItem('fitai_cached_user', JSON.stringify(resolvedUser)),
              persistentStorage.setItem('fitai_telegram_id', resolvedUser.telegramId),
              persistentStorage.setItem('fitai_user_id', resolvedUser.id),
            ]);

            const isAlreadyOnboarded = Boolean(
              resolvedUser.onboardingCompleted ||
              resolvedUser.isAdmin ||
              savedOnboarded === 'true' ||
              localStorage.getItem('fitai_onboarded') === 'true' ||
              localStorage.getItem('fitai_onboarded_' + resolvedUser.id) === 'true' ||
              localStorage.getItem('fitai_onboarded_' + resolvedUser.telegramId) === 'true'
            );

            if (isAlreadyOnboarded) {
              setOnboardingOpen(false);
              await persistentStorage.setItem('fitai_onboarded', 'true');
              await persistentStorage.setItem('fitai_onboarded_' + resolvedUser.telegramId, 'true');
            } else {
              setOnboardingOpen(true);
            }

            if (checkData.todayActivity) {
              setTodayActivity(checkData.todayActivity);
            } else {
              await fetchTodayActivity(savedToken);
            }
            setLoading(false);
            return;
          }
        } catch {
          // Token verification failed or server temporarily unavailable, proceed with auth
        }
      }

      // 2. Perform authentication with Telegram initData or fallback
      const initData = window.Telegram?.WebApp?.initData || '';
      const telegramUnsafe = window.Telegram?.WebApp?.initDataUnsafe?.user;

      const payload = {
        initData,
        existingToken: savedToken,
        savedTelegramId,
        clientState,
        simulatedUser: simulatedUser || (telegramUnsafe ? {
          id: telegramUnsafe.id,
          first_name: telegramUnsafe.first_name,
          last_name: telegramUnsafe.last_name,
          username: telegramUnsafe.username,
          language_code: telegramUnsafe.language_code,
        } : undefined),
      };

      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok && data.user) {
        const resolvedUser = { ...data.user };
        if (resolvedUser.isAdmin) {
          resolvedUser.isPremium = true;
          resolvedUser.onboardingCompleted = true;
        } else if (savedIsPremium === 'true' && !resolvedUser.isPremium) {
          resolvedUser.isPremium = true;
          if (savedPremiumUntil) resolvedUser.premiumUntil = savedPremiumUntil;
        }

        setUser(resolvedUser);
        setToken(data.token);

        await Promise.all([
          persistentStorage.setItem('fitai_token', data.token),
          persistentStorage.setItem('fitai_cached_user', JSON.stringify(resolvedUser)),
          persistentStorage.setItem('fitai_telegram_id', resolvedUser.telegramId),
          persistentStorage.setItem('fitai_user_id', resolvedUser.id),
        ]);

        if (resolvedUser.isPremium) {
          await persistentStorage.setItem('fitai_is_premium', 'true');
          if (resolvedUser.premiumUntil) {
            await persistentStorage.setItem('fitai_premium_until', resolvedUser.premiumUntil);
          }
        }

        if (data.user.language) {
          setLangState(data.user.language);
          localStorage.setItem('fitai_lang', data.user.language);
        }

        const isAlreadyOnboarded = Boolean(
          resolvedUser.onboardingCompleted ||
          resolvedUser.isAdmin ||
          savedOnboarded === 'true' ||
          localStorage.getItem('fitai_onboarded') === 'true' ||
          localStorage.getItem('fitai_onboarded_' + resolvedUser.id) === 'true' ||
          localStorage.getItem('fitai_onboarded_' + resolvedUser.telegramId) === 'true'
        );

        if (isAlreadyOnboarded) {
          setOnboardingOpen(false);
          await persistentStorage.setItem('fitai_onboarded', 'true');
          await persistentStorage.setItem('fitai_onboarded_' + resolvedUser.telegramId, 'true');
        } else {
          setOnboardingOpen(true);
        }

        // Fetch today's activity
        await fetchTodayActivity(data.token);
      }
    } catch (err) {
      console.error('Initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayActivity = async (authToken?: string) => {
    const tkn = authToken || token || (await persistentStorage.getItem('fitai_token')) || localStorage.getItem('fitai_token');
    if (!tkn) return;
    try {
      const res = await fetch('/api/activity/today', {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      const data = await res.json();
      if (data.ok) {
        setTodayActivity(data.activity);
      }
    } catch (err) {
      console.error('Error fetching today activity:', err);
    }
  };

  const refreshUser = async () => {
    const currentToken = token || (await persistentStorage.getItem('fitai_token')) || localStorage.getItem('fitai_token');
    if (!currentToken) return;
    try {
      const res = await fetch('/api/user/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await res.json();
      if (data.ok && data.user) {
        const resolvedUser = { ...data.user };
        if (resolvedUser.isAdmin) {
          resolvedUser.isPremium = true;
          resolvedUser.onboardingCompleted = true;
        }
        setUser(resolvedUser);
        await Promise.all([
          persistentStorage.setItem('fitai_cached_user', JSON.stringify(resolvedUser)),
          persistentStorage.setItem('fitai_telegram_id', resolvedUser.telegramId),
        ]);
        if (resolvedUser.isPremium) {
          await persistentStorage.setItem('fitai_is_premium', 'true');
          if (resolvedUser.premiumUntil) {
            await persistentStorage.setItem('fitai_premium_until', resolvedUser.premiumUntil);
          }
        }
        if (resolvedUser.onboardingCompleted) {
          await persistentStorage.setItem('fitai_onboarded', 'true');
          await persistentStorage.setItem('fitai_onboarded_' + resolvedUser.id, 'true');
          await persistentStorage.setItem('fitai_onboarded_' + resolvedUser.telegramId, 'true');
        }
        if (data.todayActivity) {
          setTodayActivity(data.todayActivity);
        }
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  };

  const setLanguage = async (newLang: Language) => {
    haptic('light');
    setLangState(newLang);
    localStorage.setItem('fitai_lang', newLang);
    if (token) {
      try {
        await fetch('/api/user/language', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ language: newLang }),
        });
      } catch {
        // ignore
      }
    }
  };

  const setActiveTab = (tab: AppTab) => {
    haptic('light');
    setActiveTabState(tab);
  };

  const addWater = async (amountMl = 250) => {
    haptic('medium');
    if (!token) return;
    try {
      const res = await fetch('/api/activity/water', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amountMl }),
      });
      const data = await res.json();
      if (data.ok && data.activity) {
        setTodayActivity(data.activity);
        showToast(`+${amountMl} ml 💧`);
      }
    } catch {
      // ignore
    }
  };

  const isPremium = Boolean(
    user?.isPremium && (!user?.premiumUntil || new Date(user.premiumUntil).getTime() > Date.now())
  );

  const premiumUntilFormatted = user?.premiumUntil
    ? new Date(user.premiumUntil).toLocaleDateString(language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US')
    : '';

  const openPaywall = () => {
    haptic('medium');
    setPaywallOpen(true);
  };

  const closePaywall = () => setPaywallOpen(false);

  const openPayment = (planId: '1month' | '3months' | '1year' = '1month') => {
    haptic('medium');
    setSelectedPlanId(planId);
    setPaywallOpen(false);
    setPaymentOpen(true);
  };

  const closePayment = () => setPaymentOpen(false);

  const switchDemoUser = async (id: string, name: string) => {
    await initAuth({ id, first_name: name });
  };

  return (
    <AppContext.Provider
      value={{
        user,
        language,
        setLanguage,
        t,
        activeTab,
        setActiveTab,
        token,
        loading,
        isPremium,
        premiumUntilFormatted,
        paywallOpen,
        openPaywall,
        closePaywall,
        paymentOpen,
        selectedPlanId,
        openPayment,
        closePayment,
        onboardingOpen,
        setOnboardingOpen,
        todayActivity,
        addWater,
        refreshUser,
        haptic,
        showToast,
        toastMessage,
        switchDemoUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
};

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Heart,
  Baby,
  Utensils,
  ShoppingCart,
  Wallet,
  Clock,
  Camera,
  Sparkles,
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sliders,
  DollarSign,
  AlertCircle,
  Info,
  Check,
  Star,
  Users,
  Smile,
  Shield,
  Send,
  Upload,
  Crown,
  Lock,
  ArrowRight,
} from 'lucide-react';
import {
  MomDinnerIdea,
  MomChildActivity,
  MomFamilyMenu,
  MomShoppingList,
  MomBudgetPlan,
  MomQuickRecipe,
  MomFoodPhoto,
  MomWhatToCook,
  MomDayPlan,
} from '../types';

type MomSubTab =
  | 'dayPlan'
  | 'dinner'
  | 'whatToCook'
  | 'quick'
  | 'activities'
  | 'familyMenu'
  | 'shopping'
  | 'budget'
  | 'photo';

export const MomTab: React.FC = () => {
  const { user, token, isPremium, openPaywall, showToast, refreshUserData } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<MomSubTab>('dayPlan');
  const [loading, setLoading] = useState(false);

  // Settings & Profile
  const [showSettings, setShowSettings] = useState(false);
  const [isMomMode, setIsMomMode] = useState<boolean>(user?.profile?.isMomMode ?? true);
  const [childAge, setChildAge] = useState<string>(user?.profile?.childAge || '3-4 года');
  const [familyMembersCount, setFamilyMembersCount] = useState<number>(user?.profile?.familyMembersCount || 3);
  const [maxWeeklyBudget, setMaxWeeklyBudget] = useState<number>(user?.profile?.maxWeeklyBudget || 450000);

  // 1. Dinner Ideas State
  const [dinnerProducts, setDinnerProducts] = useState('');
  const [dinnerPortions, setDinnerPortions] = useState(familyMembersCount);
  const [dinnerIdeas, setDinnerIdeas] = useState<MomDinnerIdea[]>([]);
  const [expandedDinnerId, setExpandedDinnerId] = useState<string | null>(null);

  // 2. Child Activities State
  const [activityCategory, setActivityCategory] = useState<'movement' | 'development' | 'calm'>('movement');
  const [activityLocation, setActivityLocation] = useState<'home' | 'outdoor'>('home');
  const [activityDuration, setActivityDuration] = useState<number>(20);
  const [activities, setActivities] = useState<MomChildActivity[]>([]);

  // 3. Family Menu State
  const [menuMealType, setMenuMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'all_day'>('dinner');
  const [familyMenus, setFamilyMenus] = useState<MomFamilyMenu[]>([]);

  // 4. Weekly Shopping State
  const [shoppingList, setShoppingList] = useState<MomShoppingList | null>(null);

  // 5. Budget State
  const [budgetPlan, setBudgetPlan] = useState<MomBudgetPlan | null>(null);

  // 6. Quick Recipes State
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<10 | 15 | 20 | 30>(15);
  const [quickRecipes, setQuickRecipes] = useState<MomQuickRecipe[]>([]);

  // 7. Food Photo State
  const [photoAnalysis, setPhotoAnalysis] = useState<MomFoodPhoto | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 8. What to Cook Today State
  const [instantDecision, setInstantDecision] = useState<MomWhatToCook | null>(null);
  const [fridgeLeftovers, setFridgeLeftovers] = useState('');

  // 9. Day Plan State
  const [todayDayPlan, setTodayDayPlan] = useState<MomDayPlan | null>(null);

  // Initial load
  useEffect(() => {
    if (!token || !isPremium) return;

    // Load initial Mom data
    fetch('/api/mom/day-plan/today', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.dayPlan) setTodayDayPlan(d.dayPlan);
      })
      .catch(() => {});

    fetch('/api/mom/dinner-ideas', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.ideas) setDinnerIdeas(d.ideas);
      })
      .catch(() => {});

    fetch('/api/mom/child-activities', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.activities) setActivities(d.activities);
      })
      .catch(() => {});

    fetch('/api/mom/family-menu', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.menus) setFamilyMenus(d.menus);
      })
      .catch(() => {});

    fetch('/api/mom/shopping', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.shoppingList) setShoppingList(d.shoppingList);
      })
      .catch(() => {});

    fetch('/api/mom/budget', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.budgetPlan) setBudgetPlan(d.budgetPlan);
      })
      .catch(() => {});

    fetch(`/api/mom/quick-recipes?time=${selectedTimeFilter}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.recipes) setQuickRecipes(d.recipes);
      })
      .catch(() => {});
  }, [token, isPremium]);

  // Save Mom Profile Settings
  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mom/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isMomMode,
          childAge,
          familyMembersCount,
          maxWeeklyBudget,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Настройки для мам успешно сохранены!');
        setShowSettings(false);
        refreshUserData();
      } else if (data.require_premium) {
        openPaywall();
        showToast(data.message || 'Требуется подписка FitAI Premium');
      } else {
        showToast(data.error || 'Ошибка при сохранении');
      }
    } catch {
      showToast('Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  // 1. Generate Dinner Ideas
  const handleGenerateDinner = async () => {
    if (!dinnerProducts.trim()) {
      showToast('Укажите продукты, которые есть дома');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/mom/dinner-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productsText: dinnerProducts,
          portions: dinnerPortions,
          budgetUZS: maxWeeklyBudget,
        }),
      });
      const data = await res.json();
      if (data.ok && data.ideas) {
        setDinnerIdeas(data.ideas);
        showToast('Идеи ужина успешно сгенерированы!');
        if (data.ideas.length > 0) setExpandedDinnerId(data.ideas[0].id);
      } else {
        showToast(data.error || 'Ошибка генерации');
      }
    } catch {
      showToast('Ошибка при запросе к AI');
    } finally {
      setLoading(false);
    }
  };

  // 2. Generate Child Activities
  const handleGenerateActivities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mom/child-activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ageGroup: childAge,
          durationMinutes: activityDuration,
          location: activityLocation,
          category: activityCategory,
        }),
      });
      const data = await res.json();
      if (data.ok && data.activities) {
        setActivities(data.activities);
        showToast('Новые активности созданы!');
      } else {
        showToast(data.error || 'Ошибка');
      }
    } catch {
      showToast('Ошибка при запросе к AI');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivity = async (id: string) => {
    try {
      const res = await fetch(`/api/mom/child-activities/${id}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && data.activity) {
        setActivities((prev) =>
          prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a))
        );
      }
    } catch {
      // ignore
    }
  };

  // 3. Generate Family Menu
  const handleGenerateFamilyMenu = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mom/family-menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mealType: menuMealType,
          familySize: familyMembersCount,
        }),
      });
      const data = await res.json();
      if (data.ok && data.menu) {
        setFamilyMenus((prev) => [data.menu, ...prev]);
        showToast('Семейное меню готово!');
      } else {
        showToast(data.error || 'Ошибка');
      }
    } catch {
      showToast('Ошибка при генерации меню');
    } finally {
      setLoading(false);
    }
  };

  // 4. Generate Weekly Shopping
  const handleGenerateShopping = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mom/shopping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          familyMembersCount,
          budgetUZS: maxWeeklyBudget,
        }),
      });
      const data = await res.json();
      if (data.ok && data.shoppingList) {
        setShoppingList(data.shoppingList);
        showToast('Список покупок обновлен!');
      } else {
        showToast(data.error || 'Ошибка');
      }
    } catch {
      showToast('Ошибка генерации списка');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShoppingItem = async (itemId: string) => {
    try {
      const res = await fetch('/api/mom/shopping/toggle', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (data.ok && data.shoppingList) {
        setShoppingList(data.shoppingList);
      }
    } catch {
      // ignore
    }
  };

  // 5. Optimize Budget
  const handleOptimizeBudget = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mom/budget/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          maxWeeklyBudget,
          maxMonthlyBudget: maxWeeklyBudget * 4,
        }),
      });
      const data = await res.json();
      if (data.ok && data.budgetPlan) {
        setBudgetPlan(data.budgetPlan);
        showToast('Бюджет успешно оптимизирован!');
      } else {
        showToast(data.error || 'Ошибка');
      }
    } catch {
      showToast('Ошибка оптимизации бюджета');
    } finally {
      setLoading(false);
    }
  };

  // 6. Quick Recipes
  const handleLoadQuickRecipes = async (time: 10 | 15 | 20 | 30) => {
    setSelectedTimeFilter(time);
    try {
      setLoading(true);
      const res = await fetch(`/api/mom/quick-recipes?time=${time}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && data.recipes && data.recipes.length > 0) {
        setQuickRecipes(data.recipes);
      } else {
        // Generate new if none
        const genRes = await fetch('/api/mom/quick-recipes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ timeMinutes: time }),
        });
        const genData = await genRes.json();
        if (genData.ok && genData.recipes) {
          setQuickRecipes(genData.recipes);
        }
      }
    } catch {
      showToast('Ошибка при загрузке рецептов');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavoriteRecipe = async (id: string) => {
    try {
      const res = await fetch(`/api/mom/quick-recipes/${id}/favorite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && data.recipe) {
        setQuickRecipes((prev) =>
          prev.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
        );
      }
    } catch {
      // ignore
    }
  };

  // 7. Food Photo Analysis
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPhotoPreview(base64);

      try {
        setLoading(true);
        const res = await fetch('/api/mom/food-photo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.type || 'image/jpeg',
          }),
        });
        const data = await res.json();
        if (data.ok && data.analysis) {
          setPhotoAnalysis(data.analysis);
          showToast('Блюдо распознано!');
        } else {
          showToast(data.error || 'Не удалось распознать фото');
        }
      } catch {
        showToast('Ошибка при анализе фотографии');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // 8. What to Cook Today
  const handleWhatToCook = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mom/what-to-cook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mealType: 'dinner',
          availableTimeMinutes: 20,
          fridgeProducts: fridgeLeftovers,
        }),
      });
      const data = await res.json();
      if (data.ok && data.decision) {
        setInstantDecision(data.decision);
        showToast('Решение найдено!');
      } else {
        showToast(data.error || 'Ошибка');
      }
    } catch {
      showToast('Ошибка запроса');
    } finally {
      setLoading(false);
    }
  };

  // 9. Day Plan
  const handleGenerateDayPlan = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mom/day-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          childAge,
          familySize: familyMembersCount,
        }),
      });
      const data = await res.json();
      if (data.ok && data.dayPlan) {
        setTodayDayPlan(data.dayPlan);
        showToast('Семейный план на день сформирован!');
      } else {
        showToast(data.error || 'Ошибка');
      }
    } catch {
      showToast('Ошибка генерации плана');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDayPlanItem = async (itemId: string) => {
    try {
      const res = await fetch('/api/mom/day-plan/toggle-item', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (data.ok && data.dayPlan) {
        setTodayDayPlan(data.dayPlan);
      }
    } catch {
      // ignore
    }
  };

  // Sub-navigation bar items
  const subNavItems: { id: MomSubTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dayPlan', label: 'План на день', icon: Calendar },
    { id: 'dinner', label: 'Ужин дома', icon: Utensils },
    { id: 'whatToCook', label: 'Что готовить?', icon: Sparkles },
    { id: 'quick', label: '10-30 минут', icon: Clock },
    { id: 'activities', label: 'Дети и игры', icon: Baby },
    { id: 'familyMenu', label: 'Семья + Мама', icon: Heart },
    { id: 'shopping', label: 'Покупки', icon: ShoppingCart },
    { id: 'budget', label: 'Бюджет', icon: Wallet },
    { id: 'photo', label: 'Фото блюда', icon: Camera },
  ];

  if (!isPremium) {
    return (
      <div className="max-w-md mx-auto px-4 py-6 space-y-5 pb-28 text-white animate-fade-in">
        {/* Header Promo Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-950/90 via-slate-900 to-amber-950/80 border border-rose-500/40 p-5 shadow-2xl text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-black tracking-wide uppercase mb-3">
            <Crown className="w-3.5 h-3.5 fill-amber-300" />
            FitAI Premium
          </div>

          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-500 to-amber-400 text-slate-950 flex items-center justify-center font-black mx-auto mb-3 shadow-lg shadow-rose-500/30">
            <Baby className="w-8 h-8 text-slate-950" />
          </div>

          <h2 className="text-xl font-black text-white tracking-tight">
            Раздел «Для мам»
          </h2>
          <p className="text-xs text-rose-200/90 mt-1.5 leading-relaxed max-w-xs mx-auto">
            Специальный AI-модуль для мам: баланс заботы о фигуре, вкусного питания семьи и развивающих игр с ребёнком.
          </p>
        </div>

        {/* Benefits List */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4.5 space-y-3.5 shadow-xl">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Что входит в раздел:
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">1. Ужин из того, что есть в холодильнике</span>
                <span className="text-slate-400 leading-snug">
                  Напишите продукты или сфотографируйте полку — AI выдаст пошаговые рецепты с КБЖУ за секунды.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Baby className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">2. Безопасные активности и игры с детьми</span>
                <span className="text-slate-400 leading-snug">
                  Развивающие и подвижные игры дома и на улице с таймером и мерами безопасности.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 mt-0.5">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">3. Меню «Семья + Мама» без готовки в 3 кастрюли</span>
                <span className="text-slate-400 leading-snug">
                  Одно базовое блюдо: легкая порция для мамы под норму калорий, сытная порция для мужа и детей.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">4. Экспресс-рецепты за 10–30 минут</span>
                <span className="text-slate-400 leading-snug">
                  Проверенные спасительные блюда, когда совсем нет времени и сил на готовку.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">5. Умный список покупок и оптимизация бюджета</span>
                <span className="text-slate-400 leading-snug">
                  Готовый список по отделам магазина с расчетом стоимости в UZS и экономией до 30%.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">6. Интерактивный семейный распорядок дня</span>
                <span className="text-slate-400 leading-snug">
                  Четкий план питания, сна, прогулок и обязательное время для отдыха самой мамы.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Security / Guarantee note */}
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Входит в единую подписку FitAI Premium вместе с AI-тренером 24/7 и подсчетом калорий по фото.
          </span>
        </div>

        {/* Primary CTA Button */}
        <button
          onClick={openPaywall}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-rose-400 to-amber-300 text-slate-950 font-black text-sm shadow-xl shadow-rose-500/25 flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer"
        >
          <Crown className="w-5 h-5 fill-slate-950" />
          <span>Оформить FitAI Premium</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-24 text-white">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-950/80 via-slate-900 to-amber-950/60 border border-rose-500/30 p-4.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-rose-500/20">
              <Baby className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">FitAI «Для мам»</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  СЕМЬЯ
                </span>
              </div>
              <p className="text-xs text-rose-200/80">
                Худеем без стресса, готовим для семьи и радуем детей
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 text-rose-300 transition"
            title="Настройки профиля мамы"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>

        {/* Quick parameters pill */}
        <div className="mt-3 pt-3 border-t border-rose-500/20 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <Baby className="w-3.5 h-3.5 text-rose-400" />
            <span>Ребёнок: <strong className="text-white">{childAge}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Семья: <strong className="text-white">{familyMembersCount} чел.</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span>{(maxWeeklyBudget / 1000).toLocaleString()}k сум/нед</span>
          </div>
        </div>
      </div>

      {/* Settings Accordion */}
      {showSettings && (
        <div className="rounded-3xl bg-slate-900 border border-rose-500/30 p-4 space-y-3.5 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              <span>Параметры профиля мамы</span>
            </h3>
            <span className="text-[11px] text-slate-400">Автоподбор рецептов и игр</span>
          </div>

          {/* Child age selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">Возраст ребёнка:</label>
            <div className="grid grid-cols-3 gap-1.5">
              {['1-2 года', '3-4 года', '5-6 лет', '7-9 лет', '10+ лет', 'Несколько'].map((age) => (
                <button
                  key={age}
                  onClick={() => setChildAge(age)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition ${
                    childAge === age
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {age}
                </button>
              ))}
            </div>
          </div>

          {/* Family members count */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">Количество человек в семье:</label>
            <div className="grid grid-cols-4 gap-2">
              {[2, 3, 4, 5].map((cnt) => (
                <button
                  key={cnt}
                  onClick={() => {
                    setFamilyMembersCount(cnt);
                    setDinnerPortions(cnt);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition ${
                    familyMembersCount === cnt
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {cnt} {cnt >= 5 ? 'и более' : 'чел.'}
                </button>
              ))}
            </div>
          </div>

          {/* Budget slider / options */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Недельный бюджет на питание (UZS):</span>
              <span className="text-emerald-400 font-bold">{maxWeeklyBudget.toLocaleString()} сум</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[350000, 450000, 650000].map((b) => (
                <button
                  key={b}
                  onClick={() => setMaxWeeklyBudget(b)}
                  className={`py-1.5 rounded-xl text-[11px] font-bold border ${
                    maxWeeklyBudget === b
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {(b / 1000).toLocaleString()}k сум
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-rose-500/20 active:scale-95 transition"
          >
            {loading ? 'Сохранение...' : 'Сохранить параметры'}
          </button>
        </div>
      )}

      {/* Horizontal Scrollable Feature Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {subNavItems.map((item) => {
          const isActive = activeSubTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSubTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/25 scale-[1.02]'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================
          1. 📅 Семейный план на день (Day Plan)
          ======================================================== */}
      {activeSubTab === 'dayPlan' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4.5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-rose-400" />
                  <span>Семейный план на день</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Питание мамы, блюда семьи и развивающие игры
                </p>
              </div>

              <button
                onClick={handleGenerateDayPlan}
                disabled={loading}
                className="py-1.5 px-3 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold hover:bg-rose-500/30 flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Генерация...' : 'Обновить'}</span>
              </button>
            </div>

            {todayDayPlan ? (
              <div className="space-y-3 pt-2">
                {/* Meals Grid */}
                <div className="space-y-2">
                  {[
                    { label: 'Завтрак', data: todayDayPlan.breakfast, color: 'text-amber-400' },
                    { label: 'Обед', data: todayDayPlan.lunch, color: 'text-emerald-400' },
                    { label: 'Ужин', data: todayDayPlan.dinner, color: 'text-rose-400' },
                    { label: 'Перекус', data: todayDayPlan.snack, color: 'text-teal-400' },
                  ].map((meal, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-black ${meal.color}`}>{meal.label}</span>
                        <span className="font-bold text-slate-400">{meal.data.momCal} ккал для мамы</span>
                      </div>
                      <div className="text-xs font-bold text-white">{meal.data.dish}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Users className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span>Семье: {meal.data.familyTip}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Child Activity of the Day */}
                {todayDayPlan.childActivity && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/40 to-slate-950 border border-rose-500/30 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-rose-300 flex items-center gap-1.5">
                        <Baby className="w-4 h-4 text-rose-400" />
                        <span>Игра дня с ребёнком ({childAge})</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                        {todayDayPlan.childActivity.duration}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white">{todayDayPlan.childActivity.title}</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {todayDayPlan.childActivity.desc}
                    </p>
                  </div>
                )}

                {/* Quick Shopping Checklist */}
                {todayDayPlan.shoppingChecklist && todayDayPlan.shoppingChecklist.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Что докупить сегодня:
                    </h4>
                    <div className="space-y-1">
                      {todayDayPlan.shoppingChecklist.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleToggleDayPlanItem(item.id)}
                          className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:bg-slate-800/50 transition"
                        >
                          {item.done ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          )}
                          <span
                            className={`text-xs ${
                              item.done ? 'line-through text-slate-500' : 'text-slate-200'
                            }`}
                          >
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <Calendar className="w-10 h-10 text-rose-400/50 mx-auto" />
                <p className="text-xs text-slate-400">
                  План на сегодня еще не сформирован. Нажмите кнопку ниже, чтобы AI составил персональный план дня для вас и ребёнка.
                </p>
                <button
                  onClick={handleGenerateDayPlan}
                  disabled={loading}
                  className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-rose-500/25 active:scale-95 transition"
                >
                  {loading ? 'Создаем план...' : 'Сформировать план на день'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          2. 🍽 Идеи ужина из того, что есть дома (Dinner)
          ======================================================== */}
      {activeSubTab === 'dinner' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4.5 space-y-3.5 shadow-xl">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-400" />
                <span>Идеи ужина из того, что есть дома</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Напишите список продуктов, и AI предложит сбалансированные блюда для всей семьи
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Что есть в холодильнике и шкафу:
              </label>
              <textarea
                value={dinnerProducts}
                onChange={(e) => setDinnerProducts(e.target.value)}
                placeholder="Например: куриное филе, кабачок, рис, яйца, лук, сыр сулугуни, немного сметаны..."
                rows={3}
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Количество порций:</label>
                <div className="flex items-center gap-1">
                  {[2, 3, 4, 5].map((p) => (
                    <button
                      key={p}
                      onClick={() => setDinnerPortions(p)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${
                        dinnerPortions === p
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Бюджет & цель:</label>
                <div className="py-1.5 px-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-emerald-400 font-bold truncate">
                  Похудение + Экономия
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateDinner}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 font-black text-xs shadow-md shadow-rose-500/20 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'AI готовит идеи ужина...' : 'Предложить варианты ужина'}</span>
            </button>
          </div>

          {/* Dinner Ideas List */}
          {dinnerIdeas.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Варианты ужина ({dinnerIdeas.length}):
              </h4>

              {dinnerIdeas.map((idea) => {
                const isExpanded = expandedDinnerId === idea.id;
                return (
                  <div
                    key={idea.id}
                    className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg transition"
                  >
                    <div
                      onClick={() => setExpandedDinnerId(isExpanded ? null : idea.id)}
                      className="p-4 cursor-pointer hover:bg-slate-800/40 flex items-start justify-between gap-3 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-white">{idea.title}</h4>
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-amber-300">
                            {idea.prepTime}
                          </span>
                        </div>

                        {/* Macros Pill */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-extrabold text-emerald-400">{idea.calories} ккал</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">Порция: {idea.portionGrams}г</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">Б: {idea.proteins}г | Ж: {idea.fats}г | У: {idea.carbs}г</span>
                        </div>
                      </div>

                      <div className="p-1 rounded-lg bg-slate-800 text-slate-300">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 space-y-3 animate-in fade-in">
                        {idea.forMomTip && (
                          <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200">
                            <strong>Лайфхак для мамы:</strong> {idea.forMomTip}
                          </div>
                        )}

                        {/* Ingredients */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            Ингредиенты и граммовки:
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {idea.ingredients.map((ing, i) => (
                              <div key={i} className="text-xs text-slate-300 p-1.5 rounded-xl bg-slate-950 border border-slate-800">
                                {ing}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Steps */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            Пошаговое приготовление:
                          </span>
                          <ol className="space-y-1.5">
                            {idea.steps.map((st, i) => (
                              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                                <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                                  {i + 1}
                                </span>
                                <span className="pt-0.5">{st}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          3. ❤️ «Что приготовить сегодня?» (Quick Decision)
          ======================================================== */}
      {activeSubTab === 'whatToCook' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4.5 space-y-3.5 shadow-xl">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span>«Что приготовить сегодня?»</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Устали думать, что приготовить? AI сделает мгновенный выбор под время и семью!
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Что осталось в холодильнике (необязательно):
              </label>
              <input
                type="text"
                value={fridgeLeftovers}
                onChange={(e) => setFridgeLeftovers(e.target.value)}
                placeholder="Например: яйца, помидоры, сыр, вчерашняя гречка..."
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
              />
            </div>

            <button
              onClick={handleWhatToCook}
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-rose-500/25 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'AI выбирает лучшее блюдо...' : 'Принять решение за 1 клик'}</span>
            </button>
          </div>

          {instantDecision && (
            <div className="rounded-3xl bg-gradient-to-br from-rose-950/60 via-slate-900 to-slate-950 border border-rose-500/40 p-4.5 space-y-3.5 shadow-xl animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-bold border border-rose-500/30">
                  Выбор шеф-AI FitAI
                </span>
                <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {instantDecision.timeMinutes} минут
                </span>
              </div>

              <div>
                <h4 className="text-base font-black text-white">{instantDecision.dish}</h4>
                <p className="text-xs text-emerald-400 font-bold mt-0.5">
                  {instantDecision.calories} ккал • {instantDecision.whyItFitsGoal}
                </p>
              </div>

              {/* Ingredients */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Продукты:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {instantDecision.ingredients.map((ing, idx) => (
                    <div key={idx} className="text-xs text-slate-200 p-2 rounded-xl bg-slate-950 border border-slate-800">
                      {ing}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Как быстро приготовить:
                </span>
                <ol className="space-y-1.5">
                  {instantDecision.instructions.map((inst, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-rose-500 text-slate-950 font-black flex items-center justify-center flex-shrink-0 text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="pt-0.5">{inst}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          4. ⏱ Быстрые рецепты для мам (10 / 15 / 20 / 30 мин)
          ======================================================== */}
      {activeSubTab === 'quick' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4.5 space-y-3 shadow-xl">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                <span>Быстрые рецепты для мам</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Минимум грязной посуды, простые ингредиенты и максимум пользы
              </p>
            </div>

            {/* Time Filter Pills */}
            <div className="grid grid-cols-4 gap-1.5">
              {([10, 15, 20, 30] as const).map((mins) => (
                <button
                  key={mins}
                  onClick={() => handleLoadQuickRecipes(mins)}
                  className={`py-2 rounded-xl text-xs font-black border transition ${
                    selectedTimeFilter === mins
                      ? 'bg-teal-500 text-slate-950 border-teal-500 shadow-md shadow-teal-500/20'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white'
                  }`}
                >
                  ⏱ {mins} мин
                </button>
              ))}
            </div>
          </div>

          {/* Quick Recipes Cards */}
          <div className="space-y-3">
            {quickRecipes.map((r) => (
              <div
                key={r.id}
                className="rounded-3xl bg-slate-900 border border-slate-800 p-4 space-y-3 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-white">{r.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-black text-teal-400">{r.timeMinutes} мин</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-emerald-400 font-bold">{r.calories} ккал</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">{r.ingredientsCount || r.ingredients.length} ингред.</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleFavoriteRecipe(r.id)}
                    className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 transition"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        r.isFavorite ? 'fill-rose-500 text-rose-500' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Ingredients chips */}
                <div className="flex flex-wrap gap-1.5">
                  {r.ingredients.map((ing, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300"
                    >
                      {ing}
                    </span>
                  ))}
                </div>

                {/* Steps */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  {r.steps.map((st, i) => (
                    <div key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                      <span className="text-teal-400 font-bold">{i + 1}.</span>
                      <span>{st}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          5. 👶 Активности для ребёнка (Activities)
          ======================================================== */}
      {activeSubTab === 'activities' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4.5 space-y-3.5 shadow-xl">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Baby className="w-4 h-4 text-rose-400" />
                <span>Активности и игры для ребёнка</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Безопасные игры для возраста: <strong className="text-rose-300">{childAge}</strong>
              </p>
            </div>

            {/* Category tabs */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'movement', label: 'Подвижные' },
                { id: 'development', label: 'Развивающие' },
                { id: 'calm', label: 'Спокойные' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActivityCategory(c.id as any)}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition ${
                    activityCategory === c.id
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Location & Duration */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex rounded-xl bg-slate-950 border border-slate-800 p-0.5">
                <button
                  onClick={() => setActivityLocation('home')}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                    activityLocation === 'home' ? 'bg-slate-800 text-white' : 'text-slate-400'
                  }`}
                >
                  Дома
                </button>
                <button
                  onClick={() => setActivityLocation('outdoor')}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                    activityLocation === 'outdoor' ? 'bg-slate-800 text-white' : 'text-slate-400'
                  }`}
                >
                  На улице
                </button>
              </div>

              <div className="flex items-center gap-1">
                {[15, 20, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setActivityDuration(d)}
                    className={`flex-1 py-1 rounded-xl text-xs font-bold border transition ${
                      activityDuration === d
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {d}м
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateActivities}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-rose-500/20 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Baby className="w-4 h-4" />
              <span>{loading ? 'AI придумывает игры...' : 'Придумать новые игры'}</span>
            </button>
          </div>

          {/* Activities List */}
          <div className="space-y-3">
            {activities.map((act) => (
              <div
                key={act.id}
                className="rounded-3xl bg-slate-900 border border-slate-800 p-4 space-y-3 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-white">{act.title}</h4>
                    <div className="flex items-center gap-2 text-xs mt-0.5">
                      <span className="text-rose-400 font-bold">{act.durationMinutes} мин</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">
                        {act.location === 'home' ? 'Дома' : 'На свежем воздухе'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleActivity(act.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      act.completed
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {act.completed ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Сыграли!</span>
                      </>
                    ) : (
                      <span>Отметить</span>
                    )}
                  </button>
                </div>

                {/* Materials & Benefits */}
                <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1 text-xs">
                  <div className="text-slate-300">
                    <strong className="text-amber-400">Что понадобится:</strong>{' '}
                    {act.materialsNeeded.join(', ')}
                  </div>
                  <div className="text-slate-300">
                    <strong className="text-emerald-400">Польза:</strong> {act.benefits}
                  </div>
                </div>

                {/* Safety note */}
                {act.safetyNote && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90">
                    <Shield className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>Безопасность: {act.safetyNote}</span>
                  </div>
                )}

                {/* Instructions */}
                <div className="space-y-1 pt-1 border-t border-slate-800/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Правила игры:
                  </span>
                  <ol className="space-y-1">
                    {act.instructions.map((inst, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                        <span className="text-rose-400 font-bold">{i + 1}.</span>
                        <span>{inst}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          6. 🥗 Семейное меню (Family Menu)
          ======================================================== */}
      {activeSubTab === 'familyMenu' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4.5 space-y-3.5 shadow-xl">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400" />
                <span>Семейное меню (Мама + Семья)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Готовим одно базовое блюдо: мама получает дефицит калорий, а семья — сытный ужин
              </p>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'breakfast', label: 'Завтрак' },
                { id: 'lunch', label: 'Обед' },
                { id: 'dinner', label: 'Ужин' },
                { id: 'all_day', label: 'Весь день' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMenuMealType(m.id as any)}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition ${
                    menuMealType === m.id
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerateFamilyMenu}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-rose-500/20 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'AI рассчитывает меню...' : 'Сгенерировать совместное меню'}</span>
            </button>
          </div>

          {/* Menus List */}
          <div className="space-y-3">
            {familyMenus.map((menu) => (
              <div
                key={menu.id}
                className="rounded-3xl bg-slate-900 border border-slate-800 p-4 space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-white">{menu.title}</h4>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-amber-300">
                    Основа 1 кастрюля
                  </span>
                </div>

                {/* 2 Comparison Cards: Mom vs Family */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Mom Card */}
                  <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-1">
                    <span className="text-[11px] font-black text-rose-400 uppercase tracking-wider block">
                      Порция мамы
                    </span>
                    <div className="text-xs font-bold text-white">{menu.momDish.name}</div>
                    <div className="text-xs font-extrabold text-emerald-400">
                      {menu.momDish.calories} ккал ({menu.momDish.portionGrams}г)
                    </div>
                    <p className="text-[10px] text-slate-300 pt-1 leading-tight">
                      {menu.momDish.customTips}
                    </p>
                  </div>

                  {/* Family Card */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider block">
                      Порция семьи
                    </span>
                    <div className="text-xs font-bold text-white">{menu.familyDish.name}</div>
                    <div className="text-xs font-bold text-slate-400">
                      {menu.familyDish.standardPortionGrams}г • {menu.familyDish.familyServings} порций
                    </div>
                    <p className="text-[10px] text-slate-400 pt-1 leading-tight">
                      {menu.familyDish.servingTips}
                    </p>
                  </div>
                </div>

                {/* Shared Cooking Instructions */}
                <div className="space-y-1 pt-1 border-t border-slate-800/80">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Как приготовить без двойной готовки:
                  </span>
                  <ol className="space-y-1">
                    {menu.onePotInstructions.map((inst, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">{i + 1}.</span>
                        <span>{inst}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          7. 🛒 Покупки на неделю (Shopping List)
          ======================================================== */}
      {activeSubTab === 'shopping' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4.5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                  <span>Покупки на неделю</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Семья: {familyMembersCount} чел. • Бюджет: {maxWeeklyBudget.toLocaleString()} сум
                </p>
              </div>

              <button
                onClick={handleGenerateShopping}
                disabled={loading}
                className="py-1.5 px-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-500/30 flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Создаем...' : 'Обновить'}</span>
              </button>
            </div>

            {shoppingList ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-slate-400">Примерная сумма корзины:</span>
                  <span className="font-extrabold text-emerald-400 text-sm">
                    {shoppingList.estimatedTotal?.toLocaleString() || maxWeeklyBudget.toLocaleString()} сум
                  </span>
                </div>

                <div className="space-y-1.5">
                  {shoppingList.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleShoppingItem(item.id)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:bg-slate-800/40 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        {item.checked ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        )}
                        <div>
                          <span
                            className={`text-xs font-bold ${
                              item.checked ? 'line-through text-slate-500' : 'text-slate-200'
                            }`}
                          >
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block">{item.amount}</span>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                        {item.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <ShoppingCart className="w-10 h-10 text-emerald-400/40 mx-auto" />
                <p className="text-xs text-slate-400">
                  AI составит экономный список покупок для семьи на неделю.
                </p>
                <button
                  onClick={handleGenerateShopping}
                  disabled={loading}
                  className="py-2.5 px-5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition"
                >
                  Сформировать список покупок
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          8. 💰 Семейный бюджет на питание (Budget Plan)
          ======================================================== */}
      {activeSubTab === 'budget' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4.5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>Семейный бюджет на питание</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Оптимизация расходов без потери качества и витаминов
                </p>
              </div>

              <button
                onClick={handleOptimizeBudget}
                disabled={loading}
                className="py-1.5 px-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-500/30 flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{loading ? 'Анализ...' : 'Оптимизировать'}</span>
              </button>
            </div>

            {budgetPlan ? (
              <div className="space-y-3 pt-1">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Недельный лимит</span>
                    <span className="text-sm font-black text-emerald-400 mt-0.5 block">
                      {budgetPlan.weeklyBudget?.toLocaleString()} сум
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Экономия в месяц</span>
                    <span className="text-sm font-black text-amber-400 mt-0.5 block">
                      ~350 000 сум
                    </span>
                  </div>
                </div>

                {/* Smart Substitutions */}
                {budgetPlan.optimizedItems && budgetPlan.optimizedItems.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Умные замены продуктов:
                    </h4>
                    <div className="space-y-1">
                      {budgetPlan.optimizedItems.map((opt, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="line-through text-slate-500 block">{opt.original}</span>
                            <span className="text-emerald-400 font-bold block">{opt.replacement}</span>
                          </div>
                          <span className="text-[11px] font-black text-amber-400">
                            +{opt.savings}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {budgetPlan.savingsRecommendations && (
                  <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-1">
                    <h5 className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                      Советы AI по семейной экономии:
                    </h5>
                    <ul className="space-y-1">
                      {budgetPlan.savingsRecommendations.map((rec, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <Wallet className="w-10 h-10 text-emerald-400/40 mx-auto" />
                <p className="text-xs text-slate-400">
                  Нажмите кнопку ниже, чтобы рассчитать оптимальный план трат на продукты для вашей семьи.
                </p>
                <button
                  onClick={handleOptimizeBudget}
                  disabled={loading}
                  className="py-2.5 px-5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition"
                >
                  Оптимизировать бюджет
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          9. 📸 Фото еды (Food Photo Analysis)
          ======================================================== */}
      {activeSubTab === 'photo' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4.5 space-y-3.5 shadow-xl">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Фото еды: разбор для мамы</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Сфотографируйте семейное блюдо. AI определит калории и подскажет, как маме адаптировать порцию
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              accept="image/*"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>{loading ? 'AI распознает фото...' : 'Загрузить или сделать фото'}</span>
            </button>
          </div>

          {photoAnalysis && (
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4.5 space-y-3 shadow-xl animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-white">{photoAnalysis.dishName}</h4>
                <span className="text-xs font-bold text-slate-400">{photoAnalysis.portionSize}</span>
              </div>

              {/* Macros */}
              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Калории</span>
                  <span className="text-xs font-extrabold text-emerald-400">{photoAnalysis.calories} ккал</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Белки</span>
                  <span className="text-xs font-bold text-white">{photoAnalysis.proteins} г</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Жиры</span>
                  <span className="text-xs font-bold text-white">{photoAnalysis.fats} г</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Углеводы</span>
                  <span className="text-xs font-bold text-white">{photoAnalysis.carbs} г</span>
                </div>
              </div>

              {/* Mom Adaptation Tip */}
              <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-200 space-y-1">
                <strong className="text-rose-300 block">Как съесть с пользой для похудения:</strong>
                <p className="leading-relaxed">{photoAnalysis.goalAdaptationTips}</p>
              </div>

              {/* Medical Disclaimer */}
              <div className="text-[10px] text-slate-500 leading-tight flex items-start gap-1">
                <Info className="w-3 h-3 text-slate-500 flex-shrink-0 mt-0.5" />
                <span>{photoAnalysis.disclaimer || 'Расчёт калорий приблизительный и носит информационный характер.'}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

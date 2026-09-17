import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Utensils,
  Sparkles,
  Clock,
  ChevronRight,
  Plus,
  Trash2,
  Lock,
  Search,
  BookOpen,
  X,
  ChefHat,
  Flame,
} from 'lucide-react';
import { MealPlan, MealItem, FoodDiaryEntry } from '../types';

export const NutritionTab: React.FC = () => {
  const { user, isPremium, openPaywall, token, t, haptic, showToast } = useApp();

  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<{ title: string; item: MealItem } | null>(null);

  // Fridge generator state
  const [fridgeIngredients, setFridgeIngredients] = useState('');
  const [fridgeLoading, setFridgeLoading] = useState(false);
  const [fridgeRecipes, setFridgeRecipes] = useState<any[]>([]);

  // Food Diary state
  const [diaryEntries, setDiaryEntries] = useState<FoodDiaryEntry[]>([]);
  const [diaryDish, setDiaryDish] = useState('');
  const [diaryCalories, setDiaryCalories] = useState('');
  const [diaryMealType, setDiaryMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('snack');
  const [diaryModalOpen, setDiaryModalOpen] = useState(false);

  useEffect(() => {
    if (token && isPremium) {
      loadMealPlan();
      loadDiary();
    }
  }, [token, isPremium]);

  const loadMealPlan = async () => {
    setLoadingPlan(true);
    try {
      const res = await fetch('/api/nutrition/plan', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && data.plan) {
        setMealPlan(data.plan);
      }
    } catch {
      // ignore
    } finally {
      setLoadingPlan(false);
    }
  };

  const loadDiary = async () => {
    try {
      const res = await fetch('/api/food/diary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.diary)) {
        setDiaryEntries(data.diary);
      }
    } catch {
      // ignore
    }
  };

  const handleFridgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fridgeIngredients.trim() || fridgeLoading) return;
    if (!isPremium) {
      openPaywall();
      return;
    }

    haptic('medium');
    setFridgeLoading(true);

    try {
      const res = await fetch('/api/nutrition/fridge-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ingredients: fridgeIngredients }),
      });

      const data = await res.json();
      if (data.ok && Array.isArray(data.recipes)) {
        setFridgeRecipes(data.recipes);
      }
    } catch {
      // ignore
    } finally {
      setFridgeLoading(false);
    }
  };

  const handleAddDiaryEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diaryDish.trim()) return;

    try {
      const res = await fetch('/api/food/diary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dishName: diaryDish,
          mealType: diaryMealType,
          calories: Number(diaryCalories) || 250,
          weightGrams: 200,
        }),
      });

      const data = await res.json();
      if (data.ok && data.entry) {
        setDiaryEntries((prev) => [data.entry, ...prev]);
        setDiaryDish('');
        setDiaryCalories('');
        setDiaryModalOpen(false);
        showToast('Запись добавлена в дневник');
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteDiary = async (id: string) => {
    try {
      await fetch(`/api/food/diary/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setDiaryEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      // ignore
    }
  };

  const mealsList = mealPlan
    ? [
        { key: 'breakfast', title: t.nutrition.breakfast, item: mealPlan.breakfast, color: 'text-amber-400 bg-amber-400/10' },
        { key: 'lunch', title: t.nutrition.lunch, item: mealPlan.lunch, color: 'text-emerald-400 bg-emerald-400/10' },
        { key: 'dinner', title: t.nutrition.dinner, item: mealPlan.dinner, color: 'text-teal-400 bg-teal-400/10' },
        { key: 'snack', title: t.nutrition.snack, item: mealPlan.snack, color: 'text-purple-400 bg-purple-400/10' },
      ]
    : [];

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-5 pb-24 text-white">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          {t.nutrition.title}
          <Sparkles className="w-4 h-4 text-emerald-400" />
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">{t.nutrition.subtitle}</p>
      </div>

      {/* Calories & Macros Summary Bar */}
      {mealPlan && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300">Дневная норма КБЖУ:</span>
            <div className="flex items-center gap-1 text-emerald-400 font-extrabold text-sm">
              <Flame className="w-4 h-4 fill-emerald-400" />
              <span>{mealPlan.totalCalories} {t.home.kcal}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium block">{t.home.proteins}</span>
              <span className="text-xs font-bold text-white mt-0.5 block">{mealPlan.totalProteins}г</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium block">{t.home.fats}</span>
              <span className="text-xs font-bold text-white mt-0.5 block">{mealPlan.totalFats}г</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium block">{t.home.carbs}</span>
              <span className="text-xs font-bold text-white mt-0.5 block">{mealPlan.totalCarbs}г</span>
            </div>
          </div>
        </div>
      )}

      {/* MEAL CARDS (Breakfast, Lunch, Dinner, Snack) */}
      <div className="space-y-3">
        {loadingPlan ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-900 rounded-3xl border border-slate-800">
            Составляем персонализированное меню...
          </div>
        ) : isPremium && mealPlan ? (
          mealsList.map((m) => (
            <div
              key={m.key}
              className="rounded-3xl bg-slate-900 border border-slate-800 p-4 space-y-2.5 transition hover:border-slate-700"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${m.color}`}>
                  {m.title}
                </span>
                <span className="text-xs font-extrabold text-white">
                  {m.item.calories} {t.home.kcal} • {m.item.portionGrams}г
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">{m.item.dish}</h4>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {m.item.ingredients?.map((ing, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] text-slate-300"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400">
                  Б: {m.item.proteins}г | Ж: {m.item.fats}г | У: {m.item.carbs}г
                </span>
                <button
                  onClick={() => setSelectedRecipe({ title: m.title, item: m.item })}
                  className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {t.nutrition.viewRecipe}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Меню доступно в Premium</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Индивидуальное меню с точными граммовками под ваш целевой вес и бюджет.
            </p>
            <button
              onClick={openPaywall}
              className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-400 text-slate-950 font-black text-xs transition"
            >
              {t.home.upgradeNow}
            </button>
          </div>
        )}
      </div>

      {/* "WHAT TO COOK FROM FRIDGE" WIDGET */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-4.5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white">{t.nutrition.fridgeTitle}</h3>
            <p className="text-[11px] text-slate-400">{t.nutrition.fridgeDesc}</p>
          </div>
        </div>

        <form onSubmit={handleFridgeSubmit} className="space-y-2">
          <input
            type="text"
            placeholder={t.nutrition.fridgePlaceholder}
            value={fridgeIngredients}
            onChange={(e) => setFridgeIngredients(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
          <button
            type="submit"
            disabled={fridgeLoading || !fridgeIngredients.trim()}
            className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            {fridgeLoading ? (
              <span>{t.nutrition.fridgeLoading}</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{t.nutrition.fridgeBtn}</span>
              </>
            )}
          </button>
        </form>

        {/* Fridge Recipes Output */}
        {fridgeRecipes.length > 0 && (
          <div className="pt-2 space-y-2.5">
            {fridgeRecipes.map((rec, i) => (
              <div key={i} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-400">{rec.title}</h4>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {rec.prepTime}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-medium">
                  {rec.calories} ккал • {rec.macros}
                </div>
                <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-0.5 pt-1">
                  {rec.steps?.map((step: string, sIdx: number) => (
                    <li key={sIdx}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TODAY'S FOOD DIARY */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4.5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white">{t.nutrition.diaryTitle}</h3>
          <button
            onClick={() => setDiaryModalOpen(true)}
            className="py-1 px-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 hover:bg-emerald-500/30 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить</span>
          </button>
        </div>

        {diaryEntries.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-2">
            В дневнике пока нет записей за сегодня
          </p>
        ) : (
          <div className="space-y-1.5">
            {diaryEntries.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-200 block">{item.dishName}</span>
                  <span className="text-[10px] text-slate-400">
                    {item.calories} ккал • {item.weightGrams}г
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteDiary(item.id)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RECIPE DETAILS MODAL */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-white space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                  {selectedRecipe.title}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{selectedRecipe.item.dish}</h3>
              </div>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <span className="font-bold text-slate-200 block mb-1">Ингредиенты:</span>
              <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
                {selectedRecipe.item.ingredients?.map((ing, i) => (
                  <li key={i}>{ing}</li>
                ))}
              </ul>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <span className="font-bold text-slate-200 block mb-1">Приготовление:</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {selectedRecipe.item.recipeInstructions}
              </p>
            </div>

            <button
              onClick={() => setSelectedRecipe(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 font-bold text-xs text-slate-200"
            >
              {t.nutrition.closeRecipe}
            </button>
          </div>
        </div>
      )}

      {/* ADD DIARY ENTRY MODAL */}
      {diaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-white space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{t.nutrition.addToDiary}</h3>
              <button onClick={() => setDiaryModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDiaryEntry} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t.nutrition.foodName}</label>
                <input
                  type="text"
                  required
                  placeholder="Например: Гречка с курицей"
                  value={diaryDish}
                  onChange={(e) => setDiaryDish(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{t.home.calories}</label>
                <input
                  type="number"
                  placeholder="ккал (примерно 350)"
                  value={diaryCalories}
                  onChange={(e) => setDiaryCalories(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Прием пищи</label>
                <select
                  value={diaryMealType}
                  onChange={(e) => setDiaryMealType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="breakfast">Завтрак</option>
                  <option value="lunch">Обед</option>
                  <option value="dinner">Ужин</option>
                  <option value="snack">Перекус</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
              >
                {t.nutrition.addEntryBtn}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

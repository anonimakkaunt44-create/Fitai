import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Flame,
  Droplets,
  Footprints,
  Plus,
  Bot,
  Dumbbell,
  Utensils,
  Camera,
  ArrowRight,
  TrendingDown,
  Sparkles,
  Lock,
  ChevronRight,
  CheckCircle2,
  Baby,
  Crown,
} from 'lucide-react';
import { MealPlan, Workout } from '../types';

export const HomeTab: React.FC = () => {
  const { user, isPremium, openPaywall, setActiveTab, todayActivity, addWater, t, token } = useApp();

  const [todayMealPlan, setTodayMealPlan] = useState<MealPlan | null>(null);
  const [todayWorkout, setTodayWorkout] = useState<Workout | null>(null);

  useEffect(() => {
    if (token && isPremium) {
      // Fetch meal plan & workout preview
      fetch('/api/nutrition/plan', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && d.plan) setTodayMealPlan(d.plan);
        })
        .catch(() => {});

      fetch('/api/workouts/today', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && d.workout) setTodayWorkout(d.workout);
        })
        .catch(() => {});
    }
  }, [token, isPremium]);

  const p = user?.profile;
  const currentWeight = p?.weight || 82;
  const targetWeight = p?.targetWeight || 72;
  const weightToLose = Math.max(0, currentWeight - targetWeight);

  // Water progress
  const waterMl = todayActivity?.waterMl || 750;
  const waterGoal = todayActivity?.waterGoalMl || 2500;
  const waterPct = Math.min(100, Math.round((waterMl / waterGoal) * 100));

  // Steps progress
  const steps = todayActivity?.steps || 4280;
  const stepsGoal = todayActivity?.stepsGoal || 10000;
  const stepsPct = Math.min(100, Math.round((steps / stepsGoal) * 100));

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-24 text-white">
      {/* 1. Weight Goal Progress Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {t.home.progressToGoal}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white">{currentWeight}</span>
              <span className="text-xs text-slate-400 font-bold">{t.home.kg}</span>
              <TrendingDown className="w-4 h-4 text-emerald-400 ml-1" />
              <span className="text-xs text-emerald-400 font-bold">
                -{weightToLose} {t.home.kg} {t.home.remaining}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-slate-400 block">{t.home.targetWeight}</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              {targetWeight} <span className="text-xs text-slate-400 font-bold">{t.home.kg}</span>
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(15, 100 - (weightToLose / (currentWeight || 1)) * 100))}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
            <span>Старт</span>
            <span className="text-emerald-400 font-bold">Цель: {targetWeight} кг</span>
          </div>
        </div>
      </div>

      {/* 2. Daily Habits: Water & Steps Widgets */}
      <div className="grid grid-cols-2 gap-3">
        {/* Water widget */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold">
              <Droplets className="w-4 h-4" />
              <span>{t.home.water}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {(waterMl / 1000).toFixed(1)} / {(waterGoal / 1000).toFixed(1)} л
            </span>
          </div>

          <div className="my-2.5">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${waterPct}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => addWater(250)}
            className="w-full py-2 px-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.home.addWater}</span>
          </button>
        </div>

        {/* Steps widget */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
              <Footprints className="w-4 h-4" />
              <span>{t.home.steps}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">{stepsPct}%</span>
          </div>

          <div className="my-1">
            <span className="text-xl font-black text-white">{steps.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 block">{t.home.stepsGoal}</span>
          </div>

          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
              style={{ width: `${stepsPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. AI Coach Interactive Callout */}
      <div
        onClick={() => (isPremium ? setActiveTab('ai_trainer') : openPaywall())}
        className="cursor-pointer relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 border border-teal-500/30 p-4.5 shadow-lg group hover:border-teal-500/60 transition-all"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/40">
              <Bot className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-extrabold text-white">{t.home.aiTrainerCardTitle}</h4>
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                {t.home.aiTrainerCardDesc}
              </p>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-slate-800/80 text-slate-300 group-hover:text-teal-300 group-hover:bg-slate-800 transition">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">AI учитывает вес {currentWeight} кг</span>
          <span className="text-teal-400 font-bold flex items-center gap-1">
            {t.home.aiTrainerBtn}
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* 3.5 Mom Mode Card if active */}
      {user?.profile?.isMomMode && (
        <div
          onClick={() => {
            if (!isPremium) {
              openPaywall();
              return;
            }
            setActiveTab('mom');
          }}
          className="cursor-pointer relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/60 border border-rose-500/40 p-4 shadow-lg group hover:border-rose-500/70 transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/40">
                <Baby className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-extrabold text-white">Раздел «Для мам»</h4>
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
                <p className="text-[11px] text-rose-200/90 mt-0.5 line-clamp-1">
                  Ужин из того что есть, игры с ребёнком ({user?.profile?.childAge || '3-4 года'}) и план на день
                </p>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-800/80 text-rose-300 group-hover:bg-rose-500 group-hover:text-slate-950 transition">
              {isPremium ? <ArrowRight className="w-4 h-4" /> : <Lock className="w-4 h-4 text-amber-400" />}
            </div>
          </div>
        </div>
      )}

      {/* 4. Quick Action Pills (Food Photo & Progress & Shopping) */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => (isPremium ? setActiveTab('food_photo') : openPaywall())}
          className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-center transition flex flex-col items-center gap-1.5"
        >
          <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
            <Camera className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-200">{t.nav.foodPhoto}</span>
        </button>

        <button
          onClick={() => (isPremium ? setActiveTab('progress') : openPaywall())}
          className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-center transition flex flex-col items-center gap-1.5"
        >
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-200">{t.nav.progress}</span>
        </button>

        <button
          onClick={() => (isPremium ? setActiveTab('shopping') : openPaywall())}
          className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-center transition flex flex-col items-center gap-1.5"
        >
          <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
            <Utensils className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-200">{t.nav.shopping}</span>
        </button>
      </div>

      {/* 5. Today's Workout Preview */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4.5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Dumbbell className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-extrabold text-white">{t.home.todayWorkout}</h4>
          </div>
          <button
            onClick={() => (isPremium ? setActiveTab('workouts') : openPaywall())}
            className="text-xs text-emerald-400 font-bold hover:underline"
          >
            {t.home.viewAll}
          </button>
        </div>

        {isPremium && todayWorkout ? (
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-200 block">{todayWorkout.title}</span>
              <span className="text-[11px] text-slate-400">
                {todayWorkout.durationMinutes} мин • {todayWorkout.exercises.length} упражнений
              </span>
            </div>
            <button
              onClick={() => setActiveTab('workouts')}
              className="py-1.5 px-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
            >
              {todayWorkout.completed ? 'Выполнено' : 'Начать'}
            </button>
          </div>
        ) : !isPremium ? (
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Программа тренировок на сегодня</span>
            </div>
            <button
              onClick={openPaywall}
              className="py-1.5 px-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
            >
              {t.home.upgradeNow}
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-2 text-center">
            {t.home.noWorkoutToday}
          </div>
        )}
      </div>

      {/* 6. Today's Meals Preview */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4.5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
              <Utensils className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-extrabold text-white">{t.home.todayMeals}</h4>
          </div>
          <button
            onClick={() => (isPremium ? setActiveTab('nutrition') : openPaywall())}
            className="text-xs text-teal-400 font-bold hover:underline"
          >
            {t.home.viewAll}
          </button>
        </div>

        {isPremium && todayMealPlan ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">
                Завтрак
              </span>
              <span className="text-xs font-semibold text-slate-200 line-clamp-1">
                {todayMealPlan.breakfast?.dish || 'Овсяная каша'}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {todayMealPlan.breakfast?.calories} ккал
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-teal-400 block mb-0.5">
                Обед
              </span>
              <span className="text-xs font-semibold text-slate-200 line-clamp-1">
                {todayMealPlan.lunch?.dish || 'Куриное филе с рисом'}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {todayMealPlan.lunch?.calories} ккал
              </span>
            </div>
          </div>
        ) : !isPremium ? (
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Меню с расчетом граммовок и БЖУ</span>
            </div>
            <button
              onClick={openPaywall}
              className="py-1.5 px-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
            >
              {t.home.upgradeNow}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setActiveTab('nutrition')}
            className="w-full py-2.5 rounded-xl bg-teal-500/20 text-teal-300 font-bold text-xs"
          >
            Сгенерировать рацион питания
          </button>
        )}
      </div>

      {/* 7. FitAI Motivation Tip */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-bold text-white block">{t.home.motivationTitle}</span>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
            {t.home.motivationText}
          </p>
        </div>
      </div>
    </div>
  );
};

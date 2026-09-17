import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Dumbbell,
  Clock,
  Flame,
  CheckCircle2,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Timer,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Workout, Exercise } from '../types';

export const WorkoutsTab: React.FC = () => {
  const { user, isPremium, openPaywall, token, t, haptic } = useApp();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(0);
  const [filterLocation, setFilterLocation] = useState<'all' | 'home' | 'gym'>('all');

  // Rest Timer State
  const [restSeconds, setRestSeconds] = useState(45);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    let interval: any;
    if (timerRunning && restSeconds > 0) {
      interval = setInterval(() => {
        setRestSeconds((prev) => {
          if (prev <= 1) {
            haptic('success');
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, restSeconds]);

  useEffect(() => {
    if (token && isPremium) {
      loadWorkout();
    }
  }, [token, isPremium]);

  const loadWorkout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workouts/today', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && data.workout) {
        setWorkout(data.workout);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async () => {
    if (!workout) return;
    haptic('success');

    try {
      const res = await fetch(`/api/workouts/${workout.id}/toggle`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && data.workout) {
        setWorkout(data.workout);
        if (data.workout.completed) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      }
    } catch {
      // ignore
    }
  };

  const startRestTimer = (seconds: number) => {
    haptic('light');
    setRestSeconds(seconds);
    setTimerRunning(true);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-24 text-white">
      {/* Title Bar */}
      <div>
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          {t.workouts.title}
          <Sparkles className="w-4 h-4 text-emerald-400" />
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">{t.workouts.subtitle}</p>
      </div>

      {/* Location Filter */}
      <div className="grid grid-cols-3 gap-2">
        {(['all', 'home', 'gym'] as const).map((loc) => (
          <button
            key={loc}
            onClick={() => setFilterLocation(loc)}
            className={`py-1.5 rounded-xl text-xs font-bold transition border ${
              filterLocation === loc
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                : 'border-slate-800 bg-slate-900 text-slate-400'
            }`}
          >
            {loc === 'all' ? t.workouts.filterAll : loc === 'home' ? t.workouts.filterHome : t.workouts.filterGym}
          </button>
        ))}
      </div>

      {!isPremium ? (
        /* Paywall Block */
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Тренировки доступны в Premium</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Индивидуальные планы для дома и зала с расчетом подходов, повторений и таймером отдыха.
          </p>
          <button
            onClick={openPaywall}
            className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-400 text-slate-950 font-black text-xs transition"
          >
            {t.home.upgradeNow}
          </button>
        </div>
      ) : loading ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-slate-900 rounded-3xl border border-slate-800">
          Составляем программу тренировок...
        </div>
      ) : workout ? (
        /* Workout Detail */
        <div className="space-y-4">
          {/* Header Card */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block mb-1">
                  {workout.location === 'home' ? 'Домашняя тренировка' : 'В тренажерном зале'}
                </span>
                <h3 className="text-lg font-black text-white">{workout.title}</h3>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {workout.durationMinutes} мин
                  </span>
                  <span>•</span>
                  <span>{workout.exercises.length} упражнений</span>
                </div>
              </div>

              <button
                onClick={handleToggleComplete}
                className={`p-3 rounded-2xl border transition flex items-center gap-1.5 font-bold text-xs ${
                  workout.completed
                    ? 'border-emerald-500 bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                    : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-emerald-500/60'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{workout.completed ? 'Выполнено!' : 'Завершить'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Rest Timer Bar */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
                <Timer className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">{t.workouts.restTimer}</span>
                <span className="text-xs text-teal-400 font-mono font-extrabold">
                  {restSeconds > 0 ? `${restSeconds} сек` : 'Отдых окончен!'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {[30, 45, 60].map((sec) => (
                <button
                  key={sec}
                  onClick={() => startRestTimer(sec)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-[11px] font-bold text-slate-300 transition"
                >
                  {sec}с
                </button>
              ))}
              {timerRunning && (
                <button
                  onClick={() => setTimerRunning(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Exercises List */}
          <div className="space-y-2.5">
            {workout.exercises.map((ex, idx) => {
              const isOpen = activeExerciseIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition"
                >
                  <div
                    onClick={() => setActiveExerciseIndex(isOpen ? null : idx)}
                    className="p-4 cursor-pointer flex items-center justify-between hover:bg-slate-850 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-xs font-bold text-emerald-400">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-white">{ex.name}</h4>
                        <span className="text-[11px] text-slate-400">
                          {ex.sets} {t.workouts.sets} • {ex.reps} {t.workouts.reps}
                        </span>
                      </div>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 bg-slate-950/40 space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {t.workouts.technique}:
                        </span>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          {ex.technique}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                        <span>
                          <strong className="text-slate-300">Мышцы:</strong> {ex.targetMuscles}
                        </span>
                        <button
                          onClick={() => startRestTimer(ex.restSeconds || 45)}
                          className="text-teal-400 font-bold hover:underline flex items-center gap-1"
                        >
                          <Timer className="w-3 h-3" />
                          Таймер {ex.restSeconds || 45}с
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-400 py-6 text-center">
          На сегодня тренировка не найдена
        </div>
      )}
    </div>
  );
};

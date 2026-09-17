import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, X } from 'lucide-react';
import { UserProfile } from '../types';
import { persistentStorage } from '../utils/persistentStorage';

export const OnboardingModal: React.FC = () => {
  const { onboardingOpen, setOnboardingOpen, user, token, refreshUser, t, haptic } = useApp();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState<UserProfile>({
    gender: user?.profile?.gender || 'male',
    age: user?.profile?.age || 26,
    height: user?.profile?.height || 176,
    weight: user?.profile?.weight || 82,
    targetWeight: user?.profile?.targetWeight || 72,
    waist: user?.profile?.waist || 88,
    activityLevel: user?.profile?.activityLevel || 'moderate',
    workoutsPerWeek: user?.profile?.workoutsPerWeek || 3,
    workoutLocation: user?.profile?.workoutLocation || 'home',
    workoutTimeMinutes: user?.profile?.workoutTimeMinutes || 35,
    fitnessLevel: user?.profile?.fitnessLevel || 'beginner',
    dietaryPreferences: user?.profile?.dietaryPreferences || ['Сбалансированное'],
    allergies: user?.profile?.allergies || [],
    dislikedFoods: user?.profile?.dislikedFoods || [],
    weeklyBudget: user?.profile?.weeklyBudget || '300,000 UZS',
  });

  const [allergiesInput, setAllergiesInput] = useState(user?.profile?.allergies?.join(', ') || '');
  const [dislikedInput, setDislikedInput] = useState(user?.profile?.dislikedFoods?.join(', ') || '');

  if (!onboardingOpen) return null;

  const handleDismiss = async () => {
    haptic('light');
    if (user?.id) {
      localStorage.setItem('fitai_onboarded_' + user.id, 'true');
    }
    if (user?.telegramId) {
      localStorage.setItem('fitai_onboarded_' + user.telegramId, 'true');
      await persistentStorage.setItem('fitai_onboarded_' + user.telegramId, 'true');
    }
    localStorage.setItem('fitai_onboarded', 'true');
    await persistentStorage.setItem('fitai_onboarded', 'true');
    setOnboardingOpen(false);

    // Save onboarding completion to server so it never asks again
    if (token) {
      try {
        await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        });
      } catch {
        // ignore
      }
    }
  };

  const handleNext = () => {
    haptic('light');
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    haptic('light');
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    haptic('medium');

    const updatedProfile: UserProfile = {
      ...profile,
      allergies: allergiesInput ? allergiesInput.split(',').map((s) => s.trim()).filter(Boolean) : [],
      dislikedFoods: dislikedInput ? dislikedInput.split(',').map((s) => s.trim()).filter(Boolean) : [],
    };

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedProfile),
      });

      if (res.ok) {
        if (user?.id) {
          localStorage.setItem('fitai_onboarded_' + user.id, 'true');
        }
        if (user?.telegramId) {
          localStorage.setItem('fitai_onboarded_' + user.telegramId, 'true');
          await persistentStorage.setItem('fitai_onboarded_' + user.telegramId, 'true');
        }
        localStorage.setItem('fitai_onboarded', 'true');
        await persistentStorage.setItem('fitai_onboarded', 'true');
        await refreshUser();
        setOnboardingOpen(false);
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-white max-h-[92vh] overflow-y-auto">
        {/* Header Progress */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-300">
              {step === 1 ? t.onboarding.step1 : step === 2 ? t.onboarding.step2 : t.onboarding.step3}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step ? 'w-6 bg-emerald-400' : s < step ? 'w-3 bg-emerald-600' : 'w-3 bg-slate-800'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleDismiss}
              type="button"
              className="p-1.5 -mr-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STEP 1: Body Parameters */}
        {step === 1 && (
          <div className="py-4 space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-black text-white">{t.onboarding.welcome}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{t.onboarding.subtitle}</p>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t.onboarding.gender}</label>
              <div className="grid grid-cols-2 gap-2">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setProfile({ ...profile, gender: g })}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition ${
                      profile.gender === g
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {g === 'male' ? `👨 ${t.onboarding.male}` : `👩 ${t.onboarding.female}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Age & Height */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.onboarding.age}</label>
                <input
                  type="number"
                  value={profile.age || ''}
                  onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t.onboarding.height}</label>
                <input
                  type="number"
                  value={profile.height || ''}
                  onChange={(e) => setProfile({ ...profile, height: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Weights & Waist */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 leading-tight">
                  {t.onboarding.currentWeight}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={profile.weight || ''}
                  onChange={(e) => setProfile({ ...profile, weight: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 leading-tight">
                  {t.onboarding.targetWeight}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={profile.targetWeight || ''}
                  onChange={(e) => setProfile({ ...profile, targetWeight: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 leading-tight">
                  {t.onboarding.waist}
                </label>
                <input
                  type="number"
                  value={profile.waist || ''}
                  onChange={(e) => setProfile({ ...profile, waist: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Activity & Workouts */}
        {step === 2 && (
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">{t.onboarding.activity}</label>
              <div className="space-y-1.5">
                {[
                  { id: 'sedentary', label: t.onboarding.activitySedentary },
                  { id: 'light', label: t.onboarding.activityLight },
                  { id: 'moderate', label: t.onboarding.activityModerate },
                  { id: 'high', label: t.onboarding.activityHigh },
                ].map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setProfile({ ...profile, activityLevel: act.id as any })}
                    className={`w-full p-2.5 rounded-xl text-left text-xs font-medium border transition flex items-center justify-between ${
                      profile.activityLevel === act.id
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 font-bold'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>{act.label}</span>
                    {profile.activityLevel === act.id && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Workouts per week */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t.onboarding.workoutsCount}</label>
              <div className="grid grid-cols-4 gap-2">
                {[2, 3, 4, 5].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setProfile({ ...profile, workoutsPerWeek: cnt })}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      profile.workoutsPerWeek === cnt
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400'
                    }`}
                  >
                    {cnt}x
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">{t.onboarding.location}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'home', label: t.onboarding.home },
                  { id: 'gym', label: t.onboarding.gym },
                  { id: 'both', label: t.onboarding.both },
                ].map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setProfile({ ...profile, workoutLocation: loc.id as any })}
                    className={`py-2.5 px-2 rounded-xl text-[11px] font-semibold border text-center transition ${
                      profile.workoutLocation === loc.id
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400'
                    }`}
                  >
                    {loc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Diet & Allergies */}
        {step === 3 && (
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t.onboarding.allergies}</label>
              <input
                type="text"
                placeholder="Орехи, лактоза, морепродукты..."
                value={allergiesInput}
                onChange={(e) => setAllergiesInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t.onboarding.disliked}</label>
              <input
                type="text"
                placeholder="Брокколи, кинза, лук..."
                value={dislikedInput}
                onChange={(e) => setDislikedInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">{t.onboarding.budget}</label>
              <input
                type="text"
                placeholder="250 000 - 350 000 UZS"
                value={profile.weeklyBudget || ''}
                onChange={(e) => setProfile({ ...profile, weeklyBudget: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              onClick={handlePrev}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t.onboarding.prev}</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            disabled={loading}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition disabled:opacity-50"
          >
            {loading ? (
              <span>{t.common.loading}</span>
            ) : step === 3 ? (
              <>
                <span>{t.onboarding.finish}</span>
                <Sparkles className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>{t.onboarding.next}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

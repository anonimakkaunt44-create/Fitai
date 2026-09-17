import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  Lock,
  RotateCcw,
  Flame,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { FoodAnalysis } from '../types';

export const FoodPhotoTab: React.FC = () => {
  const { isPremium, openPaywall, token, t, haptic, showToast } = useApp();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedToDiary, setSavedToDiary] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isPremium) {
      openPaywall();
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Файл слишком большой. Максимум 8 МБ');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
      setAnalysisResult(null);
      setErrorMsg(null);
      setSavedToDiary(false);
      await analyzeImage(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (base64: string, mimeType: string) => {
    setAnalyzing(true);
    haptic('medium');

    try {
      const res = await fetch('/api/food/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
        }),
      });

      const data = await res.json();
      if (data.ok && data.analysis) {
        setAnalysisResult(data.analysis);
        haptic('success');
      } else {
        setErrorMsg(data.error || 'Не удалось распознать блюдо');
      }
    } catch {
      setErrorMsg('Ошибка связи с AI-сервером');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveToDiary = async () => {
    if (!analysisResult) return;
    haptic('light');

    try {
      const res = await fetch('/api/food/diary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dishName: analysisResult.dishName,
          mealType: 'lunch',
          weightGrams: parseInt(analysisResult.portionWeight) || 250,
          calories: analysisResult.calories,
          proteins: analysisResult.proteins,
          fats: analysisResult.fats,
          carbs: analysisResult.carbs,
        }),
      });

      if (res.ok) {
        setSavedToDiary(true);
        showToast(t.foodPhoto.savedSuccess);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-24 text-white">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          {t.foodPhoto.title}
          <Sparkles className="w-4 h-4 text-emerald-400" />
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">{t.foodPhoto.subtitle}</p>
      </div>

      {!isPremium ? (
        /* Paywall Block */
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Сканирование еды по фото</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Компьютерное зрение Gemini определяет блюда, подсчитывает вес порции, калории и БЖУ прямо с тарелки.
          </p>
          <button
            onClick={openPaywall}
            className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-400 text-slate-950 font-black text-xs transition"
          >
            {t.home.upgradeNow}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Photo Uploader / Camera Card */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 overflow-hidden">
            {selectedImage ? (
              <div className="relative rounded-2xl overflow-hidden aspect-4/3 bg-slate-950 flex items-center justify-center border border-slate-800">
                <img
                  src={selectedImage}
                  alt="Тарелка"
                  className="w-full h-full object-cover"
                />

                {/* Radar Scanning Line Animation while analyzing */}
                {analyzing && (
                  <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[1px] flex flex-col items-center justify-center">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse absolute top-1/2 -translate-y-1/2" />
                    <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>{t.foodPhoto.analyzing}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center aspect-4/3 border-2 border-dashed border-slate-750 hover:border-emerald-500/60 rounded-2xl bg-slate-950/40 cursor-pointer transition p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-3">
                  <Camera className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-200">{t.foodPhoto.takePhoto}</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Нажмите, чтобы сделать снимок или выбрать из галереи
                </p>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}

            {/* Change photo button */}
            {selectedImage && !analyzing && (
              <div className="mt-3 flex gap-2">
                <label className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold text-center cursor-pointer transition flex items-center justify-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.foodPhoto.tryAnother}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Analysis Result Card */}
          {analysisResult && (
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/40 p-5 shadow-xl space-y-3.5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block mb-0.5">
                  {t.foodPhoto.dishFound}
                </span>
                <h3 className="text-lg font-black text-white">{analysisResult.dishName}</h3>
                <span className="text-xs text-slate-400">
                  {t.foodPhoto.portion}: <strong>{analysisResult.portionWeight}</strong>
                </span>
              </div>

              {/* Nutrition breakdown */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">Калорийность:</span>
                  <span className="text-sm font-extrabold text-emerald-400 flex items-center gap-1">
                    <Flame className="w-4 h-4 fill-emerald-400" />
                    {analysisResult.calories} ккал
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-900">
                    <span className="text-[10px] text-slate-400 block">{t.home.proteins}</span>
                    <span className="text-xs font-bold text-white mt-0.5 block">
                      {analysisResult.proteins}г
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900">
                    <span className="text-[10px] text-slate-400 block">{t.home.fats}</span>
                    <span className="text-xs font-bold text-white mt-0.5 block">
                      {analysisResult.fats}г
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900">
                    <span className="text-[10px] text-slate-400 block">{t.home.carbs}</span>
                    <span className="text-xs font-bold text-white mt-0.5 block">
                      {analysisResult.carbs}г
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs">
                <span className="font-bold text-slate-200 block mb-1">
                  {t.foodPhoto.recommendations}:
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {analysisResult.recommendations}
                </p>
              </div>

              {/* 1-Tap Save to Diary */}
              <button
                onClick={handleSaveToDiary}
                disabled={savedToDiary}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                  savedToDiary
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-95'
                }`}
              >
                {savedToDiary ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{t.foodPhoto.savedSuccess}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>{t.foodPhoto.saveToDiary}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

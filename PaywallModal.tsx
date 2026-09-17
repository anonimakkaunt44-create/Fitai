import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, CheckCircle2, Crown, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { PaymentSettings } from '../types';

export const PaywallModal: React.FC = () => {
  const { paywallOpen, closePaywall, openPayment, t } = useApp();
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'1month' | '3months' | '1year'>('3months');

  useEffect(() => {
    if (paywallOpen) {
      fetch('/api/payment/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.settings) setSettings(data.settings);
        })
        .catch(() => {});
    }
  }, [paywallOpen]);

  if (!paywallOpen) return null;

  const currency = settings?.currency || 'UZS';
  const price1Month = settings?.price1Month || 149000;
  const price3Months = settings?.price3Months || 349000;
  const price1Year = settings?.price1Year || 799000;

  const plans = [
    {
      id: '1month' as const,
      name: t.paywall.month1,
      price: price1Month,
      perMonth: price1Month,
      badge: null,
      color: 'border-slate-700 bg-slate-900/60',
    },
    {
      id: '3months' as const,
      name: t.paywall.month3,
      price: price3Months,
      perMonth: Math.round(price3Months / 3),
      badge: t.paywall.discount3,
      popular: true,
      color: 'border-emerald-500/80 bg-emerald-950/20 shadow-lg shadow-emerald-500/10',
    },
    {
      id: '1year' as const,
      name: t.paywall.year1,
      price: price1Year,
      perMonth: Math.round(price1Year / 12),
      badge: t.paywall.discount12,
      color: 'border-amber-500/60 bg-amber-950/20',
    },
  ];

  const features = [
    t.paywall.feature1,
    t.paywall.feature2,
    t.paywall.feature3,
    t.paywall.feature4,
    t.paywall.feature5,
    t.paywall.feature6,
    (t.paywall as any).feature7 || 'Эксклюзивный раздел «Для мам»: меню семьи, ужин из остатков, игры с детьми',
  ];

  const handleContinue = () => {
    openPayment(selectedPlan);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-y-auto shadow-2xl text-white">
        {/* Close Button */}
        <button
          onClick={closePaywall}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Header */}
        <div className="text-center pt-2 pb-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-400 text-slate-950 mb-3 shadow-lg shadow-emerald-500/20">
            <Crown className="w-7 h-7 fill-slate-950" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            FitAI <span className="text-amber-400">Premium</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            {t.paywall.subtitle}
          </p>
        </div>

        {/* Features List */}
        <div className="space-y-2.5 my-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
          {features.map((feat, i) => (
            <div key={i} className="flex items-start gap-2.5 text-xs text-slate-200">
              <div className="mt-0.5 rounded-full bg-emerald-500/20 text-emerald-400 p-0.5 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span className="leading-snug">{feat}</span>
            </div>
          ))}
        </div>

        {/* Plan Selector */}
        <div className="space-y-2.5 my-4">
          <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">
            {t.paywall.choosePlan}
          </p>

          <div className="grid grid-cols-3 gap-2">
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative cursor-pointer rounded-2xl p-3 border-2 transition-all flex flex-col justify-between text-left ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-500/10 shadow-md shadow-emerald-500/20'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-[9px] font-black tracking-wider whitespace-nowrap shadow-sm">
                      {plan.badge}
                    </span>
                  )}

                  <div>
                    <span className="text-xs font-bold text-slate-300 block">
                      {plan.name}
                    </span>
                    <div className="mt-1">
                      <span className="text-sm font-extrabold text-white">
                        {plan.price.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-0.5">
                        {currency}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-emerald-400 font-semibold block">
                      ~{plan.perMonth.toLocaleString()} {currency}/мес
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleContinue}
          className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4 fill-slate-950" />
          {t.paywall.selectBtn}
        </button>

        {/* Guarantee footer */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t.paywall.guarantee}</span>
        </div>
      </div>
    </div>
  );
};

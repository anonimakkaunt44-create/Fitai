import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Copy, Check, Upload, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { PaymentSettings } from '../types';
import { persistentStorage } from '../utils/persistentStorage';

export const PaymentModal: React.FC = () => {
  const { paymentOpen, closePayment, selectedPlanId, token, language, t, showToast, haptic } = useApp();
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [copied, setCopied] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (paymentOpen) {
      setSubmitted(false);
      setReceiptImage(null);
      setErrorMsg(null);
      fetch('/api/payment/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.settings) setSettings(data.settings);
        })
        .catch(() => {});
    }
  }, [paymentOpen]);

  if (!paymentOpen) return null;

  const currency = settings?.currency || 'UZS';
  let planName = t.paywall.month1;
  let amount = settings?.price1Month || 149000;

  if (selectedPlanId === '3months') {
    planName = t.paywall.month3;
    amount = settings?.price3Months || 349000;
  } else if (selectedPlanId === '1year') {
    planName = t.paywall.year1;
    amount = settings?.price1Year || 799000;
  }

  const cardNumber = settings?.cardNumber || '8600 0000 0000 0000';
  const cardHolder = settings?.cardHolder || 'FITAI SERVICES';
  const bankName = settings?.bankName || 'Humo / Uzcard / Visa';

  const instructions =
    language === 'uz'
      ? settings?.instructionsUz || '1. Karta raqamiga to‘lov qiling.\n2. To‘lov cheki skrinshotini oling.\n3. Skrinshotni quyidagi maydonga yuklang va «Men to‘ladim» tugmasini bosing.'
      : language === 'en'
      ? settings?.instructionsEn || '1. Transfer the exact amount to the card below.\n2. Take a screenshot of the payment receipt.\n3. Upload the screenshot below and click "I Paid".'
      : settings?.instructions || '1. Переведите точную сумму на карту ниже.\n2. Сохраните чек или скриншот перевода.\n3. Прикрепите чек в поле ниже и нажмите «Я оплатил».';

  const handleCopyCard = () => {
    navigator.clipboard.writeText(cardNumber.replace(/\s+/g, ''));
    setCopied(true);
    haptic('light');
    showToast(t.payment.copied);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Файл слишком большой. Максимум 8 МБ');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptImage(event.target?.result as string);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!receiptImage) {
      setErrorMsg('Пожалуйста, прикрепите фото или скриншот чека');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/payment/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: selectedPlanId,
          receiptImage,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        haptic('success');
        setSubmitted(true);
        try {
          const raw = (await persistentStorage.getItem('fitai_my_payments')) || '[]';
          const list = JSON.parse(raw);
          if (data.payment) {
            const exists = list.some((p: any) => p.id === data.payment.id);
            if (!exists) {
              list.unshift(data.payment);
              await persistentStorage.setItem('fitai_my_payments', JSON.stringify(list.slice(0, 20)));
            }
          }
        } catch {}
      } else {
        setErrorMsg(data.error || 'Ошибка при отправке');
      }
    } catch (err: any) {
      setErrorMsg('Не удалось связаться с сервером');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] overflow-y-auto shadow-2xl text-white">
        <button
          onClick={closePayment}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          /* SUCCESS SCREEN */
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/40">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">{t.payment.successTitle}</h3>
            <p className="text-xs text-slate-300 mt-2 max-w-xs mx-auto leading-relaxed">
              {t.payment.successDesc}
            </p>
            <div className="mt-5 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
              Вы получите мгновенное уведомление в Telegram сразу после проверки чека администратором.
            </div>
            <button
              onClick={closePayment}
              className="w-full mt-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition"
            >
              {t.payment.close}
            </button>
          </div>
        ) : (
          /* PAYMENT FORM */
          <>
            <div className="text-center pb-3">
              <h3 className="text-lg font-black text-white">{t.payment.title}</h3>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-xs text-slate-400">{t.payment.selectedPlan}</span>
                <span className="text-xs font-bold text-emerald-400">{planName}</span>
              </div>
              <div className="mt-2 inline-block px-3 py-1 rounded-xl bg-slate-800 border border-slate-700">
                <span className="text-xl font-extrabold text-white">
                  {amount.toLocaleString()} {currency}
                </span>
              </div>
            </div>

            {/* Bank Card Box */}
            <div className="my-3 p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-750 shadow-md">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1.5">
                <span>{bankName}</span>
                <span>FitAI Card</span>
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-base font-mono font-bold tracking-wider text-emerald-400 select-all">
                  {cardNumber}
                </span>
                <button
                  onClick={handleCopyCard}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    copied
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-200'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Скопировано' : 'Копия'}</span>
                </button>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-between items-center text-xs">
                <span className="text-slate-400">{t.payment.cardHolder}:</span>
                <span className="font-semibold text-slate-200">{cardHolder}</span>
              </div>
            </div>

            {/* Instructions */}
            <div className="my-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
              <span className="font-bold text-slate-200 block mb-1">
                {t.payment.instructionsTitle}
              </span>
              <p className="whitespace-pre-line text-slate-400 text-[11px] leading-relaxed">
                {instructions}
              </p>
            </div>

            {/* Receipt Upload */}
            <div className="my-3">
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {t.payment.attachReceipt}
              </label>

              {receiptImage ? (
                <div className="relative rounded-2xl overflow-hidden border border-emerald-500/50 bg-slate-950 p-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={receiptImage}
                      alt="Чек"
                      className="w-14 h-14 object-cover rounded-xl border border-slate-700"
                    />
                    <div>
                      <span className="text-xs font-bold text-emerald-400 block">
                        Чек загружен
                      </span>
                      <span className="text-[10px] text-slate-400">Готов к отправке</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setReceiptImage(null)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-750 hover:border-emerald-500/60 rounded-2xl bg-slate-950/40 cursor-pointer transition">
                  <Upload className="w-6 h-6 text-emerald-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-300">
                    {t.payment.uploadReceiptBtn}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">JPG, PNG, WEBP до 8МБ</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {errorMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <span>{t.payment.submitting}</span>
              ) : (
                <>
                  <span>{t.payment.submitBtn}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 text-center">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>После проверки Premium активируется автоматически</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

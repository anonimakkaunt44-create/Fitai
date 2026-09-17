import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingCart, Check, Sparkles, Lock, RotateCcw, DollarSign } from 'lucide-react';
import { ShoppingList, ShoppingItem } from '../types';

export const ShoppingTab: React.FC = () => {
  const { isPremium, openPaywall, token, t, haptic } = useApp();

  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && isPremium) {
      loadShoppingList();
    }
  }, [token, isPremium]);

  const loadShoppingList = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shopping/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && data.list) {
        setShoppingList(data.list);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = async (itemId: string) => {
    if (!shoppingList) return;
    haptic('light');

    setShoppingList({
      ...shoppingList,
      items: shoppingList.items.map((it) =>
        it.id === itemId ? { ...it, checked: !it.checked } : it
      ),
    });

    try {
      await fetch(`/api/shopping/${shoppingList.id}/toggle/${itemId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore
    }
  };

  const checkedCount = shoppingList?.items.filter((i) => i.checked).length || 0;
  const totalCount = shoppingList?.items.length || 0;

  // Group by category
  const categories: { [cat: string]: ShoppingItem[] } = {};
  shoppingList?.items.forEach((item) => {
    const cat = item.category || 'Разное';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(item);
  });

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-24 text-white">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          {t.shopping.title}
          <Sparkles className="w-4 h-4 text-emerald-400" />
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">{t.shopping.subtitle}</p>
      </div>

      {!isPremium ? (
        /* Paywall Block */
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Список покупок в Premium</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Автоматический расчет продуктов на неделю с категоризацией, расчетом граммовок и контролем бюджета.
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
          Формируем список покупок...
        </div>
      ) : shoppingList ? (
        <div className="space-y-4">
          {/* Budget Overview Card */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  {t.shopping.estimatedTotal}
                </span>
                <span className="text-xl font-black text-emerald-400">
                  {shoppingList.estimatedTotal.toLocaleString()} UZS
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  {t.shopping.weeklyBudget}
                </span>
                <span className="text-sm font-bold text-slate-200">
                  {shoppingList.weeklyBudget.toLocaleString()} UZS
                </span>
              </div>
            </div>

            {/* Checked progress */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Куплено:</span>
                <span className="font-bold text-white">
                  {checkedCount} из {totalCount} товаров
                </span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Categorized Items */}
          <div className="space-y-3">
            {Object.entries(categories).map(([categoryName, items]) => (
              <div
                key={categoryName}
                className="rounded-3xl bg-slate-900 border border-slate-800 p-4 space-y-2"
              >
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  {categoryName}
                </h4>

                <div className="space-y-1.5">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      onClick={() => toggleItem(it.id)}
                      className={`cursor-pointer p-2.5 rounded-xl border transition flex items-center justify-between text-xs ${
                        it.checked
                          ? 'border-slate-850 bg-slate-950/40 text-slate-500'
                          : 'border-slate-800 bg-slate-950 text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition ${
                            it.checked
                              ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                              : 'border-slate-700 bg-slate-900'
                          }`}
                        >
                          {it.checked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className={it.checked ? 'line-through text-slate-500' : 'font-medium'}>
                          {it.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-slate-400">{it.amount}</span>
                        {it.estimatedPrice > 0 && (
                          <span className="text-slate-500 font-mono">
                            ~{(it.estimatedPrice / 1000).toFixed(0)}k
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

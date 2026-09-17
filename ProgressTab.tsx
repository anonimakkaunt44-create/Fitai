import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingDown,
  Plus,
  Calendar,
  Sparkles,
  Lock,
  ChevronRight,
  Scale,
  X,
  Camera,
} from 'lucide-react';
import { ProgressLog } from '../types';

export const ProgressTab: React.FC = () => {
  const { user, isPremium, openPaywall, token, t, haptic, showToast } = useApp();

  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newWeight, setNewWeight] = useState(user?.profile?.weight?.toString() || '80');
  const [newWaist, setNewWaist] = useState(user?.profile?.waist?.toString() || '86');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (token && isPremium) {
      loadLogs();
    }
  }, [token, isPremium]);

  const loadLogs = async () => {
    try {
      const res = await fetch('/api/progress', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch {
      // ignore
    }
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight) return;

    setSaving(true);
    haptic('medium');

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          weight: Number(newWeight),
          waist: newWaist ? Number(newWaist) : undefined,
          notes: newNotes,
        }),
      });

      const data = await res.json();
      if (data.ok && data.log) {
        setLogs((prev) => [data.log, ...prev]);
        setModalOpen(false);
        showToast('Замер успешно сохранен');
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const currentWeight = user?.profile?.weight || 82;
  const targetWeight = user?.profile?.targetWeight || 72;
  const initialWeight = logs.length > 0 ? logs[logs.length - 1].weight : currentWeight + 3;
  const totalLost = (initialWeight - currentWeight).toFixed(1);

  // SVG Chart points calculation
  const chartLogs = [...logs].reverse();
  const weights = chartLogs.map((l) => l.weight);
  const minW = Math.min(...(weights.length ? weights : [currentWeight])) - 2;
  const maxW = Math.max(...(weights.length ? weights : [currentWeight])) + 2;

  const points = chartLogs.map((l, idx) => {
    const x = chartLogs.length > 1 ? (idx / (chartLogs.length - 1)) * 300 + 20 : 170;
    const y = 120 - ((l.weight - minW) / (maxW - minW || 1)) * 90;
    return { x, y, weight: l.weight, date: l.date };
  });

  const svgPolyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-24 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            {t.progress.title}
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{t.progress.subtitle}</p>
        </div>

        <button
          onClick={() => (isPremium ? setModalOpen(true) : openPaywall())}
          className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.progress.addLogBtn}</span>
        </button>
      </div>

      {!isPremium ? (
        /* Paywall Block */
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Трекер прогресса в Premium</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Следите за динамикой веса, талии и смотрите наглядные графики достижения цели.
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
          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                {t.progress.lostTotal}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-emerald-400">{totalLost}</span>
                <span className="text-xs text-slate-400 font-bold">{t.home.kg}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                {t.progress.toGoal}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-white">
                  {Math.max(0, currentWeight - targetWeight)}
                </span>
                <span className="text-xs text-slate-400 font-bold">{t.home.kg}</span>
              </div>
            </div>
          </div>

          {/* Dynamic SVG Weight Chart */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">{t.progress.weightChart}</span>
              <span className="text-[11px] text-emerald-400 font-semibold">
                Цель: {targetWeight} кг
              </span>
            </div>

            <div className="h-40 w-full relative flex items-center justify-center pt-2">
              {points.length > 0 ? (
                <svg className="w-full h-full overflow-visible" viewBox="0 0 340 140">
                  {/* Subtle Grid Lines */}
                  <line x1="20" y1="30" x2="320" y2="30" stroke="#1e293b" strokeDasharray="3 3" />
                  <line x1="20" y1="75" x2="320" y2="75" stroke="#1e293b" strokeDasharray="3 3" />
                  <line x1="20" y1="120" x2="320" y2="120" stroke="#1e293b" strokeDasharray="3 3" />

                  {/* Polyline */}
                  {points.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={svgPolyline}
                    />
                  )}

                  {/* Points */}
                  {points.map((pt, i) => (
                    <g key={i}>
                      <circle cx={pt.x} cy={pt.y} r="5" fill="#047857" stroke="#10b981" strokeWidth="2" />
                      <text
                        x={pt.x}
                        y={pt.y - 9}
                        textAnchor="middle"
                        fill="#e2e8f0"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        {pt.weight}
                      </text>
                    </g>
                  ))}
                </svg>
              ) : (
                <span className="text-xs text-slate-500">Запишите первый замер веса</span>
              )}
            </div>
          </div>

          {/* Measurement History */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4.5 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {t.progress.historyTitle}
            </h3>

            {logs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-2">
                История замеров пуста
              </p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-900 text-slate-400">
                        <Scale className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <span className="font-extrabold text-white text-sm">
                          {log.weight} кг
                        </span>
                        {log.waist && (
                          <span className="text-[11px] text-slate-400 ml-2">
                            Талия: {log.waist} см
                          </span>
                        )}
                        {log.notes && (
                          <p className="text-[10px] text-slate-500 mt-0.5">{log.notes}</p>
                        )}
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-400">
                      {new Date(log.date).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Log Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-white space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{t.progress.addLogBtn}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t.progress.enterWeight}</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{t.progress.enterWaist}</label>
                <input
                  type="number"
                  step="0.5"
                  value={newWaist}
                  onChange={(e) => setNewWaist(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{t.progress.enterNotes}</label>
                <input
                  type="text"
                  placeholder="Отличное самочувствие, бодрость"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
              >
                {t.progress.saveLog}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

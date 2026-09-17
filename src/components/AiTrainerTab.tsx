import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Bot, Send, Trash2, Sparkles, Lock, ArrowUp, User as UserIcon } from 'lucide-react';
import { AiChatMessage } from '../types';

export const AiTrainerTab: React.FC = () => {
  const { user, isPremium, openPaywall, token, t, haptic } = useApp();
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) {
      fetch('/api/ai/chat/history', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && Array.isArray(d.history)) {
            setMessages(d.history);
          }
        })
        .catch(() => {});
    }
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
    if (!textToSend || loading) return;

    if (!isPremium) {
      openPaywall();
      return;
    }

    haptic('light');
    setInputText('');

    // Optimistically append user message
    const tempUserMsg: AiChatMessage = {
      id: Date.now().toString(),
      userId: user?.id || '',
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: textToSend }),
      });

      const data = await res.json();
      if (data.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
        haptic('light');
      } else if (data.require_premium) {
        openPaywall();
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm(t.aiTrainer.clearConfirm)) return;
    try {
      await fetch('/api/ai/chat/history', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages([]);
    } catch {
      // ignore
    }
  };

  const quickPrompts = [
    t.aiTrainer.quickPrompt1,
    t.aiTrainer.quickPrompt2,
    t.aiTrainer.quickPrompt3,
    t.aiTrainer.quickPrompt4,
  ];

  return (
    <div className="max-w-md mx-auto flex flex-col h-[calc(100vh-125px)] text-white relative">
      {/* Top Coach Info Bar */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 flex items-center justify-center font-bold">
            <Bot className="w-5 h-5 text-slate-950" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-slate-900" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1">
              FitAI Coach
              <Sparkles className="w-3 h-3 text-teal-400" />
            </h3>
            <p className="text-[10px] text-slate-400">
              {user?.profile?.weight ? `Вес: ${user.profile.weight} кг • Цель: ${user.profile.targetWeight} кг` : 'Персональный AI-тренер'}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
            title={t.aiTrainer.clearHistory}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto mb-3">
              <Bot className="w-7 h-7" />
            </div>
            <h4 className="text-base font-extrabold text-white">{t.aiTrainer.title}</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
              {t.aiTrainer.subtitle}
            </p>

            {/* Quick Prompt Pills */}
            <div className="mt-5 space-y-2 text-left">
              <span className="text-[11px] font-bold text-slate-400 block px-1">
                Частые вопросы:
              </span>
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p)}
                  className="w-full text-left p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-teal-500/50 text-xs text-slate-200 transition active:scale-[0.99] flex items-center justify-between"
                >
                  <span>{p}</span>
                  <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 mt-0.5 border border-teal-500/30">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-emerald-500 text-slate-950 font-semibold rounded-tr-xs'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs whitespace-pre-line'
                  }`}
                >
                  {m.content}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex gap-2.5 justify-start items-center">
            <div className="w-7 h-7 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 border border-teal-500/30">
              <Bot className="w-4 h-4" />
            </div>
            <div className="rounded-2xl rounded-tl-xs bg-slate-900 border border-slate-800 px-4 py-2.5 text-xs text-teal-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] text-slate-400 ml-1">{t.aiTrainer.typing}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Premium Gate Overlay if not subscribed */}
      {!isPremium && (
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 border border-amber-500/40">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-white">AI-Тренер доступен в Premium</h3>
          <p className="text-xs text-slate-300 max-w-xs mt-1 leading-relaxed">
            Получите персонального наставника, который корректирует тренировки, рацион и отвечает на любые вопросы 24/7.
          </p>
          <button
            onClick={openPaywall}
            className="mt-4 py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition"
          >
            {t.home.upgradeNow}
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            placeholder={t.aiTrainer.placeholder}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading || !isPremium}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-4 pr-12 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading || !isPremium}
            className="absolute right-1.5 p-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold disabled:opacity-30 disabled:pointer-events-none transition"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

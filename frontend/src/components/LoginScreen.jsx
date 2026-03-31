import React, { useState } from 'react';
import { BotIcon } from './Icons';

const DEMO_EMAIL = 'shri@mail.com';
const DEMO_PASSWORD = 'demo123';

export default function LoginScreen({ onLogin, loading, error, theme = 'dark', onToggleTheme }) {
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onLogin(email, password);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-6 ${theme === 'dark' ? 'bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(180deg,_#08111f_0%,_#0f172a_48%,_#111827_100%)] text-white' : 'bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_35%),linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_45%,_#e2ebf7_100%)] text-slate-900'}`}>
      <div className={`w-full max-w-md rounded-[28px] backdrop-blur-xl p-8 ${theme === 'dark' ? 'border border-white/10 bg-white/5 shadow-2xl shadow-cyan-950/40' : 'border border-slate-200 bg-white/80 shadow-2xl shadow-slate-300/40'}`}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${theme === 'dark' ? 'bg-cyan-400/15 border border-cyan-300/20' : 'bg-cyan-500/10 border border-cyan-500/20'}`}>
            <BotIcon size={24} stroke={theme === 'dark' ? '#67e8f9' : '#0891b2'} strokeWidth={1.8} />
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className={`rounded-xl px-3 py-2 text-sm ${theme === 'dark' ? 'border border-white/10 text-slate-200 hover:bg-white/5' : 'border border-slate-300 text-slate-700 hover:bg-slate-100'}`}
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
        <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-500'}`}>
          Use the seeded demo account to access conversations.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className={`text-xs uppercase tracking-[0.18em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none ${theme === 'dark' ? 'bg-slate-950/50 border border-white/10 text-white focus:border-cyan-400/50' : 'bg-white border border-slate-300 text-slate-900 focus:border-cyan-500/50'}`}
              placeholder="name@example.com"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className={`text-xs uppercase tracking-[0.18em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none ${theme === 'dark' ? 'bg-slate-950/50 border border-white/10 text-white focus:border-cyan-400/50' : 'bg-white border border-slate-300 text-slate-900 focus:border-cyan-500/50'}`}
              placeholder="Password"
              autoComplete="current-password"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-cyan-400 text-slate-950 py-3 font-medium transition hover:bg-cyan-300 disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <div className={`mt-6 rounded-2xl px-4 py-3 text-xs ${theme === 'dark' ? 'border border-white/10 bg-slate-950/35 text-slate-400' : 'border border-slate-200 bg-slate-50 text-slate-500'}`}>
          Demo credentials: <span className={theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}>{DEMO_EMAIL}</span> / <span className={theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}>{DEMO_PASSWORD}</span>
        </div>
      </div>
    </div>
  );
}

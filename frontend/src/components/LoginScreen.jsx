import React, { useState } from 'react';
import { BotIcon } from './Icons';

const DEMO_EMAIL = 'shri@mail.com';
const DEMO_PASSWORD = 'demo123';

export default function LoginScreen({ onLogin, loading, error }) {
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(180deg,_#08111f_0%,_#0f172a_48%,_#111827_100%)] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-cyan-950/40 p-8">
        <div className="w-14 h-14 rounded-2xl bg-cyan-400/15 border border-cyan-300/20 flex items-center justify-center mb-6">
          <BotIcon size={24} stroke="#67e8f9" strokeWidth={1.8} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="text-sm text-slate-300 mt-2">
          Use the seeded demo account to access conversations.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl bg-slate-950/50 border border-white/10 px-4 py-3 text-sm outline-none focus:border-cyan-400/50"
              placeholder="name@example.com"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl bg-slate-950/50 border border-white/10 px-4 py-3 text-sm outline-none focus:border-cyan-400/50"
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

        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-xs text-slate-400">
          Demo credentials: <span className="text-slate-200">{DEMO_EMAIL}</span> / <span className="text-slate-200">{DEMO_PASSWORD}</span>
        </div>
      </div>
    </div>
  );
}

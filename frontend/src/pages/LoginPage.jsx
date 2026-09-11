import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, AlertOctagon, ArrowRight, KeyRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('superadmin');
  const [password, setPassword] = useState('admin123');
  const { login, isLoading, error, isLocked, remainingAttempts } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const result = await login(identifier, password);
    if (result.success) {
      if (result.user.role === 'EMPLOYEE') {
        navigate('/checkin');
      } else {
        navigate('/ops');
      }
    }
  };

  const setDemoUser = (id, pass) => {
    setIdentifier(id);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 selection:bg-sky-500/30">
      <div className="w-full max-w-md space-y-6">
        {/* Brand & System Status */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-sky-600 flex items-center justify-center mx-auto shadow-xl shadow-sky-600/30">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
            AttendX <span className="text-sky-400 font-light">Aero-Ops</span>
          </h1>
          <p className="text-xs text-zinc-500 font-mono">
            Photo-Verified Telemetry &amp; Geofenced Attendance Kernel
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Station Authentication
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              POLICY: 3-STRIKE LOCK
            </span>
          </div>

          {/* Lockout or Error Alert Banner */}
          {error && (
            <div
              className={`p-3.5 rounded-lg border text-xs font-mono flex items-start gap-2.5 ${
                isLocked
                  ? 'bg-red-500/15 border-red-500/50 text-red-300'
                  : 'bg-amber-500/15 border-amber-500/50 text-amber-300'
              }`}
            >
              <AlertOctagon size={16} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">{isLocked ? 'ACCOUNT LOCKED' : 'AUTH FAILED'}</div>
                <div className="text-[11px] mt-0.5">{error}</div>
                {remainingAttempts !== null && remainingAttempts !== undefined && !isLocked && (
                  <div className="text-[10px] text-amber-400 font-bold mt-1">
                    Remaining attempts before permanent lock: {remainingAttempts}
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-zinc-400 mb-1.5 font-medium">
                Admin Username or Employee ID
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-3 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. superadmin or EMP-90000"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3 py-2.5 text-zinc-200 focus:outline-none focus:border-sky-500 text-xs transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1.5 font-medium">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-zinc-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3 py-2.5 text-zinc-200 focus:outline-none focus:border-sky-500 text-xs transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-medium rounded-lg text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </div>
              ) : (
                <>
                  <span>Authenticate Session</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Switcher */}
          <div className="pt-4 border-t border-zinc-800 text-[11px] font-mono space-y-2">
            <span className="text-zinc-500 block uppercase text-[10px]">
              Fast Role Simulator Presets:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDemoUser('superadmin', 'admin123')}
                className="text-left p-2 rounded bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-300 transition-colors"
              >
                <div className="font-semibold text-sky-400">Super Admin</div>
                <div className="text-[10px] text-zinc-500">superadmin / admin123</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoUser('engadmin', 'section123')}
                className="text-left p-2 rounded bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-300 transition-colors"
              >
                <div className="font-semibold text-emerald-400">Section Admin</div>
                <div className="text-[10px] text-zinc-500">engadmin / section123</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoUser('EMP-9000', 'employee123')}
                className="text-left p-2 rounded bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-300 transition-colors"
              >
                <div className="font-semibold text-zinc-300">Marcus Chen</div>
                <div className="text-[10px] text-zinc-500">EMP-9000 / employee123</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoUser('EMP-10644', 'employee123')}
                className="text-left p-2 rounded bg-zinc-950 hover:bg-zinc-800/80 border border-red-500/20 text-zinc-300 transition-colors"
              >
                <div className="font-semibold text-red-400">Owen Brennan (Locked)</div>
                <div className="text-[10px] text-zinc-500">EMP-10644 (Test Lockout)</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="text-center text-[11px] font-mono text-zinc-600">
          Encrypted TLS 1.3 &bull; Back-Button Intercept Active &bull; RTK Geofence Enforced
        </div>
      </div>
    </div>
  );
}

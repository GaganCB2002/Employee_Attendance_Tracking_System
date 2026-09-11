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
    <div className="min-h-screen bg-app-bg flex flex-col justify-center items-center p-4 selection:bg-blue-500/30 transition-colors duration-200">
      <div className="w-full max-w-md space-y-6">
        {/* Brand & System Status */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto shadow-xl shadow-blue-600/30">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-app-text">
            AttendX <span className="text-blue-600 font-light">Aero-Ops</span>
          </h1>
          <p className="text-xs text-app-muted font-mono">
            Photo-Verified Telemetry &amp; Geofenced Attendance Kernel
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-app-surface border border-app-border rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-app-border">
            <span className="text-xs font-mono uppercase tracking-wider text-app-muted font-semibold">
              Station Authentication
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-700 font-bold">
              POLICY: 3-STRIKE LOCK
            </span>
          </div>

          {/* Lockout or Error Alert Banner */}
          {error && (
            <div
              className={`p-3.5 rounded-lg border text-xs font-mono flex items-start gap-2.5 ${
                isLocked
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              <AlertOctagon size={16} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">{isLocked ? 'ACCOUNT LOCKED' : 'AUTH FAILED'}</div>
                <div className="text-[11px] mt-0.5">{error}</div>
                {remainingAttempts !== null && remainingAttempts !== undefined && !isLocked && (
                  <div className="text-[10px] text-amber-600 font-bold mt-1">
                    Remaining attempts before permanent lock: {remainingAttempts}
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-app-text mb-1.5 font-medium">
                Admin Username or Employee ID
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-3 text-app-muted" />
                <input
                  type="text"
                  required
                  placeholder="e.g. superadmin or EMP-90000"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-app-bg border border-app-border rounded-lg pl-10 pr-3 py-2.5 text-app-text focus:outline-none focus:border-blue-500 text-xs transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-app-text mb-1.5 font-medium">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-app-muted" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-app-bg border border-app-border rounded-lg pl-10 pr-3 py-2.5 text-app-text focus:outline-none focus:border-blue-500 text-xs transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium rounded-lg text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
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
          <div className="pt-4 border-t border-app-border text-[11px] font-mono space-y-2">
            <span className="text-app-muted block uppercase text-[10px] font-semibold">
              Fast Role Simulator Presets:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDemoUser('superadmin', 'admin123')}
                className="text-left p-2 rounded-lg bg-app-bg hover:bg-app-surface border border-app-border text-app-text transition-colors shadow-2xs"
              >
                <div className="font-semibold text-blue-600">Super Admin</div>
                <div className="text-[10px] text-app-muted">superadmin / admin123</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoUser('engadmin', 'section123')}
                className="text-left p-2 rounded-lg bg-app-bg hover:bg-app-surface border border-app-border text-app-text transition-colors shadow-2xs"
              >
                <div className="font-semibold text-emerald-600">Section Admin</div>
                <div className="text-[10px] text-app-muted">engadmin / section123</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoUser('EMP-9000', 'employee123')}
                className="text-left p-2 rounded-lg bg-app-bg hover:bg-app-surface border border-app-border text-app-text transition-colors shadow-2xs"
              >
                <div className="font-semibold text-app-text">Marcus Chen</div>
                <div className="text-[10px] text-app-muted">EMP-9000 / employee123</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoUser('EMP-10644', 'employee123')}
                className="text-left p-2 rounded-lg bg-app-bg hover:bg-app-surface border border-red-200 text-app-text transition-colors shadow-2xs"
              >
                <div className="font-semibold text-red-600">Owen Brennan (Locked)</div>
                <div className="text-[10px] text-app-muted">EMP-10644 (Test Lockout)</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="text-center text-[11px] font-mono text-app-muted">
          Encrypted TLS 1.3 &bull; Back-Button Intercept Active &bull; RTK Geofence Enforced
        </div>
      </div>
    </div>
  );
}

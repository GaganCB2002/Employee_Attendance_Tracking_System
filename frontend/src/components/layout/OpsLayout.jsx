import React, { useState, useEffect } from 'react';
import { Menu, X, Wifi, Clock, AlertTriangle, Shield, RefreshCw } from 'lucide-react';
import Sidebar from './Sidebar';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { zulu } from '../../utils/time';

export default function OpsLayout({ children, selectedSection, onSectionChange, onResync }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const { latencyMs } = useSocket();
  const { user, isSuperAdmin } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-app-bg text-app-text font-sans flex transition-colors duration-200">
      {/* Persistent Left-Side Navigation Bar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Operations Area (Offset by left sidebar on desktop) */}
      <div className="flex-1 min-w-0 md:pl-64 flex flex-col min-h-screen">
        {/* Top Telemetry Header */}
        <header className="border-b border-app-border bg-app-header backdrop-blur-sm sticky top-0 z-30 select-none transition-colors duration-200 shadow-xs">
          <div className="flex items-center gap-3 px-4 py-2.5 overflow-x-auto">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg border border-app-border text-app-muted hover:text-app-text hover:bg-app-surface md:hidden"
              aria-label="Toggle navigation"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* Breadcrumb / Node Path */}
            <div className="flex items-center gap-2 text-[11px] font-mono text-app-muted overflow-x-auto">
              <span className="uppercase opacity-60 hidden sm:inline">Node:</span>
              <span className="px-2 py-0.5 border border-app-border rounded bg-app-surface text-app-text font-semibold">
                /HQ-Alpha
              </span>
              <span className="px-2 py-0.5 border border-app-border rounded bg-app-surface text-app-text font-semibold">
                {user?.section?.name || 'Sec-01-Aero'}
              </span>
              <span className="px-2 py-0.5 border border-emerald-500/40 rounded bg-emerald-500/10 text-emerald-600 font-semibold">
                Shift-03 (10:30-19:00)
              </span>
            </div>

            {/* Right Telemetry Controls */}
            <div className="ml-auto flex items-center gap-2.5 shrink-0">
              {/* Section Scope Switcher for Super Admin */}
              {isSuperAdmin && onSectionChange && (
                <select
                  value={selectedSection || 'ALL'}
                  onChange={(e) => onSectionChange(e.target.value)}
                  className="bg-app-surface border border-app-border text-app-text text-[11px] rounded px-2.5 py-1 font-mono focus:outline-none focus:border-blue-500 hidden lg:inline-block"
                >
                  <option value="ALL">All Sections (Universal Scope)</option>
                  <option value="SEC-A-F1">Sec-A / Flow-1 (Avionics)</option>
                  <option value="SEC-A-F2">Sec-A / Flow-2 (Propulsion)</option>
                  <option value="SEC-B-F3">Sec-B / Flow-3 (Telemetry)</option>
                  <option value="SEC-B-F4">Sec-B / Flow-4 (Structures)</option>
                  <option value="SEC-C-F5">Sec-C / Flow-5 (Navigation)</option>
                </select>
              )}

              {/* Force Resync Button */}
              {onResync && (
                <button
                  onClick={onResync}
                  className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-blue-600 hover:text-blue-700 border border-app-border rounded px-2 py-1 bg-app-surface transition-colors"
                >
                  <RefreshCw size={11} /> Resync
                </button>
              )}

              {/* WebSocket Pump Latency */}
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 border border-emerald-500/30 bg-emerald-500/10 rounded px-2 py-1 font-semibold">
                <Wifi size={12} className="animate-pulse" /> {latencyMs}ms
              </div>

              {/* UTC / Zulu Real-time Clock */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-app-muted border border-app-border rounded px-2 py-1 bg-app-surface">
                <Clock size={12} /> {zulu(now)}Z
              </div>

              {/* Emergency Override Button */}
              <button
                onClick={() => alert('Emergency Override protocol standing by. All geofence policies active.')}
                className="flex items-center gap-1.5 text-[11px] font-mono text-red-600 border border-red-500/40 bg-red-500/10 rounded px-2.5 py-1 hover:bg-red-500/20 transition-colors font-semibold"
              >
                <AlertTriangle size={12} />
                <span className="hidden xl:inline">Emergency override</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content View */}
        <main className="flex-1 p-4 md:p-6 max-w-[1500px] w-full mx-auto space-y-4">
          {children}
        </main>
      </div>
    </div>
  );
}

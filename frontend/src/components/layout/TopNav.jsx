import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  Wifi,
  Clock,
  User,
  ChevronDown,
  AlertTriangle,
  Bell,
  LogOut,
  Radar,
  LayoutGrid,
  Fingerprint,
  Compass,
  Calendar,
  History,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { zulu } from '../../utils/time';

export const NAV_ITEMS = [
  { icon: Radar, label: 'Live monitor', path: '/ops' },
  { icon: LayoutGrid, label: 'Folder View', path: '/ops/folders' },
  { icon: Compass, label: 'Geofencing', path: '/ops/geofencing' },
  { icon: Calendar, label: 'Shifts', path: '/ops/shifts' },
  { icon: History, label: 'Audit', path: '/ops/audit' },
];

export default function TopNav({ latencyMs = 42 }) {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [now, setNow] = useState(new Date());
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="border-b border-app-border bg-app-header sticky top-0 z-30 select-none shadow-xs transition-colors duration-200">
      <div className="flex items-center gap-4 px-4 py-2.5 overflow-x-auto">
        {/* Brand */}
        <div
          onClick={() => navigate('/ops')}
          className="flex items-center gap-2 shrink-0 cursor-pointer group"
        >
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20 group-hover:bg-blue-500 transition-colors">
            <Shield size={15} className="text-white" />
          </div>
          <span className="text-app-text font-bold text-sm tracking-tight font-mono">
            AttendX <span className="text-blue-600 font-normal">Ops</span>
          </span>
        </div>

        <div className="h-5 w-px bg-app-border shrink-0" />

        {/* Ops Navigation Links */}
        <nav className="flex items-center gap-2 sm:gap-4 text-xs font-mono text-app-muted shrink-0">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-1.5 px-2 py-1 transition-colors font-medium ${
                  isActive
                    ? 'text-blue-600 border-b-2 border-blue-600 font-bold'
                    : 'hover:text-app-text'
                }`}
              >
                <Icon size={13} className={isActive ? 'text-blue-600' : ''} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Telemetry Indicators */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* Socket latency */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 border border-emerald-500/30 bg-emerald-500/10 rounded px-2 py-1 font-semibold">
            <Wifi size={12} className="animate-pulse" /> {latencyMs}ms
          </div>

          {/* Zulu Clock */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-app-muted border border-app-border rounded px-2 py-1 bg-app-surface">
            <Clock size={12} /> {zulu(now)}Z
          </div>

          {/* User Account Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-1.5 text-[11px] font-mono text-app-text border border-app-border rounded px-2 py-1 hover:bg-app-surface transition-colors font-semibold"
            >
              <User size={12} className="text-blue-600" />
              <span className="max-w-[120px] truncate">
                {user?.name || (isSuperAdmin ? 'Super Admin' : 'Admin')}
              </span>
              <ChevronDown size={12} className="text-app-muted" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-52 bg-app-surface border border-app-border rounded-xl shadow-xl py-1 z-50 text-xs font-mono">
                <div className="px-3 py-2 border-b border-app-border text-[11px] text-app-muted">
                  <div className="text-app-text font-bold">{user?.name}</div>
                  <div className="text-app-muted">{user?.role}</div>
                  {user?.section && (
                    <div className="text-blue-600 text-[10px] mt-0.5">{user.section.name}</div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={13} /> Disconnect Session
                </button>
              </div>
            )}
          </div>

          {/* Emergency Override Button */}
          <button
            onClick={() => alert('Emergency Override protocol standing by. All geofence policies active.')}
            className="flex items-center gap-1.5 text-[11px] font-mono text-red-400 border border-red-500/40 bg-red-500/10 rounded px-2 py-1 hover:bg-red-500/20 transition-colors"
          >
            <AlertTriangle size={12} />
            <span className="hidden md:inline">Emergency override</span>
          </button>
        </div>
      </div>
    </header>
  );
}

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
    <header className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-30 select-none">
      <div className="flex items-center gap-4 px-4 py-2.5 overflow-x-auto">
        {/* Brand */}
        <div
          onClick={() => navigate('/ops')}
          className="flex items-center gap-2 shrink-0 cursor-pointer group"
        >
          <div className="w-7 h-7 rounded bg-sky-600 flex items-center justify-center shadow-lg shadow-sky-600/20 group-hover:bg-sky-500 transition-colors">
            <Shield size={15} className="text-white" />
          </div>
          <span className="text-zinc-100 font-semibold text-sm tracking-tight font-mono">
            AttendX <span className="text-sky-400 font-normal">Ops</span>
          </span>
        </div>

        <div className="h-5 w-px bg-zinc-800 shrink-0" />

        {/* Ops Navigation Links */}
        <nav className="flex items-center gap-2 sm:gap-4 text-xs font-mono text-zinc-500 shrink-0">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-1.5 px-2 py-1 transition-colors ${
                  isActive
                    ? 'text-zinc-100 border-b-2 border-sky-500 font-medium'
                    : 'hover:text-zinc-300'
                }`}
              >
                <Icon size={13} className={isActive ? 'text-sky-400' : ''} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Telemetry Indicators */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* Socket latency */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded px-2 py-1">
            <Wifi size={12} className="animate-pulse" /> {latencyMs}ms
          </div>

          {/* Zulu Clock */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 border border-zinc-800 rounded px-2 py-1 bg-zinc-900/50">
            <Clock size={12} /> {zulu(now)}Z
          </div>

          {/* User Account Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-300 border border-zinc-800 rounded px-2 py-1 hover:bg-zinc-900 transition-colors"
            >
              <User size={12} className="text-sky-400" />
              <span className="max-w-[120px] truncate">
                {user?.name || (isSuperAdmin ? 'Super Admin' : 'Admin')}
              </span>
              <ChevronDown size={12} className="text-zinc-500" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-52 bg-zinc-900 border border-zinc-800 rounded shadow-xl py-1 z-50 text-xs font-mono">
                <div className="px-3 py-2 border-b border-zinc-800 text-[11px] text-zinc-400">
                  <div className="text-zinc-200 font-semibold">{user?.name}</div>
                  <div className="text-zinc-500">{user?.role}</div>
                  {user?.section && (
                    <div className="text-sky-400 text-[10px] mt-0.5">{user.section.name}</div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 text-red-400 hover:bg-zinc-800/80 transition-colors"
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

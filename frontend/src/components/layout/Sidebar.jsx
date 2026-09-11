import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield,
  Radar,
  FolderTree,
  Compass,
  Calendar,
  History,
  Fingerprint,
  ShieldAlert,
  Users,
  LogOut,
  Radio,
  ExternalLink,
  ChevronRight,
  Activity,
  MapPin,
  Lock,
  Tv,
  Building2,
  Layers,
  FileText,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const SIDEBAR_NAV_ITEMS = [
  { icon: Radar, label: 'Live Monitor', to: '/ops', badge: 'OPS' },
  { icon: Tv, label: 'Live TV', to: '/live-tv', badge: 'LIVE', highlight: true },
  { icon: Users, label: 'Employees', to: '/employees' },
  { icon: Building2, label: 'Departments', to: '/departments' },
  { icon: Layers, label: 'Floors', to: '/floors' },
  { icon: FolderTree, label: 'Attendance', to: '/ops/folders' },
  { icon: FileText, label: 'Reports', to: '/reports' },
  { icon: Compass, label: 'GPS Geofencing', to: '/ops/geofencing' },
  { icon: Calendar, label: 'Shift Engine', to: '/ops/shifts' },
  { icon: Settings, label: 'Settings & Theme', to: '/settings' },
  { icon: History, label: 'Security Audit', to: '/ops/audit' },
  { icon: Fingerprint, label: 'Employee Check-in', to: '/checkin', external: true },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 border-r border-zinc-800/90 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Kernel Header */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between">
          <div
            onClick={() => navigate('/ops')}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center shadow-lg shadow-sky-600/30 group-hover:bg-sky-500 transition-colors">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <div className="text-zinc-100 font-bold text-sm tracking-tight font-mono flex items-center gap-1.5">
                AttendX <span className="text-sky-400 font-light">Ops</span>
              </div>
              <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Telemetry Kernel v2.0</span>
              </div>
            </div>
          </div>

          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
            {isSuperAdmin ? 'SUPER' : 'SECTION'}
          </span>
        </div>

        {/* Scope Node Tag */}
        <div className="px-4 py-2 border-b border-zinc-800/60 bg-zinc-900/30 flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <span className="text-zinc-500 text-[10px] uppercase">Active Scope</span>
          <span className="text-sky-400 truncate max-w-[130px]" title={user?.section?.name || 'All Sections'}>
            {user?.section?.name || 'Universal (HQ)'}
          </span>
        </div>

        {/* Navigation Topic Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-2 pt-1 pb-1 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            Operations &amp; Control
          </div>

          {SIDEBAR_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/ops'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono transition-all group ${
                    isActive
                      ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/70 border border-transparent'
                  }`
                }
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon size={16} className="shrink-0 group-hover:text-sky-400 transition-colors" />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {item.badge}
                  </span>
                ) : item.external ? (
                  <ExternalLink size={12} className="text-zinc-600 group-hover:text-zinc-400" />
                ) : null}
              </NavLink>
            );
          })}

          {/* Quick System Links */}
          <div className="pt-4 px-2 pb-1 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            Perimeter Security
          </div>

          <NavLink
            to="/ops/audit"
            onClick={onClose}
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/70 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert size={15} className="text-red-400" />
              <span>3-Strike Lockouts</span>
            </div>
            <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-1.5 rounded border border-red-500/30">
              POLICY
            </span>
          </NavLink>

          <NavLink
            to="/ops/geofencing"
            onClick={onClose}
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/70 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <MapPin size={15} className="text-emerald-400" />
              <span>HQ Geofence Radar</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">
              50M
            </span>
          </NavLink>
        </div>

        {/* Live Vector Telemetry Widget */}
        <div className="p-3 mx-3 mb-3 rounded-lg bg-zinc-900/80 border border-zinc-800/80 font-mono text-[11px] space-y-1.5">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1">
              <Radio size={12} className="text-emerald-400 animate-pulse" />
              RTK FIX ACTIVE
            </span>
            <span className="text-emerald-400 text-[10px]">DUAL-NODE</span>
          </div>
          <div className="text-[10px] text-zinc-500">
            LATERAL &plusmn;0.4m &bull; GEOFENCE: ARMED
          </div>
        </div>

        {/* Operator Profile & Disconnect Session */}
        <div className="p-3 border-t border-zinc-800/90 bg-zinc-950/90">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-mono font-semibold text-zinc-200 truncate">
                {user?.name || (isSuperAdmin ? 'Super Admin' : 'Station Admin')}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 truncate">
                {user?.role || 'OPERATOR'} &bull; ID: {user?.id?.slice(0, 6)}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
              title="Disconnect Session"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

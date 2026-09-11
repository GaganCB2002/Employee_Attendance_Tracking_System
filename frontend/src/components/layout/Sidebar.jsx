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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-app-sidebar border-r border-app-border flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 shadow-lg ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Kernel Header */}
        <div className="p-4 border-b border-app-border bg-app-sidebar flex items-center justify-between">
          <div
            onClick={() => navigate('/ops')}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30 group-hover:bg-blue-500 transition-colors">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <div className="text-app-text font-bold text-sm tracking-tight font-mono flex items-center gap-1.5">
                AttendX <span className="text-blue-600 font-light">Ops</span>
              </div>
              <div className="text-[10px] text-app-muted font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Telemetry Kernel v2.0</span>
              </div>
            </div>
          </div>

          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-app-surface border border-app-border text-app-muted font-semibold">
            {isSuperAdmin ? 'SUPER' : 'SECTION'}
          </span>
        </div>

        {/* Scope Node Tag */}
        <div className="px-4 py-2 border-b border-app-border bg-app-surface/50 flex items-center justify-between text-[11px] font-mono text-app-muted">
          <span className="text-[10px] uppercase font-semibold">Active Scope</span>
          <span className="text-blue-600 font-bold truncate max-w-[130px]" title={user?.section?.name || 'All Sections'}>
            {user?.section?.name || 'Universal (HQ)'}
          </span>
        </div>

        {/* Navigation Topic Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-2 pt-1 pb-1 text-[10px] font-mono text-app-muted uppercase tracking-wider font-semibold">
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
                      ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-xs font-bold'
                      : 'text-app-muted hover:text-app-text hover:bg-app-surface border border-transparent'
                  }`
                }
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon size={16} className="shrink-0 group-hover:text-blue-600 transition-colors" />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold">
                    {item.badge}
                  </span>
                ) : item.external ? (
                  <ExternalLink size={12} className="text-app-muted group-hover:text-app-text" />
                ) : null}
              </NavLink>
            );
          })}

          {/* Quick System Links */}
          <div className="pt-4 px-2 pb-1 text-[10px] font-mono text-app-muted uppercase tracking-wider font-semibold">
            Perimeter Security
          </div>

          <NavLink
            to="/ops/audit"
            onClick={onClose}
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-app-muted hover:text-app-text hover:bg-app-surface transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert size={15} className="text-red-500" />
              <span>3-Strike Lockouts</span>
            </div>
            <span className="text-[10px] font-mono text-red-600 bg-red-100 px-1.5 rounded border border-red-300 font-semibold">
              POLICY
            </span>
          </NavLink>

          <NavLink
            to="/ops/geofencing"
            onClick={onClose}
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-app-muted hover:text-app-text hover:bg-app-surface transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <MapPin size={15} className="text-emerald-600" />
              <span>HQ Geofence Radar</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 font-bold">
              50M
            </span>
          </NavLink>
        </div>

        {/* Live Vector Telemetry Widget */}
        <div className="p-3 mx-3 mb-3 rounded-xl bg-app-surface border border-app-border font-mono text-[11px] space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-app-text font-semibold">
            <span className="flex items-center gap-1">
              <Radio size={12} className="text-emerald-600 animate-pulse" />
              RTK FIX ACTIVE
            </span>
            <span className="text-emerald-600 text-[10px] font-bold">DUAL-NODE</span>
          </div>
          <div className="text-[10px] text-app-muted">
            LATERAL &plusmn;0.4m &bull; GEOFENCE: ARMED
          </div>
        </div>

        {/* Operator Profile & Disconnect Session */}
        <div className="p-3 border-t border-app-border bg-app-sidebar">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-mono font-bold text-app-text truncate">
                {user?.name || (isSuperAdmin ? 'Super Admin' : 'Station Admin')}
              </div>
              <div className="text-[10px] font-mono text-app-muted truncate">
                {user?.role || 'OPERATOR'} &bull; ID: {user?.id?.slice(0, 6)}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-app-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

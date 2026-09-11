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
  Menu,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUiStore } from '../../store/uiStore';

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
  const { isCollapsed, toggleCollapse, mobileDrawerOpen, setMobileDrawerOpen } = useUiStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const effectiveDrawerOpen = isOpen !== undefined ? isOpen : mobileDrawerOpen;
  const handleClose = onClose || (() => setMobileDrawerOpen(false));

  return (
    <>
      {/* Mobile Backdrop */}
      {effectiveDrawerOpen && (
        <div
          onClick={handleClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden animate-fadeIn"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-app-sidebar border-r border-app-border flex flex-col transition-all duration-300 ease-in-out shadow-lg ${
          // Mobile state
          effectiveDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${
          // Desktop width: w-16 (logo only) vs w-64 (open text)
          isCollapsed ? 'md:w-16' : 'md:w-64'
        }`}
      >
        {/* Brand & Kernel Header */}
        <div className={`border-b border-app-border bg-app-sidebar flex items-center transition-all duration-300 ${
          isCollapsed ? 'p-3 justify-center' : 'p-4 justify-between'
        }`}>
          {isCollapsed ? (
            /* Logo Only Mode: Centered Shield Logo with Expand Action */
            <button
              onClick={toggleCollapse}
              className="w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-600/30 transition-transform active:scale-95 group"
              title="Click to Open Text (Expand Navigation)"
              aria-label="Click to Open Text (Expand Navigation)"
            >
              <Shield size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          ) : (
            /* Full Text Mode: Logo + Title + 3-Line Collapse Button */
            <>
              <div
                onClick={() => navigate('/ops')}
                className="flex items-center gap-2.5 cursor-pointer group select-none min-w-0"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30 group-hover:bg-blue-500 transition-colors shrink-0">
                  <Shield size={18} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-app-text font-bold text-sm tracking-tight font-mono flex items-center gap-1.5 truncate">
                    AttendX <span className="text-blue-600 font-light">Ops</span>
                  </div>
                  <div className="text-[10px] text-app-muted font-mono flex items-center gap-1 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Telemetry v2.0</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-app-surface border border-app-border text-app-muted font-semibold hidden sm:inline">
                  {isSuperAdmin ? 'SUPER' : 'SECTION'}
                </span>
                {/* 3-Line Hamburger Collapse Button inside Header */}
                <button
                  onClick={toggleCollapse}
                  className="p-1 rounded text-app-muted hover:text-app-text hover:bg-app-surface transition-colors"
                  title="Collapse to Logo Only (3 Lines)"
                  aria-label="Collapse to Logo Only (3 Lines)"
                >
                  <Menu size={16} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Scope Node Tag (Visible only in Full Text Mode) */}
        {!isCollapsed && (
          <div className="px-4 py-2 border-b border-app-border bg-app-surface/50 flex items-center justify-between text-[11px] font-mono text-app-muted transition-opacity duration-200">
            <span className="text-[10px] uppercase font-semibold">Active Scope</span>
            <span className="text-blue-600 font-bold truncate max-w-[130px]" title={user?.section?.name || 'All Sections'}>
              {user?.section?.name || 'Universal (HQ)'}
            </span>
          </div>
        )}

        {/* Navigation Topic Links */}
        <div className={`flex-1 overflow-y-auto space-y-1 ${isCollapsed ? 'p-2' : 'p-3'}`}>
          {!isCollapsed && (
            <div className="px-2 pt-1 pb-1 text-[10px] font-mono text-app-muted uppercase tracking-wider font-semibold">
              Operations &amp; Control
            </div>
          )}

          {SIDEBAR_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/ops'}
                onClick={handleClose}
                title={item.label}
                className={({ isActive }) =>
                  `flex items-center rounded-lg text-xs font-mono transition-all group ${
                    isCollapsed
                      ? 'justify-center p-2.5 mx-auto'
                      : 'justify-between px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-xs font-bold'
                      : 'text-app-muted hover:text-app-text hover:bg-app-surface border border-transparent'
                  }`
                }
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                  <Icon
                    size={isCollapsed ? 20 : 16}
                    className="shrink-0 group-hover:text-blue-600 transition-colors"
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && (
                  <>
                    {item.badge ? (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold">
                        {item.badge}
                      </span>
                    ) : item.external ? (
                      <ExternalLink size={12} className="text-app-muted group-hover:text-app-text" />
                    ) : null}
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Quick System Links */}
          {!isCollapsed && (
            <div className="pt-4 px-2 pb-1 text-[10px] font-mono text-app-muted uppercase tracking-wider font-semibold">
              Perimeter Security
            </div>
          )}

          {/* 3-Strike Lockouts */}
          <NavLink
            to="/ops/audit"
            onClick={handleClose}
            title="3-Strike Lockouts Policy"
            className={({ isActive }) =>
              `flex items-center rounded-lg text-xs font-mono transition-all ${
                isCollapsed
                  ? 'justify-center p-2.5 mx-auto text-red-500 hover:bg-red-50'
                  : 'justify-between px-3 py-2 text-app-muted hover:text-app-text hover:bg-app-surface'
              } ${isActive ? 'bg-red-50 text-red-600 font-bold' : ''}`
            }
          >
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
              <ShieldAlert size={isCollapsed ? 20 : 15} className="text-red-500 shrink-0" />
              {!isCollapsed && <span>3-Strike Lockouts</span>}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] font-mono text-red-600 bg-red-100 px-1.5 rounded border border-red-300 font-semibold">
                POLICY
              </span>
            )}
          </NavLink>

          {/* HQ Geofence Radar */}
          <NavLink
            to="/ops/geofencing"
            onClick={handleClose}
            title="HQ Geofence Radar (50M)"
            className={({ isActive }) =>
              `flex items-center rounded-lg text-xs font-mono transition-all ${
                isCollapsed
                  ? 'justify-center p-2.5 mx-auto text-emerald-600 hover:bg-emerald-50'
                  : 'justify-between px-3 py-2 text-app-muted hover:text-app-text hover:bg-app-surface'
              } ${isActive ? 'bg-emerald-50 text-emerald-600 font-bold' : ''}`
            }
          >
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
              <MapPin size={isCollapsed ? 20 : 15} className="text-emerald-600 shrink-0" />
              {!isCollapsed && <span>HQ Geofence Radar</span>}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] font-mono text-emerald-600 font-bold">
                50M
              </span>
            )}
          </NavLink>
        </div>

        {/* Live Vector Telemetry Widget */}
        {isCollapsed ? (
          <div className="py-3 flex justify-center border-t border-app-border" title="RTK Dual-Node Telemetry Active">
            <Radio size={16} className="text-emerald-600 animate-pulse" />
          </div>
        ) : (
          <div className="p-3 mx-3 mb-3 rounded-xl bg-app-surface border border-app-border font-mono text-[11px] space-y-1.5 shadow-xs transition-opacity duration-200">
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
        )}

        {/* Operator Profile & Disconnect Session */}
        <div className="p-3 border-t border-app-border bg-app-sidebar">
          {isCollapsed ? (
            <div className="flex justify-center">
              <button
                onClick={handleLogout}
                className="p-2 text-app-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title={`Logout (${user?.name || 'Operator'})`}
                aria-label="Disconnect Session"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
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
          )}
        </div>
      </aside>
    </>
  );
}

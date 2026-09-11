import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Tv,
  Maximize,
  Minimize,
  Play,
  Pause,
  RefreshCw,
  Search,
  Filter,
  Users,
  UserCheck,
  Activity,
  Coffee,
  PhoneCall,
  Video,
  Clock,
  AlertTriangle,
  Flame,
  Moon,
  ChevronRight,
  ShieldAlert,
  Bell,
  Building2,
  Layers,
  CheckCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import OpsLayout from '../components/layout/OpsLayout';
import EmployeeProfileModal from '../components/EmployeeProfileModal';

export default function LiveTvPage() {
  const { token, user } = useAuth();

  // Core data states
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);

  // TV Modes & Controls
  const [isTvMode, setIsTvMode] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [rotationIntervalSeconds, setRotationIntervalSeconds] = useState(20);
  const [activeRotationScreen, setActiveRotationScreen] = useState(0); // 0: All, 1: Depts, 2: Floors, 3: Late/Alerts

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedFloor, setSelectedFloor] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Employee Profile Modal state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  // Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Alerts Panel
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);

  // Fetch Live TV Data
  const fetchData = async () => {
    try {
      const res = await fetch('/api/live-tv', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastUpdated(new Date());
        setIsConnected(true);
        setError(null);
      } else {
        setError(json.error || 'Failed to load telemetry');
      }
    } catch (err) {
      console.error('[LIVE_TV] Fetch error:', err);
      setIsConnected(false);
      setError('Connection interrupted. Retrying...');
    } finally {
      setIsLoading(false);
    }
  };

  // Clock tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Polling data every 5 seconds (with socket fallback)
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // Slideshow auto-rotation timer
  useEffect(() => {
    if (!isAutoRotating) return;
    const rotateTimer = setInterval(() => {
      setActiveRotationScreen((prev) => (prev + 1) % 4);
    }, rotationIntervalSeconds * 1000);
    return () => clearInterval(rotateTimer);
  }, [isAutoRotating, rotationIntervalSeconds]);

  // Handle Fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsTvMode(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsTvMode(false);
    }
  };

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    if (!data?.employees) return [];
    return data.employees.filter((emp) => {
      const matchSearch =
        !searchQuery ||
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchDept = selectedDept === 'ALL' || emp.departmentId === selectedDept || emp.department === selectedDept;
      const matchFloor = selectedFloor === 'ALL' || emp.floorId === selectedFloor || emp.floor === selectedFloor;
      const matchStatus = selectedStatus === 'ALL' || emp.status === selectedStatus;

      return matchSearch && matchDept && matchFloor && matchStatus;
    });
  }, [data, searchQuery, selectedDept, selectedFloor, selectedStatus]);

  // Summary counts
  const summary = data?.summary || {
    totalEmployees: 0,
    loggedIn: 0,
    active: 0,
    idle: 0,
    onBreak: 0,
    onCall: 0,
    meeting: 0,
    away: 0,
    notLoggedIn: 0,
    late: 0,
    longIdle: 0,
    longBreak: 0,
    offline: 0,
  };

  const ratios = data?.ratios || {
    attendancePercent: 0,
    activePercent: 0,
    idlePercent: 0,
    latePercent: 0,
  };

  // Formatted date and time in Asia/Kolkata
  const formattedDate = currentTime.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedClock = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const content = (
    <div className={`space-y-4 font-mono transition-all ${isTvMode ? 'p-6 bg-app-bg min-h-screen' : ''}`}>
      {/* ========================================================================= */}
      {/* 1. ENTERPRISE LIVE TV HEADER */}
      {/* ========================================================================= */}
      <div className="bg-app-surface border border-app-border rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Company & Title */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-inner">
            <Tv size={24} className="animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] text-app-muted uppercase tracking-widest flex items-center gap-2">
              <span>ATTENDX TELEMETRY SYSTEMS</span>
              <span className="text-zinc-600">&bull;</span>
              <span className="text-sky-400">ZONE ASIA/KOLKATA</span>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-app-text tracking-tight flex items-center gap-2">
              LIVE WORKFORCE MONITORING
              {isAutoRotating && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  SLIDESHOW: SCREEN {activeRotationScreen + 1}/4
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Live Status Beacon & Real-Time Clock */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs text-app-muted">{formattedDate}</span>
            <span className="text-base font-bold text-sky-400 font-mono tracking-wider">{formattedClock}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-app-border">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
            <span className="text-xs font-semibold text-zinc-200">
              {isConnected ? '● LIVE' : '⚠ RECONNECTING'}
            </span>
          </div>

          {/* Controls: Alerts toggle, Auto-Rotate, TV Fullscreen */}
          <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-lg border border-app-border">
            {/* Alerts toggle button */}
            <button
              onClick={() => setShowAlertsPanel(!showAlertsPanel)}
              className="p-2 text-zinc-400 hover:text-amber-400 rounded transition-colors relative"
              title="Live Alerts"
            >
              <Bell size={16} />
              {data?.alerts && data.alerts.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>

            {/* Slideshow rotation toggle */}
            <button
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              className={`p-2 rounded transition-colors flex items-center gap-1 text-xs ${
                isAutoRotating
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              }`}
              title="Toggle Auto Rotation Slideshow"
            >
              {isAutoRotating ? <Pause size={14} /> : <Play size={14} />}
              <span className="hidden md:inline">Auto-Rotate</span>
            </button>

            {/* Rotation speed select */}
            {isAutoRotating && (
              <select
                value={rotationIntervalSeconds}
                onChange={(e) => setRotationIntervalSeconds(Number(e.target.value))}
                className="bg-zinc-950 text-xs text-purple-300 border border-purple-500/40 rounded px-1.5 py-1"
              >
                <option value={10}>10s</option>
                <option value={20}>20s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
              </select>
            )}

            {/* Fullscreen TV Mode */}
            <button
              onClick={toggleFullscreen}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isTvMode
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-sky-600 text-white hover:bg-sky-500 shadow-lg shadow-sky-600/20'
              }`}
            >
              {isTvMode ? <Minimize size={14} /> : <Maximize size={14} />}
              <span>{isTvMode ? 'EXIT TV MODE' : 'ENTER TV MODE'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP SUMMARY CARDS (Real-time Totals calculated dynamically) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <SummaryCard
          title="TOTAL EMPLOYEES"
          count={summary.totalEmployees}
          icon={Users}
          color="sky"
          subtitle="Registered Roster"
        />
        <SummaryCard
          title="LOGGED IN"
          count={summary.loggedIn}
          icon={UserCheck}
          color="emerald"
          badge={`${ratios.attendancePercent}%`}
        />
        <SummaryCard
          title="ACTIVE"
          count={summary.active}
          icon={Activity}
          color="emerald"
          badge={`${ratios.activePercent}%`}
        />
        <SummaryCard
          title="IDLE"
          count={summary.idle}
          icon={Clock}
          color="amber"
          badge={`${ratios.idlePercent}%`}
        />
        <SummaryCard
          title="ON BREAK"
          count={summary.onBreak}
          icon={Coffee}
          color="orange"
          subtitle="Break Active"
        />
        <SummaryCard
          title="ON CALL"
          count={summary.onCall}
          icon={PhoneCall}
          color="cyan"
          subtitle="Voice / Comms"
        />
        <SummaryCard
          title="IN MEETING"
          count={summary.meeting}
          icon={Video}
          color="purple"
          subtitle="Conference"
        />
        <SummaryCard
          title="AWAY"
          count={summary.away}
          icon={Moon}
          color="yellow"
          subtitle="Station Away"
        />
        <SummaryCard
          title="NOT LOGGED IN"
          count={summary.notLoggedIn}
          icon={Users}
          color="zinc"
          subtitle="Expected"
        />
        <SummaryCard
          title="LATE ARRIVAL"
          count={summary.late}
          icon={AlertTriangle}
          color="rose"
          badge={`${ratios.latePercent}%`}
          isHighlight={summary.late > 0}
        />
        <SummaryCard
          title="LONG IDLE"
          count={summary.longIdle}
          icon={Flame}
          color="orange"
          subtitle="&gt; 30m Idle"
          isHighlight={summary.longIdle > 0}
        />
        <SummaryCard
          title="LONG BREAK"
          count={summary.longBreak}
          icon={Flame}
          color="red"
          subtitle="&gt; 30m Break"
          isHighlight={summary.longBreak > 0}
        />
        <SummaryCard
          title="OFFLINE"
          count={summary.offline}
          icon={Moon}
          color="slate"
          subtitle="Disconnected"
        />
      </div>

      {/* ========================================================================= */}
      {/* 3. ROTATION SLIDESHOW CONTENT: SCREEN 1 (Ratios) or SCREEN 2 (Depts) */}
      {/* ========================================================================= */}
      {isAutoRotating && activeRotationScreen === 1 && (
        <div className="bg-app-surface border border-purple-500/40 rounded-xl p-4 shadow-xl animate-fadeIn">
          <h2 className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Building2 size={16} /> Department Breakdown &amp; Segregation Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {data?.departments?.map((d) => (
              <div
                key={d.id}
                className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 space-y-2 hover:border-purple-500/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-zinc-100">{d.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                    Total: {d.total}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[11px] font-mono text-zinc-400">
                  <div>🟢 Active: <span className="text-emerald-400 font-bold">{d.active}</span></div>
                  <div>🟡 Idle: <span className="text-amber-400 font-bold">{d.idle}</span></div>
                  <div>🟠 Break: <span className="text-orange-400 font-bold">{d.break}</span></div>
                  <div>🔵 Call: <span className="text-sky-400 font-bold">{d.call}</span></div>
                  <div>🔴 Late: <span className="text-rose-400 font-bold">{d.late}</span></div>
                  <div>⚫ Off: <span className="text-zinc-500 font-bold">{d.offline}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAutoRotating && activeRotationScreen === 2 && (
        <div className="bg-app-surface border border-purple-500/40 rounded-xl p-4 shadow-xl animate-fadeIn">
          <h2 className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Layers size={16} /> Floor Segregation &amp; Real-time Occupancy
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {data?.floors?.map((f) => (
              <div
                key={f.id}
                className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 space-y-1.5"
              >
                <div className="text-xs text-sky-400 font-mono">Level {f.level}</div>
                <div className="font-bold text-sm text-zinc-100 truncate">{f.name}</div>
                <div className="text-2xl font-bold text-emerald-400">{f.active} <span className="text-xs text-zinc-500 font-normal">Active</span></div>
                <div className="text-[10px] text-zinc-400">Total Assigned: {f.total}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DYNAMIC FILTERS PANEL (Dept, Floor, Status, Search) */}
      {/* ========================================================================= */}
      <div className="bg-app-surface border border-app-border rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* Search input */}
        <div className="flex items-center gap-2 min-w-[240px] flex-1">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Employee Name, ID, or Dept..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-app-border rounded-lg text-xs text-app-text placeholder-zinc-500 focus:outline-hidden focus:border-sky-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 text-xs text-app-muted">
            <Building2 size={13} />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-zinc-900 border border-app-border rounded-lg px-2.5 py-1.5 text-xs text-app-text focus:outline-hidden focus:border-sky-500"
            >
              <option value="ALL">All Departments</option>
              {data?.departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.total})
                </option>
              ))}
            </select>
          </div>

          {/* Floor Filter */}
          <div className="flex items-center gap-1.5 text-xs text-app-muted">
            <Layers size={13} />
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="bg-zinc-900 border border-app-border rounded-lg px-2.5 py-1.5 text-xs text-app-text focus:outline-hidden focus:border-sky-500"
            >
              <option value="ALL">All Floors</option>
              {data?.floors?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.total})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-app-muted">
            <Filter size={13} />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-zinc-900 border border-app-border rounded-lg px-2.5 py-1.5 text-xs text-app-text focus:outline-hidden focus:border-sky-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">🟢 Active</option>
              <option value="IDLE">🟡 Idle</option>
              <option value="LONG_IDLE">🟠 Long Idle</option>
              <option value="BREAK">🟠 On Break</option>
              <option value="LONG_BREAK">🔴 Long Break</option>
              <option value="ON_CALL">🔵 On Call</option>
              <option value="MEETING">🟣 In Meeting</option>
              <option value="AWAY">🟡 Away</option>
              <option value="LATE">🔴 Late</option>
              <option value="OFFLINE">⚫ Offline</option>
              <option value="NOT_LOGGED_IN">⚪ Not Logged In</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(selectedDept !== 'ALL' || selectedFloor !== 'ALL' || selectedStatus !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedDept('ALL');
                setSelectedFloor('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
            >
              Reset
            </button>
          )}

          <div className="text-[11px] text-zinc-500 pl-2">
            Showing <span className="text-sky-400 font-bold">{filteredEmployees.length}</span> of{' '}
            {data?.employees?.length || 0}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. LARGE LIVE EMPLOYEE TABLE (TV Optimized, prominent names, accessible) */}
      {/* ========================================================================= */}
      <div className="bg-app-surface border border-app-border rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-app-border bg-app-bg text-[11px] uppercase tracking-wider text-app-muted font-bold">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-3">Employee ID</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Floor</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Login Time</th>
                <th className="py-3 px-3">Active Time</th>
                <th className="py-3 px-3">Idle Time</th>
                <th className="py-3 px-3">Break Time</th>
                <th className="py-3 px-3">Call Time</th>
                <th className="py-3 px-3">Last Activity</th>
                <th className="py-3 px-3 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border text-xs">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-app-muted">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Users size={32} className="mx-auto text-zinc-600" />
                      <div className="text-sm font-semibold text-zinc-300">No employees found</div>
                      <div className="text-[11px] text-zinc-500">Try adjusting or resetting your active filters.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isLate = emp.status === 'LATE';
                  const isLongIdle = emp.status === 'LONG_IDLE';
                  const isLongBreak = emp.status === 'LONG_BREAK';

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedEmployeeId(emp.id)}
                      className={`hover:bg-zinc-800/50 cursor-pointer transition-colors ${
                        isLate
                          ? 'bg-rose-950/20'
                          : isLongIdle || isLongBreak
                          ? 'bg-amber-950/20'
                          : ''
                      }`}
                    >
                      {/* Employee Name Prominent */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={emp.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=dbeafe&color=1d4ed8`}
                            alt={emp.name}
                            className="w-9 h-9 rounded-full object-cover border border-blue-400/40 shrink-0"
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=dbeafe&color=1d4ed8`;
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-app-text truncate hover:text-sky-400 transition-colors">
                              {emp.name}
                            </div>
                            <div className="text-[10px] text-app-muted truncate">
                              {emp.jobTitle}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td className="py-3 px-3 font-mono text-zinc-400">{emp.employeeCode}</td>

                      {/* Department */}
                      <td className="py-3 px-3 font-semibold text-app-text">
                        <span className="px-2 py-0.5 rounded bg-app-bg border border-app-border text-[11px]">
                          {emp.department}
                        </span>
                      </td>

                      {/* Floor */}
                      <td className="py-3 px-3 text-zinc-400 text-[11px]">{emp.floor}</td>

                      {/* Status with colored dot + text */}
                      <td className="py-3 px-3">
                        <StatusBadge status={emp.status} displayStatus={emp.displayStatus} />
                      </td>

                      {/* Login Time */}
                      <td className="py-3 px-3 text-zinc-300 font-mono">{emp.loginTime}</td>

                      {/* Active Time */}
                      <td className="py-3 px-3 font-bold text-emerald-400 font-mono">{emp.activeTime}</td>

                      {/* Idle Time */}
                      <td className={`py-3 px-3 font-mono ${isLongIdle ? 'text-amber-400 font-bold' : 'text-zinc-400'}`}>
                        {emp.idleTime}
                      </td>

                      {/* Break Time */}
                      <td className={`py-3 px-3 font-mono ${isLongBreak ? 'text-rose-400 font-bold' : 'text-zinc-400'}`}>
                        {emp.breakTime}
                      </td>

                      {/* Call Time */}
                      <td className="py-3 px-3 text-sky-400 font-mono">{emp.callTime}</td>

                      {/* Last Activity */}
                      <td className="py-3 px-3 text-zinc-400 font-mono text-[11px]">{emp.lastActivity}</td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <span className="text-[10px] text-sky-400 hover:underline flex items-center justify-end gap-1 font-mono">
                          View <ChevronRight size={12} />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. SLIDE-OUT LIVE ALERTS DRAWER */}
      {/* ========================================================================= */}
      {showAlertsPanel && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-zinc-950 border-l border-app-border shadow-2xl p-4 flex flex-col font-mono animate-slideLeft">
          <div className="flex items-center justify-between pb-3 border-b border-app-border">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <ShieldAlert size={18} />
              <span>Real-Time Alerts</span>
            </div>
            <button
              onClick={() => setShowAlertsPanel(false)}
              className="p-1 text-zinc-500 hover:text-zinc-200"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
            {data?.alerts?.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs">No active alerts detected.</div>
            ) : (
              data?.alerts?.map((alt) => (
                <div
                  key={alt.id}
                  className={`p-3 rounded-lg border text-xs space-y-1 ${
                    alt.severity === 'CRITICAL'
                      ? 'bg-red-950/30 border-red-500/40 text-red-300'
                      : alt.severity === 'WARNING'
                      ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{alt.title}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-black/40">
                      {alt.type}
                    </span>
                  </div>
                  <div className="text-[11px] opacity-90">{alt.message}</div>
                  <div className="text-[9px] text-zinc-500 pt-1">
                    {new Date(alt.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. EMPLOYEE PROFILE MODAL */}
      {/* ========================================================================= */}
      {selectedEmployeeId && (
        <EmployeeProfileModal
          employeeId={selectedEmployeeId}
          onClose={() => setSelectedEmployeeId(null)}
        />
      )}
    </div>
  );

  // If in TV Fullscreen mode, render directly without normal sidebar layout
  if (isTvMode) {
    return content;
  }

  // Normal mode renders docked within standard OpsLayout
  return <OpsLayout activeSection="live-tv">{content}</OpsLayout>;
}

// Summary Card Sub-component
function SummaryCard({ title, count, icon: Icon, color, subtitle, badge, isHighlight }) {
  const colorMap = {
    sky: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
    emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    amber: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    orange: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    cyan: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    purple: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    yellow: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    zinc: 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10',
    rose: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    red: 'text-red-400 border-red-500/30 bg-red-500/10',
    slate: 'text-slate-400 border-slate-500/30 bg-slate-500/10',
  };

  const styleClass = colorMap[color] || colorMap.sky;

  return (
    <div
      className={`bg-app-surface border rounded-xl p-3.5 shadow-md flex flex-col justify-between transition-transform hover:-translate-y-0.5 ${
        isHighlight
          ? 'border-rose-500/60 shadow-rose-950/40 animate-pulse'
          : 'border-app-border'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-app-muted uppercase font-bold tracking-wider truncate">
          {title}
        </span>
        <div className={`p-1.5 rounded-lg ${styleClass}`}>
          <Icon size={14} />
        </div>
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-2xl font-bold font-mono text-app-text">{count}</span>
        {badge && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-app-border text-zinc-300">
            {badge}
          </span>
        )}
      </div>

      {subtitle && <span className="text-[10px] text-zinc-500 mt-1 truncate">{subtitle}</span>}
    </div>
  );
}

// Accessible Status Badge Sub-component
function StatusBadge({ status, displayStatus }) {
  const map = {
    ACTIVE: { dot: 'bg-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    IDLE: { dot: 'bg-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    LONG_IDLE: { dot: 'bg-orange-400', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
    BREAK: { dot: 'bg-orange-400', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
    LONG_BREAK: { dot: 'bg-rose-400', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    ON_CALL: { dot: 'bg-sky-400', badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
    MEETING: { dot: 'bg-purple-400', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
    AWAY: { dot: 'bg-yellow-400', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
    LATE: { dot: 'bg-rose-400', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    OFFLINE: { dot: 'bg-zinc-500', badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
    NOT_LOGGED_IN: { dot: 'bg-zinc-600', badge: 'bg-zinc-800 text-zinc-500 border-zinc-700' },
  };

  const style = map[status] || map.ACTIVE;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border font-semibold ${style.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span>{displayStatus || status}</span>
    </span>
  );
}

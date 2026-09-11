import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Building2,
  Layers,
  Calendar,
  Clock,
  Activity,
  Coffee,
  PhoneCall,
  Video,
  CheckCircle,
  AlertTriangle,
  History,
  TrendingUp,
  Award,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function EmployeeProfileModal({ employeeId, onClose }) {
  const { token } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'timeline' | 'history'
  const [isLightMode, setIsLightMode] = useState(true); // Default to light color for profiles

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(`/api/employees/${employeeId}/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();
        if (json.success) {
          setProfileData(json.data);
        }
      } catch (err) {
        console.error('[PROFILE_MODAL] Failed to load profile:', err);
      } finally {
        setIsLoading(false);
      }
    }
    if (employeeId) {
      loadProfile();
    }
  }, [employeeId, token]);

  if (!employeeId) return null;

  const emp = profileData?.employee;
  const today = profileData?.todaySummary;
  const timeline = profileData?.timeline || [];
  const history = profileData?.historicalTrends || [];

  // Helper for dynamic status colors
  const getStatusBadgeStyle = (status) => {
    const s = (status || '').toUpperCase();
    if (isLightMode) {
      if (s === 'ACTIVE') return 'bg-emerald-100 text-emerald-800 border-emerald-300 dot-emerald-500';
      if (s === 'IDLE' || s === 'LONG_IDLE') return 'bg-amber-100 text-amber-800 border-amber-300 dot-amber-500';
      if (s === 'BREAK' || s === 'LONG_BREAK') return 'bg-orange-100 text-orange-800 border-orange-300 dot-orange-500';
      if (s === 'LATE') return 'bg-rose-100 text-rose-800 border-rose-300 dot-rose-500';
      if (s === 'ON_CALL') return 'bg-sky-100 text-sky-800 border-sky-300 dot-sky-500';
      if (s === 'MEETING') return 'bg-purple-100 text-purple-800 border-purple-300 dot-purple-500';
      if (s === 'AWAY') return 'bg-yellow-100 text-yellow-800 border-yellow-300 dot-yellow-500';
      if (s === 'OFFLINE') return 'bg-slate-200 text-slate-700 border-slate-300 dot-slate-400';
      return 'bg-slate-100 text-slate-600 border-slate-200 dot-slate-400';
    } else {
      if (s === 'ACTIVE') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 dot-emerald-400';
      if (s === 'IDLE' || s === 'LONG_IDLE') return 'bg-amber-500/10 text-amber-400 border-amber-500/30 dot-amber-400';
      if (s === 'BREAK' || s === 'LONG_BREAK') return 'bg-orange-500/10 text-orange-400 border-orange-500/30 dot-orange-400';
      if (s === 'LATE') return 'bg-rose-500/10 text-rose-400 border-rose-500/30 dot-rose-400';
      if (s === 'ON_CALL') return 'bg-sky-500/10 text-sky-400 border-sky-500/30 dot-sky-400';
      if (s === 'MEETING') return 'bg-purple-500/10 text-purple-400 border-purple-500/30 dot-purple-400';
      if (s === 'AWAY') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 dot-yellow-400';
      return 'bg-zinc-800 text-zinc-400 border-zinc-700 dot-zinc-500';
    }
  };

  const badgeStyle = getStatusBadgeStyle(emp?.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs font-mono animate-fadeIn">
      <div
        className={`rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-colors duration-200 ${
          isLightMode
            ? 'bg-slate-50 text-slate-800 border border-slate-200 shadow-slate-900/30'
            : 'bg-app-surface text-app-text border border-app-border shadow-2xl'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900/80 border-app-border'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                isLightMode ? 'bg-blue-50 text-blue-600' : 'bg-sky-500/20 text-sky-400'
              }`}
            >
              <User size={16} />
            </div>
            <div>
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  isLightMode ? 'text-blue-700' : 'text-sky-400'
                }`}
              >
                Employee Workforce Profile
              </span>
              <span
                className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  isLightMode ? 'bg-blue-100 text-blue-700' : 'bg-sky-900/40 text-sky-300'
                }`}
              >
                Light Profile Mode
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Light / Dark Mode Toggle */}
            <button
              onClick={() => setIsLightMode(!isLightMode)}
              className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 transition-colors ${
                isLightMode
                  ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
              }`}
              title="Toggle Light / Dark Profile styling"
            >
              {isLightMode ? '☀️ Light' : '🌙 Dark'}
            </button>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                isLightMode
                  ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              }`}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div
            className={`p-12 text-center text-xs ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}
          >
            Loading employee profile telemetry...
          </div>
        ) : !emp ? (
          <div
            className={`p-12 text-center text-xs ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}
          >
            Failed to load profile data.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Top Identity Card - Clean Light Aesthetic */}
            <div
              className={`flex flex-wrap sm:flex-nowrap items-start gap-4 p-4 rounded-xl border transition-all ${
                isLightMode
                  ? 'bg-gradient-to-br from-white via-slate-50 to-blue-50/40 border-slate-200 shadow-sm'
                  : 'bg-zinc-900/90 border-app-border'
              }`}
            >
              <img
                src={
                  emp.photoUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    emp.name
                  )}&background=3b82f6&color=fff&size=128`
                }
                alt={emp.name}
                className={`w-16 h-16 rounded-xl object-cover shrink-0 shadow-sm border-2 ${
                  isLightMode ? 'border-blue-400/80' : 'border-app-border'
                }`}
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    emp.name
                  )}&background=3b82f6&color=fff&size=128`;
                }}
              />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2
                    className={`text-lg font-bold ${
                      isLightMode ? 'text-slate-900' : 'text-app-text'
                    }`}
                  >
                    {emp.name}
                  </h2>
                  {/* Dynamic Status Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-xs ${badgeStyle}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    <span>STATUS: {emp.displayStatus}</span>
                  </span>
                </div>

                <div
                  className={`text-xs font-bold ${
                    isLightMode ? 'text-blue-600' : 'text-sky-400'
                  }`}
                >
                  {emp.jobTitle}
                </div>

                <div
                  className={`grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] ${
                    isLightMode ? 'text-slate-600' : 'text-app-muted'
                  }`}
                >
                  <div>
                    <span
                      className={`block text-[10px] uppercase font-semibold ${
                        isLightMode ? 'text-slate-400' : 'text-zinc-500'
                      }`}
                    >
                      EMPLOYEE ID
                    </span>
                    <span
                      className={`font-bold ${isLightMode ? 'text-slate-800' : 'text-zinc-200'}`}
                    >
                      {emp.employeeCode}
                    </span>
                  </div>
                  <div>
                    <span
                      className={`block text-[10px] uppercase font-semibold ${
                        isLightMode ? 'text-slate-400' : 'text-zinc-500'
                      }`}
                    >
                      DEPARTMENT
                    </span>
                    <span
                      className={`font-semibold ${isLightMode ? 'text-slate-800' : 'text-zinc-200'}`}
                    >
                      {emp.department}
                    </span>
                  </div>
                  <div>
                    <span
                      className={`block text-[10px] uppercase font-semibold ${
                        isLightMode ? 'text-slate-400' : 'text-zinc-500'
                      }`}
                    >
                      FLOOR
                    </span>
                    <span
                      className={`font-semibold ${isLightMode ? 'text-slate-800' : 'text-zinc-200'}`}
                    >
                      {emp.floor}
                    </span>
                  </div>
                  <div>
                    <span
                      className={`block text-[10px] uppercase font-semibold ${
                        isLightMode ? 'text-slate-400' : 'text-zinc-500'
                      }`}
                    >
                      MANAGER
                    </span>
                    <span
                      className={`font-semibold ${isLightMode ? 'text-slate-800' : 'text-zinc-200'}`}
                    >
                      {emp.managerName}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div
              className={`flex border-b gap-2 text-xs ${
                isLightMode ? 'border-slate-200' : 'border-app-border'
              }`}
            >
              <button
                onClick={() => setActiveTab('summary')}
                className={`pb-2 px-3 font-semibold transition-colors border-b-2 ${
                  activeTab === 'summary'
                    ? isLightMode
                      ? 'border-blue-600 text-blue-600'
                      : 'border-sky-500 text-sky-400'
                    : isLightMode
                    ? 'border-transparent text-slate-500 hover:text-slate-800'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Today&apos;s Summary
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`pb-2 px-3 font-semibold transition-colors border-b-2 ${
                  activeTab === 'timeline'
                    ? isLightMode
                      ? 'border-blue-600 text-blue-600'
                      : 'border-sky-500 text-sky-400'
                    : isLightMode
                    ? 'border-transparent text-slate-500 hover:text-slate-800'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Activity Timeline ({timeline.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-2 px-3 font-semibold transition-colors border-b-2 ${
                  activeTab === 'history'
                    ? isLightMode
                      ? 'border-blue-600 text-blue-600'
                      : 'border-sky-500 text-sky-400'
                    : isLightMode
                    ? 'border-transparent text-slate-500 hover:text-slate-800'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Historical Trends
              </button>
            </div>

            {/* Tab 1: Today's Summary & Donut Visual */}
            {activeTab === 'summary' && today && (
              <div className="space-y-4">
                {/* Metric Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div
                    className={`p-3 rounded-xl border ${
                      isLightMode ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900 border-app-border'
                    }`}
                  >
                    <span
                      className={`text-[10px] uppercase block font-semibold ${
                        isLightMode ? 'text-slate-400' : 'text-zinc-500'
                      }`}
                    >
                      Total Working
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        isLightMode ? 'text-emerald-600' : 'text-emerald-400'
                      }`}
                    >
                      {today.totalWorkingTime}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${
                      isLightMode ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900 border-app-border'
                    }`}
                  >
                    <span
                      className={`text-[10px] uppercase block font-semibold ${
                        isLightMode ? 'text-slate-400' : 'text-zinc-500'
                      }`}
                    >
                      Active Working
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        isLightMode ? 'text-blue-600' : 'text-sky-400'
                      }`}
                    >
                      {today.activeTime}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${
                      isLightMode ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900 border-app-border'
                    }`}
                  >
                    <span
                      className={`text-[10px] uppercase block font-semibold ${
                        isLightMode ? 'text-slate-400' : 'text-zinc-500'
                      }`}
                    >
                      Idle Time
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        isLightMode ? 'text-amber-600' : 'text-amber-400'
                      }`}
                    >
                      {today.idleTime}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${
                      isLightMode ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900 border-app-border'
                    }`}
                  >
                    <span
                      className={`text-[10px] uppercase block font-semibold ${
                        isLightMode ? 'text-slate-400' : 'text-zinc-500'
                      }`}
                    >
                      Break Time
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        isLightMode ? 'text-orange-600' : 'text-orange-400'
                      }`}
                    >
                      {today.breakTime}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${
                      isLightMode ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900 border-app-border'
                    }`}
                  >
                    <span
                      className={`text-[10px] uppercase block font-semibold ${
                        isLightMode ? 'text-slate-400' : 'text-zinc-500'
                      }`}
                    >
                      Call Time
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        isLightMode ? 'text-cyan-600' : 'text-cyan-400'
                      }`}
                    >
                      {today.callTime}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${
                      isLightMode ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900 border-app-border'
                    }`}
                  >
                    <span
                      className={`text-[10px] uppercase block font-semibold ${
                        isLightMode ? 'text-slate-400' : 'text-zinc-500'
                      }`}
                    >
                      Meeting Time
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        isLightMode ? 'text-purple-600' : 'text-purple-400'
                      }`}
                    >
                      {today.meetingTime}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${
                      isLightMode ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900 border-app-border'
                    }`}
                  >
                    <span
                      className={`text-[10px] uppercase block font-semibold ${
                        isLightMode ? 'text-slate-400' : 'text-zinc-500'
                      }`}
                    >
                      Login Time
                    </span>
                    <span
                      className={`text-base font-bold ${
                        isLightMode ? 'text-slate-800' : 'text-zinc-200'
                      }`}
                    >
                      {today.loginTime}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-xl border ${
                      isLightMode ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900 border-app-border'
                    }`}
                  >
                    <span
                      className={`text-[10px] uppercase block font-semibold ${
                        isLightMode ? 'text-slate-400' : 'text-zinc-500'
                      }`}
                    >
                      Late Duration
                    </span>
                    <span
                      className={`text-base font-bold ${
                        isLightMode ? 'text-rose-600' : 'text-rose-400'
                      }`}
                    >
                      {today.lateDuration}
                    </span>
                  </div>
                </div>

                {/* Visual Distribution Bar */}
                <div
                  className={`p-4 rounded-xl border space-y-2 ${
                    isLightMode ? 'bg-white border-slate-200 shadow-xs' : 'bg-zinc-900 border-app-border'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span className={isLightMode ? 'text-slate-800' : 'text-app-text'}>
                      Today&apos;s Time Allocation
                    </span>
                    <span
                      className={`text-[10px] ${
                        isLightMode ? 'text-slate-400' : 'text-zinc-500'
                      }`}
                    >
                      Live Breakdown
                    </span>
                  </div>

                  <div
                    className={`h-4 rounded-full flex overflow-hidden ${
                      isLightMode ? 'bg-slate-100 border border-slate-200' : 'bg-zinc-800'
                    }`}
                  >
                    {today.donutDistribution.map((item, idx) => {
                      const totalSec =
                        today.donutDistribution.reduce((acc, cur) => acc + cur.value, 0) || 1;
                      const percent = Math.round((item.value / totalSec) * 100);
                      if (percent <= 0) return null;
                      return (
                        <div
                          key={idx}
                          style={{ width: `${percent}%`, backgroundColor: item.color }}
                          className="h-full transition-all"
                          title={`${item.label}: ${percent}%`}
                        />
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-4 pt-1 text-[11px]">
                    {today.donutDistribution.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className={isLightMode ? 'text-slate-600' : 'text-zinc-400'}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Daily Activity Timeline */}
            {activeTab === 'timeline' && (
              <div className="space-y-3">
                <div
                  className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}
                >
                  Chronological activity events recorded today:
                </div>
                <div
                  className={`relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 ${
                    isLightMode ? 'before:bg-slate-200' : 'before:bg-zinc-800'
                  }`}
                >
                  {timeline.map((ev) => (
                    <div
                      key={ev.id}
                      className="relative flex items-center justify-between text-xs"
                    >
                      <span
                        className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 ${
                          isLightMode
                            ? 'bg-blue-600 border-white shadow-xs'
                            : 'bg-sky-500 border-zinc-900'
                        }`}
                      />
                      <div>
                        <span
                          className={`font-bold ${
                            isLightMode ? 'text-slate-800' : 'text-zinc-200'
                          }`}
                        >
                          {ev.time}
                        </span>
                        <span
                          className={`mx-2 ${
                            isLightMode ? 'text-slate-300' : 'text-zinc-500'
                          }`}
                        >
                          &bull;
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-semibold border ${
                            isLightMode
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-zinc-800 text-sky-300 border-zinc-700'
                          }`}
                        >
                          {ev.type}
                        </span>
                      </div>
                      <span
                        className={`font-mono ${
                          isLightMode ? 'text-slate-500' : 'text-zinc-400'
                        }`}
                      >
                        {ev.duration}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Historical Trends */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                <div
                  className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}
                >
                  Multi-day attendance and activity metrics:
                </div>
                <div
                  className={`overflow-x-auto rounded-xl border ${
                    isLightMode ? 'border-slate-200 bg-white shadow-xs' : 'border-app-border'
                  }`}
                >
                  <table className="w-full text-left text-xs">
                    <thead
                      className={`uppercase text-[10px] ${
                        isLightMode
                          ? 'bg-slate-100 text-slate-500 border-b border-slate-200'
                          : 'bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      <tr>
                        <th className="p-3">Period</th>
                        <th className="p-3">Avg Active</th>
                        <th className="p-3">Avg Idle</th>
                        <th className="p-3">Avg Break</th>
                        <th className="p-3">Avg Call</th>
                        <th className="p-3">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y ${
                        isLightMode ? 'divide-slate-100' : 'divide-app-border'
                      }`}
                    >
                      {history.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            isLightMode ? 'hover:bg-slate-50' : 'hover:bg-zinc-900/50'
                          }`}
                        >
                          <td
                            className={`p-3 font-bold ${
                              isLightMode ? 'text-slate-800' : 'text-zinc-200'
                            }`}
                          >
                            {row.period}
                          </td>
                          <td
                            className={`p-3 font-bold ${
                              isLightMode ? 'text-emerald-600' : 'text-emerald-400'
                            }`}
                          >
                            {row.activeHrs} hrs
                          </td>
                          <td
                            className={`p-3 ${
                              isLightMode ? 'text-amber-600' : 'text-amber-400'
                            }`}
                          >
                            {row.idleMins} mins
                          </td>
                          <td
                            className={`p-3 ${
                              isLightMode ? 'text-orange-600' : 'text-orange-400'
                            }`}
                          >
                            {row.breakMins} mins
                          </td>
                          <td
                            className={`p-3 ${
                              isLightMode ? 'text-blue-600' : 'text-sky-400'
                            }`}
                          >
                            {row.callMins} mins
                          </td>
                          <td
                            className={`p-3 font-bold ${
                              isLightMode ? 'text-emerald-600' : 'text-emerald-400'
                            }`}
                          >
                            {row.attendanceRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

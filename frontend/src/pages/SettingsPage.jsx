import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sliders,
  Palette,
  Bell,
  Save,
  RotateCcw,
  CheckCircle,
  Clock,
  Shield,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useThemeStore, THEME_PRESETS } from '../stores/themeStore';
import OpsLayout from '../components/layout/OpsLayout';

export default function SettingsPage() {
  const { token, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'theme' | 'notifications'
  const [statusMsg, setStatusMsg] = useState(null);

  // Theme store
  const { preset, mode, tokens, selectPreset, updateToken, resetTheme, saveToServer } = useThemeStore();

  // Activity rules state
  const [rules, setRules] = useState({
    workStartTime: '09:00',
    workEndTime: '18:00',
    idleThresholdMinutes: 10,
    longIdleThresholdMinutes: 30,
    breakLimitMinutes: 15,
    longBreakThresholdMinutes: 30,
    lateThresholdTime: '09:15',
    callWarningMinutes: 30,
    timezone: 'Asia/Kolkata',
  });

  useEffect(() => {
    async function loadRules() {
      try {
        const res = await fetch('/api/settings/activity-rules', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) setRules(json.rules);
      } catch (e) {}
    }
    loadRules();
  }, [token]);

  const handleSaveRules = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/activity-rules', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(rules),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg('Activity rules and thresholds saved successfully.');
      }
    } catch (err) {
      setStatusMsg('Failed to save rules.');
    }
  };

  const handleSaveTheme = async () => {
    const success = await saveToServer();
    if (success) {
      setStatusMsg('Theme customization saved across the entire project.');
    }
  };

  return (
    <OpsLayout activeSection="settings">
      <div className="space-y-4 font-mono max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-app-surface border border-app-border rounded-xl p-4 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Settings size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-app-text">SYSTEM &amp; THEME SETTINGS</h1>
              <p className="text-xs text-app-muted">Configurable business rules, time thresholds, and project-wide theme customization</p>
            </div>
          </div>
        </div>

        {statusMsg && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
            <span className="flex items-center gap-1.5">
              <CheckCircle size={14} /> {statusMsg}
            </span>
            <button onClick={() => setStatusMsg(null)} className="text-emerald-400 hover:underline">Dismiss</button>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex gap-2 p-1.5 bg-app-bg border border-app-border rounded-xl text-xs">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'rules' ? 'bg-blue-600 text-white shadow-sm' : 'text-app-muted hover:text-app-text'
            }`}
          >
            <Sliders size={15} />
            <span>Activity Rules &amp; Thresholds</span>
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'theme' ? 'bg-blue-600 text-white shadow-sm' : 'text-app-muted hover:text-app-text'
            }`}
          >
            <Palette size={15} />
            <span>Project-Wide Theme Customization</span>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'notifications' ? 'bg-blue-600 text-white shadow-sm' : 'text-app-muted hover:text-app-text'
            }`}
          >
            <Bell size={15} />
            <span>Live Alerts &amp; Triggers</span>
          </button>
        </div>

        {/* TAB 1: Activity Rules & Thresholds */}
        {activeTab === 'rules' && (
          <form onSubmit={handleSaveRules} className="bg-app-surface border border-app-border rounded-xl p-5 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-app-border">
              <h2 className="text-sm font-bold text-app-text flex items-center gap-2">
                <Clock size={16} className="text-sky-400" /> Configurable Time Thresholds
              </h2>
              {isSuperAdmin && (
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Save size={14} /> Save Rules
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Standard Work Start Time (24h)</label>
                <input
                  type="text"
                  value={rules.workStartTime}
                  onChange={(e) => setRules({ ...rules, workStartTime: e.target.value })}
                  placeholder="09:00"
                  className="w-full px-3 py-2 bg-zinc-900 border border-app-border rounded-lg text-app-text"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Standard Work End Time (24h)</label>
                <input
                  type="text"
                  value={rules.workEndTime}
                  onChange={(e) => setRules({ ...rules, workEndTime: e.target.value })}
                  placeholder="18:00"
                  className="w-full px-3 py-2 bg-zinc-900 border border-app-border rounded-lg text-app-text"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Idle Threshold (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={rules.idleThresholdMinutes}
                  onChange={(e) => setRules({ ...rules, idleThresholdMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-app-border rounded-lg text-app-text"
                />
                <span className="text-[10px] text-zinc-500">Flags employee as IDLE after this inactivity period</span>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Long Idle Threshold (Minutes)</label>
                <input
                  type="number"
                  min={5}
                  value={rules.longIdleThresholdMinutes}
                  onChange={(e) => setRules({ ...rules, longIdleThresholdMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-app-border rounded-lg text-app-text"
                />
                <span className="text-[10px] text-zinc-500">Triggers visual warning highlight &amp; Live TV alert</span>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Normal Break Limit (Minutes)</label>
                <input
                  type="number"
                  min={5}
                  value={rules.breakLimitMinutes}
                  onChange={(e) => setRules({ ...rules, breakLimitMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-app-border rounded-lg text-app-text"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Long Break Threshold (Minutes)</label>
                <input
                  type="number"
                  min={10}
                  value={rules.longBreakThresholdMinutes}
                  onChange={(e) => setRules({ ...rules, longBreakThresholdMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-app-border rounded-lg text-app-text"
                />
                <span className="text-[10px] text-zinc-500">Flags break duration breach</span>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Late Arrival Threshold (Time)</label>
                <input
                  type="text"
                  value={rules.lateThresholdTime}
                  onChange={(e) => setRules({ ...rules, lateThresholdTime: e.target.value })}
                  placeholder="09:15"
                  className="w-full px-3 py-2 bg-zinc-900 border border-app-border rounded-lg text-app-text"
                />
                <span className="text-[10px] text-zinc-500">Logins after this timestamp marked as LATE</span>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Call Duration Warning (Minutes)</label>
                <input
                  type="number"
                  min={5}
                  value={rules.callWarningMinutes}
                  onChange={(e) => setRules({ ...rules, callWarningMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-app-border rounded-lg text-app-text"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-zinc-400 mb-1">Default System Timezone</label>
                <select
                  value={rules.timezone}
                  onChange={(e) => setRules({ ...rules, timezone: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-app-border rounded-lg text-app-text"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="UTC">Universal Coordinated Time (UTC)</option>
                </select>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: Project-Wide Theme Customization */}
        {activeTab === 'theme' && (
          <div className="bg-app-surface border border-app-border rounded-xl p-5 shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-app-border gap-2">
              <div>
                <h2 className="text-sm font-bold text-app-text flex items-center gap-2">
                  <Palette size={16} className="text-sky-400" /> Centralized Design Tokens
                </h2>
                <p className="text-[11px] text-app-muted">Changes apply immediately across every page, card, modal, and table in the system.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetTheme}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs flex items-center gap-1"
                >
                  <RotateCcw size={13} /> Reset
                </button>
                <button
                  type="button"
                  onClick={handleSaveTheme}
                  className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-sky-600/20"
                >
                  <Save size={13} /> Save Project Theme
                </button>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-app-text uppercase">Curated Enterprise Presets</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {Object.keys(THEME_PRESETS).map((pName) => {
                  const pTokens = THEME_PRESETS[pName];
                  const isSelected = preset === pName;
                  return (
                    <button
                      key={pName}
                      type="button"
                      onClick={() => selectPreset(pName)}
                      className={`p-3 rounded-xl border text-left text-xs transition-all flex flex-col justify-between gap-2 shadow-xs ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 shadow-md font-bold text-blue-700 ring-2 ring-blue-500/20'
                          : 'border-app-border bg-app-bg hover:bg-app-surface text-app-text'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: pTokens.primary }} />
                        <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: pTokens.accent }} />
                        <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: pTokens.background }} />
                      </div>
                      <span className="text-[11px] truncate font-semibold">{pName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Individual Token Color Pickers */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-app-text uppercase">Individual Color Tokens</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                {[
                  { key: 'primary', label: 'Primary Color' },
                  { key: 'secondary', label: 'Secondary Color' },
                  { key: 'accent', label: 'Accent Color' },
                  { key: 'background', label: 'Background' },
                  { key: 'surface', label: 'Surface / Cards' },
                  { key: 'sidebar', label: 'Sidebar Background' },
                  { key: 'header', label: 'Header Background' },
                  { key: 'text', label: 'Text Color' },
                  { key: 'mutedText', label: 'Muted Text' },
                  { key: 'success', label: 'Success / Active' },
                  { key: 'warning', label: 'Warning / Idle' },
                  { key: 'danger', label: 'Danger / Late' },
                  { key: 'info', label: 'Info Color' },
                  { key: 'border', label: 'Border Color' },
                ].map(({ key, label }) => (
                  <div key={key} className="p-2.5 rounded-lg bg-zinc-900 border border-app-border space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>{label}</span>
                      <span className="text-[10px] font-mono text-zinc-500">{tokens[key]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={tokens[key] || '#000000'}
                        onChange={(e) => updateToken(key, e.target.value)}
                        className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={tokens[key] || ''}
                        onChange={(e) => updateToken(key, e.target.value)}
                        className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-[11px] font-mono text-zinc-200"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Interactive Preview Card */}
            <div className="pt-3 border-t border-app-border space-y-2">
              <label className="block text-xs font-bold text-app-text uppercase">Live Component Preview</label>
              <div
                style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
                className="border p-4 rounded-xl shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div style={{ color: tokens.text }} className="font-bold text-sm">
                    Sample Telemetry Card
                  </div>
                  <span
                    style={{ backgroundColor: `${tokens.success}20`, color: tokens.success, borderColor: `${tokens.success}40` }}
                    className="px-2 py-0.5 rounded text-xs border font-bold"
                  >
                    Active
                  </span>
                </div>
                <p style={{ color: tokens.mutedText }} className="text-xs">
                  This preview renders with your chosen surface, text, border, and badge tokens.
                </p>
                <div className="flex gap-2">
                  <button
                    style={{ backgroundColor: tokens.primary, color: '#ffffff' }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold shadow-md"
                  >
                    Primary Button
                  </button>
                  <button
                    style={{ backgroundColor: tokens.surface, borderColor: tokens.border, color: tokens.text }}
                    className="px-3 py-1.5 rounded-lg text-xs border"
                  >
                    Secondary
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Notifications & Triggers */}
        {activeTab === 'notifications' && (
          <div className="bg-app-surface border border-app-border rounded-xl p-5 shadow-xl space-y-4 text-xs">
            <h2 className="text-sm font-bold text-app-text flex items-center gap-2">
              <Bell size={16} className="text-sky-400" /> Active Real-Time Monitoring Alerts
            </h2>
            <div className="space-y-2.5">
              {[
                { title: 'Long Idle Alert (>30m)', desc: 'Notify operators when an employee station is idle beyond threshold', active: true },
                { title: 'Long Break Alert (>30m)', desc: 'Alert ops when meal or tea break duration limit is exceeded', active: true },
                { title: 'Late Login Alert', desc: 'Real-time telemetry event for sign-ins past configured grace threshold', active: true },
                { title: 'Geofence Breach Alert', desc: 'Immediate incident broadcast when device submits from outside authorized zone', active: true },
                { title: '3-Strike Lockout Alert', desc: 'Security event trigger on 3 consecutive failed login attempts', active: true },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-zinc-900 border border-app-border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-zinc-200">{item.title}</div>
                    <div className="text-[11px] text-zinc-500">{item.desc}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    ENABLED
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </OpsLayout>
  );
}

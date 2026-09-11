import React from 'react';
import { ChevronRight, MapPin } from 'lucide-react';
import { initials, formatTimeAmPm } from '../../utils/time';

const STATUS_STYLE = {
  ON_TIME: {
    label: 'On-site verified',
    ring: 'border-emerald-500/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    dot: 'bg-emerald-500',
  },
  LATE: {
    label: 'Late flagged',
    ring: 'border-amber-500/40',
    text: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    dot: 'bg-amber-500',
  },
  BREACH: {
    label: 'Geofence breach',
    ring: 'border-rose-500/40',
    text: 'text-rose-700 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    dot: 'bg-rose-500',
  },
  BREAK: {
    label: 'On break',
    ring: 'border-sky-500/40',
    text: 'text-sky-700 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-500/10',
    dot: 'bg-sky-500',
  },
};

const FILTERS = [
  { key: 'ALL', label: 'All flows (1-6)' },
  { key: 'VERIFIED', label: 'Geofence validated' },
  { key: 'LATE', label: 'Late (>15m)' },
  { key: 'BREAK', label: 'Break exceeded' },
  { key: 'BREACH', label: 'Breach' },
];

function CheckpointTrack({ step = 1, status = 'ON_TIME' }) {
  const labels = ['LOGIN', 'LUNCH OUT', 'LUNCH IN', 'TEA', 'TEA IN', 'END'];
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {labels.map((lb, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
        const failed = status === 'BREACH' && active;
        return (
          <div key={lb} className="flex items-center gap-1">
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border whitespace-nowrap font-medium ${
                failed
                  ? 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-500/20 dark:border-rose-500/50 dark:text-rose-300'
                  : active
                  ? 'bg-sky-100 border-sky-300 text-sky-800 dark:bg-sky-500/20 dark:border-sky-500/50 dark:text-sky-300'
                  : done
                  ? 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'
                  : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-600'
              }`}
            >
              {idx}.{lb}
              {failed ? ' (FAILED)' : ''}
            </span>
            {i < labels.length - 1 && (
              <ChevronRight size={10} className="text-slate-400 dark:text-zinc-700 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function EventRow({ emp, onSelect }) {
  const statusKey = emp.status in STATUS_STYLE ? emp.status : 'ON_TIME';
  const s = STATUS_STYLE[statusKey];
  const name = emp.employee?.name || emp.name || 'Personnel';
  const code = emp.employee?.employeeCode || emp.employeeCode || emp.id;
  const section = emp.employee?.section?.name || emp.section || 'Sec-A / Flow-1';
  const shift = emp.shift?.name || emp.shift || 'Shift-01';
  const time = emp.actualTime ? formatTimeAmPm(emp.actualTime) : emp.time || '10:45 AM';
  const breach = emp.status === 'BREACH';
  const breachMeters = emp.breachMeters || (breach ? 65 : 0);
  const accuracy = emp.gpsAccuracy || '1.2';
  const liveness = emp.livenessScore || emp.liveness || '98.4';
  const step = emp.checkpoint?.sequenceOrder || emp.step || 1;

  return (
    <div
      onClick={() => onSelect && onSelect(emp)}
      className="border-b border-app-border py-3 px-2 last:border-b-0 hover:bg-slate-50 dark:hover:bg-zinc-800/40 rounded transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-zinc-800 border border-app-border flex items-center justify-center text-xs font-mono text-slate-800 dark:text-zinc-300 shrink-0 font-bold">
          {initials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-app-text text-sm font-semibold">{name}</span>
            <span className="text-app-text-muted text-xs font-mono font-medium">{code}</span>
            <span
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${s.ring} ${s.bg} ${s.text}`}
            >
              {s.label.toUpperCase()}
            </span>
          </div>

          <div className="text-xs text-app-text-muted font-mono mt-0.5">
            {section} &bull; {shift} &bull; {time}
          </div>

          <div className="mt-2">
            <CheckpointTrack step={step} status={emp.status} />
          </div>

          <div className="flex items-center justify-between mt-2 text-[11px] font-mono">
            <span
              className={`flex items-center gap-1 font-semibold ${
                breach ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <MapPin size={11} />
              {breach
                ? `${breachMeters}m outside geofence`
                : `Inside HQ perimeter (${accuracy}m)`}
            </span>
            <span className="text-app-text-muted hidden sm:inline">Liveness: {liveness}% match</span>
            <span className="text-sky-600 dark:text-sky-400 font-medium hover:underline text-[11px]">Details &amp; dossier &rarr;</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventStream({
  records = [],
  filter = 'ALL',
  onFilterChange,
  onSelectRecord,
  totalCount = 705,
}) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <span className="text-sm font-semibold text-app-text">
          Attendance Event Stream &amp; Roster
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`text-[10px] font-mono font-medium px-2.5 py-1 rounded-md border transition-colors ${
                filter === f.key
                  ? 'bg-sky-600 border-sky-600 text-white shadow-xs'
                  : 'border-app-border bg-app-surface text-app-text-muted hover:text-app-text hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[520px] overflow-y-auto pr-1 divide-y divide-app-border">
        {records.length === 0 ? (
          <div className="text-app-text-muted text-sm text-center py-12 font-mono">
            No records match this filter
          </div>
        ) : (
          records.map((r, i) => (
            <EventRow key={r.id || i} emp={r} onSelect={onSelectRecord} />
          ))
        )}
      </div>

      <div className="flex items-center justify-between mt-3 text-[11px] font-mono text-app-text-muted pt-3 border-t border-app-border">
        <span>
          Showing {records.length} of {totalCount.toLocaleString()} personnel
        </span>
        <div className="flex items-center gap-2">
          <button className="border border-app-border rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-zinc-800 text-app-text transition-colors">
            Prev
          </button>
          <span className="font-semibold text-app-text">Page 01</span>
          <button className="border border-app-border rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-zinc-800 text-app-text transition-colors">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

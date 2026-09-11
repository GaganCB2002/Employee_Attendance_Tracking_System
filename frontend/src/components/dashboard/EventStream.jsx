import React from 'react';
import { ChevronRight, MapPin } from 'lucide-react';
import { initials, formatTimeAmPm } from '../../utils/time';

const STATUS_STYLE = {
  ON_TIME: {
    label: 'On-site verified',
    ring: 'border-emerald-500/40',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    dot: 'bg-emerald-400',
  },
  LATE: {
    label: 'Late flagged',
    ring: 'border-amber-500/40',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    dot: 'bg-amber-400',
  },
  BREACH: {
    label: 'Geofence breach',
    ring: 'border-red-500/40',
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    dot: 'bg-red-400',
  },
  BREAK: {
    label: 'On break',
    ring: 'border-sky-500/40',
    text: 'text-sky-400',
    bg: 'bg-sky-500/10',
    dot: 'bg-sky-400',
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
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border whitespace-nowrap ${
                failed
                  ? 'bg-red-500/20 border-red-500/50 text-red-300'
                  : active
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                  : done
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-600'
              }`}
            >
              {idx}.{lb}
              {failed ? ' (FAILED)' : ''}
            </span>
            {i < labels.length - 1 && (
              <ChevronRight size={10} className="text-zinc-700 shrink-0" />
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
      className="border-b border-zinc-800/80 py-3 px-1.5 last:border-b-0 hover:bg-zinc-800/30 rounded transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-mono text-zinc-300 shrink-0 font-semibold">
          {initials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-zinc-100 text-sm font-medium">{name}</span>
            <span className="text-zinc-500 text-xs font-mono">{code}</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${s.ring} ${s.bg} ${s.text}`}
            >
              {s.label.toUpperCase()}
            </span>
          </div>

          <div className="text-xs text-zinc-500 font-mono mt-0.5">
            {section} &bull; {shift} &bull; {time}
          </div>

          <div className="mt-2">
            <CheckpointTrack step={step} status={emp.status} />
          </div>

          <div className="flex items-center justify-between mt-2 text-[11px] font-mono">
            <span
              className={`flex items-center gap-1 ${
                breach ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              <MapPin size={11} />
              {breach
                ? `${breachMeters}m outside geofence`
                : `Inside HQ perimeter (${accuracy}m)`}
            </span>
            <span className="text-zinc-500 hidden sm:inline">Liveness: {liveness}% match</span>
            <span className="text-sky-400 hover:text-sky-300 text-[11px]">Details &amp; drawers</span>
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span className="text-sm font-medium text-zinc-200">
          Attendance event stream and roster
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors ${
                filter === f.key
                  ? 'bg-sky-600 border-sky-500 text-white'
                  : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[520px] overflow-y-auto pr-1 divide-y divide-zinc-800/40">
        {records.length === 0 ? (
          <div className="text-zinc-600 text-sm text-center py-12 font-mono">
            No records match this filter
          </div>
        ) : (
          records.map((r, i) => (
            <EventRow key={r.id || i} emp={r} onSelect={onSelectRecord} />
          ))
        )}
      </div>

      <div className="flex items-center justify-between mt-3 text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800">
        <span>
          Showing {records.length} of {totalCount.toLocaleString()} personnel
        </span>
        <div className="flex items-center gap-2">
          <button className="border border-zinc-700 rounded px-2 py-1 hover:bg-zinc-800 transition-colors">
            Prev
          </button>
          <span>Page 01</span>
          <button className="border border-zinc-700 rounded px-2 py-1 hover:bg-zinc-800 transition-colors">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

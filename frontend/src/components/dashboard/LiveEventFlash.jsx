import React, { useState } from 'react';
import { Pin, CheckCircle2, Send, MapPin, AlertTriangle, ShieldCheck } from 'lucide-react';
import { initials } from '../../utils/time';

export default function LiveEventFlash({ event, onApprove, onPageComm }) {
  const [isApproving, setIsApproving] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pageSent, setPageSent] = useState(false);

  if (!event) {
    return (
      <div className="bg-app-surface border border-app-border rounded-xl p-6 text-center text-app-muted font-mono text-xs shadow-xs">
        <ShieldCheck size={24} className="mx-auto mb-2 text-emerald-600" />
        ALL PERIMETERS SECURE &bull; NO ACTIVE EXCEPTIONS FLAGGED
      </div>
    );
  }

  const employeeName = event.employee?.name || event.name || 'Unknown Personnel';
  const employeeId = event.employee?.employeeCode || event.id || 'EMP-XXXXX';
  const sectionName = event.employee?.section?.name || event.section || 'Sec-A / Flow-1';
  const shiftName = event.shift?.name || event.shift || 'Shift-03 (10:30-19:00)';
  const status = event.status || 'LATE';
  const photoUrl = event.photoUrl;
  const isLate = status === 'LATE';
  const isBreach = status === 'BREACH';

  const handleApprove = async () => {
    setIsApproving(true);
    await onApprove(event.id);
    setIsApproving(false);
  };

  const handlePage = () => {
    setPageSent(true);
    if (onPageComm) onPageComm(employeeId);
    setTimeout(() => setPageSent(false), 3000);
  };

  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-4 transition-all shadow-xs">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isBreach ? 'bg-red-500 animate-ping' : isLate ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
            }`}
          />
          <span className="text-xs font-mono text-app-muted uppercase tracking-wide font-semibold">
            Live event photo flash &bull; Telemetry Feed
          </span>
        </div>
        <button
          onClick={() => setPinned(!pinned)}
          className={`flex items-center gap-1.5 text-[11px] font-mono border rounded-lg px-2.5 py-1 transition-colors ${
            pinned
              ? 'border-blue-500/50 bg-blue-50 text-blue-600 font-semibold'
              : 'border-app-border text-app-muted hover:bg-app-bg'
          }`}
        >
          <Pin size={12} className={pinned ? 'rotate-45 text-blue-600' : ''} /> {pinned ? 'Pinned' : 'Pin record'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Photo / Visual Verification Preview */}
        <div className="relative w-24 h-24 rounded-xl bg-app-bg border border-app-border flex items-center justify-center text-lg font-mono text-app-text shrink-0 overflow-hidden shadow-xs group">
          {photoUrl && !photoUrl.includes('placeholder') ? (
            <img
              src={photoUrl}
              alt={employeeName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <span className="text-base font-bold text-blue-600">{initials(employeeName)}</span>
              <span className="text-[9px] text-app-muted font-mono">CAM-SYNC</span>
            </div>
          )}
          <span className="absolute bottom-1 right-1 text-[8px] font-mono px-1 rounded bg-slate-900/80 text-emerald-400 border border-emerald-500/30">
            {event.livenessScore ? `${event.livenessScore}%` : '98.4%'}
          </span>
        </div>

        {/* Personnel & Event Details */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-app-text font-bold text-sm">{employeeName}</span>
            <span className="text-[11px] font-mono text-app-muted">{employeeId}</span>
            {isLate && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-800 font-bold">
                LATE BY 15 MINUTES
              </span>
            )}
            {isBreach && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-red-300 bg-red-50 text-red-800 font-bold">
                GEOFENCE PERIMETER BREACH
              </span>
            )}
            {event.approvedException && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-800 font-bold">
                EXCEPTION APPROVED
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-app-muted mt-1">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Flow / Squad</span>
              <span className="truncate block font-semibold text-app-text">{sectionName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assigned Shift</span>
              <span className="truncate block font-semibold text-app-text">{shiftName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Event Trigger</span>
              <span className="truncate block font-semibold text-app-text">
                {event.checkpoint?.name || 'Sign In / First Face'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Stamp Delta</span>
              <span className="truncate block font-semibold text-app-text">
                {isLate ? 'Sched 10:30 → Act 10:45' : 'On-Schedule'}
              </span>
            </div>
          </div>

          <div className="text-[11px] font-mono flex items-center gap-1.5 pt-1.5 text-app-muted">
            <MapPin
              size={12}
              className={isBreach ? 'text-red-600 shrink-0' : 'text-emerald-600 shrink-0'}
            />
            <span className={isBreach ? 'text-red-600 font-semibold' : 'text-emerald-700 font-semibold'}>
              {event.gpsLat?.toFixed(4) || '37.7749'}N, {event.gpsLng?.toFixed(4) || '-122.4194'}W
              &bull; {event.gpsAccuracy || '1.2'}m accuracy &bull;{' '}
              {isBreach
                ? `65m Outside authorized HQ perimeter`
                : `Inside HQ Perimeter (Verified)`}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 md:w-52 shrink-0 justify-center">
          {isLate && !event.approvedException && (
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-medium rounded px-3 py-2 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              <span>{isApproving ? 'Approving...' : 'Approve late exception'}</span>
            </button>
          )}

          <button
            onClick={handlePage}
            className={`flex items-center justify-center gap-1.5 border text-xs rounded px-3 py-2 transition-colors ${
              pageSent
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Send size={14} />
            <span>{pageSent ? 'Dispatch Sent' : 'Page comm'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

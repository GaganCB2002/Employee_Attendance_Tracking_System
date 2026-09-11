import React from 'react';
import { Clock, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { formatTimeAmPm } from '../../utils/time';

export default function ShiftStatus({ shift, allCheckpoints = [], completedRecords = [] }) {
  const completedIds = new Set(completedRecords.map((r) => r.checkpointId));
  const completedCount = completedIds.size;
  const totalCount = allCheckpoints.length || 8;
  const progressPercent = Math.round((completedCount / (totalCount || 1)) * 100);

  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-5 space-y-4 shadow-sm">
      {/* Shift Overview */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-app-border">
        <div>
          <span className="text-[10px] font-mono text-app-text-muted uppercase tracking-wider block font-semibold">
            Assigned Shift Schedule
          </span>
          <h3 className="text-app-text font-bold text-sm">
            {shift?.name || 'Shift-03 (Avionics Ops)'}
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-app-text-muted bg-slate-50 dark:bg-zinc-950 px-3 py-1 rounded-lg border border-app-border font-medium">
          <Clock size={13} className="text-sky-600 dark:text-sky-400" />
          <span>
            {shift?.startTime || '10:30'} &rarr; {shift?.endTime || '19:00'}
          </span>
          <span className="text-slate-400">&bull;</span>
          <span className="text-amber-600 dark:text-amber-400 font-semibold">+{shift?.gracePeriodMinutes || 15}m grace</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-xs font-mono text-app-text-muted mb-1.5 font-medium">
          <span>Shift Checkpoint Progress</span>
          <span className="text-sky-600 dark:text-sky-400 font-bold">
            {completedCount} of {totalCount} Steps ({progressPercent}%)
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-zinc-950 rounded-full h-2.5 overflow-hidden border border-app-border">
          <div
            className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Sequential Checkpoints Timeline */}
      <div className="space-y-1.5 pt-1">
        {allCheckpoints.map((cp) => {
          const record = completedRecords.find((r) => r.checkpointId === cp.id);
          const isDone = Boolean(record);
          const isLate = record?.status === 'LATE';

          return (
            <div
              key={cp.id}
              className={`flex items-center justify-between text-xs font-mono p-2.5 rounded-lg transition-colors ${
                isDone
                  ? 'bg-slate-50 dark:bg-zinc-950/60 border border-app-border text-app-text font-medium'
                  : 'text-app-text-muted border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                {isDone ? (
                  <CheckCircle2
                    size={15}
                    className={isLate ? 'text-amber-500' : 'text-emerald-500'}
                  />
                ) : (
                  <Circle size={15} className="text-slate-300 dark:text-zinc-700" />
                )}
                <span>
                  {cp.sequenceOrder}. {cp.name}
                </span>
                {isLate && (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400">
                    LATE
                  </span>
                )}
              </div>

              <div className="text-[11px] text-app-text-muted">
                {isDone && record?.actualTime ? (
                  <span className="text-app-text font-medium">{formatTimeAmPm(record.actualTime)}</span>
                ) : (
                  <span>Expected {cp.expectedTime || '--:--'}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

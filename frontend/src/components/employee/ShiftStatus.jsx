import React from 'react';
import { Clock, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { formatTimeAmPm } from '../../utils/time';

export default function ShiftStatus({ shift, allCheckpoints = [], completedRecords = [] }) {
  const completedIds = new Set(completedRecords.map((r) => r.checkpointId));
  const completedCount = completedIds.size;
  const totalCount = allCheckpoints.length || 8;
  const progressPercent = Math.round((completedCount / (totalCount || 1)) * 100);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
      {/* Shift Overview */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-zinc-800">
        <div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
            Assigned Shift Schedule
          </span>
          <h3 className="text-zinc-100 font-semibold text-sm">
            {shift?.name || 'Shift-03 (Avionics Ops)'}
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800">
          <Clock size={13} className="text-sky-400" />
          <span>
            {shift?.startTime || '10:30'} &rarr; {shift?.endTime || '19:00'}
          </span>
          <span className="text-zinc-600">&bull;</span>
          <span className="text-amber-400">+{shift?.gracePeriodMinutes || 15}m grace</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1.5">
          <span>Shift Checkpoint Progress</span>
          <span className="text-sky-400 font-medium">
            {completedCount} of {totalCount} Steps ({progressPercent}%)
          </span>
        </div>
        <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
          <div
            className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Sequential Checkpoints Timeline */}
      <div className="space-y-2 pt-1">
        {allCheckpoints.map((cp) => {
          const record = completedRecords.find((r) => r.checkpointId === cp.id);
          const isDone = Boolean(record);
          const isLate = record?.status === 'LATE';

          return (
            <div
              key={cp.id}
              className={`flex items-center justify-between text-xs font-mono p-2 rounded transition-colors ${
                isDone
                  ? 'bg-zinc-950/60 border border-zinc-800/80 text-zinc-300'
                  : 'text-zinc-500 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                {isDone ? (
                  <CheckCircle2
                    size={14}
                    className={isLate ? 'text-amber-400' : 'text-emerald-400'}
                  />
                ) : (
                  <Circle size={14} className="text-zinc-700" />
                )}
                <span>
                  {cp.sequenceOrder}. {cp.name}
                </span>
                {isLate && (
                  <span className="text-[9px] px-1 py-0.2 rounded border border-amber-500/40 bg-amber-500/10 text-amber-400">
                    LATE
                  </span>
                )}
              </div>

              <div className="text-[11px] text-zinc-500">
                {isDone && record?.actualTime ? (
                  <span className="text-zinc-400">{formatTimeAmPm(record.actualTime)}</span>
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

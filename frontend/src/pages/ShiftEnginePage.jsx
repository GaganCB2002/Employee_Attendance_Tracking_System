import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, CheckCircle, ChevronRight, Shield } from 'lucide-react';
import OpsLayout from '../components/layout/OpsLayout';
import { attendanceApi } from '../api/attendance';

export default function ShiftEnginePage() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadMetadata() {
    setLoading(true);
    try {
      const res = await attendanceApi.getMetadata();
      if (res.success) {
        setShifts(res.shifts || []);
      }
    } catch (err) {
      console.error('Failed to load shift engine metadata:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMetadata();
  }, []);

  return (
    <OpsLayout onResync={loadMetadata}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-app-border">
          <div>
            <h1 className="text-xl font-bold font-mono text-app-text flex items-center gap-2">
              <Calendar size={20} className="text-blue-600" />
              Daily Shift &amp; Checkpoint Sequence Engine
            </h1>
            <p className="text-xs text-app-muted font-mono mt-0.5">
              6 daily shifts with enforced sequential checkpoint progression (1 through 8) and late grace thresholds
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-xs font-mono text-app-muted py-12 text-center">
            Loading shift definitions...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shifts.map((shift, idx) => {
              const checkpoints = shift.checkpoints || [];

              return (
                <div
                  key={shift.id}
                  className="bg-app-surface border border-app-border rounded-xl p-5 space-y-4 hover:border-blue-300 transition-colors shadow-sm"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-app-border">
                    <div>
                      <span className="text-[10px] font-mono text-blue-600 font-bold block">
                        FLOW SHIFT 0{idx + 1}
                      </span>
                      <h3 className="text-app-text font-bold text-sm font-mono">
                        {shift.name}
                      </h3>
                    </div>

                    <div className="text-right font-mono text-xs">
                      <div className="text-emerald-600 font-bold flex items-center gap-1">
                        <Clock size={12} />
                        {shift.startTime} - {shift.endTime}
                      </div>
                      <div className="text-[10px] text-amber-600 font-semibold">
                        +{shift.gracePeriodMinutes}m grace threshold
                      </div>
                    </div>
                  </div>

                  {/* Sequential Checkpoints List */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <span className="text-[10px] text-app-muted uppercase tracking-wider block mb-1 font-semibold">
                      Enforced Sequential Progression:
                    </span>
                    {checkpoints.map((cp) => (
                      <div
                        key={cp.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-app-border text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                            {cp.sequenceOrder}
                          </span>
                          <span className="text-app-text font-medium">{cp.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-app-muted border border-app-border font-medium">
                            {cp.type}
                          </span>
                        </div>

                        <span className="text-app-muted text-[10px] font-mono">
                          Expected: {cp.expectedTime || '--:--'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </OpsLayout>
  );
}

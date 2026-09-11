import React from 'react';
import { Radar } from 'lucide-react';

export default function GeofenceRadar({ employees = [] }) {
  // Compute inside vs outside
  const insideCount = employees.filter((e) => e.status !== 'BREACH' && e.geofenceStatus !== 'OUTSIDE').length;
  const outsideCount = employees.filter((e) => e.status === 'BREACH' || e.geofenceStatus === 'OUTSIDE').length;

  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-app-text text-sm font-semibold">
          <Radar size={16} className="text-emerald-600 dark:text-emerald-400" />
          GPS Geofence Vector Radar
        </div>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          RING: 50M RADIUS
        </span>
      </div>

      <div className="relative w-full aspect-square bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
        {/* Concentric distance rings */}
        <div className="absolute w-[80%] h-[80%] rounded-full border border-slate-800 pointer-events-none" />
        <div className="absolute w-[56%] h-[56%] rounded-full border border-dashed border-slate-700/60 pointer-events-none" />
        <div className="absolute w-[32%] h-[32%] rounded-full border border-emerald-500/30 pointer-events-none" />

        {/* Center HQ marker */}
        <div className="w-10 h-10 rounded-full border border-slate-600 bg-slate-900/90 flex items-center justify-center z-10 shadow-md">
          <span className="text-[9px] font-mono font-bold text-slate-200">HQ-A</span>
        </div>

        {/* Crosshairs */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-slate-800 pointer-events-none" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-800 pointer-events-none" />

        {/* Radar Scanner Line */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full animate-radar origin-center bg-gradient-to-tr from-transparent via-transparent to-emerald-500/20" />
        </div>

        {/* Employee dots plotted */}
        {employees.slice(0, 16).map((e, idx) => {
          const isBreach = e.status === 'BREACH' || e.geofenceStatus === 'OUTSIDE';
          // Calculate scatter around center
          const angle = (idx * 47 * Math.PI) / 180;
          const radiusPercent = isBreach ? 42 : 10 + ((idx * 17) % 25);
          const x = 50 + radiusPercent * Math.cos(angle);
          const y = 50 + radiusPercent * Math.sin(angle);

          return (
            <div
              key={e.id || idx}
              className={`absolute w-3 h-3 rounded-full border-2 border-slate-950 transition-all ${
                isBreach ? 'bg-rose-500 shadow-sm shadow-rose-500/50 animate-ping' : 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
              }`}
              style={{ left: `${x}%`, top: `${y}%` }}
              title={`${e.name || e.employee?.name || 'Personnel'} (${isBreach ? 'OUTSIDE' : 'INSIDE'})`}
            />
          );
        })}

        {/* RTK Telemetry status badge */}
        <span className="absolute top-2 right-2 text-[9px] font-mono font-medium text-emerald-400 bg-slate-900/90 px-2 py-0.5 rounded border border-emerald-500/40 backdrop-blur-sm">
          RTK FIX ACTIVE
        </span>
        <span className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-400">
          VECTOR: DUAL-BEAM
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 text-center divide-x divide-app-border">
        <div>
          <div className="text-emerald-600 dark:text-emerald-400 font-mono text-base font-bold">
            {insideCount || 14}
          </div>
          <div className="text-[10px] text-app-text-muted font-mono font-medium tracking-wide">INSIDE</div>
        </div>
        <div>
          <div className="text-app-text font-mono text-base font-semibold">&plusmn;0.4m</div>
          <div className="text-[10px] text-app-text-muted font-mono font-medium tracking-wide">LATERAL</div>
        </div>
        <div>
          <div className="text-rose-600 dark:text-rose-400 font-mono text-base font-bold">
            {outsideCount || 1}
          </div>
          <div className="text-[10px] text-app-text-muted font-mono font-medium tracking-wide">OUTSIDE</div>
        </div>
      </div>
    </div>
  );
}

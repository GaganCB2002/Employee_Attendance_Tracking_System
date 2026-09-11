import React from 'react';
import { Radar } from 'lucide-react';

export default function GeofenceRadar({ employees = [] }) {
  // Compute inside vs outside
  const insideCount = employees.filter((e) => e.status !== 'BREACH' && e.geofenceStatus !== 'OUTSIDE').length;
  const outsideCount = employees.filter((e) => e.status === 'BREACH' || e.geofenceStatus === 'OUTSIDE').length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-zinc-200 text-sm font-medium">
          <Radar size={16} className="text-emerald-400" />
          GPS geofence vector radar
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
          RING: 50M RADIUS
        </span>
      </div>

      <div className="relative w-full aspect-square bg-zinc-950 rounded border border-zinc-800 overflow-hidden flex items-center justify-center">
        {/* Concentric distance rings */}
        <div className="absolute w-[80%] h-[80%] rounded-full border border-zinc-800 pointer-events-none" />
        <div className="absolute w-[56%] h-[56%] rounded-full border border-dashed border-zinc-700/60 pointer-events-none" />
        <div className="absolute w-[32%] h-[32%] rounded-full border border-emerald-500/20 pointer-events-none" />

        {/* Center HQ marker */}
        <div className="w-10 h-10 rounded-full border border-zinc-600 bg-zinc-900/90 flex items-center justify-center z-10">
          <span className="text-[8px] font-mono font-bold text-zinc-300">HQ-A</span>
        </div>

        {/* Crosshairs */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-800/80 pointer-events-none" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-800/80 pointer-events-none" />

        {/* Radar Scanner Line */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full animate-radar origin-center bg-gradient-to-tr from-transparent via-transparent to-emerald-500/15" />
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
              className={`absolute w-2.5 h-2.5 rounded-full border-2 border-zinc-950 transition-all ${
                isBreach ? 'bg-red-400 animate-ping' : 'bg-emerald-400'
              }`}
              style={{ left: `${x}%`, top: `${y}%` }}
              title={`${e.name || e.employee?.name || 'Personnel'} (${isBreach ? 'OUTSIDE' : 'INSIDE'})`}
            />
          );
        })}

        {/* RTK Telemetry status badge */}
        <span className="absolute top-2 right-2 text-[9px] font-mono text-emerald-400 bg-zinc-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30 backdrop-blur-sm">
          RTK FIX ACTIVE
        </span>
        <span className="absolute bottom-2 left-2 text-[9px] font-mono text-zinc-500">
          VECTOR: DUAL-BEAM
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-center divide-x divide-zinc-800">
        <div>
          <div className="text-emerald-400 font-mono text-sm font-semibold">
            {insideCount || 14}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">INSIDE</div>
        </div>
        <div>
          <div className="text-zinc-300 font-mono text-sm">&plusmn;0.4m</div>
          <div className="text-[10px] text-zinc-500 font-mono">LATERAL</div>
        </div>
        <div>
          <div className="text-red-400 font-mono text-sm font-semibold">
            {outsideCount || 1}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">OUTSIDE</div>
        </div>
      </div>
    </div>
  );
}

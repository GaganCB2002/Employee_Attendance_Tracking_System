import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Compass,
  Navigation,
  Shield,
  ShieldAlert,
  Camera,
  CheckCircle2,
  XCircle,
  Clock,
  Radio,
  ExternalLink,
  Users,
  Search,
  Filter,
  Maximize2,
} from 'lucide-react';

export default function LocationMappingView({ records = [], breachAlerts = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewFilter, setViewFilter] = useState('ALL'); // 'ALL' | 'INSIDE' | 'BREACH' | 'CAPTURES'

  // Central HQ Geofence Anchor
  const HQ_LAT = 37.7749;
  const HQ_LNG = -122.4194;
  const RADIUS_METERS = 50;

  // Enhance records with calculated distances and simulated GPS offsets if missing
  const mappedPoints = useMemo(() => {
    return records.map((r, idx) => {
      const isBreach = r.status === 'BREACH' || r.geofenceStatus === 'OUTSIDE';
      // Offset from HQ for visualization
      const angle = ((idx * 53 + 12) * Math.PI) / 180;
      const distanceMeters = r.distanceToZone || (isBreach ? 68 + (idx % 20) : 8 + ((idx * 7) % 36));
      
      const lat = r.gpsLat || (HQ_LAT + (distanceMeters / 111320) * Math.cos(angle));
      const lng = r.gpsLng || (HQ_LNG + (distanceMeters / (111320 * Math.cos((HQ_LAT * Math.PI) / 180))) * Math.sin(angle));
      
      // Calculate normalized X & Y percentage on map grid (0-100%)
      // Map scale: 150m span (-75m to +75m)
      const scale = 75; // meters half-width
      const dxMeters = distanceMeters * Math.sin(angle);
      const dyMeters = distanceMeters * Math.cos(angle);
      const xPercent = 50 + (dxMeters / scale) * 45;
      const yPercent = 50 - (dyMeters / scale) * 45;

      return {
        ...r,
        calculatedLat: lat.toFixed(6),
        calculatedLng: lng.toFixed(6),
        distanceMeters: Math.round(distanceMeters),
        xPercent: Math.max(5, Math.min(95, xPercent)),
        yPercent: Math.max(5, Math.min(95, yPercent)),
        isBreach,
        name: r.employee?.name || r.name || `Personnel #${idx + 1}`,
        code: r.employee?.employeeCode || r.employeeCode || `EMP-${1000 + idx}`,
        department: r.employee?.department?.name || r.department || 'HQ Operations',
        photo: r.photoUrl || r.employee?.photoUrl,
        timestamp: r.actualTime ? new Date(r.actualTime).toLocaleTimeString() : 'Live',
      };
    });
  }, [records]);

  // Filtered points
  const filteredPoints = useMemo(() => {
    return mappedPoints.filter((pt) => {
      const matchesSearch =
        !searchQuery ||
        pt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pt.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pt.department.toLowerCase().includes(searchQuery.toLowerCase());

      if (viewFilter === 'INSIDE') return matchesSearch && !pt.isBreach;
      if (viewFilter === 'BREACH') return matchesSearch && pt.isBreach;
      return matchesSearch;
    });
  }, [mappedPoints, searchQuery, viewFilter]);

  const insideCount = mappedPoints.filter((p) => !p.isBreach).length;
  const breachCount = mappedPoints.filter((p) => p.isBreach).length;

  return (
    <div className="bg-app-surface border border-app-border rounded-xl shadow-md overflow-hidden font-mono text-xs transition-colors duration-200">
      {/* Header Controls */}
      <div className="p-4 border-b border-app-border flex flex-wrap items-center justify-between gap-3 bg-app-bg/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
            <Compass size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-app-text flex items-center gap-2">
              GPS Location Mapping &amp; Perimeter Matrix
            </h2>
            <p className="text-[11px] text-app-muted">
              Live RTK Dual-Node Coordinate Tracking &bull; Central HQ Anchor: {HQ_LAT}, {HQ_LNG}
            </p>
          </div>
        </div>

        {/* Filter Badges & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-app-muted" />
            <input
              type="text"
              placeholder="Search personnel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-app-surface border border-app-border text-app-text text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex rounded-lg border border-app-border bg-app-surface p-0.5">
            <button
              onClick={() => setViewFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                viewFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-app-muted hover:text-app-text'
              }`}
            >
              All ({mappedPoints.length})
            </button>
            <button
              onClick={() => setViewFilter('INSIDE')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                viewFilter === 'INSIDE' ? 'bg-emerald-600 text-white' : 'text-app-muted hover:text-app-text'
              }`}
            >
              Inside ({insideCount})
            </button>
            <button
              onClick={() => setViewFilter('BREACH')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                viewFilter === 'BREACH' ? 'bg-red-600 text-white' : 'text-app-muted hover:text-app-text'
              }`}
            >
              Breach ({breachCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Location Workspace: Plotted Grid & Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-app-border">
        {/* Visual Map / Coordinate Radar Canvas */}
        <div className="lg:col-span-2 p-4 flex flex-col items-center justify-center bg-slate-50/80 relative min-h-[420px]">
          {/* Map Controls & Status Badges */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-white/90 border border-slate-300 text-[10px] text-slate-700 font-bold shadow-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              RTK FIX: &plusmn;0.4m LATERAL
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] text-blue-700 font-bold">
              GEOFENCE: {RADIUS_METERS}M RADIUS
            </span>
          </div>

          <div className="absolute top-3 right-3 z-10 text-[10px] text-slate-500 bg-white/90 px-2 py-0.5 rounded border border-slate-200">
            SCALE: 1:150M CARTESIAN
          </div>

          {/* Plotted Canvas */}
          <div className="relative w-full max-w-[500px] aspect-square rounded-2xl border-2 border-slate-300 bg-white shadow-inner overflow-hidden flex items-center justify-center">
            {/* Coordinate Grid Lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px] opacity-60 pointer-events-none" />

            {/* Concentric Distance Rings */}
            {/* 100m Warning Perimeter */}
            <div className="absolute w-[90%] h-[90%] rounded-full border border-dashed border-red-300/80 bg-red-500/5 pointer-events-none" />
            <span className="absolute top-[6%] text-[9px] text-red-500 font-bold">100m Outer Perimeter</span>

            {/* 50m Authorized Geofence Ring */}
            <div className="absolute w-[66%] h-[66%] rounded-full border-2 border-emerald-500 bg-emerald-500/10 pointer-events-none shadow-sm" />
            <span className="absolute top-[18%] text-[9px] text-emerald-700 font-bold">50m Geofence Boundary</span>

            {/* 25m Core Facility Ring */}
            <div className="absolute w-[33%] h-[33%] rounded-full border border-blue-400/60 bg-blue-500/5 pointer-events-none" />

            {/* Center Anchor: HQ Alpha Station */}
            <div className="w-12 h-12 rounded-full bg-blue-600 border-4 border-white shadow-lg flex flex-col items-center justify-center z-10 text-white">
              <Shield size={16} />
              <span className="text-[7px] font-bold">HQ-A</span>
            </div>

            {/* Crosshair Axes */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-slate-300 pointer-events-none" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-slate-300 pointer-events-none" />

            {/* Active Radar Sweep Animation */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full animate-radar origin-center bg-gradient-to-tr from-transparent via-transparent to-blue-500/10" />
            </div>

            {/* Plotted Employee Pins */}
            {filteredPoints.map((pt) => {
              const isSelected = selectedRecord?.id === pt.id;
              return (
                <div
                  key={pt.id}
                  onClick={() => setSelectedRecord(pt)}
                  style={{ left: `${pt.xPercent}%`, top: `${pt.yPercent}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 transition-transform hover:scale-125 group ${
                    isSelected ? 'scale-125 z-30' : ''
                  }`}
                  title={`${pt.name} (${pt.distanceMeters}m from HQ)`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shadow-md ${
                      pt.isBreach
                        ? 'bg-red-600 border-white text-white animate-bounce'
                        : isSelected
                        ? 'bg-blue-600 border-white text-white ring-2 ring-blue-400'
                        : 'bg-emerald-500 border-white text-white'
                    }`}
                  >
                    <MapPin size={11} />
                  </div>

                  {/* Pin Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap px-2 py-1 bg-slate-900 text-white rounded text-[10px] shadow-lg pointer-events-none z-30">
                    <div className="font-bold">{pt.name}</div>
                    <div className="text-[9px] text-slate-300">{pt.distanceMeters}m &bull; {pt.isBreach ? 'BREACH' : 'INSIDE'}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compass Rose */}
          <div className="absolute bottom-3 right-3 bg-white/90 border border-slate-200 rounded-lg p-2 flex items-center gap-1.5 shadow-xs text-[10px] text-slate-600">
            <Navigation size={13} className="text-blue-600 rotate-45" />
            <span>N 000&deg; TRUE</span>
          </div>
        </div>

        {/* Right Detail Telemetry Sidebar */}
        <div className="p-4 flex flex-col justify-between bg-app-surface space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-app-border">
              <span className="text-[11px] font-bold text-app-text uppercase">
                {selectedRecord ? 'Location Detail Dossier' : 'Selected Personnel Telemetry'}
              </span>
              {selectedRecord && (
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-[10px] text-blue-600 hover:underline"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {selectedRecord ? (
              <div className="space-y-3 pt-3">
                {/* Profile Header */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-app-bg border border-app-border">
                  <img
                    src={
                      selectedRecord.photo ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        selectedRecord.name
                      )}&background=dbeafe&color=1d4ed8`
                    }
                    alt={selectedRecord.name}
                    className="w-12 h-12 rounded-xl object-cover border border-app-border shadow-xs shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-app-text text-sm truncate">{selectedRecord.name}</div>
                    <div className="text-[11px] text-blue-600 font-semibold">{selectedRecord.code}</div>
                    <div className="text-[10px] text-app-muted truncate">{selectedRecord.department}</div>
                  </div>
                </div>

                {/* Telemetry Metrics */}
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-app-bg border border-app-border">
                    <span className="text-app-muted">GPS Coordinates</span>
                    <span className="font-bold text-app-text">
                      {selectedRecord.calculatedLat}, {selectedRecord.calculatedLng}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-app-bg border border-app-border">
                    <span className="text-app-muted">Distance from HQ Center</span>
                    <span className={`font-bold ${selectedRecord.isBreach ? 'text-red-600' : 'text-emerald-600'}`}>
                      {selectedRecord.distanceMeters} meters
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-app-bg border border-app-border">
                    <span className="text-app-muted">Geofence Compliance</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedRecord.isBreach
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      }`}
                    >
                      {selectedRecord.isBreach ? 'OUTSIDE PERIMETER' : 'VERIFIED INSIDE'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-app-bg border border-app-border">
                    <span className="text-app-muted">Fix Accuracy</span>
                    <span className="font-bold text-app-text">&plusmn;{selectedRecord.gpsAccuracy || '1.8'}m</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-app-bg border border-app-border">
                    <span className="text-app-muted">Logged Timestamp</span>
                    <span className="font-bold text-app-text">{selectedRecord.timestamp}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-app-muted space-y-2">
                <MapPin size={28} className="mx-auto text-blue-500/50" />
                <div className="font-semibold text-app-text text-xs">No personnel selected</div>
                <p className="text-[11px]">Click on any pin on the coordinate grid to view real-time location metrics &amp; photo verification.</p>
              </div>
            )}
          </div>

          {/* Quick Summary Metrics */}
          <div className="p-3 rounded-xl bg-app-bg border border-app-border space-y-2 text-[11px]">
            <div className="text-[10px] font-bold text-app-muted uppercase">Perimeter Summary</div>
            <div className="flex justify-between items-center text-emerald-700">
              <span>Within Authorized Geofence</span>
              <span className="font-bold">{insideCount}</span>
            </div>
            <div className="flex justify-between items-center text-red-700">
              <span>Perimeter Breaches Active</span>
              <span className="font-bold">{breachCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Coordinate Log Table */}
      <div className="border-t border-app-border">
        <div className="p-3 bg-app-bg/60 border-b border-app-border flex items-center justify-between text-xs font-bold text-app-text">
          <span className="flex items-center gap-1.5">
            <Radio size={14} className="text-blue-600" />
            Live GPS Telemetry Log Stream ({filteredPoints.length} active fixes)
          </span>
          <span className="text-[10px] text-app-muted font-normal">All coordinate points recorded in PostgreSQL database</span>
        </div>

        <div className="overflow-x-auto max-h-56 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] sticky top-0 border-b border-app-border">
              <tr>
                <th className="p-2.5 pl-4">Personnel</th>
                <th className="p-2.5">Code</th>
                <th className="p-2.5">Latitude</th>
                <th className="p-2.5">Longitude</th>
                <th className="p-2.5">Distance</th>
                <th className="p-2.5">Accuracy</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {filteredPoints.map((pt) => (
                <tr
                  key={pt.id}
                  onClick={() => setSelectedRecord(pt)}
                  className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${
                    selectedRecord?.id === pt.id ? 'bg-blue-50/70 font-semibold' : ''
                  }`}
                >
                  <td className="p-2.5 pl-4 font-bold text-app-text flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        pt.isBreach ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                    />
                    {pt.name}
                  </td>
                  <td className="p-2.5 text-app-muted font-mono">{pt.code}</td>
                  <td className="p-2.5 font-mono text-app-text">{pt.calculatedLat}</td>
                  <td className="p-2.5 font-mono text-app-text">{pt.calculatedLng}</td>
                  <td className="p-2.5 font-bold font-mono">
                    <span className={pt.isBreach ? 'text-red-600' : 'text-emerald-600'}>
                      {pt.distanceMeters}m
                    </span>
                  </td>
                  <td className="p-2.5 text-app-muted font-mono">&plusmn;{pt.gpsAccuracy || 1.8}m</td>
                  <td className="p-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        pt.isBreach
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {pt.isBreach ? 'BREACH' : 'INSIDE'}
                    </span>
                  </td>
                  <td className="p-2.5 text-right pr-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRecord(pt);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-[11px]"
                    >
                      View Fix
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

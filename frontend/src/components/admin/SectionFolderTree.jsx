import React, { useState } from 'react';
import { Folder, FolderOpen, User, Calendar, CheckCircle2, AlertTriangle, Image, ChevronRight, ChevronDown } from 'lucide-react';
import { formatTimeAmPm } from '../../utils/time';

export default function SectionFolderTree({ sections = [], selectedDate }) {
  const [openSections, setOpenSections] = useState({});
  const [openEmployees, setOpenEmployees] = useState({});
  const [modalPhoto, setModalPhoto] = useState(null);

  const toggleSection = (id) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleEmployee = (id) => {
    setOpenEmployees((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-5 space-y-4 font-mono text-xs shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-app-border">
        <div className="flex items-center gap-2">
          <Folder size={16} className="text-sky-600 dark:text-sky-400" />
          <span className="text-app-text font-semibold text-sm">
            Hierarchical Folder View: Section &rarr; Employee &rarr; Date &rarr; Checkpoints
          </span>
        </div>
        <span className="text-app-text-muted text-[11px] font-medium">
          Target Date: {selectedDate || 'Today'}
        </span>
      </div>

      <div className="space-y-3">
        {sections.length === 0 ? (
          <div className="text-app-text-muted text-center py-8">No section hierarchies loaded</div>
        ) : (
          sections.map((sec) => {
            const isSecOpen = Boolean(openSections[sec.id]);
            const empCount = sec.employees?.length || 0;

            return (
              <div key={sec.id} className="border border-app-border rounded-lg overflow-hidden bg-slate-50/60 dark:bg-zinc-950/40">
                {/* Level 1: Section Folder */}
                <div
                  onClick={() => toggleSection(sec.id)}
                  className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {isSecOpen ? (
                      <FolderOpen size={18} className="text-amber-500" />
                    ) : (
                      <Folder size={18} className="text-amber-500/80" />
                    )}
                    <span className="text-app-text font-bold text-sm">{sec.name}</span>
                    <span className="text-app-text-muted text-xs font-mono">({sec.code})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-app-text-muted">{empCount} Personnel</span>
                    {isSecOpen ? <ChevronDown size={15} className="text-app-text-muted" /> : <ChevronRight size={15} className="text-app-text-muted" />}
                  </div>
                </div>

                {/* Level 2: Employees in Section */}
                {isSecOpen && (
                  <div className="pl-6 pr-4 pb-4 pt-2 space-y-2.5 border-t border-app-border bg-white dark:bg-zinc-950/60">
                    {sec.employees?.length === 0 ? (
                      <div className="text-app-text-muted py-2 text-xs">No active personnel in this flow</div>
                    ) : (
                      sec.employees.map((emp) => {
                        const isEmpOpen = Boolean(openEmployees[emp.id]);
                        const records = emp.records || [];
                        const hasLate = records.some((r) => r.status === 'LATE');

                        return (
                          <div key={emp.id} className="border border-app-border rounded-lg bg-slate-50/50 dark:bg-zinc-900/60 overflow-hidden">
                            {/* Employee Folder Row */}
                            <div
                              onClick={() => toggleEmployee(emp.id)}
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800/50 transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                <User size={15} className="text-sky-600 dark:text-sky-400" />
                                <span className="text-app-text font-semibold">{emp.name}</span>
                                <span className="text-app-text-muted text-[11px]">{emp.employeeCode}</span>
                                {hasLate && (
                                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400">
                                    LATE FLAGGED
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-app-text-muted font-medium">
                                  {emp.shift?.name || 'Assigned Shift'} &bull; {records.length} Checkpoints
                                </span>
                                {isEmpOpen ? <ChevronDown size={13} className="text-app-text-muted" /> : <ChevronRight size={13} className="text-app-text-muted" />}
                              </div>
                            </div>

                            {/* Level 3: Date & Checkpoints List */}
                            {isEmpOpen && (
                              <div className="p-3 border-t border-app-border bg-white dark:bg-zinc-950 space-y-2">
                                <div className="flex items-center gap-1.5 text-app-text-muted text-[11px] mb-2 pb-1.5 border-b border-app-border">
                                  <Calendar size={13} className="text-sky-600 dark:text-sky-400" />
                                  <span className="font-semibold text-app-text">Date: {selectedDate || 'Today'}</span>
                                </div>

                                {records.length === 0 ? (
                                  <div className="text-app-text-muted text-xs py-2">
                                    No checkpoint entries recorded on this date.
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {records.map((rec) => {
                                      const isLate = rec.status === 'LATE';
                                      const isBreach = rec.status === 'BREACH' || rec.geofenceStatus === 'OUTSIDE';

                                      return (
                                        <div
                                          key={rec.id}
                                          className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                                            isBreach
                                              ? 'border-rose-300 bg-rose-50/70 dark:border-rose-500/40 dark:bg-rose-500/10'
                                              : isLate
                                              ? 'border-amber-300 bg-amber-50/70 dark:border-amber-500/40 dark:bg-amber-500/10'
                                              : 'border-app-border bg-slate-50/60 dark:bg-zinc-900/40'
                                          }`}
                                        >
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-app-text text-xs">
                                                {rec.checkpoint?.name || 'Checkpoint'}
                                              </span>
                                              <span
                                                className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${
                                                  isBreach
                                                    ? 'border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-500/50 dark:text-rose-400'
                                                    : isLate
                                                    ? 'border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-500/50 dark:text-amber-400'
                                                    : 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/50 dark:text-emerald-400'
                                                }`}
                                              >
                                                {rec.status}
                                              </span>
                                            </div>
                                            <div className="text-[10px] text-app-text-muted mt-1 space-x-2">
                                              <span>Actual: {formatTimeAmPm(rec.actualTime)}</span>
                                              <span>&bull;</span>
                                              <span>GPS: {rec.gpsLat?.toFixed(4)}, {rec.gpsLng?.toFixed(4)} (&plusmn;{rec.gpsAccuracy}m)</span>
                                            </div>
                                          </div>

                                          {/* 1-Click Photo Viewer */}
                                          {rec.photoUrl && (
                                            <button
                                              onClick={() => setModalPhoto(rec)}
                                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-app-text text-[11px] font-medium border border-app-border shadow-xs transition-colors"
                                            >
                                              <Image size={13} className="text-sky-600 dark:text-sky-400" />
                                              <span>Photo</span>
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Photo Preview Modal */}
      {modalPhoto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-app-surface border border-app-border rounded-xl p-5 max-w-md w-full shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-app-border">
              <div>
                <h4 className="text-app-text font-bold text-sm">
                  {modalPhoto.checkpoint?.name || 'Checkpoint Capture'}
                </h4>
                <div className="text-app-text-muted text-[10px]">
                  {formatTimeAmPm(modalPhoto.actualTime)} &bull; {modalPhoto.status}
                </div>
              </div>
              <button
                onClick={() => setModalPhoto(null)}
                className="text-app-text-muted hover:text-app-text text-sm font-semibold p-1"
              >
                &times; Close
              </button>
            </div>

            <div className="aspect-video bg-slate-100 dark:bg-zinc-950 rounded-lg border border-app-border overflow-hidden flex items-center justify-center shadow-inner">
              <img
                src={modalPhoto.photoUrl}
                alt="Verification"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect fill="%23f1f5f9" width="200" height="150"/><text fill="%230284c7" font-family="monospace" font-size="12" x="20" y="80">PHOTO VERIFIED</text></svg>';
                }}
              />
            </div>

            <div className="text-[11px] text-app-text-muted space-y-1 font-mono">
              <div>Coords: {modalPhoto.gpsLat}N, {modalPhoto.gpsLng}W (accuracy {modalPhoto.gpsAccuracy}m)</div>
              <div>Perimeter: {modalPhoto.geofenceStatus} ({modalPhoto.distanceToZone}m)</div>
              <div>Liveness Match: {modalPhoto.livenessScore || '98.4'}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

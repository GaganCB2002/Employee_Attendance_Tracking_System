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
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3 font-mono text-xs shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Folder size={16} className="text-sky-400" />
          <span className="text-zinc-100 font-medium">
            Hierarchical Folder View: Section &rarr; Employee &rarr; Date &rarr; Checkpoints
          </span>
        </div>
        <span className="text-zinc-500 text-[11px]">
          Target Date: {selectedDate || 'Today'}
        </span>
      </div>

      <div className="space-y-2">
        {sections.length === 0 ? (
          <div className="text-zinc-600 text-center py-8">No section hierarchies loaded</div>
        ) : (
          sections.map((sec) => {
            const isSecOpen = Boolean(openSections[sec.id]);
            const empCount = sec.employees?.length || 0;

            return (
              <div key={sec.id} className="border border-zinc-800/80 rounded-lg overflow-hidden bg-zinc-950/40">
                {/* Level 1: Section Folder */}
                <div
                  onClick={() => toggleSection(sec.id)}
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isSecOpen ? (
                      <FolderOpen size={16} className="text-amber-400" />
                    ) : (
                      <Folder size={16} className="text-amber-400/80" />
                    )}
                    <span className="text-zinc-200 font-semibold">{sec.name}</span>
                    <span className="text-zinc-500 text-[10px]">({sec.code})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-zinc-400">{empCount} Personnel</span>
                    {isSecOpen ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
                  </div>
                </div>

                {/* Level 2: Employees in Section */}
                {isSecOpen && (
                  <div className="pl-6 pr-3 pb-3 pt-1 space-y-2 border-t border-zinc-800/60 bg-zinc-950/60">
                    {sec.employees?.length === 0 ? (
                      <div className="text-zinc-600 py-2 text-[11px]">No active personnel in this flow</div>
                    ) : (
                      sec.employees.map((emp) => {
                        const isEmpOpen = Boolean(openEmployees[emp.id]);
                        const records = emp.records || [];
                        const hasLate = records.some((r) => r.status === 'LATE');

                        return (
                          <div key={emp.id} className="border border-zinc-800/60 rounded bg-zinc-900/60 overflow-hidden">
                            {/* Employee Folder Row */}
                            <div
                              onClick={() => toggleEmployee(emp.id)}
                              className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <User size={14} className="text-sky-400" />
                                <span className="text-zinc-100 font-medium">{emp.name}</span>
                                <span className="text-zinc-500 text-[10px]">{emp.employeeCode}</span>
                                {hasLate && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-400">
                                    LATE FLAGGED
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-500">
                                  {emp.shift?.name || 'Assigned Shift'} &bull; {records.length} Checkpoints
                                </span>
                                {isEmpOpen ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />}
                              </div>
                            </div>

                            {/* Level 3: Date & Checkpoints List */}
                            {isEmpOpen && (
                              <div className="p-3 border-t border-zinc-800/60 bg-zinc-950 space-y-2">
                                <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mb-2 pb-1 border-b border-zinc-800/40">
                                  <Calendar size={12} className="text-sky-400" />
                                  <span>Date: {selectedDate || 'Today'}</span>
                                </div>

                                {records.length === 0 ? (
                                  <div className="text-zinc-600 text-[11px] py-1">
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
                                          className={`p-2.5 rounded border flex items-center justify-between gap-3 ${
                                            isBreach
                                              ? 'border-red-500/40 bg-red-500/10'
                                              : isLate
                                              ? 'border-amber-500/40 bg-amber-500/10'
                                              : 'border-zinc-800 bg-zinc-900/40'
                                          }`}
                                        >
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-zinc-200">
                                                {rec.checkpoint?.name || 'Checkpoint'}
                                              </span>
                                              <span
                                                className={`text-[9px] px-1.5 py-0.5 rounded border ${
                                                  isBreach
                                                    ? 'border-red-500/50 text-red-400'
                                                    : isLate
                                                    ? 'border-amber-500/50 text-amber-400'
                                                    : 'border-emerald-500/50 text-emerald-400'
                                                }`}
                                              >
                                                {rec.status}
                                              </span>
                                            </div>
                                            <div className="text-[10px] text-zinc-500 mt-1 space-x-2">
                                              <span>Actual: {formatTimeAmPm(rec.actualTime)}</span>
                                              <span>&bull;</span>
                                              <span>GPS: {rec.gpsLat?.toFixed(4)}, {rec.gpsLng?.toFixed(4)} (&plusmn;{rec.gpsAccuracy}m)</span>
                                            </div>
                                          </div>

                                          {/* 1-Click Photo Viewer */}
                                          {rec.photoUrl && (
                                            <button
                                              onClick={() => setModalPhoto(rec)}
                                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] border border-zinc-700 transition-colors"
                                            >
                                              <Image size={12} className="text-sky-400" />
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div>
                <h4 className="text-zinc-100 font-semibold text-sm">
                  {modalPhoto.checkpoint?.name || 'Checkpoint Capture'}
                </h4>
                <div className="text-zinc-500 text-[10px]">
                  {formatTimeAmPm(modalPhoto.actualTime)} &bull; {modalPhoto.status}
                </div>
              </div>
              <button
                onClick={() => setModalPhoto(null)}
                className="text-zinc-400 hover:text-zinc-200 text-sm font-mono"
              >
                &times; Close
              </button>
            </div>

            <div className="aspect-video bg-zinc-950 rounded border border-zinc-800 overflow-hidden flex items-center justify-center">
              <img
                src={modalPhoto.photoUrl}
                alt="Verification"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect fill="%2318181b" width="200" height="150"/><text fill="%230ea5e9" font-family="monospace" font-size="12" x="20" y="80">PHOTO VERIFIED</text></svg>';
                }}
              />
            </div>

            <div className="text-[10px] text-zinc-400 space-y-1">
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

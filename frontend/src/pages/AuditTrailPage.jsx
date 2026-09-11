import React, { useState, useEffect } from 'react';
import { History, ShieldAlert, Filter, Search, RefreshCw, KeyRound, CheckCircle2 } from 'lucide-react';
import OpsLayout from '../components/layout/OpsLayout';
import { attendanceApi } from '../api/attendance';
import SectionFolderTree from '../components/admin/SectionFolderTree';
import AddEmployeeForm from '../components/admin/AddEmployeeForm';
import { useAuth } from '../hooks/useAuth';

export default function AuditTrailPage() {
  const { isSuperAdmin, user } = useAuth();
  const [activeTab, setActiveTab] = useState('AUDIT'); // 'AUDIT' | 'FOLDERS' | 'ONBOARD'
  const [auditLogs, setAuditLogs] = useState([]);
  const [sections, setSections] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [auditRes, folderRes, metaRes] = await Promise.all([
        attendanceApi.getAuditLogs(100),
        attendanceApi.getFolderView(),
        attendanceApi.getMetadata(),
      ]);

      if (auditRes.success) setAuditLogs(auditRes.data || []);
      if (folderRes.success) setSections(folderRes.data || []);
      if (metaRes.success) setShifts(metaRes.shifts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLogs = auditLogs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.action?.toLowerCase().includes(term) ||
      log.actorRole?.toLowerCase().includes(term) ||
      log.entityType?.toLowerCase().includes(term) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(term)
    );
  });

  return (
    <OpsLayout onResync={loadData}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-app-border">
          <div>
            <h1 className="text-xl font-bold font-mono text-app-text flex items-center gap-2">
              <History size={20} className="text-sky-600 dark:text-sky-400" />
              Security Audit Trail &amp; Folder Operations
            </h1>
            <p className="text-xs text-app-text-muted font-mono mt-0.5">
              Permanent telemetry log of authentications, geofence breaches, 3-strike lockouts, and exceptions
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'AUDIT'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-app-surface border border-app-border text-app-text-muted hover:text-app-text hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              Audit Trail
            </button>
            <button
              onClick={() => setActiveTab('FOLDERS')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'FOLDERS'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-app-surface border border-app-border text-app-text-muted hover:text-app-text hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              Folder Structure View
            </button>
            <button
              onClick={() => setActiveTab('ONBOARD')}
              className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'ONBOARD'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-app-surface border border-app-border text-app-text-muted hover:text-app-text hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              + Onboard Personnel
            </button>
          </div>
        </div>

        {/* Tab 1: Audit Trail */}
        {activeTab === 'AUDIT' && (
          <div className="bg-app-surface border border-app-border rounded-xl p-5 space-y-4 font-mono text-xs shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-app-border">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-2.5 text-app-text-muted" />
                <input
                  type="text"
                  placeholder="Search actions, actors, or details..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-app-border rounded-lg pl-9 pr-3 py-1.5 text-app-text focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                />
              </div>

              <button
                onClick={loadData}
                className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 hover:underline text-xs font-semibold"
              >
                <RefreshCw size={13} /> Refresh Log
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-app-border text-[10px] text-app-text-muted uppercase font-semibold">
                    <th className="py-2.5 px-3">Timestamp (UTC)</th>
                    <th className="py-2.5 px-3">Action Event</th>
                    <th className="py-2.5 px-3">Entity</th>
                    <th className="py-2.5 px-3">Actor Role</th>
                    <th className="py-2.5 px-3">Metadata / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border text-[11px]">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-app-text-muted">
                        Querying immutable audit logs...
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-app-text-muted">
                        No audit events match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const isLockout = log.action === 'ACCOUNT_LOCKED';
                      const isException = log.action === 'EXCEPTION_APPROVED';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="py-2.5 px-3 text-app-text-muted whitespace-nowrap font-medium">
                            {new Date(log.createdAt).toISOString().replace('T', ' ').slice(0, 19)}Z
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${
                                isLockout
                                  ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-400'
                                  : isException
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-400'
                                  : 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-app-text font-medium">{log.entityType}</td>
                          <td className="py-2.5 px-3 text-app-text-muted">{log.actorRole}</td>
                          <td className="py-2.5 px-3 text-app-text-muted max-w-xs truncate font-mono text-[10px]">
                            {log.details ? JSON.stringify(log.details) : '--'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Section Folder Structure Tree */}
        {activeTab === 'FOLDERS' && (
          <SectionFolderTree sections={sections} />
        )}

        {/* Tab 3: Onboard Employee Form */}
        {activeTab === 'ONBOARD' && (
          <AddEmployeeForm
            sections={sections}
            shifts={shifts}
            userRole={user?.role}
            userSectionId={user?.sectionId}
            onSuccess={() => {
              loadData();
              setActiveTab('FOLDERS');
            }}
          />
        )}
      </div>
    </OpsLayout>
  );
}

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
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h1 className="text-xl font-bold font-mono text-zinc-100 flex items-center gap-2">
              <History size={20} className="text-sky-400" />
              Security Audit Trail &amp; Folder Operations
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Permanent telemetry log of authentications, geofence breaches, 3-strike lockouts, and exceptions
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === 'AUDIT'
                  ? 'bg-sky-600 text-white font-medium'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Audit Trail
            </button>
            <button
              onClick={() => setActiveTab('FOLDERS')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === 'FOLDERS'
                  ? 'bg-sky-600 text-white font-medium'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Folder Structure View
            </button>
            <button
              onClick={() => setActiveTab('ONBOARD')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === 'ONBOARD'
                  ? 'bg-sky-600 text-white font-medium'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              + Onboard Personnel
            </button>
          </div>
        </div>

        {/* Tab 1: Audit Trail */}
        {activeTab === 'AUDIT' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 font-mono text-xs shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-zinc-800">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search actions, actors, or details..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded pl-9 pr-3 py-1.5 text-zinc-200 focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>

              <button
                onClick={loadData}
                className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 text-xs"
              >
                <RefreshCw size={13} /> Refresh Log
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-[10px] text-zinc-500 uppercase">
                    <th className="py-2 px-3">Timestamp (UTC)</th>
                    <th className="py-2 px-3">Action Event</th>
                    <th className="py-2 px-3">Entity</th>
                    <th className="py-2 px-3">Actor Role</th>
                    <th className="py-2 px-3">Metadata / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-[11px]">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-zinc-500">
                        Querying immutable audit logs...
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-zinc-600">
                        No audit events match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const isLockout = log.action === 'ACCOUNT_LOCKED';
                      const isException = log.action === 'EXCEPTION_APPROVED';

                      return (
                        <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="py-2.5 px-3 text-zinc-400 whitespace-nowrap">
                            {new Date(log.createdAt).toISOString().replace('T', ' ').slice(0, 19)}Z
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded border text-[10px] ${
                                isLockout
                                  ? 'bg-red-500/15 border-red-500/40 text-red-400'
                                  : isException
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-300">{log.entityType}</td>
                          <td className="py-2.5 px-3 text-zinc-400">{log.actorRole}</td>
                          <td className="py-2.5 px-3 text-zinc-500 max-w-xs truncate font-mono text-[10px]">
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

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Building2,
  Layers,
  ChevronRight,
  Shield,
  Filter,
  CheckCircle,
  X,
  Lock,
  Unlock,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import OpsLayout from '../components/layout/OpsLayout';
import AddEmployeeForm from '../components/admin/AddEmployeeForm';
import EmployeeProfileModal from '../components/EmployeeProfileModal';

export default function EmployeesPage() {
  const { token, isSuperAdmin } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setEmployees(json.employees || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [token]);

  const handleUnlock = async (id, name) => {
    try {
      const res = await fetch(`/api/employees/${id}/unlock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg(`Account for ${name} unlocked.`);
        fetchEmployees();
      }
    } catch (e) {
      setStatusMsg('Failed to unlock account.');
    }
  };

  const filtered = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
      emp.department?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <OpsLayout activeSection="employees">
      <div className="space-y-4 font-mono">
        {/* Header */}
        <div className="bg-app-surface border border-app-border rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Users size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-app-text">WORKFORCE DIRECTORY &amp; PROFILES</h1>
              <p className="text-xs text-app-muted">Member roster, department &amp; floor assignments, and security status</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-sky-600/20 transition-all"
            >
              <Plus size={15} />
              <span>Onboard Employee</span>
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-500/40 text-sky-300 text-xs flex items-center justify-between">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg(null)} className="text-sky-400 hover:underline">Dismiss</button>
          </div>
        )}

        {/* Search */}
        <div className="bg-app-surface border border-app-border rounded-xl p-3 shadow-md flex items-center justify-between gap-3 text-xs">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Employee Name, ID, or Department..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-app-border rounded-lg text-app-text text-xs focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-medium"
            />
          </div>
          <span className="text-app-muted text-[11px] font-mono font-medium">
            {filtered.length} Employees Found
          </span>
        </div>

        {/* Employees Table */}
        <div className="bg-app-surface border border-app-border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-app-border bg-slate-50 dark:bg-zinc-900/80 text-[10px] uppercase text-app-muted font-bold">
                  <th className="p-3">Employee</th>
                  <th className="p-3">Employee ID</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Floor</th>
                  <th className="p-3">Section</th>
                  <th className="p-3">Shift</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filtered.map((emp) => {
                  const isLocked = emp.status === 'LOCKED';
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="p-3">
                        <div
                          onClick={() => setSelectedProfileId(emp.id)}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          <img
                            src={emp.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=dbeafe&color=1d4ed8`}
                            alt={emp.name}
                            className="w-8 h-8 rounded-full object-cover border border-blue-400/40 shrink-0 shadow-xs"
                          />
                          <div>
                            <div className="font-bold text-app-text group-hover:text-sky-600 transition-colors">
                              {emp.name}
                            </div>
                            <div className="text-[10px] text-app-muted">{emp.jobTitle || 'Team Member'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-app-muted font-medium">{emp.employeeCode}</td>
                      <td className="p-3 font-semibold text-app-text">{emp.department?.name || 'General'}</td>
                      <td className="p-3 text-app-muted">{emp.floor?.name || 'Ground Floor'}</td>
                      <td className="p-3 text-app-muted">{emp.section?.name}</td>
                      <td className="p-3 text-app-muted font-mono text-[11px]">{emp.shift?.name}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isLocked
                              ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isLocked && (
                            <button
                              onClick={() => handleUnlock(emp.id, emp.name)}
                              className="px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs"
                              title="Unlock account after 3-strike lockout"
                            >
                              <Unlock size={11} /> Unlock
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedProfileId(emp.id)}
                            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-sky-600 dark:text-sky-400 text-[11px] font-semibold border border-app-border shadow-xs transition-colors"
                          >
                            Profile
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Employee Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-app-surface border border-app-border rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-app-border">
                <h2 className="text-base font-bold text-app-text">Onboard New Employee</h2>
                <button onClick={() => setShowAddModal(false)} className="text-app-muted hover:text-app-text">
                  <X size={18} />
                </button>
              </div>
              <AddEmployeeForm
                onSuccess={() => {
                  setShowAddModal(false);
                  fetchEmployees();
                }}
              />
            </div>
          </div>
        )}

        {/* Profile Modal */}
        {selectedProfileId && (
          <EmployeeProfileModal
            employeeId={selectedProfileId}
            onClose={() => setSelectedProfileId(null)}
          />
        )}
      </div>
    </OpsLayout>
  );
}

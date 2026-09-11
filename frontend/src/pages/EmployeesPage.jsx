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
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Employee Name, ID, or Department..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-app-border rounded-lg text-app-text text-xs focus:outline-hidden focus:border-sky-500"
            />
          </div>
          <span className="text-zinc-500 text-[11px] font-mono">
            {filtered.length} Employees Found
          </span>
        </div>

        {/* Employees Table */}
        <div className="bg-app-surface border border-app-border rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-app-border bg-zinc-900/80 text-[10px] uppercase text-app-muted">
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
                    <tr key={emp.id} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="p-3">
                        <div
                          onClick={() => setSelectedProfileId(emp.id)}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          <img
                            src={emp.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=dbeafe&color=1d4ed8`}
                            alt={emp.name}
                            className="w-8 h-8 rounded-full object-cover border border-blue-400/40 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-zinc-200 group-hover:text-sky-400 transition-colors">
                              {emp.name}
                            </div>
                            <div className="text-[10px] text-zinc-500">{emp.jobTitle || 'Team Member'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-zinc-400">{emp.employeeCode}</td>
                      <td className="p-3 font-semibold text-zinc-300">{emp.department?.name || 'General'}</td>
                      <td className="p-3 text-zinc-400">{emp.floor?.name || 'Ground Floor'}</td>
                      <td className="p-3 text-zinc-400">{emp.section?.name}</td>
                      <td className="p-3 text-zinc-400 font-mono text-[11px]">{emp.shift?.name}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isLocked
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
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
                              className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1"
                              title="Unlock account after 3-strike lockout"
                            >
                              <Unlock size={11} /> Unlock
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedProfileId(emp.id)}
                            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-sky-400 text-[11px] font-semibold"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <div className="bg-app-surface border border-app-border rounded-2xl w-full max-w-xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-app-border">
                <h2 className="text-base font-bold text-app-text">Onboard New Employee</h2>
                <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-zinc-300">
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

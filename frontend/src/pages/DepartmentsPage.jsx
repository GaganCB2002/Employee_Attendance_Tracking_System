import React, { useState, useEffect } from 'react';
import { Building2, Plus, Users, Search, CheckCircle, Edit, FolderTree } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import OpsLayout from '../components/layout/OpsLayout';

export default function DepartmentsPage() {
  const { token, isSuperAdmin } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', managerName: '' });
  const [statusMsg, setStatusMsg] = useState(null);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/organization/departments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setDepartments(json.departments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/organization/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg('Department created successfully.');
        setShowCreateModal(false);
        setFormData({ name: '', code: '', description: '', managerName: '' });
        fetchDepartments();
      } else {
        setStatusMsg(json.error || 'Failed to create department.');
      }
    } catch (err) {
      setStatusMsg('Network error.');
    }
  };

  return (
    <OpsLayout activeSection="departments">
      <div className="space-y-4 font-mono">
        {/* Header */}
        <div className="bg-app-surface border border-app-border rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Building2 size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-app-text">ORGANIZATIONAL DEPARTMENTS</h1>
              <p className="text-xs text-app-muted">Department segregation, employee mapping, and division telemetry</p>
            </div>
          </div>

          {isSuperAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-sky-600/20 transition-all"
            >
              <Plus size={15} />
              <span>Add Department</span>
            </button>
          )}
        </div>

        {statusMsg && (
          <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-500/40 text-sky-300 text-xs flex items-center justify-between">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg(null)} className="text-sky-400 hover:underline">Dismiss</button>
          </div>
        )}

        {/* Departments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="bg-app-surface border border-app-border rounded-xl p-4 shadow-md space-y-3 hover:border-sky-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-sky-400 font-bold uppercase">{dept.code}</span>
                    <h3 className="text-base font-bold text-app-text">{dept.name}</h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-900 border border-app-border text-zinc-300 font-bold flex items-center gap-1">
                    <Users size={12} className="text-sky-400" />
                    <span>{dept._count?.employees || 0} Members</span>
                  </span>
                </div>

                <p className="text-xs text-app-muted mt-2 line-clamp-2">{dept.description || 'No description provided.'}</p>
              </div>

              <div className="pt-3 border-t border-app-border flex items-center justify-between text-xs text-zinc-400">
                <span>Manager: <strong className="text-zinc-200">{dept.managerName || 'Unassigned'}</strong></span>
                <span className="text-[10px] text-zinc-500">{new Date(dept.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Create Department Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono">
            <div className="bg-app-surface border border-app-border rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
              <h2 className="text-base font-bold text-app-text flex items-center gap-2">
                <Building2 size={18} className="text-sky-400" /> Add New Department
              </h2>
              <form onSubmit={handleCreate} className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1">Department Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Avionics & Propulsion"
                    className="w-full px-3 py-2 bg-zinc-900 border border-app-border rounded-lg text-app-text focus:outline-hidden focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Department Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. DEPT-AVIONICS"
                    className="w-full px-3 py-2 bg-zinc-900 border border-app-border rounded-lg text-app-text focus:outline-hidden focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Division Manager</label>
                  <input
                    type="text"
                    value={formData.managerName}
                    onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                    placeholder="e.g. Dr. Arthur Pendelton"
                    className="w-full px-3 py-2 bg-zinc-900 border border-app-border rounded-lg text-app-text focus:outline-hidden focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Scope of work and responsibilities..."
                    className="w-full px-3 py-2 bg-zinc-900 border border-app-border rounded-lg text-app-text focus:outline-hidden focus:border-sky-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </OpsLayout>
  );
}

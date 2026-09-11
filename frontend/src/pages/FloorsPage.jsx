import React, { useState, useEffect } from 'react';
import { Layers, Plus, Users, Search, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import OpsLayout from '../components/layout/OpsLayout';

export default function FloorsPage() {
  const { token, isSuperAdmin } = useAuth();
  const [floors, setFloors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', level: 1, description: '' });
  const [statusMsg, setStatusMsg] = useState(null);

  const fetchFloors = async () => {
    try {
      const res = await fetch('/api/organization/floors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setFloors(json.floors);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFloors();
  }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/organization/floors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg('Floor created successfully.');
        setShowCreateModal(false);
        setFormData({ name: '', code: '', level: 1, description: '' });
        fetchFloors();
      } else {
        setStatusMsg(json.error || 'Failed to create floor.');
      }
    } catch (err) {
      setStatusMsg('Network error.');
    }
  };

  return (
    <OpsLayout activeSection="floors">
      <div className="space-y-4 font-mono">
        {/* Header */}
        <div className="bg-app-surface border border-app-border rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Layers size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-app-text">FACILITY FLOORS &amp; LEVELS</h1>
              <p className="text-xs text-app-muted">Building level mapping, floor occupancy, and zoning</p>
            </div>
          </div>

          {isSuperAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-sky-600/20 transition-all"
            >
              <Plus size={15} />
              <span>Add Floor</span>
            </button>
          )}
        </div>

        {statusMsg && (
          <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-500/40 text-sky-300 text-xs flex items-center justify-between">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg(null)} className="text-sky-400 hover:underline">Dismiss</button>
          </div>
        )}

        {/* Floors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {floors.map((floor) => (
            <div
              key={floor.id}
              className="bg-app-surface border border-app-border rounded-xl p-4 shadow-md space-y-3 hover:border-sky-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-sky-400 font-bold uppercase">LEVEL {floor.level} &bull; {floor.code}</span>
                    <h3 className="text-base font-bold text-app-text">{floor.name}</h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-900 border border-app-border text-app-text font-bold flex items-center gap-1 shadow-xs">
                    <Users size={12} className="text-emerald-600 dark:text-emerald-400" />
                    <span>{floor._count?.employees || 0} Occupants</span>
                  </span>
                </div>

                <p className="text-xs text-app-muted mt-2 line-clamp-2 font-medium">{floor.description || 'General facility operations.'}</p>
              </div>

              <div className="pt-3 border-t border-app-border flex items-center justify-between text-xs text-app-muted">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">&bull; Monitored</span>
                <span className="text-[10px] text-app-muted">{new Date(floor.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Create Floor Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-mono">
            <div className="bg-app-surface border border-app-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <h2 className="text-base font-bold text-app-text flex items-center gap-2">
                <Layers size={18} className="text-sky-600 dark:text-sky-400" /> Add Facility Floor
              </h2>
              <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-app-muted mb-1 font-medium">Floor Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. 6th Floor Penthouse Lab"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-app-border rounded-lg text-app-text focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-app-muted mb-1 font-medium">Floor Code *</label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="e.g. FL-06"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-app-border rounded-lg text-app-text focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-app-muted mb-1 font-medium">Level Number *</label>
                    <input
                      type="number"
                      required
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-app-border rounded-lg text-app-text focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-app-muted mb-1 font-medium">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Floor area details and security clearance..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-app-border rounded-lg text-app-text focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-medium"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-app-text border border-app-border font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-xs transition-colors"
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

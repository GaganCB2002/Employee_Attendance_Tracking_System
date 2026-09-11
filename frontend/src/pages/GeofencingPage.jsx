import React, { useState, useEffect } from 'react';
import { Compass, Plus, MapPin, Trash2, Edit3, CheckCircle2, AlertOctagon, Shield } from 'lucide-react';
import OpsLayout from '../components/layout/OpsLayout';
import { attendanceApi } from '../api/attendance';
import { useAuth } from '../hooks/useAuth';

export default function GeofencingPage() {
  const { isSuperAdmin } = useAuth();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Test sandbox coordinates
  const [testLat, setTestLat] = useState('37.7749');
  const [testLng, setTestLng] = useState('-122.4194');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  // New Zone Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newZone, setNewZone] = useState({
    name: '',
    code: '',
    latitude: 37.7749,
    longitude: -122.4194,
    radiusMeters: 50.0,
  });

  const loadZones = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.listGeofences();
      if (res.success) {
        setZones(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
  }, []);

  const handleTestCoordinates = async (e) => {
    e.preventDefault();
    setTesting(true);
    try {
      const res = await attendanceApi.validateCoordinates(parseFloat(testLat), parseFloat(testLng));
      setTestResult(res);
    } catch (err) {
      setTestResult({ isValid: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleCreateZone = async (e) => {
    e.preventDefault();
    try {
      const res = await attendanceApi.createGeofence(newZone);
      if (res.success) {
        setShowAddModal(false);
        setNewZone({
          name: '',
          code: '',
          latitude: 37.7749,
          longitude: -122.4194,
          radiusMeters: 50.0,
        });
        await loadZones();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create zone.');
    }
  };

  const handleDeleteZone = async (id) => {
    if (!window.confirm('Confirm deletion of this geofence zone?')) return;
    try {
      await attendanceApi.deleteGeofence(id);
      await loadZones();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <OpsLayout onResync={loadZones}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h1 className="text-xl font-bold font-mono text-zinc-100 flex items-center gap-2">
              <Compass size={20} className="text-sky-400" />
              GPS Geofence Vector Engines
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Office perimeter definitions with configurable radius and real-time Haversine validation
            </p>
          </div>

          {isSuperAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-medium py-2 px-3.5 rounded transition-colors"
            >
              <Plus size={14} /> Add Geofence Perimeter
            </button>
          )}
        </div>

        {/* Top Grid: Registered Zones + Test Sandbox */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Geofence Zones List */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
              Active Authorized Office Zones ({zones.length})
            </h2>

            <div className="space-y-3">
              {loading ? (
                <div className="text-xs font-mono text-zinc-500 py-6 text-center">
                  Loading geofence perimeters...
                </div>
              ) : zones.length === 0 ? (
                <div className="text-xs font-mono text-zinc-600 py-6 text-center">
                  No geofence perimeters registered.
                </div>
              ) : (
                zones.map((z) => (
                  <div
                    key={z.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start justify-between gap-4 hover:border-zinc-700 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-emerald-400" />
                        <span className="font-semibold text-zinc-100 text-sm font-mono">{z.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {z.code}
                        </span>
                      </div>

                      <div className="text-xs font-mono text-zinc-500 space-x-3">
                        <span>Center: {z.latitude?.toFixed(4)}N, {z.longitude?.toFixed(4)}W</span>
                        <span>&bull;</span>
                        <span className="text-sky-400">Radius: {z.radiusMeters} meters</span>
                      </div>

                      {z.section && (
                        <div className="text-[11px] font-mono text-zinc-500">
                          Assigned Flow: {z.section.name}
                        </div>
                      )}
                    </div>

                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDeleteZone(z.id)}
                        className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors"
                        title="Delete perimeter"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Real-time Haversine Test Sandbox */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 font-mono text-xs shadow-xl">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <Shield size={16} className="text-sky-400" />
              <span className="text-zinc-100 font-semibold">Coordinate Vector Tester</span>
            </div>

            <p className="text-[11px] text-zinc-500">
              Test any GPS coordinates against active office boundaries to verify Haversine distance and breach detection.
            </p>

            <form onSubmit={handleTestCoordinates} className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1">Latitude</label>
                <input
                  type="text"
                  required
                  value={testLat}
                  onChange={(e) => setTestLat(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-2 text-zinc-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Longitude</label>
                <input
                  type="text"
                  required
                  value={testLng}
                  onChange={(e) => setTestLng(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-2 text-zinc-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={testing}
                className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium transition-colors"
              >
                {testing ? 'Computing Vector...' : 'Execute Vector Check'}
              </button>
            </form>

            {testResult && (
              <div
                className={`p-3 rounded border ${
                  testResult.isValid
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/40 text-red-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  {testResult.isValid ? <CheckCircle2 size={14} /> : <AlertOctagon size={14} />}
                  <span>{testResult.isValid ? 'INSIDE GEOFENCE' : 'GEOFENCE BREACH'}</span>
                </div>
                <div className="text-[11px] mt-1 space-y-0.5">
                  <div>Distance to Zone: {testResult.distanceMeters}m</div>
                  {!testResult.isValid && <div>Perimeter Breach: {testResult.breachMeters}m outside</div>}
                  <div>Nearest Zone: {testResult.nearestZone?.name || 'HQ Campus'}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Zone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-zinc-100 font-semibold text-sm">Create Geofence Perimeter</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-base"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateZone} className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1">Perimeter Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flight Testing Hangar 4"
                  value={newZone.name}
                  onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-2 text-zinc-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Perimeter Code</label>
                <input
                  type="text"
                  required
                  placeholder="GEO-HANGAR-4"
                  value={newZone.code}
                  onChange={(e) => setNewZone({ ...newZone, code: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-2 text-zinc-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Center Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newZone.latitude}
                    onChange={(e) => setNewZone({ ...newZone, latitude: parseFloat(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-2 text-zinc-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Center Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newZone.longitude}
                    onChange={(e) => setNewZone({ ...newZone, longitude: parseFloat(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-2 text-zinc-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Allowable Radius (Meters)</label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  required
                  value={newZone.radiusMeters}
                  onChange={(e) => setNewZone({ ...newZone, radiusMeters: parseFloat(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-2 text-zinc-200 focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Recommended: 30–50m for standard GPS accuracy without false breaches.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 border border-zinc-800 text-zinc-400 rounded hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium"
                >
                  Save Perimeter
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

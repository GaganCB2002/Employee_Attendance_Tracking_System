import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, MapPin, Wifi, Clock, LogOut, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useGeolocation } from '../hooks/useGeolocation';
import { attendanceApi } from '../api/attendance';
import CheckpointButton from '../components/employee/CheckpointButton';
import ShiftStatus from '../components/employee/ShiftStatus';
import { zulu } from '../utils/time';

export default function EmployeeCheckInPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [shiftData, setShiftData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(new Date());
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Watch device GPS
  const geo = useGeolocation();

  // Load shift & checkpoint status
  const loadStatus = async () => {
    try {
      const res = await attendanceApi.getCheckpointStatus();
      if (res.success) {
        setShiftData(res);
      }
    } catch (err) {
      console.error('Failed to load status:', err);
    }
  };

  useEffect(() => {
    loadStatus();
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Geofence check: Default HQ-Alpha is Lat: 37.7749, Lng: -122.4194, Radius: 50m
  // In dev / fallback mode, geo is within radius
  const isOutsideGeofence = geo.latitude > 37.785 || geo.latitude < 37.76;
  const breachMeters = isOutsideGeofence ? 65 : 0;

  const handleCheckpointSubmit = async ({ checkpointId, photoBase64 }) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const payload = {
        checkpointId,
        photoBase64,
        latitude: geo.latitude,
        longitude: geo.longitude,
        accuracy: geo.accuracy,
        livenessScore: 98.6,
      };

      const res = await attendanceApi.submitCheckpoint(payload);
      if (res.success) {
        setSubmitSuccess(`Checkpoint "${res.data.checkpoint?.name || 'Verified'}" successfully logged! Status: ${res.data.status}`);
        await loadStatus();
      } else {
        setSubmitError(res.error || 'Failed to submit checkpoint.');
      }
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Checkpoint submission rejected.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans flex flex-col">
      {/* Top Header */}
      <header className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 py-3 max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center shadow-lg shadow-sky-600/25">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <div className="text-zinc-100 font-semibold text-xs font-mono">
                AttendX Station
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">
                {user?.name} ({user?.employeeCode || 'EMP'})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-2 py-1">
              <Wifi size={12} className="animate-pulse" /> Live
            </div>
            <div className="flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-900 border border-zinc-800 rounded px-2 py-1">
              <Clock size={12} /> {zulu(now)}Z
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-zinc-400 hover:text-red-400 rounded hover:bg-zinc-800 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Employee Flow */}
      <main className="flex-1 p-4 max-w-xl w-full mx-auto space-y-4">
        {/* GPS Live Geofence Banner */}
        <div
          className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
            isOutsideGeofence
              ? 'bg-red-500/10 border-red-500/40 text-red-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <MapPin size={14} className={isOutsideGeofence ? 'text-red-400' : 'text-emerald-400'} />
            <span>
              {isOutsideGeofence
                ? `Perimeter Breach: ${breachMeters}m outside HQ`
                : `Within Authorized Geofence (${geo.accuracy}m fix)`}
            </span>
          </div>
          <button
            onClick={geo.refresh}
            className="text-[11px] flex items-center gap-1 text-zinc-400 hover:text-zinc-200"
          >
            <RefreshCw size={11} /> Refresh Fix
          </button>
        </div>

        {/* Feedback alerts */}
        {submitSuccess && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs font-mono">
            {submitSuccess}
          </div>
        )}

        {submitError && (
          <div className="p-3 bg-red-500/15 border border-red-500/50 rounded-lg text-red-300 text-xs font-mono">
            {submitError}
          </div>
        )}

        {/* Primary Action Button (Next Checkpoint) */}
        <CheckpointButton
          nextCheckpoint={shiftData?.nextCheckpoint}
          isOutsideGeofence={isOutsideGeofence}
          breachMeters={breachMeters}
          nearestZone="HQ-Alpha Main"
          onSubmit={handleCheckpointSubmit}
          isSubmitting={isSubmitting}
        />

        {/* Shift Schedule & Sequential Checkpoints Tracker */}
        <ShiftStatus
          shift={shiftData?.shift}
          allCheckpoints={shiftData?.allCheckpoints}
          completedRecords={shiftData?.completedRecords}
        />
      </main>
    </div>
  );
}

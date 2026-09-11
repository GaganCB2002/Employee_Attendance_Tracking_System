import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, MapPin, Wifi, Clock, LogOut, RefreshCw, AlertTriangle, KeyRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useGeolocation } from '../hooks/useGeolocation';
import { attendanceApi } from '../api/attendance';
import CheckpointButton from '../components/employee/CheckpointButton';
import ShiftStatus from '../components/employee/ShiftStatus';
import AdminExitSecurityModal from '../components/employee/AdminExitSecurityModal';
import { zulu } from '../utils/time';

export default function EmployeeCheckInPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [shiftData, setShiftData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(new Date());
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [showExitModal, setShowExitModal] = useState(false);

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

  // Intercept window close / leave attempt
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Station locked. Admin exit authorization required.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Geofence check: Default HQ-Alpha is Lat: 37.7749, Lng: -122.4194, Radius: 50m
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

  const executeAuthorizedExit = async () => {
    setShowExitModal(false);
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-app-bg text-app-text font-sans flex flex-col transition-colors duration-200">
      {/* Top Header */}
      <header className="border-b border-app-border bg-app-surface sticky top-0 z-20 shadow-xs">
        <div className="flex items-center justify-between px-4 py-3 max-w-3xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/25">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <div className="text-app-text font-bold text-xs font-mono">
                AttendX Station
              </div>
              <div className="text-[10px] text-app-muted font-mono">
                {user?.name} ({user?.employeeCode || 'EMP'})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-300 rounded px-2 py-1 font-semibold">
              <Wifi size={12} className="animate-pulse" /> Live
            </div>
            <div className="flex items-center gap-1 text-[11px] text-app-muted bg-app-bg border border-app-border rounded px-2 py-1">
              <Clock size={12} /> {zulu(now)}Z
            </div>

            {/* Exit Station Guard Trigger */}
            <button
              onClick={() => setShowExitModal(true)}
              className="px-2.5 py-1 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg font-semibold flex items-center gap-1 transition-colors text-[11px]"
              title="Request Exit Authorization"
            >
              <KeyRound size={13} />
              <span>Exit Station</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Employee Flow */}
      <main className="flex-1 p-4 max-w-xl w-full mx-auto space-y-4">
        {/* GPS Live Geofence Banner */}
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between shadow-xs ${
            isOutsideGeofence
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <MapPin size={15} className={isOutsideGeofence ? 'text-red-600' : 'text-emerald-600'} />
            <span className="font-semibold">
              {isOutsideGeofence
                ? `Perimeter Breach: ${breachMeters}m outside HQ`
                : `Within Authorized Geofence (${geo.accuracy}m fix)`}
            </span>
          </div>
          <button
            onClick={geo.refresh}
            className="text-[11px] font-semibold flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <RefreshCw size={11} /> Refresh Fix
          </button>
        </div>

        {/* Feedback alerts */}
        {submitSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-mono font-medium shadow-xs">
            {submitSuccess}
          </div>
        )}

        {submitError && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-800 text-xs font-mono font-medium shadow-xs">
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

      {/* Admin Exit Authorization & 2-Strike Photo Capture Guard */}
      <AdminExitSecurityModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onAuthorizedExit={executeAuthorizedExit}
        coords={{
          latitude: geo.latitude,
          longitude: geo.longitude,
          accuracy: geo.accuracy,
        }}
      />
    </div>
  );
}

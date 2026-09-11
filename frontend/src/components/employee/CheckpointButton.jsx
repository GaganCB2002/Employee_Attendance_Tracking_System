import React, { useState } from 'react';
import { Camera, MapPin, AlertOctagon, CheckCircle, ShieldCheck } from 'lucide-react';
import CameraCapture from './CameraCapture';

export default function CheckpointButton({
  nextCheckpoint,
  isOutsideGeofence,
  breachMeters,
  nearestZone,
  onSubmit,
  isSubmitting,
}) {
  const [showCamera, setShowCamera] = useState(false);
  const [showBreachAlert, setShowBreachAlert] = useState(false);

  const handleClick = () => {
    if (isOutsideGeofence) {
      setShowBreachAlert(true);
      return;
    }
    setShowCamera(true);
  };

  const handlePhotoCaptured = async (photoBase64) => {
    setShowCamera(false);
    await onSubmit({
      checkpointId: nextCheckpoint.id,
      photoBase64,
    });
  };

  if (!nextCheckpoint) {
    return (
      <div className="bg-app-surface border border-emerald-500/40 rounded-2xl p-7 text-center shadow-sm">
        <ShieldCheck size={40} className="mx-auto text-emerald-600 dark:text-emerald-400 mb-2" />
        <h3 className="text-app-text font-bold text-base">Shift Complete</h3>
        <p className="text-xs text-app-text-muted font-mono mt-1">
          All sequential checkpoints for this shift have been verified.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-app-surface border border-app-border rounded-2xl p-7 text-center space-y-5 shadow-sm">
        <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30">
          <span>STEP {nextCheckpoint.sequenceOrder} IN SEQUENCE</span>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-app-text font-mono tracking-tight">
            {nextCheckpoint.name}
          </h2>
          <p className="text-xs text-app-text-muted font-mono mt-1 font-medium">
            Expected: {nextCheckpoint.expectedTime || 'Current Window'} &bull; Photo &amp; GPS Telemetry Required
          </p>
        </div>

        {/* Large Action Button */}
        <button
          onClick={handleClick}
          disabled={isSubmitting}
          className={`w-full max-w-sm mx-auto py-4 px-6 rounded-xl font-mono text-sm font-bold flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-md ${
            isOutsideGeofence
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
              : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/25'
          } disabled:opacity-50`}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Verifying &amp; Logging...</span>
            </div>
          ) : isOutsideGeofence ? (
            <div className="flex items-center gap-2">
              <AlertOctagon size={18} />
              <span>Geofence Restricted ({breachMeters}m Breach)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Camera size={18} />
              <span>Capture Photo &amp; Check In</span>
            </div>
          )}
        </button>

        <div className="flex items-center justify-center gap-4 text-[11px] font-mono text-app-text-muted pt-3 border-t border-app-border">
          <span className="flex items-center gap-1 font-medium">
            <MapPin size={12} className={isOutsideGeofence ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'} />
            {isOutsideGeofence
              ? `Outside Office Perimeter (${breachMeters}m)`
              : `Within ${nearestZone || 'HQ'} Perimeter`}
          </span>
          <span>&bull;</span>
          <span>1-Tap Verification</span>
        </div>
      </div>

      {/* Camera Capture Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <CameraCapture
            onCapture={handlePhotoCaptured}
            onCancel={() => setShowCamera(false)}
          />
        </div>
      )}

      {/* Geofence Breach Modal Alert */}
      {showBreachAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-app-surface border border-rose-400 rounded-2xl p-6 max-w-sm text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertOctagon size={28} />
            </div>
            <div>
              <h3 className="text-app-text font-bold text-base">
                Outside Office Location
              </h3>
              <p className="text-xs text-app-text-muted font-mono mt-2 leading-relaxed">
                Your device GPS is {breachMeters} meters outside the authorized office geofence.
                Checkpoint submission is blocked until you are within the perimeter.
              </p>
            </div>
            <button
              onClick={() => setShowBreachAlert(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-app-text text-xs font-mono font-bold rounded-lg transition-colors"
            >
              Acknowledge &amp; Return
            </button>
          </div>
        </div>
      )}
    </>
  );
}

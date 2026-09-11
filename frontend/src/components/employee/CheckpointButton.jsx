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
      <div className="bg-zinc-900 border border-emerald-500/30 rounded-xl p-6 text-center">
        <ShieldCheck size={36} className="mx-auto text-emerald-400 mb-2" />
        <h3 className="text-zinc-100 font-medium text-sm">Shift Complete</h3>
        <p className="text-xs text-zinc-500 font-mono mt-1">
          All sequential checkpoints for this shift have been verified.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center space-y-4 shadow-xl">
        <div className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400">
          <span>STEP {nextCheckpoint.sequenceOrder} IN SEQUENCE</span>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-zinc-100 font-mono">
            {nextCheckpoint.name}
          </h2>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Expected: {nextCheckpoint.expectedTime || 'Current Window'} &bull; Photo &amp; GPS Required
          </p>
        </div>

        {/* Large Action Button */}
        <button
          onClick={handleClick}
          disabled={isSubmitting}
          className={`w-full max-w-sm mx-auto py-4 px-6 rounded-xl font-mono text-sm font-semibold flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-lg ${
            isOutsideGeofence
              ? 'bg-red-600/80 hover:bg-red-600 text-white shadow-red-600/20'
              : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/25'
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

        <div className="flex items-center justify-center gap-4 text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
          <span className="flex items-center gap-1">
            <MapPin size={12} className={isOutsideGeofence ? 'text-red-400' : 'text-emerald-400'} />
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <CameraCapture
            onCapture={handlePhotoCaptured}
            onCancel={() => setShowCamera(false)}
          />
        </div>
      )}

      {/* Geofence Breach Modal Alert */}
      {showBreachAlert && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-500/50 rounded-xl p-6 max-w-sm text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertOctagon size={28} />
            </div>
            <div>
              <h3 className="text-zinc-100 font-semibold text-base">
                Outside Office Location
              </h3>
              <p className="text-xs text-zinc-400 font-mono mt-2">
                Your device GPS is {breachMeters} meters outside the authorized office geofence.
                Checkpoint submission is blocked until you are within the perimeter.
              </p>
            </div>
            <button
              onClick={() => setShowBreachAlert(false)}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono rounded"
            >
              Acknowledge &amp; Return
            </button>
          </div>
        </div>
      )}
    </>
  );
}

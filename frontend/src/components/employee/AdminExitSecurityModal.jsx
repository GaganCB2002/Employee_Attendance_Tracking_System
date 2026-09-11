import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  Camera,
  AlertTriangle,
  KeyRound,
  CheckCircle,
  X,
  Radio,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function AdminExitSecurityModal({ isOpen, onClose, onAuthorizedExit, coords }) {
  const { token, user } = useAuth();
  const [code, setCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isBreached, setIsBreached] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [lockoutCountdown, setLockoutCountdown] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize webcam stream in background so snapshot can be captured instantly
  useEffect(() => {
    let stream = null;
    if (isOpen) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 640, height: 480 } })
        .then((s) => {
          stream = s;
          streamRef.current = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.warn('[EXIT_GUARD] Camera access not active or simulated:', err);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  // Handle Lockout countdown
  useEffect(() => {
    if (lockoutCountdown > 0) {
      const timer = setTimeout(() => setLockoutCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [lockoutCountdown]);

  if (!isOpen) return null;

  // Capture photo from video stream or fallback canvas
  const captureSuspectPhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Overlay security timestamp on photo
      ctx.fillStyle = 'rgba(220, 38, 38, 0.85)';
      ctx.fillRect(10, canvas.height - 40, canvas.width - 20, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px monospace';
      ctx.fillText(
        `BREACH LOGGED: ${new Date().toISOString()} | GPS: ${coords?.latitude || '37.7749'}, ${coords?.longitude || '-122.4194'}`,
        20,
        canvas.height - 20
      );

      return canvas.toDataURL('image/jpeg', 0.85);
    }

    // Fallback simulated security photo if physical webcam blocked
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('SECURITY BREACH SUSPECT CAPTURE', 100, 200);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px monospace';
    ctx.fillText(`TERMINAL: ${user?.employeeCode || 'STATION-01'}`, 100, 240);
    ctx.fillText(`TIME: ${new Date().toISOString()}`, 100, 270);
    ctx.fillText(`ATTEMPTS: 2 FAILED EXIT CODES`, 100, 300);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code.trim() || isVerifying || lockoutCountdown > 0) return;

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/checkpoints/verify-exit-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const json = await res.json();

      if (json.success) {
        // Correct code! Exit is authorized
        setIsVerifying(false);
        onAuthorizedExit();
        return;
      }

      // Code was wrong! Increase attempt counter
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setCode('');

      if (newAttempts >= 2) {
        // SECOND ATTEMPT FAILED: TRIGGER AUTOMATIC PHOTO CAPTURE & DISPATCH BREACH
        setIsBreached(true);
        setLockoutCountdown(45); // 45 second penalty lock

        const photoDataUrl = captureSuspectPhoto();
        setCapturedPhoto(photoDataUrl);

        // Send breach to backend
        await fetch('/api/checkpoints/security-breach', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            photoBase64: photoDataUrl,
            failedAttempts: newAttempts,
            reason: 'UNAUTHORIZED_EXIT_ATTEMPT',
            latitude: coords?.latitude || 37.7749,
            longitude: coords?.longitude || -122.4194,
            accuracy: coords?.accuracy || 2.5,
            enteredCode: code,
          }),
        });

        setErrorMsg('CRITICAL SECURITY BREACH: 2 Failed Exit Attempts. Your photo has been captured and dispatched to HQ Operations.');
      } else {
        setErrorMsg('Invalid Administrator Exit Code. 1 Attempt Remaining before automatic camera snapshot & security alarm.');
      }
    } catch (err) {
      console.error('[EXIT_VERIFY_ERROR]', err);
      setErrorMsg('Communication error verifying exit code.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs font-mono animate-fadeIn">
      {/* Hidden camera & canvas for silent snapshot */}
      <div className="hidden">
        <video ref={videoRef} autoPlay playsInline muted />
        <canvas ref={canvasRef} />
      </div>

      <div
        className={`bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border transition-all ${
          isBreached ? 'border-red-500 shadow-red-500/20' : 'border-slate-200'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isBreached
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                isBreached ? 'bg-red-600 text-white animate-pulse' : 'bg-blue-100 text-blue-600'
              }`}
            >
              <ShieldAlert size={18} />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">
                {isBreached ? 'SECURITY BREACH LOGGED' : 'ADMIN EXIT AUTHORIZATION'}
              </div>
              <div className="text-[10px] text-slate-500">
                {isBreached ? 'Suspect Photo Dispatched to Ops' : 'Kiosk Departure Security Policy'}
              </div>
            </div>
          </div>

          {!isBreached && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Attempt Counter Status Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between ${
              attempts === 0
                ? 'bg-blue-50/70 border-blue-200 text-blue-800'
                : attempts === 1
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <KeyRound size={16} className={attempts >= 1 ? 'text-amber-600' : 'text-blue-600'} />
              <span className="font-semibold">
                Exit Attempts: <span className="font-bold">{attempts} of 2</span>
              </span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                attempts === 0
                  ? 'bg-blue-200 text-blue-800'
                  : attempts === 1
                  ? 'bg-amber-200 text-amber-800 animate-pulse'
                  : 'bg-red-200 text-red-800'
              }`}
            >
              {attempts === 0 ? 'Secure' : attempts === 1 ? 'Last Chance' : 'Breached'}
            </span>
          </div>

          {/* Captured Suspect Photo Display on Breach */}
          {isBreached && capturedPhoto && (
            <div className="p-3 rounded-xl bg-red-950/10 border-2 border-red-400 space-y-2 text-center animate-fadeIn">
              <div className="flex items-center justify-center gap-1.5 text-red-700 font-bold text-xs uppercase">
                <Camera size={15} />
                <span>Suspect Photo Auto-Captured</span>
              </div>
              <img
                src={capturedPhoto}
                alt="Breach Snapshot"
                className="w-full h-44 object-cover rounded-lg border border-red-300 shadow-md mx-auto"
              />
              <div className="text-[10px] text-red-600 font-mono">
                Photo timestamped &amp; broadcasted to Super Admin Live TV &amp; Security Ops console.
              </div>
            </div>
          )}

          {/* Error / Warning Alert */}
          {errorMsg && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                isBreached
                  ? 'bg-red-100/80 border-red-300 text-red-800'
                  : 'bg-amber-100/80 border-amber-300 text-amber-800'
              }`}
            >
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-current" />
              <div className="font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {!isBreached ? (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Enter Administrator Exit Code
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="password"
                    autoFocus
                    required
                    placeholder="Enter admin code (e.g. ADMIN99)"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={isVerifying}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                  <span>Authorized Personnel Only</span>
                  <span className="text-blue-600 font-medium">Default Code: ADMIN99</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold transition-colors"
                >
                  Stay on Page
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || !code.trim()}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Authorize Exit</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 text-center">
                Terminal security lock is active for{' '}
                <span className="font-bold text-red-600 font-mono text-sm">
                  {lockoutCountdown}s
                </span>
                . Administrator intervention required.
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsBreached(false);
                  setAttempts(0);
                  setErrorMsg(null);
                  setCapturedPhoto(null);
                }}
                disabled={lockoutCountdown > 0}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors disabled:opacity-40"
              >
                {lockoutCountdown > 0
                  ? `Security Lock Active (${lockoutCountdown}s)`
                  : 'Reset Exit Code Verification'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

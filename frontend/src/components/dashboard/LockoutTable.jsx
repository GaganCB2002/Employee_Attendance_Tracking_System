import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Check } from 'lucide-react';

export default function LockoutTable({ lockouts = [], onUnlock }) {
  const [unlockingId, setUnlockingId] = useState(null);

  const handleUnlock = async (item) => {
    setUnlockingId(item.id);
    await onUnlock(item.id, item.type || 'EMPLOYEE');
    setUnlockingId(null);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-zinc-200 text-sm font-medium">
          <ShieldAlert size={16} className="text-red-400" />
          Security lockouts
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-red-500/40 bg-red-500/10 text-red-400">
          POLICY: 3-FAILED LOCK
        </span>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {lockouts.length === 0 ? (
          <div className="text-zinc-600 text-xs text-center py-6 font-mono">
            No active security lockouts &bull; Systems nominal
          </div>
        ) : (
          lockouts.map((l) => {
            const isLocked = l.locked !== false;
            return (
              <div
                key={l.id}
                className="flex items-center justify-between text-xs border-b border-zinc-800 pb-2 last:border-b-0 hover:bg-zinc-800/20 p-1 rounded transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-zinc-200 font-medium truncate">{l.user}</div>
                  <div className="text-zinc-500 font-mono text-[10px] truncate">
                    {l.device || 'Mobile Knox 14'} &middot; {l.time || '14:19:04Z'}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      isLocked
                        ? 'border-red-500/40 bg-red-500/10 text-red-400'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {l.fails || 3}/3 {isLocked ? 'LOCKED' : 'WARN'}
                  </span>

                  <button
                    onClick={() => handleUnlock(l)}
                    disabled={unlockingId === l.id}
                    className={`text-[10px] font-mono px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                      isLocked
                        ? 'bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white'
                        : 'border border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                    } disabled:opacity-50`}
                  >
                    <KeyRound size={11} />
                    {unlockingId === l.id ? 'Unlocking...' : isLocked ? 'Unlock' : 'Reset'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

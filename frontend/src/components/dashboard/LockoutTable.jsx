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
    <div className="bg-app-surface border border-app-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-app-text text-sm font-semibold">
          <ShieldAlert size={16} className="text-rose-600 dark:text-rose-400" />
          Security Lockouts
        </div>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
          POLICY: 3-FAILED LOCK
        </span>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1 divide-y divide-app-border">
        {lockouts.length === 0 ? (
          <div className="text-app-text-muted text-xs text-center py-6 font-mono">
            No active security lockouts &bull; Systems nominal
          </div>
        ) : (
          lockouts.map((l) => {
            const isLocked = l.locked !== false;
            return (
              <div
                key={l.id}
                className="flex items-center justify-between text-xs pt-2 first:pt-0 pb-1 hover:bg-slate-50 dark:hover:bg-zinc-800/40 p-1.5 rounded transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-app-text font-semibold truncate">{l.user}</div>
                  <div className="text-app-text-muted font-mono text-[10px] truncate">
                    {l.device || 'Mobile Knox 14'} &middot; {l.time || '14:19:04Z'}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                      isLocked
                        ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-400'
                        : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400'
                    }`}
                  >
                    {l.fails || 3}/3 {isLocked ? 'LOCKED' : 'WARN'}
                  </span>

                  <button
                    onClick={() => handleUnlock(l)}
                    disabled={unlockingId === l.id}
                    className={`text-[10px] font-mono font-medium px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                      isLocked
                        ? 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white shadow-xs'
                        : 'border border-app-border text-app-text-muted hover:text-app-text hover:bg-slate-100 dark:hover:bg-zinc-800'
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

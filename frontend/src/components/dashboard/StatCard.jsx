import React from 'react';

export default function StatCard({
  icon: Icon,
  label,
  value,
  valueColor = 'text-app-text',
  sub,
  subColor = 'text-app-muted',
  sub2,
  sub2Color = 'text-app-muted',
}) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-4 flex flex-col gap-2 min-w-0 shadow-xs hover:border-blue-400/40 transition-all">
      <div className="flex items-center justify-between text-app-muted">
        <span className="text-[11px] tracking-wide uppercase font-mono font-semibold">{label}</span>
        <Icon size={15} className="text-blue-600" />
      </div>
      <div className={`text-2xl font-bold font-mono tracking-tight ${valueColor}`}>
        {value}
      </div>
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className={subColor}>{sub}</span>
        {sub2 && <span className={sub2Color}>{sub2}</span>}
      </div>
    </div>
  );
}

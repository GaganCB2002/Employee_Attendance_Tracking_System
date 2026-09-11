import React from 'react';

export default function StatCard({
  icon: Icon,
  label,
  value,
  valueColor = 'text-zinc-100',
  sub,
  subColor = 'text-zinc-500',
  sub2,
  sub2Color = 'text-zinc-500',
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col gap-2 min-w-0 shadow-sm hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between text-zinc-500">
        <span className="text-[11px] tracking-wide uppercase font-mono">{label}</span>
        <Icon size={14} className="text-zinc-400" />
      </div>
      <div className={`text-3xl font-semibold font-mono tracking-tight ${valueColor}`}>
        {value}
      </div>
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className={subColor}>{sub}</span>
        {sub2 && <span className={sub2Color}>{sub2}</span>}
      </div>
    </div>
  );
}

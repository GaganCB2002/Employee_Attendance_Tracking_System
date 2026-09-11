import React, { useState, useEffect, useMemo } from 'react';
import {
  Radar,
  Wifi,
  Clock,
  ChevronDown,
  AlertTriangle,
  Bell,
  Shield,
  User,
  LayoutGrid,
  Fingerprint,
  Compass,
  Calendar,
  History,
  Lock,
  Flag,
  Radio,
  MapPin,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Coffee,
  ShieldAlert,
  KeyRound,
  ChevronRight,
  Pin,
  Send,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { useAttendanceStore } from '../store/attendanceStore';
import { zulu, pad } from '../utils/time';
import StatCard from '../components/dashboard/StatCard';
import LiveEventFlash from '../components/dashboard/LiveEventFlash';
import EventStream from '../components/dashboard/EventStream';
import GeofenceRadar from '../components/dashboard/GeofenceRadar';
import LockoutTable from '../components/dashboard/LockoutTable';
import OpsLayout from '../components/layout/OpsLayout';

export default function AdminLiveMonitor() {
  const { user, isSuperAdmin } = useAuth();
  const { isConnected, latencyMs } = useSocket();

  const {
    records,
    aggregates,
    lockouts,
    activeFilter,
    featuredEvent,
    setFilter,
    fetchDashboardData,
    unlockUser,
    approveException,
  } = useAttendanceStore();

  const [selectedSection, setSelectedSection] = useState(user?.sectionId || 'ALL');

  useEffect(() => {
    fetchDashboardData(selectedSection === 'ALL' ? null : selectedSection);
  }, [selectedSection, fetchDashboardData]);

  // Filter records
  const filteredRecords = useMemo(() => {
    if (!records || records.length === 0) return [];
    if (activeFilter === 'ALL') return records;
    if (activeFilter === 'VERIFIED') return records.filter((r) => r.status === 'ON_TIME');
    if (activeFilter === 'LATE') return records.filter((r) => r.status === 'LATE');
    if (activeFilter === 'BREAK') return records.filter((r) => r.status === 'BREAK');
    if (activeFilter === 'BREACH') return records.filter((r) => r.status === 'BREACH' || r.geofenceStatus === 'OUTSIDE');
    return records;
  }, [records, activeFilter]);

  const handleApproveException = async (recordId) => {
    await approveException(recordId, 'Ops Commander exception granted');
  };

  const handleUnlockUser = async (id, type) => {
    await unlockUser(id, type);
  };

  const handlePageComm = (employeeId) => {
    alert(`[RADIO PAGING] High-priority page comm dispatched to employee terminal ${employeeId}.`);
  };

  return (
    <OpsLayout
      selectedSection={selectedSection}
      onSectionChange={setSelectedSection}
      onResync={() => fetchDashboardData(selectedSection === 'ALL' ? null : selectedSection)}
    >
      <div className="space-y-4">
        {/* Row 1: 6 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            icon={ClipboardList}
            label="Total workforce"
            value={aggregates.totalWorkforce?.toLocaleString() || '705'}
            valueColor="text-zinc-100"
            sub="Active, registered"
            subColor="text-zinc-500"
          />
          <StatCard
            icon={CheckCircle2}
            label="On-site verified"
            value={aggregates.onSiteVerified?.toLocaleString() || '694'}
            valueColor="text-emerald-400"
            sub="Inside geofence"
            subColor="text-zinc-500"
            sub2="98.4%"
            sub2Color="text-emerald-400"
          />
          <StatCard
            icon={Flag}
            label="Late flagged"
            value={aggregates.lateFlagged ?? 11}
            valueColor="text-amber-400"
            sub=">15m threshold"
            subColor="text-zinc-500"
            sub2="avg +18m"
            sub2Color="text-amber-400"
          />
          <StatCard
            icon={Coffee}
            label="Break / lunch"
            value={aggregates.onBreak ?? 24}
            valueColor="text-sky-400"
            sub="Lunch + tea active"
            subColor="text-zinc-500"
          />
          <StatCard
            icon={XCircle}
            label="Geofence breach"
            value={aggregates.geofenceBreach ?? 1}
            valueColor="text-red-400"
            sub="Outside perimeter"
            subColor="text-zinc-500"
          />
          <StatCard
            icon={KeyRound}
            label="Auth lockouts"
            value={aggregates.authLockouts ?? lockouts.length}
            valueColor="text-zinc-100"
            sub="3x failed credentials"
            subColor="text-zinc-500"
          />
        </div>

        {/* Row 2: Live Event Photo Flash Panel */}
        <LiveEventFlash
          event={featuredEvent}
          onApprove={handleApproveException}
          onPageComm={handlePageComm}
        />

        {/* Row 3: Event Stream + Geofence Radar & Lockout Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left 2 Cols: Live Event Stream and Roster */}
          <div className="lg:col-span-2">
            <EventStream
              records={filteredRecords}
              filter={activeFilter}
              onFilterChange={setFilter}
              totalCount={aggregates.totalWorkforce || 705}
            />
          </div>

          {/* Right 1 Col: Radar + Lockout Table */}
          <div className="space-y-4">
            <GeofenceRadar employees={records} />
            <LockoutTable lockouts={lockouts} onUnlock={handleUnlockUser} />
          </div>
        </div>

        {/* Operational Footer Telemetry */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-600 border-t border-zinc-800 pt-3">
          <Radio size={12} className="text-emerald-500 animate-pulse" />
          <span>Websocket event pump active</span>
          <span>&middot;</span>
          <span>rate {latencyMs} events/sec</span>
          <span>&middot;</span>
          <span>geofence engine: RTK dual-node</span>
          <span>&middot;</span>
          <span>scope: {isSuperAdmin ? 'SUPER ADMIN (UNIVERSAL)' : `SECTION ADMIN (${user?.section?.name || 'LOCAL'})`}</span>
        </div>
      </div>
    </OpsLayout>
  );
}

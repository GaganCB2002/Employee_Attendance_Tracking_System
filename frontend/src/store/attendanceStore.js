import { create } from 'zustand';
import { attendanceApi } from '../api/attendance';

export const useAttendanceStore = create((set, get) => ({
  records: [],
  aggregates: {
    totalWorkforce: 705,
    onSiteVerified: 694,
    lateFlagged: 11,
    onBreak: 24,
    geofenceBreach: 1,
    authLockouts: 2,
  },
  lockouts: [],
  isLoading: false,
  error: null,
  activeFilter: 'ALL',
  featuredEvent: null,

  setFilter: (filter) => set({ activeFilter: filter }),

  fetchDashboardData: async (sectionId) => {
    set({ isLoading: true });
    try {
      const [aggRes, recRes, lockRes] = await Promise.all([
        attendanceApi.getDashboardAggregates({ sectionId }),
        attendanceApi.listRecords({ limit: 40, sectionId }),
        attendanceApi.getLockouts({ sectionId }),
      ]);

      const records = recRes.data || [];
      const aggregates = aggRes.aggregates || get().aggregates;
      const lockouts = lockRes.data || [];

      // Find first late or breach record for photo flash
      const featured = records.find((r) => r.status === 'LATE' || r.status === 'BREACH') || records[0] || null;

      set({
        aggregates,
        records,
        lockouts,
        featuredEvent: featured,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('[STORE] Failed to fetch dashboard data:', err);
      set({ isLoading: false, error: err.message });
    }
  },

  addLiveRecord: (newRecord) => {
    set((state) => {
      // Prepend to records roster, avoiding duplicates
      const exists = state.records.some((r) => r.id === newRecord.id);
      const updatedRecords = exists ? state.records : [newRecord, ...state.records.slice(0, 49)];

      // Update featured event if late or breach
      const isFlagged = newRecord.status === 'LATE' || newRecord.status === 'BREACH';
      const featuredEvent = isFlagged ? newRecord : state.featuredEvent || newRecord;

      // Increment stats
      const aggregates = { ...state.aggregates };
      if (newRecord.status === 'ON_TIME') aggregates.onSiteVerified += 1;
      if (newRecord.status === 'LATE') aggregates.lateFlagged += 1;
      if (newRecord.status === 'BREACH') aggregates.geofenceBreach += 1;
      if (newRecord.status === 'BREAK') aggregates.onBreak += 1;

      return {
        records: updatedRecords,
        featuredEvent,
        aggregates,
      };
    });
  },

  addLiveLockout: (lockoutEvent) => {
    set((state) => ({
      lockouts: [lockoutEvent, ...state.lockouts],
      aggregates: {
        ...state.aggregates,
        authLockouts: (state.aggregates.authLockouts || 0) + 1,
      },
    }));
  },

  unlockUser: async (id, type) => {
    try {
      await attendanceApi.unlockUser(id, type);
      set((state) => ({
        lockouts: state.lockouts.filter((l) => l.id !== id),
        aggregates: {
          ...state.aggregates,
          authLockouts: Math.max(0, (state.aggregates.authLockouts || 1) - 1),
        },
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || err.message };
    }
  },

  approveException: async (recordId, notes) => {
    try {
      const res = await attendanceApi.approveLateException(recordId, notes);
      if (res.success) {
        set((state) => {
          const updatedRecords = state.records.map((r) =>
            r.id === recordId ? { ...r, status: 'ON_TIME', approvedException: true } : r
          );
          let featured = state.featuredEvent;
          if (featured?.id === recordId) {
            featured = { ...featured, status: 'ON_TIME', approvedException: true };
          }
          return {
            records: updatedRecords,
            featuredEvent: featured,
            aggregates: {
              ...state.aggregates,
              lateFlagged: Math.max(0, (state.aggregates.lateFlagged || 1) - 1),
              onSiteVerified: (state.aggregates.onSiteVerified || 0) + 1,
            },
          };
        });
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
}));

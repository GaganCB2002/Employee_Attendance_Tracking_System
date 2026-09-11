import { create } from 'zustand';

export const useUiStore = create((set) => ({
  // Whether sidebar is collapsed to icon/logo-only mode
  isCollapsed: localStorage.getItem('attendx_sidebar_collapsed') === 'true',

  toggleCollapse: () =>
    set((state) => {
      const next = !state.isCollapsed;
      localStorage.setItem('attendx_sidebar_collapsed', String(next));
      return { isCollapsed: next };
    }),

  setCollapsed: (val) => {
    localStorage.setItem('attendx_sidebar_collapsed', String(val));
    set({ isCollapsed: val });
  },

  // Mobile drawer state
  mobileDrawerOpen: false,
  setMobileDrawerOpen: (val) => set({ mobileDrawerOpen: val }),
  toggleMobileDrawer: () => set((state) => ({ mobileDrawerOpen: !state.mobileDrawerOpen })),
}));

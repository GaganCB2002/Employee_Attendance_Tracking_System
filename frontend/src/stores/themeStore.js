import { create } from 'zustand';

export const THEME_PRESETS = {
  'Light Enterprise': {
    mode: 'light',
    primary: '#2563eb',
    secondary: '#3b82f6',
    accent: '#0284c7',
    background: '#f8fafc',
    surface: '#ffffff',
    sidebar: '#ffffff',
    header: '#ffffff',
    text: '#0f172a',
    mutedText: '#475569',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#0284c7',
    border: '#e2e8f0',
  },
  'Corporate Slate': {
    mode: 'light',
    primary: '#0f172a',
    secondary: '#334155',
    accent: '#2563eb',
    background: '#f1f5f9',
    surface: '#ffffff',
    sidebar: '#ffffff',
    header: '#ffffff',
    text: '#0f172a',
    mutedText: '#334155',
    success: '#15803d',
    warning: '#b45309',
    danger: '#b91c1c',
    info: '#0369a1',
    border: '#cbd5e1',
  },
  'Emerald Business': {
    mode: 'light',
    primary: '#059669',
    secondary: '#10b981',
    accent: '#047857',
    background: '#f0fdf4',
    surface: '#ffffff',
    sidebar: '#ffffff',
    header: '#ffffff',
    text: '#064e3b',
    mutedText: '#065f46',
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#0891b2',
    border: '#bbf7d0',
  },
  'Modern Indigo': {
    mode: 'light',
    primary: '#4f46e5',
    secondary: '#6366f1',
    accent: '#4338ca',
    background: '#f5f3ff',
    surface: '#ffffff',
    sidebar: '#ffffff',
    header: '#ffffff',
    text: '#1e1b4b',
    mutedText: '#3730a3',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#2563eb',
    border: '#ddd6fe',
  },
  'Warm Professional': {
    mode: 'light',
    primary: '#b45309',
    secondary: '#d97706',
    accent: '#92400e',
    background: '#fffbeb',
    surface: '#ffffff',
    sidebar: '#ffffff',
    header: '#ffffff',
    text: '#451a03',
    mutedText: '#78350f',
    success: '#15803d',
    warning: '#b45309',
    danger: '#dc2626',
    info: '#0284c7',
    border: '#fde68a',
  },
  'Cyan Telemetry': {
    mode: 'light',
    primary: '#0891b2',
    secondary: '#06b6d4',
    accent: '#0e7490',
    background: '#ecfeff',
    surface: '#ffffff',
    sidebar: '#ffffff',
    header: '#ffffff',
    text: '#083344',
    mutedText: '#155e75',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#0284c7',
    border: '#a5f3fc',
  },
};

function applyTokensToDocument(tokens) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('dark');

  const mapping = {
    '--primary-color': tokens.primary,
    '--secondary-color': tokens.secondary,
    '--accent-color': tokens.accent,
    '--background-color': tokens.background,
    '--surface-color': tokens.surface,
    '--sidebar-color': tokens.sidebar,
    '--header-color': tokens.header,
    '--text-color': tokens.text,
    '--muted-text-color': tokens.mutedText,
    '--success-color': tokens.success,
    '--warning-color': tokens.warning,
    '--danger-color': tokens.danger,
    '--info-color': tokens.info,
    '--border-color': tokens.border,
  };

  for (const [cssVar, value] of Object.entries(mapping)) {
    if (value) {
      root.style.setProperty(cssVar, value);
    }
  }
}

export const useThemeStore = create((set, get) => ({
  preset: 'Light Enterprise',
  mode: 'light',
  tokens: THEME_PRESETS['Light Enterprise'],
  isLoading: false,

  initTheme: async () => {
    // 1. Try local storage first
    try {
      const saved = localStorage.getItem('attendx_theme');
      if (saved) {
        const parsed = JSON.parse(saved);
        set({
          preset: parsed.preset || 'Light Enterprise',
          mode: parsed.mode || 'light',
          tokens: parsed.tokens || THEME_PRESETS['Light Enterprise'],
        });
        applyTokensToDocument(parsed.tokens || THEME_PRESETS['Light Enterprise']);
        return;
      }
    } catch (e) {
      console.warn('[THEME] Local storage read error:', e);
    }

    // Default fallback
    applyTokensToDocument(THEME_PRESETS['Light Enterprise']);
  },

  selectPreset: (presetName) => {
    const presetTokens = THEME_PRESETS[presetName];
    if (!presetTokens) return;

    const newTokens = { ...presetTokens };
    set({ preset: presetName, tokens: newTokens, mode: presetTokens.mode || 'light' });
    applyTokensToDocument(newTokens);
    localStorage.setItem('attendx_theme', JSON.stringify({ preset: presetName, mode: presetTokens.mode, tokens: newTokens }));
  },

  setMode: (mode) => {
    set({ mode });
  },

  updateToken: (key, value) => {
    const currentTokens = get().tokens;
    const updated = { ...currentTokens, [key]: value };
    set({ tokens: updated, preset: 'Custom' });
    applyTokensToDocument(updated);
    localStorage.setItem('attendx_theme', JSON.stringify({ preset: 'Custom', mode: get().mode, tokens: updated }));
  },

  resetTheme: () => {
    const defaultTokens = THEME_PRESETS['Light Enterprise'];
    set({ preset: 'Light Enterprise', mode: 'light', tokens: defaultTokens });
    applyTokensToDocument(defaultTokens);
    localStorage.setItem('attendx_theme', JSON.stringify({ preset: 'Light Enterprise', mode: 'light', tokens: defaultTokens }));
  },

  saveToServer: async () => {
    try {
      const { preset, mode, tokens } = get();
      const token = localStorage.getItem('attendx_token');
      await fetch('/api/settings/theme', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preset, mode, ...tokens }),
      });
      return true;
    } catch (err) {
      console.error('[THEME] Server save failed:', err);
      return false;
    }
  },
}));

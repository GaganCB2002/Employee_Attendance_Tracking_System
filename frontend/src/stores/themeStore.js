import { create } from 'zustand';

export const THEME_PRESETS = {
  'Dark Enterprise': {
    mode: 'dark',
    primary: '#0284c7',
    secondary: '#38bdf8',
    accent: '#06b6d4',
    background: '#09090b',
    surface: '#18181b',
    sidebar: '#09090b',
    header: '#09090b',
    text: '#f4f4f5',
    mutedText: '#71717a',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    border: '#27272a',
  },
  'Professional Blue': {
    mode: 'dark',
    primary: '#2563eb',
    secondary: '#60a5fa',
    accent: '#38bdf8',
    background: '#0b1329',
    surface: '#152140',
    sidebar: '#090f20',
    header: '#0b1329',
    text: '#f8fafc',
    mutedText: '#94a3b8',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    border: '#1e293b',
  },
  'Corporate Green': {
    mode: 'dark',
    primary: '#059669',
    secondary: '#34d399',
    accent: '#10b981',
    background: '#061a14',
    surface: '#0d2820',
    sidebar: '#04130e',
    header: '#061a14',
    text: '#f0fdf4',
    mutedText: '#6ee7b7',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    border: '#134e4a',
  },
  'Modern Purple': {
    mode: 'dark',
    primary: '#7c3aed',
    secondary: '#a78bfa',
    accent: '#c084fc',
    background: '#13091f',
    surface: '#1e1133',
    sidebar: '#0d0617',
    header: '#13091f',
    text: '#faf5ff',
    mutedText: '#a855f7',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    border: '#3b0764',
  },
  'High Contrast': {
    mode: 'dark',
    primary: '#38bdf8',
    secondary: '#00ffff',
    accent: '#ffff00',
    background: '#000000',
    surface: '#111111',
    sidebar: '#000000',
    header: '#000000',
    text: '#ffffff',
    mutedText: '#a1a1aa',
    success: '#00ff66',
    warning: '#ffcc00',
    danger: '#ff3333',
    info: '#38bdf8',
    border: '#333333',
  },
};

function applyTokensToDocument(tokens) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

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
  preset: 'Professional Blue',
  mode: 'dark',
  tokens: THEME_PRESETS['Professional Blue'],
  isLoading: false,

  initTheme: async () => {
    // 1. Try local storage first
    try {
      const saved = localStorage.getItem('attendx_theme');
      if (saved) {
        const parsed = JSON.parse(saved);
        set({
          preset: parsed.preset || 'Professional Blue',
          mode: parsed.mode || 'dark',
          tokens: parsed.tokens || THEME_PRESETS['Professional Blue'],
        });
        applyTokensToDocument(parsed.tokens || THEME_PRESETS['Professional Blue']);
        return;
      }
    } catch (e) {
      console.warn('[THEME] Local storage read error:', e);
    }

    // Default fallback
    applyTokensToDocument(THEME_PRESETS['Professional Blue']);
  },

  selectPreset: (presetName) => {
    const presetTokens = THEME_PRESETS[presetName];
    if (!presetTokens) return;

    const newTokens = { ...presetTokens };
    set({ preset: presetName, tokens: newTokens, mode: presetTokens.mode || 'dark' });
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
    const defaultTokens = THEME_PRESETS['Professional Blue'];
    set({ preset: 'Professional Blue', mode: 'dark', tokens: defaultTokens });
    applyTokensToDocument(defaultTokens);
    localStorage.setItem('attendx_theme', JSON.stringify({ preset: 'Professional Blue', mode: 'dark', tokens: defaultTokens }));
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

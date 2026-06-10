// Theme manager: persists and applies UI theme presets + custom tokens.

export type ThemeMode = 'light' | 'dark' | 'system';
export type Density = 'compact' | 'comfortable' | 'spacious';
export type FontFamily = 'Inter' | 'Roboto' | 'Poppins' | 'System' | 'Georgia';
export type ButtonStyle = 'rounded' | 'pill' | 'square';
export type SidebarStyle = 'navy-trust' | 'emerald-prestige' | 'midnight-indigo' | 'cloud-white' | 'forest-green';
export type CardStyle = 'elevated' | 'flat' | 'bordered' | 'glass';

export interface ThemeConfig {
  mode: ThemeMode;
  density: Density;
  fontFamily: FontFamily;
  fontSize: number; // px
  buttonStyle: ButtonStyle;
  primaryColor: string; // hex
  accentColor: string; // hex
  sidebarStyle: SidebarStyle;
  cardStyle: CardStyle;
}

export const DEFAULT_THEME: ThemeConfig = {
  mode: 'light',
  density: 'comfortable',
  fontFamily: 'Inter',
  fontSize: 14,
  buttonStyle: 'rounded',
  primaryColor: '#4a7c59',
  accentColor: '#e9c46a',
  sidebarStyle: 'navy-trust',
  cardStyle: 'elevated',
};

export interface SavedTheme {
  id: string;
  name: string;
  config: ThemeConfig;
  builtin?: boolean;
}

export const BUILTIN_THEMES: SavedTheme[] = [
  {
    id: 'navy-trust',
    name: 'Navy Trust',
    builtin: true,
    config: { ...DEFAULT_THEME, primaryColor: '#1e3a8a', accentColor: '#3b82f6', sidebarStyle: 'navy-trust', cardStyle: 'elevated' },
  },
  {
    id: 'emerald-prestige',
    name: 'Emerald Prestige',
    builtin: true,
    config: { ...DEFAULT_THEME, primaryColor: '#047857', accentColor: '#10b981', sidebarStyle: 'emerald-prestige', cardStyle: 'elevated' },
  },
  {
    id: 'midnight-indigo',
    name: 'Midnight Indigo',
    builtin: true,
    config: { ...DEFAULT_THEME, mode: 'dark', primaryColor: '#6366f1', accentColor: '#a78bfa', sidebarStyle: 'midnight-indigo', cardStyle: 'flat' },
  },
  {
    id: 'cloud-white',
    name: 'Cloud White',
    builtin: true,
    config: { ...DEFAULT_THEME, primaryColor: '#0ea5e9', accentColor: '#38bdf8', sidebarStyle: 'cloud-white', cardStyle: 'bordered' },
  },
];

const STORAGE_KEY = 'farmos.theme.config';
const SAVED_KEY = 'farmos.theme.saved';
const ACTIVE_KEY = 'farmos.theme.active';

// --- hex -> hsl helpers ---
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslVar({ h, s, l }: { h: number; s: number; l: number }) {
  return `${h} ${s}% ${l}%`;
}

const DENSITY_RADIUS: Record<Density, string> = {
  compact: '0.5rem',
  comfortable: '0.75rem',
  spacious: '1rem',
};

const DENSITY_SPACING: Record<Density, string> = {
  compact: '0.85',
  comfortable: '1',
  spacious: '1.15',
};

const FONT_STACK: Record<FontFamily, string> = {
  Inter: "'Inter', system-ui, sans-serif",
  Roboto: "'Roboto', system-ui, sans-serif",
  Poppins: "'Poppins', system-ui, sans-serif",
  System: "system-ui, -apple-system, sans-serif",
  Georgia: "Georgia, 'Times New Roman', serif",
};

const BUTTON_RADIUS: Record<ButtonStyle, string> = {
  rounded: '0.5rem',
  pill: '9999px',
  square: '0.125rem',
};

const SIDEBAR_PRESETS: Record<SidebarStyle, { bg: string; fg: string; accent: string }> = {
  'navy-trust': { bg: '222 47% 11%', fg: '210 40% 98%', accent: '217 91% 60%' },
  'emerald-prestige': { bg: '160 84% 12%', fg: '152 76% 95%', accent: '160 84% 39%' },
  'midnight-indigo': { bg: '240 30% 12%', fg: '220 20% 95%', accent: '243 75% 65%' },
  'cloud-white': { bg: '210 40% 98%', fg: '222 47% 11%', accent: '199 89% 48%' },
  'forest-green': { bg: '84 31% 22%', fg: '48 16% 98%', accent: '43 74% 66%' },
};

const CARD_STYLE_VARS: Record<CardStyle, { shadow: string; border: string; bg?: string }> = {
  elevated: { shadow: '0 10px 25px -10px hsl(var(--primary) / 0.18)', border: '1px solid hsl(var(--border) / 0.4)' },
  flat: { shadow: 'none', border: '1px solid hsl(var(--border))' },
  bordered: { shadow: 'none', border: '2px solid hsl(var(--border))' },
  glass: { shadow: '0 8px 32px hsl(var(--primary) / 0.15)', border: '1px solid hsl(var(--border) / 0.3)', bg: 'hsl(var(--card) / 0.6)' },
};

export function applyTheme(cfg: ThemeConfig) {
  const root = document.documentElement;

  // Mode
  const resolved = cfg.mode === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : cfg.mode;
  root.classList.toggle('dark', resolved === 'dark');

  // Primary / accent
  const primaryHsl = hexToHsl(cfg.primaryColor);
  const accentHsl = hexToHsl(cfg.accentColor);
  root.style.setProperty('--primary', hslVar(primaryHsl));
  root.style.setProperty('--ring', hslVar(primaryHsl));
  root.style.setProperty('--accent', hslVar(accentHsl));

  // Sidebar
  const sb = SIDEBAR_PRESETS[cfg.sidebarStyle];
  root.style.setProperty('--sidebar-background', sb.bg);
  root.style.setProperty('--sidebar-foreground', sb.fg);
  root.style.setProperty('--sidebar-primary', sb.accent);
  root.style.setProperty('--sidebar-accent', sb.bg);
  root.style.setProperty('--sidebar-accent-foreground', sb.fg);
  root.style.setProperty('--sidebar-border', sb.bg);

  // Radius / density / font
  root.style.setProperty('--radius', DENSITY_RADIUS[cfg.density]);
  root.style.setProperty('--density-scale', DENSITY_SPACING[cfg.density]);
  root.style.setProperty('--app-font', FONT_STACK[cfg.fontFamily]);
  root.style.setProperty('--btn-radius', BUTTON_RADIUS[cfg.buttonStyle]);
  document.body.style.fontFamily = FONT_STACK[cfg.fontFamily];
  document.documentElement.style.fontSize = `${cfg.fontSize}px`;

  // Card style
  const cs = CARD_STYLE_VARS[cfg.cardStyle];
  root.style.setProperty('--card-shadow', cs.shadow);
  root.style.setProperty('--card-border', cs.border);
  if (cs.bg) root.style.setProperty('--card-bg', cs.bg);
}

export function loadTheme(): ThemeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_THEME, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_THEME;
}

export function saveTheme(cfg: ThemeConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function loadSavedThemes(): SavedTheme[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function persistSavedThemes(items: SavedTheme[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(items));
}

export function getActiveThemeId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveThemeId(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function initTheme() {
  applyTheme(loadTheme());
}

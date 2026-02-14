export type ThemeMode = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'clockwork-ui-theme';

function getSystemDark(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
  return 'dark';
}

export function setStoredTheme(mode: ThemeMode): void {
  localStorage.setItem(STORAGE_KEY, mode);
}

export function getEffectiveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'system') return getSystemDark() ? 'dark' : 'light';
  return mode;
}

export function applyTheme(mode: ThemeMode): void {
  const effective = getEffectiveTheme(mode);
  document.documentElement.setAttribute('data-theme', effective);
}

export function subscribeToSystemTheme(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => callback();
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}

import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import {
  applyTheme,
  getStoredTheme,
  setStoredTheme,
  subscribeToSystemTheme,
  type ThemeMode,
} from './lib/theme';

export default function App() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    return subscribeToSystemTheme(() => applyTheme('system'));
  }, [theme]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    setStoredTheme(mode);
  };

  return <Dashboard theme={theme} onThemeChange={setTheme} />;
}

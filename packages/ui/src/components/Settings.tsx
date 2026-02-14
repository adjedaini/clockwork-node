import { useState, useRef, useEffect } from 'react';
import { Settings as SettingsIcon, Sun, Moon, Monitor, Check } from 'lucide-react';
import type { ThemeMode } from '../lib/theme';

interface SettingsProps {
  theme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
}

const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
];

export function Settings({ theme, onThemeChange }: SettingsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[var(--cw-text-muted)] hover:bg-[var(--cw-border)] hover:text-[var(--cw-text)]"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <SettingsIcon className="h-4 w-4" />
        <span className="text-sm">Settings</span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded border border-[var(--cw-border)] bg-[var(--cw-panel)] py-1 shadow-lg"
          role="menu"
        >
          <div className="border-b border-[var(--cw-border)] px-3 py-2 text-xs font-medium uppercase tracking-wide text-[var(--cw-text-muted)]">
            Appearance
          </div>
          {options.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === value}
              onClick={() => {
                onThemeChange(value);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--cw-text)] hover:bg-[var(--cw-border)]"
            >
              <Icon className="h-4 w-4 text-[var(--cw-text-muted)]" />
              <span className="flex-1">{label}</span>
              {theme === value && <Check className="h-4 w-4 text-[var(--cw-accent)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

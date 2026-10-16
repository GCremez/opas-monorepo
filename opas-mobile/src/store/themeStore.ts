import { create } from 'zustand';
import { Appearance } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { colorScheme } from 'nativewind';
import { themes, type ThemeColors } from '../lib/tokens';

// User-facing appearance preference. 'system' follows the OS setting.
export type Appearance_ = 'paper' | 'ink' | 'system';

const STORAGE_KEY = 'appearance';

function resolve(pref: Appearance_): 'paper' | 'ink' {
  if (pref === 'system') {
    return Appearance.getColorScheme() === 'dark' ? 'ink' : 'paper';
  }
  return pref;
}

interface ThemeState {
  /** Raw user preference (what the Appearance control shows selected). */
  preference: Appearance_;
  /** Resolved active theme after applying 'system'. */
  active: 'paper' | 'ink';
  /** Hex color set for the active theme — pass to SVG icons / tintColor. */
  colors: ThemeColors;
  isDark: boolean;
  hydrate: () => Promise<void>;
  setPreference: (pref: Appearance_) => void;
}

function apply(pref: Appearance_) {
  const active = resolve(pref);
  // NativeWind toggles the `dark` class (→ .dark CSS vars) from the scheme.
  colorScheme.set(pref === 'system' ? 'system' : active === 'ink' ? 'dark' : 'light');
  return {
    preference: pref,
    active,
    colors: themes[active],
    isDark: active === 'ink',
  };
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'paper',
  active: 'paper',
  colors: themes.paper,
  isDark: false,

  hydrate: async () => {
    let pref: Appearance_ = 'paper';
    try {
      const stored = (await SecureStore.getItemAsync(STORAGE_KEY)) as Appearance_ | null;
      if (stored === 'paper' || stored === 'ink' || stored === 'system') pref = stored;
    } catch {
      // ignore — fall back to paper default
    }
    set(apply(pref));
  },

  setPreference: (pref) => {
    set(apply(pref));
    SecureStore.setItemAsync(STORAGE_KEY, pref).catch(() => {});
  },
}));

/** Convenience hook: hex colors for the active theme (SVG icons, tintColor). */
export function useThemeColors(): ThemeColors {
  return useThemeStore((s) => s.colors);
}

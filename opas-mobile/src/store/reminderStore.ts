import { create } from 'zustand';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { track } from '../lib/analytics';

const ENABLED_KEY = 'deadline_reminders';
const PROMPT_KEY = 'reminders_prompt_dismissed';

interface ReminderState {
  /** The user's choice; reminders also need the system permission to actually fire. */
  enabled: boolean;
  permission: Notifications.PermissionStatus | null;
  promptDismissed: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** Turning on asks for permission if it hasn't been given yet. Returns the final state. */
  setEnabled: (on: boolean) => Promise<boolean>;
  dismissPrompt: () => Promise<void>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  enabled: true,
  permission: null,
  promptDismissed: false,
  hydrated: false,

  hydrate: async () => {
    const [enabled, dismissed, perm] = await Promise.all([
      SecureStore.getItemAsync(ENABLED_KEY).catch(() => null),
      SecureStore.getItemAsync(PROMPT_KEY).catch(() => null),
      Notifications.getPermissionsAsync().catch(() => null),
    ]);
    set({
      enabled: enabled !== 'off',
      promptDismissed: dismissed === 'true',
      permission: perm?.status ?? null,
      hydrated: true,
    });
  },

  setEnabled: async (on) => {
    let permission = get().permission;
    if (on && permission !== 'granted') {
      permission = (await Notifications.requestPermissionsAsync()).status;
      track(permission === 'granted' ? 'reminders_allowed' : 'reminders_denied');
    }
    const enabled = on && permission === 'granted';
    await SecureStore.setItemAsync(ENABLED_KEY, enabled ? 'on' : 'off');
    set({ enabled, permission });
    return enabled;
  },

  dismissPrompt: async () => {
    await SecureStore.setItemAsync(PROMPT_KEY, 'true');
    set({ promptDismissed: true });
  },
}));

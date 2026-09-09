import * as SecureStore from 'expo-secure-store';

import type { WebTheme } from './webview-bridge';

const settingsStorageKey = 'zcode.mobile.settings.v1';

export type ThemePreference = 'system' | 'light' | 'dark';

export type MobileSettings = {
  readonly themePreference: ThemePreference;
  readonly lastWebTheme: WebTheme | null;
  readonly reloadRequestedAt: number | null;
};

const defaultSettings: MobileSettings = {
  themePreference: 'system',
  lastWebTheme: null,
  reloadRequestedAt: null,
};

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function isWebTheme(value: unknown): value is WebTheme {
  return value === 'light' || value === 'dark';
}

export async function getMobileSettings(): Promise<MobileSettings> {
  const serialized = await SecureStore.getItemAsync(settingsStorageKey);

  if (!serialized) {
    return defaultSettings;
  }

  try {
    const value: unknown = JSON.parse(serialized);
    const candidate = value as Partial<MobileSettings>;

    if (
      typeof value === 'object' &&
      value !== null &&
      isThemePreference(candidate.themePreference) &&
      (candidate.lastWebTheme === null || isWebTheme(candidate.lastWebTheme)) &&
      (candidate.reloadRequestedAt === null || typeof candidate.reloadRequestedAt === 'number')
    ) {
      return value as MobileSettings;
    }
  } catch {
    // Invalid local settings are replaced with safe defaults below.
  }

  await SecureStore.deleteItemAsync(settingsStorageKey);
  return defaultSettings;
}

export async function saveMobileSettings(settings: MobileSettings): Promise<void> {
  await SecureStore.setItemAsync(settingsStorageKey, JSON.stringify(settings), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function setThemePreference(themePreference: ThemePreference): Promise<void> {
  const settings = await getMobileSettings();
  await saveMobileSettings({ ...settings, themePreference });
}

export async function setLastWebTheme(lastWebTheme: WebTheme): Promise<void> {
  const settings = await getMobileSettings();
  await saveMobileSettings({ ...settings, lastWebTheme });
}

export async function requestReload(): Promise<void> {
  const settings = await getMobileSettings();
  await saveMobileSettings({ ...settings, reloadRequestedAt: Date.now() });
}

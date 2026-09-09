import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import {
  getMobileSettings,
  setLastWebTheme as persistLastWebTheme,
  setThemePreference as persistThemePreference,
  type ThemePreference,
} from './mobile-settings';
import type { WebTheme } from './webview-bridge';

type AppThemeContextValue = {
  readonly scheme: WebTheme;
  readonly preference: ThemePreference;
  readonly setPreference: (preference: ThemePreference) => void;
  readonly reportWebTheme: (theme: WebTheme) => void;
  readonly applyRemoteTheme: (theme: WebTheme | 'system') => boolean;
  readonly setRemoteThemeHandler: (handler: ((theme: WebTheme | 'system') => boolean) | null) => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { readonly children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [webTheme, setWebThemeState] = useState<WebTheme | null>(null);
  const lastPersistedWebTheme = useRef<WebTheme | null>(null);
  const remoteThemeHandler = useRef<((theme: WebTheme | 'system') => boolean) | null>(null);

  useEffect(() => {
    let isMounted = true;

    void getMobileSettings()
      .then((settings) => {
        if (!isMounted) {
          return;
        }

        setPreferenceState(settings.themePreference);
        if (settings.lastWebTheme) {
          lastPersistedWebTheme.current = settings.lastWebTheme;
          setWebThemeState(settings.lastWebTheme);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    void persistThemePreference(nextPreference).catch(() => undefined);
  }, []);

  const setRemoteThemeHandler = useCallback(
    (handler: ((theme: WebTheme | 'system') => boolean) | null) => {
      remoteThemeHandler.current = handler;
    },
    [],
  );

  const applyRemoteTheme = useCallback((theme: WebTheme | 'system') => {
    return remoteThemeHandler.current ? remoteThemeHandler.current(theme) : false;
  }, []);

  const reportWebTheme = useCallback((theme: WebTheme) => {
    setWebThemeState(theme);

    if (lastPersistedWebTheme.current !== theme) {
      lastPersistedWebTheme.current = theme;
      void persistLastWebTheme(theme).catch(() => undefined);
    }
  }, []);

  const scheme: WebTheme =
    preference === 'light'
      ? 'light'
      : preference === 'dark'
        ? 'dark'
        : (webTheme ?? (systemColorScheme === 'dark' ? 'dark' : 'light'));

  const value = useMemo(
    () => ({ scheme, preference, setPreference, reportWebTheme, applyRemoteTheme, setRemoteThemeHandler }),
    [scheme, preference, setPreference, reportWebTheme, applyRemoteTheme, setRemoteThemeHandler],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeContextValue {
  const value = useContext(AppThemeContext);

  if (!value) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }

  return value;
}

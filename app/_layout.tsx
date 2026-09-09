import { useEffect, useState } from 'react';
import Constants, { AppOwnership } from 'expo-constants';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AppThemeProvider } from '../lib/app-theme';

void SplashScreen.preventAutoHideAsync();

if (Constants.appOwnership !== AppOwnership.Expo) {
  SplashScreen.setOptions({ fade: true, duration: 280 });
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hide();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <AppThemeProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#0C0E0F' },
        }}
      />
    </AppThemeProvider>
  );
}

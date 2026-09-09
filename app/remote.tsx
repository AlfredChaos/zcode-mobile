import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { WebView } from 'react-native-webview';

import { ZCodeLoadingMark } from '../components/zcode-loading-mark';
import { ZCodeMark } from '../components/zcode-mark';
import { useAppTheme } from '../lib/app-theme';
import { getConnectionDisplayName, isTrustedZCodeNavigation } from '../lib/connection';
import { clearSavedConnection, getSavedConnection } from '../lib/connection-store';
import { getMobileSettings, type ThemePreference } from '../lib/mobile-settings';
import {
  mobileWebViewSetupScript,
  mobileWebViewThemeScript,
  parseWebThemeMessage,
  type WebTheme,
  type WebThemeMessage,
} from '../lib/webview-bridge';

const defaultWebTheme: WebThemeMessage = {
  type: 'zcode-mobile-theme',
  theme: 'light',
  backgroundColor: '#FFFFFF',
};

export default function RemoteScreen() {
  const webViewRef = useRef<WebView>(null);
  const lastHandledReload = useRef<number | null>(null);
  const lastWebMessageKey = useRef<string | null>(null);
  const appliedThemeRef = useRef<ThemePreference | null>(null);
  const { reportWebTheme, scheme: appScheme, preference: appThemePreference, setPreference: setAppPreference, setRemoteThemeHandler } = useAppTheme();
  const [connection, setConnection] = useState<string | null>(null);
  const [isLoadingConnection, setIsLoadingConnection] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [webTheme, setWebTheme] = useState<WebThemeMessage>(defaultWebTheme);
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');

  useEffect(() => {
    let isMounted = true;

    void getSavedConnection()
      .then((savedConnection) => {
        if (!isMounted) {
          return;
        }

        if (!savedConnection) {
          router.replace('/scanner');
          return;
        }

        setConnection(savedConnection);
        setIsLoadingConnection(false);
      })
      .catch(() => {
        if (isMounted) {
          router.replace('/scanner');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const reloadPage = useCallback(() => {
    setLoadFailed(false);
    setReloadKey((key) => key + 1);
    appliedThemeRef.current = null;
  }, []);

  const ensureWebTheme = useCallback(
    (theme: ThemePreference | WebTheme | 'system') => {
      const target = theme === 'dark' || theme === 'light' || theme === 'system' ? theme : 'system';
      if (target === 'system') {
        if (appliedThemeRef.current !== null) {
          appliedThemeRef.current = null;
          webViewRef.current?.injectJavaScript(mobileWebViewThemeScript('system'));
        }
        return;
      }

      if (appliedThemeRef.current !== target) {
        appliedThemeRef.current = target;
        webViewRef.current?.injectJavaScript(mobileWebViewThemeScript(target));
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      void getMobileSettings()
        .then((settings) => {
          if (!isActive) {
            return;
          }

          setThemePreference(settings.themePreference);
          setAppPreference(settings.themePreference);

          if (
            settings.reloadRequestedAt !== null &&
            settings.reloadRequestedAt !== lastHandledReload.current
          ) {
            lastHandledReload.current = settings.reloadRequestedAt;
            reloadPage();
            return;
          }

          if (settings.themePreference === 'system') {
            ensureWebTheme('system');
          } else {
            ensureWebTheme(settings.themePreference);
          }
        })
        .catch(() => undefined);

      return () => {
        isActive = false;
      };
    }, [reloadPage, ensureWebTheme]),
  );

  const handleNavigationStateChange = useCallback((navigation: WebViewNavigation) => {
    setCanGoBack(navigation.canGoBack);
  }, []);

  useEffect(() => {
    const handler = (theme: WebTheme | 'system') => {
      ensureWebTheme(theme);
      return true;
    };
    setRemoteThemeHandler(handler);
    return () => setRemoteThemeHandler(null);
  }, [ensureWebTheme, setRemoteThemeHandler]);

  useEffect(() => {
    if (appScheme === 'dark' || appScheme === 'light') {
      ensureWebTheme(appScheme);
    } else {
      ensureWebTheme('system');
    }
  }, [appScheme, ensureWebTheme]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }

      router.replace('/scanner');
      return true;
    });

    return () => subscription.remove();
  }, [canGoBack]);

  const handleRequest = useCallback((candidate: string) => {
    if (isTrustedZCodeNavigation(candidate)) {
      return true;
    }

    if (candidate.toLowerCase().startsWith('https:')) {
      void Linking.openURL(candidate).catch(() => undefined);
    }

    return false;
  }, []);

  const handleDisconnect = useCallback(async () => {
    await clearSavedConnection();
    router.replace('/scanner');
  }, []);

  const handleWebMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseWebThemeMessage(event.nativeEvent.data);

      if (!message) {
        return;
      }

      const messageKey = `${message.theme}:${message.backgroundColor}`;

      if (messageKey !== lastWebMessageKey.current) {
        lastWebMessageKey.current = messageKey;
        setWebTheme(message);
      }

      reportWebTheme(message.theme);
    },
    [reportWebTheme],
  );

  const handleLoadEnd = useCallback(() => {
    setLoadFailed(false);
    if (themePreference === 'system') {
      ensureWebTheme('system');
    } else {
      ensureWebTheme(themePreference);
    }
  }, [themePreference, ensureWebTheme]);

  if (isLoadingConnection || !connection) {
    return <RemoteLoadingState />;
  }

  if (loadFailed) {
    return <FailedConnectionState onRescan={() => router.replace('/scanner')} onRetry={reloadPage} />;
  }

  const isDark = appScheme === 'dark';
  const headerBackground = isDark ? '#0C0E0F' : '#FFFFFF';
  const headerForeground = isDark ? '#F5F7F8' : '#141719';
  const secondaryForeground = isDark ? '#A7AFB8' : '#6B747B';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(20, 23, 25, 0.12)';
  const webViewBackground = webTheme.backgroundColor || headerBackground;
  const machineName = getConnectionDisplayName(connection);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: headerBackground }]}
      edges={['top', 'bottom']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={[styles.header, { backgroundColor: headerBackground, borderBottomColor: borderColor }]}>
        <View style={styles.headerIdentity}>
          <View style={[styles.headerMark, { borderColor }]}>
            <ZCodeMark size={17} color={headerForeground} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.brandName, { color: headerForeground }]}>ZCode</Text>
            <Text style={[styles.machineName, { color: secondaryForeground }]} numberOfLines={1}>
              {machineName}
            </Text>
          </View>
          <View style={styles.connectedStatus}>
            <View style={styles.connectedDot} />
            <Text style={[styles.connectedLabel, { color: secondaryForeground }]}>已连接</Text>
          </View>
        </View>
        <Pressable
          accessibilityLabel="打开设置"
          accessibilityRole="button"
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.buttonPressed]}
        >
          <Text style={[styles.settingsGlyph, { color: headerForeground }]}>⚙︎</Text>
        </Pressable>
      </View>

      <View style={styles.noticeBar}>
        <Text style={[styles.noticeText, { color: secondaryForeground }]}>
          二维码失效后，需要回到桌面端重新连接。
        </Text>
      </View>

      <View style={[styles.webViewContainer, { backgroundColor: webViewBackground }]}>
        <WebView
          key={`${reloadKey}-webview-shell-v8`}
          ref={webViewRef}
          source={{ uri: connection }}
          originWhitelist={['https://zcode.z.ai/*']}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
          startInLoadingState
          injectedJavaScriptBeforeContentLoaded={mobileWebViewSetupScript}
          injectedJavaScript={mobileWebViewSetupScript}
          renderLoading={() => (
            <View style={styles.webLoading}>
              <ZCodeLoadingMark />
              <Text style={styles.webLoadingText}>正在连接 ZCode</Text>
            </View>
          )}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={(request) => handleRequest(request.url)}
          onMessage={handleWebMessage}
          onLoadEnd={handleLoadEnd}
          onError={() => setLoadFailed(true)}
          onHttpError={() => setLoadFailed(true)}
          style={[styles.webView, { backgroundColor: webViewBackground }]}
        />
      </View>
    </SafeAreaView>
  );
}

function RemoteLoadingState() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.fullScreenState}>
        <ZCodeLoadingMark />
        <Text style={styles.webLoadingText}>正在恢复安全连接</Text>
      </View>
    </SafeAreaView>
  );
}

type FailedConnectionStateProps = {
  readonly onRetry: () => void;
  readonly onRescan: () => void;
};

function FailedConnectionState({ onRetry, onRescan }: FailedConnectionStateProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.fullScreenState}>
        <View style={styles.loadingMark}>
          <ZCodeMark size={30} />
        </View>
        <Text style={styles.failureTitle}>连接暂时不可用</Text>
        <Text style={styles.failureDescription}>
          远程链接可能已失效，或当前网络无法访问 ZCode。不会显示或记录连接凭据。
        </Text>
        <View style={styles.failureActions}>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.primaryButtonText}>重新加载</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onRescan}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.secondaryButtonText}>重新扫码</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0C0E0F',
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIdentity: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  headerMark: {
    width: 29,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 1,
  },
  headerCopy: {
    minWidth: 0,
    flexShrink: 1,
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 17,
  },
  machineName: {
    maxWidth: 180,
    marginTop: 1,
    fontSize: 12,
    lineHeight: 15,
  },
  connectedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 4,
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3FBE83',
  },
  connectedLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  settingsButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderRadius: 12,
  },
  settingsGlyph: {
    fontSize: 25,
    lineHeight: 29,
  },
  buttonPressed: {
    opacity: 0.62,
  },
  noticeBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  noticeText: {
    fontSize: 11,
    lineHeight: 16,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: '#0C0E0F',
  },
  webLoadingText: {
    color: '#A7AFB8',
    fontSize: 14,
  },
  fullScreenState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: '#0C0E0F',
  },
  loadingMark: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderRadius: 17,
    backgroundColor: '#151718',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  failureTitle: {
    marginTop: 6,
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '700',
  },
  failureDescription: {
    maxWidth: 335,
    marginTop: 12,
    color: '#A3ACB5',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  failureActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
  },
  primaryButton: {
    paddingHorizontal: 19,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F5F7F8',
  },
  primaryButtonText: {
    color: '#101213',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingHorizontal: 19,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  secondaryButtonText: {
    color: '#E5E9EC',
    fontSize: 14,
    fontWeight: '700',
  },
});

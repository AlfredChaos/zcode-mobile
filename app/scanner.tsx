import { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ZCodeMark } from '../components/zcode-mark';
import { useAppTheme } from '../lib/app-theme';
import { parseZCodeConnection } from '../lib/connection';
import { saveConnection } from '../lib/connection-store';
import type { WebTheme } from '../lib/webview-bridge';

type Palette = {
  readonly background: string;
  readonly surface: string;
  readonly border: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly cameraShellBackground: string;
  readonly primaryButtonBackground: string;
  readonly primaryButtonText: string;
  readonly statusBarStyle: 'light' | 'dark';
};

const palettes: Record<WebTheme, Palette> = {
  dark: {
    background: '#0C0E0F',
    surface: '#151718',
    border: 'rgba(255, 255, 255, 0.2)',
    textPrimary: '#F9FAFB',
    textSecondary: '#9EA7B0',
    cameraShellBackground: '#151718',
    primaryButtonBackground: '#F5F7F8',
    primaryButtonText: '#101213',
    statusBarStyle: 'light',
  },
  light: {
    background: '#FFFFFF',
    surface: '#F2F4F5',
    border: 'rgba(20, 23, 25, 0.14)',
    textPrimary: '#141719',
    textSecondary: '#69727A',
    cameraShellBackground: '#E9ECEE',
    primaryButtonBackground: '#17191B',
    primaryButtonText: '#FFFFFF',
    statusBarStyle: 'dark',
  },
};

export default function ScannerScreen() {
  const { scheme } = useAppTheme();
  const palette = palettes[scheme];
  const [permission, requestPermission] = useCameraPermissions();
  const [isHandlingScan, setIsHandlingScan] = useState(false);
  const [scannerError, setScannerError] = useState(false);

  const handleBarcodeScanned = useCallback(
    async ({ data }: { readonly data: string }) => {
      if (isHandlingScan) {
        return;
      }

      setIsHandlingScan(true);
      const result = parseZCodeConnection(data);

      if (!result.ok) {
        Alert.alert('无法连接', '这不是有效的 ZCode 连接二维码。');
        setIsHandlingScan(false);
        return;
      }

      try {
        await saveConnection(result.url);
        router.replace('/remote');
      } catch {
        Alert.alert('无法保存连接', '请重新扫描二维码。');
        setIsHandlingScan(false);
      }
    },
    [isHandlingScan],
  );

  if (!permission) {
    return <LoadingState palette={palette} />;
  }

  if (!permission.granted) {
    return (
      <PermissionState
        palette={palette}
        canAskAgain={permission.canAskAgain}
        onRequestPermission={() => {
          void requestPermission();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <StatusBar style={palette.statusBarStyle} />
      <View style={styles.header}>
        <BrandLockup palette={palette} />
        <Text style={[styles.headerLabel, { color: palette.textSecondary }]}>安全远程连接</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: palette.textPrimary }]}>扫描桌面端二维码</Text>
        <Text style={[styles.description, { color: palette.textSecondary }]}>
          在 ZCode Desktop 中打开远程同步，并扫描显示的二维码。
        </Text>

        <View
          style={[
            styles.cameraShell,
            { backgroundColor: palette.cameraShellBackground, borderColor: palette.border },
          ]}
        >
          {scannerError ? (
            <View style={styles.cameraFallback}>
              <Text style={[styles.cameraFallbackTitle, { color: palette.textPrimary }]}>相机无法启动</Text>
              <Text style={[styles.cameraFallbackText, { color: palette.textSecondary }]}>
                请关闭后重新打开此页面，或检查系统相机权限。
              </Text>
            </View>
          ) : (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={isHandlingScan ? undefined : handleBarcodeScanned}
              onMountError={() => setScannerError(true)}
            />
          )}
          <View pointerEvents="none" style={styles.scanOverlay}>
            <View style={styles.scanFrame} />
          </View>
        </View>

        <View style={styles.securityNotice}>
          <View style={styles.securityDot} />
          <Text style={[styles.securityText, { color: palette.textSecondary }]}>
            仅接受来自 zcode.z.ai 的加密连接
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

type PaletteProps = {
  readonly palette: Palette;
};

function LoadingState({ palette }: PaletteProps) {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <StatusBar style={palette.statusBarStyle} />
      <View style={styles.centeredState}>
        <BrandLockup palette={palette} />
        <Text style={[styles.stateTitle, { color: palette.textPrimary }]}>正在检查相机权限</Text>
      </View>
    </SafeAreaView>
  );
}

type PermissionStateProps = PaletteProps & {
  readonly canAskAgain: boolean;
  readonly onRequestPermission: () => void;
};

function PermissionState({ palette, canAskAgain, onRequestPermission }: PermissionStateProps) {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <StatusBar style={palette.statusBarStyle} />
      <View style={styles.centeredState}>
        <View style={[styles.heroMark, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <ZCodeMark size={36} color={palette.textPrimary} />
        </View>
        <Text style={[styles.stateTitle, { color: palette.textPrimary }]}>需要相机权限</Text>
        <Text style={[styles.stateDescription, { color: palette.textSecondary }]}>
          ZCode Mobile 只使用相机读取你主动展示的桌面端连接二维码。
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={canAskAgain ? onRequestPermission : () => void Linking.openSettings()}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: palette.primaryButtonBackground },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: palette.primaryButtonText }]}>
            {canAskAgain ? '允许使用相机' : '打开系统设置'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function BrandLockup({ palette }: PaletteProps) {
  return (
    <View style={styles.brandLockup}>
      <View style={[styles.brandMark, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <ZCodeMark size={18} color={palette.textPrimary} />
      </View>
      <Text style={[styles.brandName, { color: palette.textPrimary }]}>ZCode Mobile</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandMark: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 1,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    marginTop: 40,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  description: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
  },
  cameraShell: {
    aspectRatio: 1,
    width: '100%',
    marginTop: 34,
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 1,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 7, 8, 0.22)',
  },
  scanFrame: {
    width: '64%',
    aspectRatio: 1,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  cameraFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  cameraFallbackTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cameraFallbackText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    marginTop: 22,
  },
  securityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#3FBE83',
  },
  securityText: {
    fontSize: 13,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  heroMark: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
  },
  stateTitle: {
    marginTop: 26,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateDescription: {
    maxWidth: 310,
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  primaryButton: {
    minWidth: 184,
    marginTop: 28,
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderRadius: 14,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonPressed: {
    opacity: 0.76,
  },
});

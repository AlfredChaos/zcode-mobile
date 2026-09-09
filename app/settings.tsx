import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ZCodeMark } from '../components/zcode-mark';
import { useAppTheme } from '../lib/app-theme';
import { getConnectionDisplayName } from '../lib/connection';
import { clearSavedConnection, getSavedConnection } from '../lib/connection-store';
import type { ThemePreference } from '../lib/mobile-settings';
import type { WebTheme } from '../lib/webview-bridge';

const themeOptions: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: '跟随网页' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
];

type Palette = {
  readonly background: string;
  readonly cardBackground: string;
  readonly border: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly footerText: string;
  readonly segmentTrack: string;
  readonly segmentSelectedBackground: string;
  readonly segmentText: string;
  readonly segmentTextSelected: string;
  readonly destructiveText: string;
  readonly markBackground: string;
  readonly statusBarStyle: 'light' | 'dark';
};

const palettes: Record<WebTheme, Palette> = {
  dark: {
    background: '#0C0E0F',
    cardBackground: '#151718',
    border: 'rgba(255, 255, 255, 0.12)',
    textPrimary: '#F5F7F8',
    textSecondary: '#8F99A3',
    footerText: '#77818A',
    segmentTrack: '#0C0E0F',
    segmentSelectedBackground: '#F5F7F8',
    segmentText: '#AAB3BC',
    segmentTextSelected: '#101213',
    destructiveText: '#FFAAA6',
    markBackground: '#151718',
    statusBarStyle: 'light',
  },
  light: {
    background: '#F6F7F8',
    cardBackground: '#FFFFFF',
    border: 'rgba(20, 23, 25, 0.12)',
    textPrimary: '#141719',
    textSecondary: '#69727A',
    footerText: '#8A939B',
    segmentTrack: '#ECEEEF',
    segmentSelectedBackground: '#FFFFFF',
    segmentText: '#69727A',
    segmentTextSelected: '#141719',
    destructiveText: '#D14B42',
    markBackground: '#FFFFFF',
    statusBarStyle: 'dark',
  },
};

export default function SettingsScreen() {
  const { scheme, preference, setPreference, applyRemoteTheme } = useAppTheme();
  const palette = palettes[scheme];
  const [machineName, setMachineName] = useState('ZCode Desktop');

  useEffect(() => {
    let isMounted = true;

    void getSavedConnection()
      .then((connection) => {
        if (isMounted && connection) {
          setMachineName(getConnectionDisplayName(connection));
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  const handleReload = useCallback(async () => {
    const { requestReload } = await import('../lib/mobile-settings');
    await requestReload();
    router.back();
  }, []);

  const handleDisconnect = useCallback(() => {
    Alert.alert('断开当前连接？', '这只会清除本机保存的连接，不会影响桌面端。', [
      { text: '取消', style: 'cancel' },
      {
        text: '断开连接',
        style: 'destructive',
        onPress: () => {
          void clearSavedConnection().then(() => router.replace('/scanner'));
        },
      },
    ]);
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <StatusBar style={palette.statusBarStyle} />
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable
          accessibilityLabel="返回远程会话"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={[styles.backGlyph, { color: palette.textPrimary }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>设置</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: palette.markBackground, borderColor: palette.border }]}>
            <ZCodeMark size={21} color={palette.textPrimary} />
          </View>
          <View>
            <Text style={[styles.brandTitle, { color: palette.textPrimary }]}>ZCode Mobile</Text>
            <Text style={[styles.brandSubtitle, { color: palette.textSecondary }]} numberOfLines={1}>
              {machineName}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>外观</Text>
        <View style={[styles.card, { backgroundColor: palette.cardBackground, borderColor: palette.border }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>主题色</Text>
          <Text style={[styles.cardDescription, { color: palette.textSecondary }]}>
            同时应用到网页、顶部栏和本页面的显示主题
          </Text>
          <View style={[styles.segmentedControl, { backgroundColor: palette.segmentTrack }]}>
            {themeOptions.map((option) => {
              const selected = option.value === preference;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={option.label}
                  onPress={() => {
                    setPreference(option.value);
                    if (option.value === 'system') {
                      applyRemoteTheme('system');
                    } else {
                      applyRemoteTheme(option.value);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.segment,
                    selected && { backgroundColor: palette.segmentSelectedBackground },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: selected ? palette.segmentTextSelected : palette.segmentText },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: palette.textSecondary }]}>当前连接</Text>
        <View style={[styles.card, { backgroundColor: palette.cardBackground, borderColor: palette.border }]}>
          <View style={styles.connectionRow}>
            <View style={styles.statusDot} />
            <View style={styles.connectionCopy}>
              <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>已连接到桌面端</Text>
              <Text style={[styles.cardDescription, { color: palette.textSecondary }]} numberOfLines={1}>
                {machineName}
              </Text>
            </View>
          </View>
          <SettingButton
            palette={palette}
            label="重新加载当前页面"
            onPress={() => void handleReload()}
          />
          <SettingButton palette={palette} label="重新扫码连接" onPress={() => router.replace('/scanner')} />
          <SettingButton palette={palette} destructive label="断开此设备" onPress={handleDisconnect} />
        </View>

        <Text style={[styles.footerNote, { color: palette.footerText }]}>
          二维码失效后，需要回到桌面端重新连接。
        </Text>
      </View>
    </SafeAreaView>
  );
}

type SettingButtonProps = {
  readonly palette: Palette;
  readonly label: string;
  readonly destructive?: boolean;
  readonly onPress: () => void;
};

function SettingButton({ palette, label, destructive = false, onPress }: SettingButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.settingButton, pressed && styles.pressed]}
    >
      <Text style={[styles.settingButtonText, { color: destructive ? palette.destructiveText : palette.textPrimary }]}>
        {label}
      </Text>
      <Text style={[styles.chevron, { color: palette.textSecondary }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backGlyph: {
    fontSize: 38,
    fontWeight: '300',
    lineHeight: 38,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 42,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  brandMark: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  brandSubtitle: {
    maxWidth: 260,
    marginTop: 3,
    fontSize: 13,
  },
  sectionLabel: {
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  card: {
    marginBottom: 26,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardDescription: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 16,
    padding: 4,
    borderRadius: 12,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 9,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 13,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3FBE83',
  },
  connectionCopy: {
    flex: 1,
  },
  settingButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128, 136, 144, 0.25)',
  },
  settingButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
  },
  footerNote: {
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.64,
  },
});

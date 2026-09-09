import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ZCodeLoadingMark } from '../components/zcode-loading-mark';
import { getSavedConnection } from '../lib/connection-store';

export default function IndexScreen() {
  const [destination, setDestination] = useState<'scanner' | 'remote' | null>(null);

  useEffect(() => {
    let isMounted = true;

    void getSavedConnection()
      .then((connection) => {
        if (isMounted) {
          setDestination(connection ? 'remote' : 'scanner');
        }
      })
      .catch(() => {
        if (isMounted) {
          setDestination('scanner');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (destination) {
    return <Redirect href={destination === 'remote' ? '/remote' : '/scanner'} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.loadingContainer}>
        <ZCodeLoadingMark />
        <Text style={styles.loadingText}>正在准备安全连接</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0C0E0F',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  loadingText: {
    color: '#A7AFB8',
    fontSize: 14,
  },
});

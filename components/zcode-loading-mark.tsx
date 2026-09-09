import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { ZCodeMark } from './zcode-mark';

type ZCodeLoadingMarkProps = {
  readonly size?: number;
};

export function ZCodeLoadingMark({ size = 58 }: ZCodeLoadingMarkProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 1100,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [progress]);

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.065],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });

  return (
    <Animated.View style={[styles.animationContainer, { opacity, transform: [{ scale }] }]}>
      <View style={[styles.markContainer, { width: size, height: size, borderRadius: size * 0.29 }]}>
        <ZCodeMark size={size * 0.54} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animationContainer: {
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  markContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151718',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});

import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  dark?: boolean;
}

export function GlassCard({
  children,
  style,
  intensity = 40,
  dark = false,
}: GlassCardProps) {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={intensity}
        tint={dark ? 'dark' : 'light'}
        style={[styles.card, dark ? styles.cardDark : styles.cardLight, style]}
      >
        {children}
      </BlurView>
    );
  }

  // Android fallback — semi-transparent View
  return (
    <View
      style={[
        styles.card,
        dark ? styles.cardDarkFallback : styles.cardLightFallback,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardLight: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  cardDark: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardLightFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  cardDarkFallback: {
    backgroundColor: 'rgba(17, 33, 22, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
});

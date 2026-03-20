import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  dark?: boolean;
}

export function GlassCard({
  children,
  style,
}: GlassCardProps) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: '#F3F5F7',
    borderWidth: 1,
    borderColor: '#DCE0E3',
  },
});

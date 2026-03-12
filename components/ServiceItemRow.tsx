import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ServiceItem, ActionCode } from '../data/maintenanceSchedule';

const actionColors: Record<ActionCode, string> = {
  I: '#3b82f6', // blue – inspect
  R: '#ef4444', // red – replace
  A: '#f59e0b', // amber – adjust
  L: '#10b981', // emerald – lubricate
  C: '#8b5cf6', // violet – clean
};

const actionBg: Record<ActionCode, string> = {
  I: 'rgba(59,130,246,0.12)',
  R: 'rgba(239,68,68,0.12)',
  A: 'rgba(245,158,11,0.12)',
  L: 'rgba(16,185,129,0.12)',
  C: 'rgba(139,92,246,0.12)',
};

interface ServiceItemRowProps {
  item: ServiceItem;
  index: number;
}

export function ServiceItemRow({ item, index }: ServiceItemRowProps) {
  const color = actionColors[item.action];
  const bg = actionBg[item.action];

  return (
    <View style={[styles.row, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
      <View style={[styles.iconBox, { backgroundColor: bg }]}>
        <Text style={[styles.actionInitial, { color }]}>
          {item.action}
        </Text>
      </View>
      <View style={styles.textBox}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={[styles.action, { color }]}>{item.actionLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowEven: {
    backgroundColor: 'transparent',
  },
  rowOdd: {
    backgroundColor: 'rgba(0,0,0,0.025)',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionInitial: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    fontWeight: '700',
  },
  textBox: {
    flex: 1,
  },
  name: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 1,
  },
  action: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
});

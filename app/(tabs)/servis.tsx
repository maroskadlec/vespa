import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useVespaData } from '../../hooks/useVespaData';
import { GlassCard } from '../../components/GlassCard';
import {
  getServiceTimeline,
  ServiceEntry,
  formatDate,
} from '../../utils/serviceCalc';

const { width } = Dimensions.get('window');

function StatusDot({ status }: { status: ServiceEntry['status'] }) {
  return (
    <View
      style={[
        styles.dot,
        status === 'done' && styles.dotDone,
        status === 'upcoming' && styles.dotUpcoming,
        status === 'future' && styles.dotFuture,
      ]}
    />
  );
}

function ServiceCard({ entry }: { entry: ServiceEntry }) {
  const isUpcoming = entry.status === 'upcoming';
  const isDone = entry.status === 'done';
  const isFuture = entry.status === 'future';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() =>
        router.push({
          pathname: '/service/[id]',
          params: { id: entry.milestone.id },
        })
      }
    >
      <GlassCard
        style={isUpcoming ? [styles.card, styles.cardUpcoming] : styles.card}
        intensity={isUpcoming ? 55 : 30}
        dark
      >
        {isUpcoming && (
          <LinearGradient
            colors={['rgba(245,158,11,0.18)', 'rgba(245,158,11,0.04)']}
            style={StyleSheet.absoluteFill}
          />
        )}

        <View style={styles.cardTop}>
          <View style={styles.timelineBar}>
            <StatusDot status={entry.status} />
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text
                style={[styles.cardTitle, isFuture && styles.cardTitleFuture]}
              >
                {entry.milestone.label}
              </Text>

              {isDone && (
                <View style={styles.chip}>
                  <Text style={styles.chipTextDone}>✓ Hotovo</Text>
                </View>
              )}
              {isUpcoming && (
                <View style={[styles.chip, styles.chipUpcoming]}>
                  <Text style={styles.chipTextUpcoming}>Příští →</Text>
                </View>
              )}
            </View>

            {entry.estimatedDate && (
              <Text style={styles.cardDate}>{formatDate(entry.estimatedDate)}</Text>
            )}

            {isUpcoming && (
              <View style={styles.upcomingStats}>
                {entry.kmRemaining !== null && entry.kmRemaining > 0 && (
                  <View style={styles.statPill}>
                    <Text style={styles.statPillValue}>
                      {entry.kmRemaining.toLocaleString('cs-CZ')} km
                    </Text>
                    <Text style={styles.statPillLabel}>zbývá</Text>
                  </View>
                )}
                {entry.daysRemaining !== null && (
                  <View style={[styles.statPill, styles.statPillAlt]}>
                    <Text style={[styles.statPillValue, { color: '#60a5fa' }]}>
                      {entry.daysRemaining} dní
                    </Text>
                    <Text style={styles.statPillLabel}>do termínu</Text>
                  </View>
                )}
              </View>
            )}

            {isFuture && entry.kmRemaining !== null && (
              <Text style={styles.futureInfo}>
                za {entry.kmRemaining.toLocaleString('cs-CZ')} km
              </Text>
            )}
            {isFuture && entry.kmRemaining === null && entry.daysRemaining !== null && (
              <Text style={styles.futureInfo}>za {entry.daysRemaining} dní</Text>
            )}

            <Text style={styles.cardItemCount}>
              {entry.milestone.items.length} úkonů
            </Text>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

export default function ServisScreen() {
  const { data, isLoading } = useVespaData();

  const timeline = useMemo(() => {
    if (!data) return [];
    return getServiceTimeline(
      new Date(data.commissioningDate),
      data.currentKm,
      data.completedServices ?? {}
    );
  }, [data]);

  const doneCount = timeline.filter((e) => e.status === 'done').length;
  const totalCount = timeline.length;

  if (isLoading) {
    return (
      <LinearGradient colors={['#0d1f13', '#112116']} style={styles.loading}>
        <Text style={styles.loadingText}>Načítám...</Text>
      </LinearGradient>
    );
  }

  if (!data) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a1f0f', '#112116', '#0d2414']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Přehled servisu</Text>
          <Text style={styles.headerSub}>Vespa Primavera, la Lulu</Text>
        </View>

        {/* Progress bar */}
        <GlassCard style={styles.progressCard} intensity={40} dark>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Celkový pokrok</Text>
            <Text style={styles.progressFraction}>
              {doneCount} / {totalCount}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={['#19e65e', '#14c752']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressFill,
                { width: `${(doneCount / Math.max(1, totalCount)) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressHint}>
            {totalCount - doneCount} prohlídek zbývá
          </Text>
        </GlassCard>

        {/* Legend */}
        <View style={styles.legend}>
          {[
            { style: styles.dotDone, label: 'Hotovo' },
            { style: styles.dotUpcoming, label: 'Příští' },
            { style: styles.dotFuture, label: 'Budoucí' },
          ].map(({ style, label }) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.legendDot, style]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          <View style={styles.timelineLine} />
          {timeline.map((entry, i) => (
            <ServiceCard key={`${entry.milestone.id}-${i}`} entry={entry} />
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#112116' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 120,
  },
  header: { marginBottom: 20 },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  progressCard: { padding: 18, marginBottom: 16 },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  progressFraction: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#19e65e',
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
  },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotDone: { backgroundColor: '#19e65e' },
  dotUpcoming: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  dotFuture: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  timeline: { position: 'relative', gap: 10 },
  timelineLine: {
    position: 'absolute',
    left: 26,
    top: 16,
    bottom: 16,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  card: { overflow: 'hidden', marginLeft: 8 },
  cardUpcoming: { borderColor: 'rgba(245,158,11,0.3)' },
  cardTop: { flexDirection: 'row', padding: 14, gap: 12 },
  timelineBar: { width: 24, alignItems: 'center', paddingTop: 2 },
  cardContent: { flex: 1, gap: 4 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#ffffff',
    flex: 1,
  },
  cardTitleFuture: { color: 'rgba(255,255,255,0.55)' },
  chip: {
    backgroundColor: 'rgba(25,230,94,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(25,230,94,0.25)',
  },
  chipTextDone: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#19e65e',
  },
  chipUpcoming: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.3)',
  },
  chipTextUpcoming: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#f59e0b',
  },
  cardDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  upcomingStats: { flexDirection: 'row', gap: 10, marginTop: 8 },
  statPill: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    alignItems: 'center',
  },
  statPillAlt: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderColor: 'rgba(59,130,246,0.2)',
  },
  statPillValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#f59e0b',
  },
  statPillLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },
  futureInfo: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
  cardItemCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  bottomSpacer: { height: 20 },
});

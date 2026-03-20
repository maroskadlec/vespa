import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';

import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVespaData } from '../../hooks/useVespaData';
import { GlassCard } from '../../components/GlassCard';
import {
  getNextServicePair,
  getServiceTimeline,
  getOverdueService,
  formatDate,
  ServiceEntry,
} from '../../utils/serviceCalc';

const { width } = Dimensions.get('window');

const VESPA_IMAGE = require('../../assets/vespa_primavera.png');

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
      >
        <View style={styles.cardTop}>
          <View style={styles.timelineBar}>
            <StatusDot status={entry.status} />
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, isFuture && styles.cardTitleFuture]}>
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
                    <Text style={[styles.statPillValue, { color: '#2563EB' }]}>
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

export default function DashboardScreen() {
  const { data, isLoading, reloadData } = useVespaData();
  const overdueAlertShown = useRef(false);

  useFocusEffect(
    useCallback(() => {
      reloadData();
    }, [])
  );

  const { nextServicePair, timeline } = useMemo(() => {
    if (!data) return { nextServicePair: null, timeline: [] };

    const commDate = new Date(data.commissioningDate);
    const completed = data.completedServices ?? {};
    const pair = getNextServicePair(commDate, data.currentKm, completed);
    const tl = getServiceTimeline(commDate, data.currentKm, completed);

    return { nextServicePair: pair, timeline: tl };
  }, [data]);

  useEffect(() => {
    if (!data || overdueAlertShown.current) return;
    const commDate = new Date(data.commissioningDate);
    const overdue = getOverdueService(
      commDate,
      data.currentKm,
      data.completedServices ?? {}
    );
    if (overdue) {
      overdueAlertShown.current = true;
      Alert.alert(
        'Čas na servis!',
        `Prohlídka „${overdue.milestone.label}" je po termínu. Chcete ji označit jako vykonanou?`,
        [
          { text: 'Později', style: 'cancel' },
          {
            text: 'Přejít na detail',
            onPress: () =>
              router.push({
                pathname: '/service/[id]',
                params: { id: overdue.milestone.id },
              }),
          },
        ]
      );
    }
  }, [data]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Načítám...</Text>
      </View>
    );
  }

  if (!data) return null;

  const commDate = new Date(data.commissioningDate);
  const today = new Date();
  const daysSince = Math.max(
    1,
    Math.round((today.getTime() - commDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  const doneCount = timeline.filter((e) => e.status === 'done').length;
  const totalCount = timeline.length;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Vespa Primavera 125, bílá, la Lulu</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.headerKmBadge}>
              <Text style={styles.headerKmValue}>
                {data.currentKm.toLocaleString('cs-CZ')}
              </Text>
              <Text style={styles.headerKmUnit}>km</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/nastaveni')}
              style={styles.gearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="settings-outline" size={22} color="#9B9B9B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Vespa Image */}
        <View style={styles.imageContainer}>
          <Image
            source={VESPA_IMAGE}
            style={styles.vespaImage}
            resizeMode="contain"
          />
        </View>

        {/* Next service countdown card */}
        {nextServicePair && (nextServicePair.nextKm || nextServicePair.nextTime) ? (
          <GlassCard style={styles.countdownCard}>
            <View style={styles.countdownHeader}>
              <View style={styles.countdownDot} />
              <Text style={styles.countdownLabel}>Příští servis za:</Text>
            </View>

            <View style={styles.countdownValues}>
              {nextServicePair.nextKm && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.countdownBlock}
                  onPress={() =>
                    router.push({
                      pathname: '/service/[id]',
                      params: { id: nextServicePair.nextKm!.entry.milestone.id },
                    })
                  }
                >
                  <View style={styles.countdownValue}>
                    <Text style={styles.countdownNumber}>
                      {nextServicePair.nextKm.kmRemaining.toLocaleString('cs-CZ')}
                    </Text>
                    <Text style={styles.countdownUnit}>km</Text>
                  </View>
                  <Text style={styles.countdownServiceName}>
                    {nextServicePair.nextKm.entry.milestone.label}
                  </Text>
                  {nextServicePair.nextKm.entry.estimatedDate && (
                    <Text style={styles.countdownDate}>
                      ~ {formatDate(nextServicePair.nextKm.entry.estimatedDate)}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {nextServicePair.nextKm && nextServicePair.nextTime && (
                <View style={styles.countdownDivider} />
              )}

              {nextServicePair.nextTime && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.countdownBlock}
                  onPress={() =>
                    router.push({
                      pathname: '/service/[id]',
                      params: { id: nextServicePair.nextTime!.entry.milestone.id },
                    })
                  }
                >
                  <View style={styles.countdownValue}>
                    <Text style={[styles.countdownNumber, { color: '#2563EB' }]}>
                      {nextServicePair.nextTime.daysRemaining}
                    </Text>
                    <Text style={[styles.countdownUnit, { color: '#2563EB' }]}>
                      dní
                    </Text>
                  </View>
                  <Text style={styles.countdownServiceName}>
                    {nextServicePair.nextTime.entry.milestone.label}
                  </Text>
                  {nextServicePair.nextTime.entry.estimatedDate && (
                    <Text style={styles.countdownDate}>
                      ~ {formatDate(nextServicePair.nextTime.entry.estimatedDate)}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </GlassCard>
        ) : (
          <GlassCard style={styles.allDoneCard}>
            <Text style={styles.allDoneText}>
              Všechny servisní prohlídky jsou aktuální
            </Text>
          </GlassCard>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statValue}>
              {data.currentKm.toLocaleString('cs-CZ')}
            </Text>
            <Text style={styles.statLabel}>Celkem km</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <Text style={styles.statValue}>{daysSince}</Text>
            <Text style={styles.statLabel}>Dní v provozu</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <Text style={styles.statValue}>
              {Math.round((data.currentKm / daysSince) * 365).toLocaleString('cs-CZ')}
            </Text>
            <Text style={styles.statLabel}>km/rok</Text>
          </GlassCard>
        </View>

        {/* Přehled prohlídek */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Přehled prohlídek</Text>
        </View>

        {/* Celkový pokrok */}
        <GlassCard style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Celkový pokrok</Text>
            <Text style={styles.progressFraction}>
              {doneCount} / {totalCount}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
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

        {/* Full timeline */}
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(24,30,37,0.4)',
    fontSize: 16,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: { flex: 1, marginRight: 12 },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#181E25',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerKmBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#F3F5F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#DCE0E3',
  },
  headerKmValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#181E25',
  },
  headerKmUnit: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(24,30,37,0.4)',
    marginLeft: 3,
  },
  gearButton: { padding: 2 },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 8,
    height: 200,
    justifyContent: 'center',
  },
  vespaImage: {
    width: width - 32,
    height: 195,
  },
  countdownCard: { marginBottom: 16, padding: 20 },
  countdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  countdownDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#181E25',
  },
  countdownLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: 'rgba(24,30,37,0.4)',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  countdownValues: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  countdownBlock: { flex: 1, gap: 3 },
  countdownDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginHorizontal: 16,
    alignSelf: 'stretch',
    marginTop: 4,
  },
  countdownValue: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  countdownNumber: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    color: '#ff9500',
    lineHeight: 36,
  },
  countdownUnit: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#ff9500',
    paddingBottom: 4,
  },
  countdownServiceName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#181E25',
    marginTop: 2,
  },
  countdownDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(24,30,37,0.4)',
  },
  allDoneCard: { padding: 20, marginBottom: 16, alignItems: 'center' },
  allDoneText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#34C759',
    textAlign: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, padding: 14, alignItems: 'center' },
  statValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#181E25',
    marginBottom: 3,
  },
  statLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: 'rgba(24,30,37,0.4)',
    textAlign: 'center',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  sectionHeader: { marginBottom: 14 },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#181E25',
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
    color: 'rgba(24,30,37,0.65)',
  },
  progressFraction: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#181E25',
  },
  progressTrack: {
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', borderRadius: 10, backgroundColor: '#ffae5d' },
  progressHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(24,30,37,0.4)',
  },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(24,30,37,0.4)',
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotDone: { backgroundColor: '#34C759' },
  dotUpcoming: { backgroundColor: '#ff9500' },
  dotFuture: {
    backgroundColor: 'rgba(24,30,37,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(24,30,37,0.2)',
  },
  timeline: { position: 'relative', gap: 10 },
  timelineLine: {
    position: 'absolute',
    left: 26,
    top: 16,
    bottom: 16,
    width: 1,
    backgroundColor: '#DCE0E3',
  },
  card: { overflow: 'hidden', marginLeft: 8 },
  cardUpcoming: {
    borderColor: 'rgba(255,149,0,0.25)',
    borderLeftWidth: 3,
    borderLeftColor: '#ff9500',
  },
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
    color: '#181E25',
    flex: 1,
  },
  cardTitleFuture: { color: 'rgba(24,30,37,0.4)' },
  chip: {
    backgroundColor: 'rgba(52,199,89,0.12)',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.35)',
  },
  chipTextDone: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#181E25',
  },
  chipUpcoming: {
    backgroundColor: 'rgba(255,149,0,0.12)',
    borderColor: 'rgba(255,149,0,0.3)',
  },
  chipTextUpcoming: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#7a4500',
  },
  cardDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(24,30,37,0.4)',
  },
  upcomingStats: { flexDirection: 'row', gap: 10, marginTop: 8 },
  statPill: {
    backgroundColor: 'rgba(255,149,0,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.15)',
    alignItems: 'center',
  },
  statPillAlt: {
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderColor: 'rgba(37,99,235,0.15)',
  },
  statPillValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#ff9500',
  },
  statPillLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: 'rgba(24,30,37,0.4)',
    marginTop: 1,
  },
  futureInfo: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(24,30,37,0.4)',
  },
  cardItemCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(24,30,37,0.4)',
    marginTop: 2,
  },
  bottomSpacer: { height: 20 },
});

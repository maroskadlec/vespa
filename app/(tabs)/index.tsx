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
import { LinearGradient } from 'expo-linear-gradient';
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

const VESPA_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCQemEbJdJdCApk_FGdCEsd1DliRHKJPnOzaEZzncEPZLzCRxGmn9kSYvrBYp0UTMjvnUP3ILEjqeOWWR9LJ7sYXgsvQcqNnvF3u5KW-RoxD5NYPDvu09D5oWCWXZrVXfUZb-u2IPdJuXEl0CR3SJkfI5dKYH-D5iproyZEaqxj4E1ClYS41rJS1aQMF0se8kLZMBn9zO_1Y_qSS9AFnGcbb1mZhhVry096qx7Ic23uoE6nunaEBCI7F1dN4yYnmpuK_-nmYd47IxMa';

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
      <LinearGradient colors={['#0d1f13', '#112116']} style={styles.loading}>
        <Text style={styles.loadingText}>Načítám...</Text>
      </LinearGradient>
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
      <LinearGradient
        colors={['#0a1f0f', '#112116', '#0d2414']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowTop} />

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
              <Ionicons name="settings-outline" size={22} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Vespa Image */}
        <View style={styles.imageContainer}>
          <View style={styles.imageGlow} />
          <Image
            source={{ uri: VESPA_IMAGE_URL }}
            style={styles.vespaImage}
            resizeMode="contain"
          />
        </View>

        {/* Next service countdown card */}
        {nextServicePair && (nextServicePair.nextKm || nextServicePair.nextTime) ? (
          <GlassCard style={styles.countdownCard} intensity={50} dark>
            <LinearGradient
              colors={['rgba(25,230,94,0.15)', 'rgba(25,230,94,0.04)']}
              style={StyleSheet.absoluteFill}
            />
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
                    <Text style={[styles.countdownNumber, { color: '#60a5fa' }]}>
                      {nextServicePair.nextTime.daysRemaining}
                    </Text>
                    <Text style={[styles.countdownUnit, { color: 'rgba(96,165,250,0.7)' }]}>
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
          <GlassCard style={styles.allDoneCard} intensity={40} dark>
            <Text style={styles.allDoneText}>
              Všechny servisní prohlídky jsou aktuální
            </Text>
          </GlassCard>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard} intensity={35} dark>
            <Text style={styles.statValue}>
              {data.currentKm.toLocaleString('cs-CZ')}
            </Text>
            <Text style={styles.statLabel}>Celkem km</Text>
          </GlassCard>

          <GlassCard style={styles.statCard} intensity={35} dark>
            <Text style={styles.statValue}>{daysSince}</Text>
            <Text style={styles.statLabel}>Dní v provozu</Text>
          </GlassCard>

          <GlassCard style={styles.statCard} intensity={35} dark>
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
  container: { flex: 1, backgroundColor: '#112116' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  glowTop: {
    position: 'absolute',
    top: -100,
    left: width / 2 - 150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(25, 230, 94, 0.08)',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 40,
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
    fontSize: 22,
    color: '#ffffff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerKmBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(25,230,94,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(25,230,94,0.25)',
  },
  headerKmValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#19e65e',
  },
  headerKmUnit: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(25,230,94,0.7)',
    marginLeft: 3,
  },
  gearButton: {
    padding: 2,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 8,
    height: 220,
    justifyContent: 'center',
  },
  imageGlow: {
    position: 'absolute',
    width: width * 0.85,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(25, 230, 94, 0.08)',
    bottom: 0,
  },
  vespaImage: {
    width: width - 32,
    height: 210,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#19e65e',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 24,
        }
      : {}),
  },
  countdownCard: { marginBottom: 16, padding: 20, overflow: 'hidden' },
  countdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  countdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#19e65e',
  },
  countdownLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  countdownValues: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 0,
  },
  countdownBlock: {
    flex: 1,
    gap: 4,
  },
  countdownDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
    marginTop: 4,
    alignSelf: 'stretch',
  },
  countdownValue: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  countdownNumber: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    color: '#19e65e',
    lineHeight: 36,
  },
  countdownUnit: {
    fontFamily: 'Inter_500Medium',
    fontSize: 18,
    color: 'rgba(25,230,94,0.7)',
    paddingBottom: 6,
  },
  countdownServiceName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#ffffff',
  },
  countdownDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  allDoneCard: { padding: 20, marginBottom: 16, alignItems: 'center' },
  allDoneText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#19e65e',
    textAlign: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, padding: 14, alignItems: 'center' },
  statValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 3,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#ffffff',
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
  legend: { flexDirection: 'row', gap: 16, marginBottom: 16 },
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

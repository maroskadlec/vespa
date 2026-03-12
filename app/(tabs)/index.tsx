import React, { useMemo, useEffect, useRef } from 'react';
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
import { router } from 'expo-router';
import { useVespaData } from '../../hooks/useVespaData';
import { GlassCard } from '../../components/GlassCard';
import {
  getNextService,
  getServiceTimeline,
  getOverdueService,
  formatDate,
} from '../../utils/serviceCalc';

const { width } = Dimensions.get('window');

const VESPA_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCQemEbJdJdCApk_FGdCEsd1DliRHKJPnOzaEZzncEPZLzCRxGmn9kSYvrBYp0UTMjvnUP3ILEjqeOWWR9LJ7sYXgsvQcqNnvF3u5KW-RoxD5NYPDvu09D5oWCWXZrVXfUZb-u2IPdJuXEl0CR3SJkfI5dKYH-D5iproyZEaqxj4E1ClYS41rJS1aQMF0se8kLZMBn9zO_1Y_qSS9AFnGcbb1mZhhVry096qx7Ic23uoE6nunaEBCI7F1dN4yYnmpuK_-nmYd47IxMa';

export default function DashboardScreen() {
  const { data, isLoading, markServiceDone } = useVespaData();
  const overdueAlertShown = useRef(false);

  const { nextService, dashboardTimeline, timeline } = useMemo(() => {
    if (!data) return { nextService: null, dashboardTimeline: [], timeline: [] };

    const commDate = new Date(data.commissioningDate);
    const completed = data.completedServices ?? {};
    const ns = getNextService(commDate, data.currentKm, completed);
    const tl = getServiceTimeline(commDate, data.currentKm, completed);

    // Dashboard shows: last 2 done + 1 upcoming
    const done = tl.filter((e) => e.status === 'done').slice(-2);
    const upcoming = tl.filter((e) => e.status === 'upcoming').slice(0, 1);
    const dash = [...done, ...upcoming];

    return { nextService: ns, dashboardTimeline: dash, timeline: tl };
  }, [data]);

  // Check overdue on mount (once)
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
            <Text style={styles.headerTitle}>Vespa Primavera, la Lulu</Text>
          </View>
          <View style={styles.headerKmBadge}>
            <Text style={styles.headerKmValue}>
              {data.currentKm.toLocaleString('cs-CZ')}
            </Text>
            <Text style={styles.headerKmUnit}>km</Text>
          </View>
        </View>

        {/* DOMINANT Vespa Image */}
        <View style={styles.imageContainer}>
          <View style={styles.imageGlow} />
          <Image
            source={{ uri: VESPA_IMAGE_URL }}
            style={styles.vespaImage}
            resizeMode="contain"
          />
        </View>

        {/* Next service countdown card */}
        {nextService ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              router.push({
                pathname: '/service/[id]',
                params: { id: nextService.entry.milestone.id },
              })
            }
          >
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
                {nextService.kmRemaining !== null && nextService.kmRemaining > 0 && (
                  <View style={styles.countdownValue}>
                    <Text style={styles.countdownNumber}>
                      {nextService.kmRemaining.toLocaleString('cs-CZ')}
                    </Text>
                    <Text style={styles.countdownUnit}>km</Text>
                  </View>
                )}
                {nextService.kmRemaining !== null &&
                  nextService.kmRemaining > 0 &&
                  nextService.daysRemaining !== null && (
                    <View style={styles.countdownSeparator}>
                      <Text style={styles.countdownOr}>nebo</Text>
                    </View>
                  )}
                {nextService.daysRemaining !== null && (
                  <View style={styles.countdownValue}>
                    <Text style={styles.countdownNumber}>
                      {nextService.daysRemaining}
                    </Text>
                    <Text style={[styles.countdownUnit, { color: 'rgba(25,230,94,0.7)' }]}>
                      dní
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.countdownFooter}>
                <Text style={styles.countdownServiceName}>
                  {nextService.serviceLabel}
                </Text>
                {nextService.entry.estimatedDate && (
                  <Text style={styles.countdownDate}>
                    ~ {formatDate(nextService.entry.estimatedDate)}
                  </Text>
                )}
              </View>
            </GlassCard>
          </TouchableOpacity>
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

        {/* Přehled prohlídek – 2 poslední hotové + 1 příští */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Přehled prohlídek</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/servis')}>
            <Text style={styles.sectionLink}>Vše →</Text>
          </TouchableOpacity>
        </View>

        {dashboardTimeline.map((entry) => (
          <TouchableOpacity
            key={entry.milestone.id}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: '/service/[id]',
                params: { id: entry.milestone.id },
              })
            }
          >
            <GlassCard style={styles.timelineCard} intensity={30} dark>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineDot,
                    entry.status === 'done' && styles.timelineDotDone,
                    entry.status === 'upcoming' && styles.timelineDotUpcoming,
                  ]}
                />
                <View style={styles.timelineText}>
                  <Text style={styles.timelineLabel}>{entry.milestone.label}</Text>
                  {entry.estimatedDate && (
                    <Text style={styles.timelineDate}>
                      {formatDate(entry.estimatedDate)}
                    </Text>
                  )}
                </View>
              </View>
              <View>
                {entry.status === 'done' && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeTextDone}>Hotovo</Text>
                  </View>
                )}
                {entry.status === 'upcoming' && (
                  <View style={[styles.badge, styles.badgeUpcoming]}>
                    <Text style={styles.badgeTextUpcoming}>Příští</Text>
                  </View>
                )}
              </View>
            </GlassCard>
          </TouchableOpacity>
        ))}

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
    paddingBottom: 120,
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
    alignItems: 'flex-end',
    gap: 16,
    marginBottom: 16,
  },
  countdownValue: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  countdownNumber: {
    fontFamily: 'Inter_700Bold',
    fontSize: 52,
    color: '#19e65e',
    lineHeight: 56,
  },
  countdownUnit: {
    fontFamily: 'Inter_500Medium',
    fontSize: 18,
    color: 'rgba(25,230,94,0.7)',
    paddingBottom: 8,
  },
  countdownSeparator: { paddingBottom: 14 },
  countdownOr: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
  },
  countdownFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
    gap: 3,
  },
  countdownServiceName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
  sectionLink: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#19e65e',
  },
  timelineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 8,
  },
  timelineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineDotDone: { backgroundColor: '#19e65e' },
  timelineDotUpcoming: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  timelineText: { flex: 1 },
  timelineLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 2,
  },
  timelineDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
  },
  badge: {
    backgroundColor: 'rgba(25,230,94,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(25,230,94,0.2)',
  },
  badgeTextDone: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#19e65e',
  },
  badgeUpcoming: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.3)',
  },
  badgeTextUpcoming: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#f59e0b',
  },
  bottomSpacer: { height: 20 },
});

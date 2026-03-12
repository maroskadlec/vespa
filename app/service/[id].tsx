import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useVespaData } from '../../hooks/useVespaData';
import { GlassCard } from '../../components/GlassCard';
import { getServiceTimeline, formatDate } from '../../utils/serviceCalc';
import { maintenanceSchedule } from '../../data/maintenanceSchedule';

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, markServiceDone } = useVespaData();

  // Strip occurrence suffix for time-based IDs (e.g., "months_12_occ2" → "months_12")
  const baseId = id?.replace(/_occ\d+$/, '') ?? '';

  const milestone = useMemo(() => {
    return maintenanceSchedule.find((m) => m.id === id || m.id === baseId) ?? null;
  }, [id, baseId]);

  const entry = useMemo(() => {
    if (!data || !milestone) return null;
    const timeline = getServiceTimeline(
      new Date(data.commissioningDate),
      data.currentKm,
      data.completedServices ?? {}
    );
    return (
      timeline.find((e) => e.milestone.id === id || e.milestone.id === baseId) ?? null
    );
  }, [data, milestone, id, baseId]);

  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const allChecked =
    milestone !== null && checkedItems.size === milestone.items.length;

  const toggleItem = (index: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (!milestone) return;
    if (allChecked) {
      setCheckedItems(new Set());
    } else {
      setCheckedItems(new Set(milestone.items.map((_, i) => i)));
    }
  };

  const handleMarkDone = async () => {
    if (!id) return;
    Alert.alert(
      'Označit jako vykonáno',
      'Prohlídka bude uložena jako dokončená s aktuálním datem a počtem km.',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Potvrdit',
          onPress: async () => {
            setSaving(true);
            try {
              await markServiceDone(id);
              Alert.alert('Hotovo!', 'Servisní prohlídka byla úspěšně zaznamenána.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch {
              Alert.alert('Chyba', 'Nepodařilo se uložit prohlídku.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const progress = milestone ? checkedItems.size / milestone.items.length : 0;

  if (!milestone) {
    return (
      <View style={styles.errorContainer}>
        <LinearGradient colors={['#0a1f0f', '#112116']} style={StyleSheet.absoluteFill} />
        <Text style={styles.errorText}>Prohlídka nenalezena</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Zpět</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isDone = entry?.status === 'done';
  const isUpcoming = entry?.status === 'upcoming';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a1f0f', '#112116', '#0d2414']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.headerDecor} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}
        >
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Zpět</Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.titleArea}>
          <Text style={styles.titleSub}>Detail prohlídky</Text>
          <Text style={styles.title}>{milestone.label}</Text>
          <View style={styles.badges}>
            {isDone && (
              <View style={[styles.badge, styles.badgeDone]}>
                <Text style={styles.badgeTextDone}>✓ Dokončeno</Text>
              </View>
            )}
            {isUpcoming && (
              <View style={[styles.badge, styles.badgeUpcoming]}>
                <Text style={styles.badgeTextUpcoming}>Příští prohlídka</Text>
              </View>
            )}
            {entry?.status === 'future' && (
              <View style={[styles.badge, styles.badgeFuture]}>
                <Text style={styles.badgeTextFuture}>Plánováno</Text>
              </View>
            )}
          </View>
        </View>

        {/* Info card */}
        {entry && (
          <GlassCard style={styles.infoCard} intensity={40} dark>
            {isUpcoming && (
              <LinearGradient
                colors={['rgba(245,158,11,0.12)', 'transparent']}
                style={StyleSheet.absoluteFill}
              />
            )}
            {isDone && (
              <LinearGradient
                colors={['rgba(25,230,94,0.1)', 'transparent']}
                style={StyleSheet.absoluteFill}
              />
            )}
            <View style={styles.infoRow}>
              {milestone.kmThreshold > 0 && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoValue}>
                    {milestone.kmThreshold.toLocaleString('cs-CZ')} km
                  </Text>
                  <Text style={styles.infoLabel}>Při kilometrech</Text>
                </View>
              )}
              {milestone.monthsThreshold > 0 && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoValue}>{milestone.monthsThreshold} měs.</Text>
                  <Text style={styles.infoLabel}>Interval</Text>
                </View>
              )}
              {entry.estimatedDate && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoValue}>
                    {formatDate(entry.estimatedDate)}
                  </Text>
                  <Text style={styles.infoLabel}>
                    {isDone ? 'Datum provedení' : 'Odhadovaný termín'}
                  </Text>
                </View>
              )}
              {!isDone && entry.kmRemaining !== null && entry.kmRemaining > 0 && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoValue, styles.infoValueHighlight]}>
                    {entry.kmRemaining.toLocaleString('cs-CZ')} km
                  </Text>
                  <Text style={styles.infoLabel}>Zbývá km</Text>
                </View>
              )}
              {!isDone && entry.daysRemaining !== null && (
                <View style={styles.infoItem}>
                  <Text style={[styles.infoValue, styles.infoValueHighlight]}>
                    {entry.daysRemaining} dní
                  </Text>
                  <Text style={styles.infoLabel}>Zbývá dní</Text>
                </View>
              )}
            </View>
          </GlassCard>
        )}

        {/* Progress */}
        <GlassCard style={styles.progressCard} intensity={35} dark>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Průběh kontroly</Text>
            <Text style={styles.progressCount}>
              {checkedItems.size} / {milestone.items.length}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={['#19e65e', '#14c752']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
          {allChecked && (
            <Text style={styles.progressDone}>Všechny úkony zkontrolovány!</Text>
          )}
        </GlassCard>

        {/* Checklist header + Označit vše */}
        <View style={styles.checklistHeaderRow}>
          <Text style={styles.checklistHeader}>
            Servisní úkony ({milestone.items.length})
          </Text>
          <TouchableOpacity onPress={toggleAll} style={styles.selectAllBtn}>
            <Text style={styles.selectAllText}>
              {allChecked ? 'Zrušit vše' : 'Označit vše'}
            </Text>
          </TouchableOpacity>
        </View>

        <GlassCard style={styles.checklistCard} intensity={35} dark>
          {milestone.items.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => toggleItem(index)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.checklistRow,
                  index > 0 && styles.checklistRowBorder,
                  checkedItems.has(index) && styles.checklistRowChecked,
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    checkedItems.has(index) && styles.checkboxChecked,
                  ]}
                >
                  {checkedItems.has(index) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <View style={styles.checklistContent}>
                  <Text
                    style={[
                      styles.checklistName,
                      checkedItems.has(index) && styles.checklistNameDone,
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.checklistAction,
                      getActionStyle(item.action),
                      checkedItems.has(index) && styles.checklistActionDone,
                    ]}
                  >
                    {item.actionLabel}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </GlassCard>

        {/* Mark as done button – only when not already done */}
        {!isDone && (
          <TouchableOpacity
            style={[styles.doneButton, saving && styles.doneButtonDisabled]}
            onPress={handleMarkDone}
            activeOpacity={0.85}
            disabled={saving}
          >
            <LinearGradient
              colors={['#23f46e', '#19e65e', '#14c752']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.doneGradient}
            >
              <Text style={styles.doneButtonText}>
                {saving ? 'Ukládám...' : 'Servisní prohlídka byla vykonána'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

function getActionStyle(action: string): object {
  const map: Record<string, object> = {
    I: { color: '#60a5fa' },
    R: { color: '#f87171' },
    A: { color: '#fbbf24' },
    L: { color: '#34d399' },
    C: { color: '#a78bfa' },
  };
  return map[action] ?? {};
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#112116' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: {
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    marginBottom: 16,
  },
  backBtn: { padding: 12 },
  backBtnText: { fontFamily: 'Inter_500Medium', color: '#19e65e', fontSize: 15 },
  headerDecor: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(25,230,94,0.06)',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 60,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backArrow: { fontFamily: 'Inter_400Regular', fontSize: 18, color: '#19e65e' },
  backText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#19e65e' },
  titleArea: { marginBottom: 16 },
  titleSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 30,
    color: '#ffffff',
    marginBottom: 12,
  },
  badges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  badgeDone: {
    backgroundColor: 'rgba(25,230,94,0.12)',
    borderColor: 'rgba(25,230,94,0.25)',
  },
  badgeTextDone: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#19e65e' },
  badgeUpcoming: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.3)',
  },
  badgeTextUpcoming: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#f59e0b' },
  badgeFuture: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  badgeTextFuture: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  infoCard: { marginBottom: 14, padding: 16, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  infoItem: { minWidth: 80 },
  infoValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 2,
  },
  infoValueHighlight: { color: '#f59e0b' },
  infoLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  progressCard: { padding: 16, marginBottom: 20 },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
  },
  progressCount: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#19e65e' },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressDone: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#19e65e',
    marginTop: 4,
  },
  checklistHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  checklistHeader: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
  },
  selectAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(25,230,94,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(25,230,94,0.2)',
  },
  selectAllText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#19e65e',
  },
  checklistCard: { overflow: 'hidden', marginBottom: 20 },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  checklistRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  checklistRowChecked: { backgroundColor: 'rgba(25,230,94,0.04)' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#19e65e', borderColor: '#19e65e' },
  checkmark: { fontSize: 13, color: '#0d1f13', fontFamily: 'Inter_700Bold' },
  checklistContent: { flex: 1 },
  checklistName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 2,
  },
  checklistNameDone: {
    color: 'rgba(255,255,255,0.4)',
    textDecorationLine: 'line-through',
  },
  checklistAction: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  checklistActionDone: { opacity: 0.4 },
  doneButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#19e65e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  doneButtonDisabled: { opacity: 0.6 },
  doneGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  doneButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#0d1f13',
  },
  bottomSpacer: { height: 40 },
});

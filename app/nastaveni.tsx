import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { useVespaData } from '../hooks/useVespaData';
import { GlassCard } from '../components/GlassCard';
import { getOverdueService } from '../utils/serviceCalc';

function parseDate(str: string): Date | null {
  const parts = str.split('.');
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      const date = new Date(y, m, d);
      if (
        date.getFullYear() === y &&
        date.getMonth() === m &&
        date.getDate() === d
      ) {
        return date;
      }
    }
  }
  return null;
}

function formatDateToCzech(isoString: string): string {
  const date = new Date(isoString);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

export default function NastaveniScreen() {
  const { data, saveData, clearData } = useVespaData();

  const [dateText, setDateText] = useState('');
  const [kmText, setKmText] = useState('');
  const [dateError, setDateError] = useState('');
  const [kmError, setKmError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setDateText(formatDateToCzech(data.commissioningDate));
      setKmText(String(data.currentKm));
    }
  }, [data]);

  function formatDateInput(text: string): string {
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`;
  }

  const handleDateChange = (text: string) => {
    const formatted = formatDateInput(text);
    setDateText(formatted);
    setDateError('');
    setSaved(false);
  };

  const handleKmChange = (text: string) => {
    setKmText(text.replace(/\D/g, ''));
    setKmError('');
    setSaved(false);
  };

  const handleSave = async () => {
    let valid = true;

    const date = parseDate(dateText);
    if (!date || date > new Date()) {
      setDateError('Zadejte platné datum ve formátu DD.MM.YYYY');
      valid = false;
    }

    const km = parseInt(kmText, 10);
    if (isNaN(km) || km < 0) {
      setKmError('Zadejte platný počet kilometrů');
      valid = false;
    }

    if (!valid) return;

    try {
      await saveData({
        commissioningDate: date!.toISOString(),
        currentKm: km,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      const overdue = getOverdueService(
        date!,
        km,
        data?.completedServices ?? {}
      );
      if (overdue) {
        Alert.alert(
          'Čas na servis!',
          `Na základě aktuálního stavu km je prohlídka „${overdue.milestone.label}" po termínu. Chcete ji zaznamenat?`,
          [
            { text: 'Později', style: 'cancel' },
            {
              text: 'Přejít na detail',
              onPress: () => router.push({
                pathname: '/service/[id]',
                params: { id: overdue.milestone.id },
              }),
            },
          ]
        );
      }
    } catch {
      Alert.alert('Chyba', 'Nepodařilo se uložit nastavení.');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Resetovat aplikaci',
      'Opravdu chcete smazat všechna data? Tato akce je nevratná.',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Smazat',
          style: 'destructive',
          onPress: async () => {
            await clearData();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a1f0f', '#112116', '#0d2414']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
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

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nastavení</Text>
        </View>

        {/* Vehicle section */}
        <Text style={styles.sectionLabel}>Údaje o vozidle</Text>
        <GlassCard style={styles.settingsCard} intensity={40} dark>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Datum uvedení do provozu</Text>
            <View
              style={[
                styles.inputWrapper,
                dateError ? styles.inputError : null,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="DD.MM.YYYY"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={dateText}
                onChangeText={handleDateChange}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
            {dateError ? <Text style={styles.errorText}>{dateError}</Text> : null}
          </View>

          <View style={[styles.fieldGroup, styles.fieldGroupLast]}>
            <Text style={styles.label}>Aktuální stav kilometrů</Text>
            <View
              style={[
                styles.inputWrapper,
                kmError ? styles.inputError : null,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={kmText}
                onChangeText={handleKmChange}
                keyboardType="numeric"
              />
              <Text style={styles.inputSuffix}>km</Text>
            </View>
            {kmError ? <Text style={styles.errorText}>{kmError}</Text> : null}
          </View>
        </GlassCard>

        {/* Save button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={saved ? ['#14c752', '#0fa840'] : ['#23f46e', '#19e65e', '#14c752']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            <Text style={styles.saveButtonText}>
              {saved ? '✓ Uloženo' : 'Uložit změny'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* App info section */}
        <Text style={styles.sectionLabel}>Informace o aplikaci</Text>
        <GlassCard style={styles.infoCard} intensity={35} dark>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Verze aplikace</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Model</Text>
            <Text style={styles.infoValue}>Vespa Primavera 125</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Servisní příručka</Text>
            <Text style={styles.infoValue}>2014–2024</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Výrobce</Text>
            <Text style={styles.infoValue}>Piaggio & C. SpA</Text>
          </View>
        </GlassCard>

        {/* Danger zone */}
        <Text style={styles.sectionLabel}>Pokročilé</Text>
        <GlassCard style={styles.dangerCard} intensity={35} dark>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleReset}
            activeOpacity={0.8}
          >
            <View style={styles.dangerContent}>
              <Text style={styles.dangerTitle}>Resetovat aplikaci</Text>
              <Text style={styles.dangerSubtitle}>
                Smazat všechna data a začít znovu
              </Text>
            </View>
            <Text style={styles.dangerArrow}>→</Text>
          </TouchableOpacity>
        </GlassCard>

        <Text style={styles.footer}>
          Vespa Tracker • Vytvořeno s láskou ke skútrům
        </Text>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#112116' },
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
  header: {
    marginBottom: 28,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#ffffff',
  },
  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  settingsCard: { padding: 18, marginBottom: 14 },
  fieldGroup: { marginBottom: 16 },
  fieldGroupLast: { marginBottom: 0 },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    height: 48,
  },
  inputError: { borderColor: 'rgba(239,68,68,0.5)' },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#ffffff',
    padding: 0,
  },
  inputSuffix: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 28,
    shadowColor: '#19e65e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  saveGradient: { paddingVertical: 15, alignItems: 'center' },
  saveButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#0d1f13',
  },
  infoCard: { marginBottom: 28, overflow: 'hidden' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  infoRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  infoLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
  },
  infoValue: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#ffffff',
  },
  dangerCard: { marginBottom: 32, overflow: 'hidden' },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  dangerContent: { flex: 1 },
  dangerTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#ef4444',
    marginBottom: 2,
  },
  dangerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
  },
  dangerArrow: { fontSize: 16, color: 'rgba(239,68,68,0.5)' },
  footer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    marginTop: 8,
  },
  bottomSpacer: { height: 20 },
});

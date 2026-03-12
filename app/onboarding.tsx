import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useVespaData } from '../hooks/useVespaData';

const { width, height } = Dimensions.get('window');

function parseDate(str: string): Date | null {
  // Accept DD.MM.YYYY or YYYY-MM-DD
  const parts = str.split('.');
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      const date = new Date(y, m, d);
      if (date.getFullYear() === y && date.getMonth() === m && date.getDate() === d) {
        return date;
      }
    }
  }
  return null;
}

export default function OnboardingScreen() {
  const { saveData } = useVespaData();
  const [dateText, setDateText] = useState('');
  const [kmText, setKmText] = useState('');
  const [dateError, setDateError] = useState('');
  const [kmError, setKmError] = useState('');
  const [saving, setSaving] = useState(false);

  function formatDateInput(text: string): string {
    // Auto-insert dots
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`;
  }

  const handleDateChange = (text: string) => {
    const formatted = formatDateInput(text);
    setDateText(formatted);
    setDateError('');
  };

  const handleKmChange = (text: string) => {
    setKmText(text.replace(/\D/g, ''));
    setKmError('');
  };

  const handleSubmit = async () => {
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
      setSaving(true);
      await saveData({
        commissioningDate: date!.toISOString(),
        currentKm: km,
      });
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Chyba', 'Nepodařilo se uložit data. Zkuste to znovu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0d1f13', '#112116', '#0a2910', '#112116']}
      locations={[0, 0.3, 0.6, 1]}
      style={styles.gradient}
    >
      {/* Decorative blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <View style={styles.blob3} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo / Icon area */}
          <View style={styles.logoArea}>
            <View style={styles.logoRing}>
              <View style={styles.logoDot} />
            </View>
          </View>

          {/* Heading */}
          <Text style={styles.title}>Vítejte u vašeho{'\n'}Vespa Trackeru</Text>
          <Text style={styles.subtitle}>
            Nastavte základní údaje pro přesný plán údržby
          </Text>

          {/* Form card */}
          <View style={styles.formCard}>
            {/* Date field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Datum uvedení do provozu</Text>
              <View style={[styles.inputWrapper, dateError ? styles.inputError : null]}>
                <TextInput
                  style={styles.input}
                  placeholder="DD.MM.YYYY"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={dateText}
                  onChangeText={handleDateChange}
                  keyboardType="numeric"
                  maxLength={10}
                  returnKeyType="next"
                />
              </View>
              {dateError ? <Text style={styles.errorText}>{dateError}</Text> : null}
            </View>

            {/* KM field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Aktuální stav kilometrů</Text>
              <View style={[styles.inputWrapper, kmError ? styles.inputError : null]}>
                <TextInput
                  style={styles.input}
                  placeholder="napr. 3500"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={kmText}
                  onChangeText={handleKmChange}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <Text style={styles.inputSuffix}>km</Text>
              </View>
              {kmError ? <Text style={styles.errorText}>{kmError}</Text> : null}
            </View>

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={saving}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#23f46e', '#19e65e', '#14c752']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {saving ? 'Ukládám...' : 'Začít sledovat'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Bottom hint */}
          <Text style={styles.hint}>
            Tato data se ukládají pouze ve vašem zařízení
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  blob1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(25, 230, 94, 0.12)',
  },
  blob2: {
    position: 'absolute',
    top: height * 0.3,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(25, 230, 94, 0.07)',
  },
  blob3: {
    position: 'absolute',
    bottom: 60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(25, 230, 94, 0.09)',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 60,
    alignItems: 'center',
  },
  logoArea: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logoRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(25, 230, 94, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(25, 230, 94, 0.08)',
  },
  logoDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#19e65e',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 30,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  formCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 24,
    gap: 0,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    height: 52,
  },
  inputError: {
    borderColor: 'rgba(239,68,68,0.6)',
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#ffffff',
    padding: 0,
  },
  inputSuffix: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginLeft: 8,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#ef4444',
    marginTop: 5,
  },
  button: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#19e65e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#0d1f13',
  },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: 24,
  },
});

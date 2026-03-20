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
} from 'react-native';
import { router } from 'expo-router';
import { useVespaData } from '../hooks/useVespaData';

function parseDate(str: string): Date | null {
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
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
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
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Datum uvedení do provozu</Text>
              <View style={[styles.inputWrapper, dateError ? styles.inputError : null]}>
                <TextInput
                  style={styles.input}
                  placeholder="DD.MM.YYYY"
                  placeholderTextColor="#BBBBBB"
                  value={dateText}
                  onChangeText={handleDateChange}
                  keyboardType="numeric"
                  maxLength={10}
                  returnKeyType="next"
                />
              </View>
              {dateError ? <Text style={styles.errorText}>{dateError}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Aktuální stav kilometrů</Text>
              <View style={[styles.inputWrapper, kmError ? styles.inputError : null]}>
                <TextInput
                  style={styles.input}
                  placeholder="např. 3500"
                  placeholderTextColor="#BBBBBB"
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

            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {saving ? 'Ukládám...' : 'Začít sledovat'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            Tato data se ukládají pouze ve vašem zařízení
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
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
    borderColor: 'rgba(52,199,89,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52,199,89,0.1)',
  },
  logoDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#34C759',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 30,
    color: '#181E25',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 12,
    letterSpacing: -0.03 * 30,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(24,30,37,0.65)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  formCard: {
    width: '100%',
    backgroundColor: '#F3F5F7',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#DCE0E3',
    padding: 24,
  },
  fieldGroup: { marginBottom: 20 },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(24,30,37,0.65)',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE0E3',
    paddingHorizontal: 16,
    height: 52,
  },
  inputError: { borderColor: 'rgba(255,59,48,0.5)' },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#181E25',
    padding: 0,
  },
  inputSuffix: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(24,30,37,0.4)',
    marginLeft: 8,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#ff3b30',
    marginTop: 5,
  },
  button: {
    borderRadius: 14,
    backgroundColor: '#1C2129',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: -0.01 * 16,
  },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(24,30,37,0.4)',
    textAlign: 'center',
    marginTop: 24,
  },
});

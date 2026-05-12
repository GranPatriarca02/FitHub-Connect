import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { API_URL } from '../api';
import AppLayout, { theme } from './AppLayout';

const SPECIALTIES = [
  'Musculación', 'Crossfit', 'Yoga', 'Pilates', 
  'Nutrición', 'Funcional', 'HIIT', 'Fisioterapia', 'Calistenia'
];

export default function TrainerProfileScreen({ navigation }) {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [userId, setUserId] = useState(null);

  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');

  useFocusEffect(
    useCallback(() => {
      const cargarPerfil = async () => {
        setCargando(true);
        try {
          const uid = await AsyncStorage.getItem('userId');
          setUserId(uid);

          const res = await fetch(`${API_URL}/monitors/me`, {
            headers: { 'X-User-Id': uid },
          });

          if (res.ok) {
            const data = await res.json();
            setSpecialty(data.specialty || '');
            setBio(data.bio || '');
            setHourlyRate(data.hourlyRate ? data.hourlyRate.toString() : '0.0');
          }
        } catch (e) {
          console.error("Error cargando perfil", e);
        } finally {
          setCargando(false);
        }
      };

      cargarPerfil();
    }, [])
  );

  const handleGuardar = async () => {
    if (!specialty.trim() || !hourlyRate.trim()) {
      Alert.alert('Campos requeridos', 'La especialidad y tarifa por hora son obligatorias.');
      return;
    }
    
    const rateNumber = parseFloat(hourlyRate);
    if (isNaN(rateNumber) || rateNumber < 0) {
      Alert.alert('Tarifa inválida', 'Por favor introduce un precio por hora válido.');
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/monitors/me/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({
          specialty: specialty.trim(),
          bio: bio.trim(),
          hourlyRate: rateNumber
        }),
      });

      if (!res.ok) throw new Error('Ocurrió un error al guardar el perfil.');
      
      Alert.alert('¡Éxito!', 'Tu perfil profesional se ha actualizado correctamente.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  };

  const incrementRate = () => {
    const current = parseFloat(hourlyRate) || 0;
    setHourlyRate((current + 1).toFixed(1));
  };

  const decrementRate = () => {
    const current = parseFloat(hourlyRate) || 0;
    if (current >= 1) {
      setHourlyRate((current - 1).toFixed(1));
    } else {
      setHourlyRate('0.0');
    }
  };

  if (cargando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.brand} />
      </View>
    );
  }

  return (
    <AppLayout title="Perfil Profesional" navigation={navigation} showBackButton={true}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <MaterialCommunityIcons name="badge-account-horizontal" size={26} color={theme.textBrand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Información Pública</Text>
            <Text style={styles.infoDesc}>Configura los detalles que verán los usuarios cuando busquen un entrenador.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Especialidad Principal *</Text>
          <View style={styles.chipsContainer}>
            {SPECIALTIES.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSpecialty(s)}
                style={[
                  styles.chip,
                  specialty === s && { backgroundColor: theme.brand, borderColor: theme.brand }
                ]}
              >
                <Text style={[styles.chipText, specialty === s && { color: '#fff', fontWeight: '800' }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Tarifa por Hora (€) *</Text>
          <View style={styles.stepperContainer}>
            <TouchableOpacity onPress={decrementRate} style={styles.stepperBtn}>
              <MaterialCommunityIcons name="minus" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.rateDisplay}>
              <TextInput
                style={styles.rateInput}
                value={hourlyRate}
                onChangeText={setHourlyRate}
                keyboardType="numeric"
                maxLength={5}
              />
              <Text style={styles.rateUnit}>€/h</Text>
            </View>
            <TouchableOpacity onPress={incrementRate} style={styles.stepperBtn}>
              <MaterialCommunityIcons name="plus" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Biografía / Presentación</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textArea}
              value={bio}
              onChangeText={setBio}
              placeholder="Cuéntale a tus futuros clientes sobre tu experiencia, método de entrenamiento y logros..."
              placeholderTextColor="#555"
              multiline
              numberOfLines={6}
              maxLength={1000}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, guardando && { opacity: 0.7 }]}
          onPress={handleGuardar}
          disabled={guardando}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[theme.brand, '#15803d']}
            style={styles.saveGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {guardando ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.saveBtnText}>Guardar Perfil Profesional</Text>
                <MaterialCommunityIcons name="check-circle-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bgPrimary },
  container: { padding: 20, paddingBottom: 40 },
  infoCard: {
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: theme.borderDefault,
    marginBottom: 24,
  },
  infoIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: theme.brandSofter,
    justifyContent: 'center', alignItems: 'center',
  },
  infoTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  infoDesc: { color: theme.textBody, fontSize: 13, lineHeight: 18 },

  section: { marginBottom: 28 },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: theme.textBrand,
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16,
  },

  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 14, borderWidth: 1, borderColor: theme.borderDefault,
  },
  chipText: { color: theme.textBody, fontSize: 13, fontWeight: '600' },

  stepperContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: theme.bgSecondarySoft,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: theme.borderDefault,
  },
  rateDisplay: {
    flex: 1, height: 52, backgroundColor: theme.bgPrimary,
    borderRadius: 16, borderWidth: 1, borderColor: theme.borderDefault,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 15,
  },
  rateInput: {
    color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'right', minWidth: 40,
  },
  rateUnit: { color: theme.textBody, fontSize: 16, fontWeight: '700', marginLeft: 6 },

  inputWrap: {
    backgroundColor: theme.bgSecondarySoft, borderRadius: 18,
    borderWidth: 1, borderColor: theme.borderDefault, overflow: 'hidden',
  },
  textArea: {
    color: '#fff', fontSize: 15, padding: 16, textAlignVertical: 'top', minHeight: 120,
  },

  saveBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 10, elevation: 8, shadowColor: theme.brand, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  saveGradient: { paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { API_URL } from '../api';
import { theme } from './AppLayout';

const SPECIALTIES = [
  'Musculación', 'Crossfit', 'Yoga', 'Pilates', 
  'Nutrición', 'Funcional', 'HIIT', 'Fisioterapia', 'Calistenia'
];

export default function TrainerProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  
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
          } else {
             Alert.alert('Aviso', 'Aún no tienes el perfil completado o ocurrió un error');
          }
        } catch (e) {
          Alert.alert('Error', 'No se pudo cargar el perfil profesional.');
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
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#000000', '#0a0a0a', '#121212']} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerIconWrap}>
            <MaterialCommunityIcons name="account-edit" size={28} color={theme.textBrand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Mi Perfil</Text>
            <Text style={styles.headerSub}>Configura tu información profesional</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Especialidad *</Text>
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
                <Text style={[styles.chipText, specialty === s && { color: '#fff', fontWeight: '700' }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Tarifa por Hora (€) *</Text>
          <View style={styles.stepperContainer}>
            <TouchableOpacity onPress={decrementRate} style={styles.stepperBtn}>
              <MaterialCommunityIcons name="minus" size={22} color="#fff" />
            </TouchableOpacity>
            <TextInput
              style={[styles.fieldInput, styles.stepperInput]}
              value={hourlyRate}
              onChangeText={setHourlyRate}
              placeholder="0.0"
              placeholderTextColor="#555"
              keyboardType="numeric"
              maxLength={10}
            />
            <TouchableOpacity onPress={incrementRate} style={styles.stepperBtn}>
              <MaterialCommunityIcons name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Descripción / Biografía</Text>
          <TextInput
            style={[styles.fieldInput, styles.fieldInputMulti]}
            value={bio}
            onChangeText={setBio}
            placeholder="Cuéntale a tus futuros clientes sobre tu experiencia, método de entrenamiento y logros..."
            placeholderTextColor="#555"
            multiline
            numberOfLines={4}
            maxLength={1000}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, guardando && { opacity: 0.6 }]}
          onPress={handleGuardar}
          disabled={guardando}
          activeOpacity={0.85}
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
              <Text style={styles.saveBtnText}>Guardar Cambios</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    gap: 16,
  },
  loadingText: { color: '#888', fontSize: 14 },
  container: { padding: 20, paddingBottom: 50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
  },
  headerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#1a1a2a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  headerSub: { fontSize: 12, color: '#666' },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 8,
    fontWeight: '600'
  },
  fieldInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontSize: 15,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
  },
  fieldInputMulti: {
    height: 120,
    textAlignVertical: 'top',
  },
  saveBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#2a2a2a',
  },
  chipText: {
    color: '#aaa',
    fontSize: 13,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperInput: {
    flex: 1,
    marginBottom: 0,
    textAlign: 'center',
  },
  backBtn: {
    marginRight: 10,
    padding: 5,
  },
});


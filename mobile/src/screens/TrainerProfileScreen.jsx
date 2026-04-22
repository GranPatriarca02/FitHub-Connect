import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API_URL } from '../api';

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

  if (cargando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#0a0a0a', '#121212', '#1a1a2e']} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <MaterialCommunityIcons name="account-edit" size={28} color="#4FC3F7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Mi Escaparate</Text>
            <Text style={styles.headerSub}>Configura cómo te ven los clientes</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Especialidad *</Text>
          <TextInput
            style={styles.fieldInput}
            value={specialty}
            onChangeText={setSpecialty}
            placeholder="Ej: Crossfit, Musculación, Yoga..."
            placeholderTextColor="#555"
            maxLength={100}
          />

          <Text style={styles.fieldLabel}>Tarifa por Hora (€) *</Text>
          <TextInput
            style={styles.fieldInput}
            value={hourlyRate}
            onChangeText={setHourlyRate}
            placeholder="Ej: 20.0"
            placeholderTextColor="#555"
            keyboardType="numeric"
            maxLength={10}
          />

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
            colors={['#4CAF50', '#2E7D32']}
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
});

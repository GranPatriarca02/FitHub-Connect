import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStripePlatform } from './StripeHelper';


// Disponibilidad de ejemplo
const MOCK_AVAILABILITY = [
  { day: 'Lunes', shortDay: 'L', start: '09:00', end: '14:00', available: true },
  { day: 'Martes', shortDay: 'M', start: '10:00', end: '13:00', available: true },
  { day: 'Miercoles', shortDay: 'X', start: '09:00', end: '14:00', available: true },
  { day: 'Jueves', shortDay: 'J', start: '16:00', end: '20:00', available: true },
  { day: 'Viernes', shortDay: 'V', start: '09:00', end: '12:00', available: true },
  { day: 'Sabado', shortDay: 'S', start: '', end: '', available: false },
  { day: 'Domingo', shortDay: 'D', start: '', end: '', available: false },
];

export default function MonitorDetailScreen({ route, navigation }) {
  const { monitor } = route.params;
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(false);

  // --- USAMOS EL HELPER EN LUGAR DEL HOOK DIRECTO ---
  const { initPaymentSheet, presentPaymentSheet, isWeb } = useStripePlatform();

  const handleContratar = async () => {
    if (!diaSeleccionado) {
      Alert.alert('Selecciona un horario', 'Elige un dia disponible antes de continuar.');
      return;
    }

    setCargando(true);

    try {
      // 1. Datos básicos
      const userId = await AsyncStorage.getItem('userId');
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

      if (isWeb) {
        // ___ LÓGICA WEB ___
        console.log("Iniciando flujo de pago Web...");

        // 1. Llamada al backend para crear la sesión de Stripe Checkout
        const response = await fetch(`${API_URL}/create-checkout-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId
          },
          body: JSON.stringify({
            monitorId: monitor.id,
            monitorName: monitor.name,
            price: monitor.hourlyRate,
            startTime: diaSeleccionado.start,
            endTime: diaSeleccionado.end,
          }),
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Error al crear sesión de pago');

        // 2. Redirigir a la URL de Stripe si existe
        if (data.url) {
          window.location.href = data.url;
        } else {
          Alert.alert('Error', 'No se pudo generar la pasarela de pago.');
        }

      } else {
        // ___ LÓGICA TELEFONO ANDR - IOS ___

        // 2. Crear reserva y obtener clientSecret
        const response = await fetch(`${API_URL}/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId
          },
          body: JSON.stringify({
            monitorId: monitor.id,
            date: "2026-04-15", // Mock de la fecha para el TFG
            startTime: diaSeleccionado.start,
            endTime: diaSeleccionado.end,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al crear la reserva');

        // 3. Inicializar pasarela nativa
        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: data.clientSecret,
          merchantDisplayName: 'FitHub Connect',
          appearance: {
            colors: {
              primary: '#4CAF50',
              background: '#121212',
              componentBackground: '#1e1e1e',
              text: '#ffffff',
            },
            shapes: { borderRadius: 12 }
          }
        });

        if (initError) throw new Error(initError.message);

        // 4. Mostrar pasarela nativa
        const { error: paymentError } = await presentPaymentSheet();

        if (paymentError) {
          if (paymentError.code !== 'Canceled') {
            Alert.alert('Error en el pago', paymentError.message);
          }
        } else {
          // 5. ¡Éxito!
          await AsyncStorage.setItem('userRole', 'CLIENT_PREMIUM');
          Alert.alert(
            '¡Éxito!',
            `Sesión reservada. ¡Ya eres PREMIUM!`,
            [{ text: 'Aceptar', onPress: () => navigation.navigate('Home') }]
          );
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.message || 'No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <LinearGradient colors={['#0a0a0a', '#121212', '#1a1a2e']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Perfil del monitor */}
        <View style={styles.profileCard}>
          <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{monitor.name.charAt(0)}</Text>
          </LinearGradient>
          <Text style={styles.name}>{monitor.name}</Text>
          <Text style={styles.specialty}>{monitor.specialty}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{monitor.rating}</Text>
              <Text style={styles.statLabel}>Valoracion</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{monitor.sessions}</Text>
              <Text style={styles.statLabel}>Sesiones</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{monitor.hourlyRate}€</Text>
              <Text style={styles.statLabel}>Por hora</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Disponibilidad semanal</Text>
        <Text style={styles.sectionHint}>Toca un dia disponible para seleccionarlo</Text>

        {/* Fila de días */}
        <View style={styles.dayRow}>
          {MOCK_AVAILABILITY.map((slot) => (
            <TouchableOpacity
              key={slot.day}
              style={[
                styles.dayCircle,
                slot.available && styles.dayCircleAvailable,
                diaSeleccionado?.day === slot.day && styles.dayCircleSelected,
                !slot.available && styles.dayCircleDisabled,
              ]}
              onPress={() => slot.available && setDiaSeleccionado(slot)}
              disabled={!slot.available}
            >
              <Text style={[
                styles.dayCircleText,
                slot.available && styles.dayCircleTextAvailable,
                diaSeleccionado?.day === slot.day && styles.dayCircleTextSelected,
              ]}>
                {slot.shortDay}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tarjetas de horario */}
        {MOCK_AVAILABILITY.filter((s) => s.available).map((slot) => (
          <TouchableOpacity
            key={slot.day}
            style={[
              styles.slotCard,
              diaSeleccionado?.day === slot.day && styles.slotCardSelected,
            ]}
            onPress={() => setDiaSeleccionado(slot)}
            activeOpacity={0.8}
          >
            <View>
              <Text style={styles.slotDay}>{slot.day}</Text>
              <Text style={styles.slotTime}>{slot.start} – {slot.end}</Text>
            </View>
            <View style={[
              styles.slotBadge,
              diaSeleccionado?.day === slot.day && styles.slotBadgeSelected
            ]}>
              <Text style={[
                styles.slotBadgeText,
                diaSeleccionado?.day === slot.day && styles.slotBadgeTextSelected
              ]}>
                {diaSeleccionado?.day === slot.day ? 'Seleccionado' : 'Disponible'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Botón CTA */}
        <TouchableOpacity
          style={[styles.ctaWrapper, cargando && { opacity: 0.7 }]}
          onPress={handleContratar}
          activeOpacity={0.85}
          disabled={cargando}
        >
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']}
            style={styles.ctaButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>
                {diaSeleccionado ? `Pagar Reserva – ${monitor.hourlyRate}€` : 'Selecciona un horario'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>
    </LinearGradient>
  );
}

// --- ESTILOS (Sin cambios) ---
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 20, paddingTop: 12, paddingBottom: 40 },
  profileCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  specialty: { fontSize: 14, color: '#4CAF50', marginBottom: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#666' },
  divider: { width: 1, height: 32, backgroundColor: '#2a2a2a' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 4 },
  sectionHint: { fontSize: 12, color: '#666', marginBottom: 16 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  dayCircleAvailable: { borderColor: '#2E7D32' },
  dayCircleSelected: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  dayCircleDisabled: { opacity: 0.25 },
  dayCircleText: { fontSize: 13, fontWeight: '600', color: '#555' },
  dayCircleTextAvailable: { color: '#4CAF50' },
  dayCircleTextSelected: { color: '#fff' },
  slotCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  slotCardSelected: { borderColor: '#4CAF50', backgroundColor: '#1a2a1a' },
  slotDay: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 2 },
  slotTime: { fontSize: 13, color: '#888' },
  slotBadge: { paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#2a2a2a', borderRadius: 10 },
  slotBadgeSelected: { backgroundColor: '#4CAF50' },
  slotBadgeText: { fontSize: 12, color: '#888', fontWeight: '500' },
  slotBadgeTextSelected: { color: '#fff', fontWeight: '700' },
  ctaWrapper: { marginTop: 16, borderRadius: 16, overflow: 'hidden' },
  ctaButton: { paddingVertical: 18, alignItems: 'center', minHeight: 60 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
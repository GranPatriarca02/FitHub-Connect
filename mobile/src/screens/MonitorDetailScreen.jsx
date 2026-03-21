// Detalle de un monitor con su disponibilidad semanal
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

// Disponibilidad de ejemplo (mas adelante se cargara del backend)
const MOCK_AVAILABILITY = [
  { day: 'Lunes', start: '09:00', end: '14:00', available: true },
  { day: 'Martes', start: '10:00', end: '13:00', available: true },
  { day: 'Miercoles', start: '09:00', end: '14:00', available: true },
  { day: 'Jueves', start: '16:00', end: '20:00', available: true },
  { day: 'Viernes', start: '09:00', end: '12:00', available: true },
  { day: 'Sabado', start: '', end: '', available: false },
  { day: 'Domingo', start: '', end: '', available: false },
];

export default function MonitorDetailScreen({ route }) {
  const { monitor } = route.params;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{monitor.name}</Text>
        <Text style={styles.specialty}>{monitor.specialty}</Text>
        <Text style={styles.rate}>{monitor.hourlyRate} euros/hora</Text>
      </View>

      <Text style={styles.sectionTitle}>Disponibilidad semanal</Text>

      {MOCK_AVAILABILITY.map((slot, index) => (
        <View key={index} style={[styles.slot, !slot.available && styles.slotUnavailable]}>
          <Text style={styles.slotDay}>{slot.day}</Text>
          <Text style={styles.slotTime}>
            {slot.available ? `${slot.start} - ${slot.end}` : 'No disponible'}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  header: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 16,
    color: '#4CAF50',
    marginBottom: 2,
  },
  rate: {
    fontSize: 14,
    color: '#aaa',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  slot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  slotUnavailable: {
    opacity: 0.4,
  },
  slotDay: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  slotTime: {
    fontSize: 15,
    color: '#4CAF50',
  },
});

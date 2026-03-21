// Detalle de un monitor con su disponibilidad semanal real
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { getMonitorDetail } from '../api';

// Traduccion de dias de la semana
const DAY_NAMES = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miercoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sabado',
  SUNDAY: 'Domingo',
};

export default function MonitorDetailScreen({ route }) {
  const { monitorId } = route.params;
  const [monitor, setMonitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDetail();
  }, []);

  const loadDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMonitorDetail(monitorId);
      setMonitor(data);
    } catch (err) {
      console.error('Error cargando detalle:', err);
      setError('No se pudo cargar el detalle del monitor.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando detalle...</Text>
      </View>
    );
  }

  if (error || !monitor) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Monitor no encontrado'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDetail}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Ordenar disponibilidad por dia de la semana
  const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const sortedAvailability = [...(monitor.availability || [])].sort(
    (a, b) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek)
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{monitor.name}</Text>
        <Text style={styles.specialty}>{monitor.specialty || 'Sin especialidad'}</Text>
        <Text style={styles.rate}>
          {monitor.hourlyRate ? `${monitor.hourlyRate} euros/hora` : 'Tarifa no definida'}
        </Text>
        {monitor.bio ? <Text style={styles.bio}>{monitor.bio}</Text> : null}
      </View>

      <Text style={styles.sectionTitle}>Disponibilidad semanal</Text>

      {sortedAvailability.length === 0 ? (
        <Text style={styles.emptyText}>Este monitor aun no ha definido su disponibilidad</Text>
      ) : (
        sortedAvailability.map((slot, index) => (
          <View key={index} style={[styles.slot, !slot.isAvailable && styles.slotUnavailable]}>
            <Text style={styles.slotDay}>{DAY_NAMES[slot.dayOfWeek] || slot.dayOfWeek}</Text>
            <Text style={styles.slotTime}>
              {slot.isAvailable ? `${slot.startTime} - ${slot.endTime}` : 'No disponible'}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  centered: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    lineHeight: 20,
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
  loadingText: {
    color: '#aaa',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#ff5252',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
});

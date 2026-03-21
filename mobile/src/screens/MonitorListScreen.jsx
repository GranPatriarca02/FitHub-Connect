// Listado de monitores — carga datos reales del backend
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { getMonitors } from '../api';

export default function MonitorListScreen({ navigation }) {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMonitors();
  }, []);

  const loadMonitors = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMonitors();
      setMonitors(data);
    } catch (err) {
      console.error('Error cargando monitores:', err);
      setError('No se pudieron cargar los monitores. Comprueba que el backend esta arrancado.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando monitores...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadMonitors}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (monitors.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No hay monitores registrados todavia</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monitores Disponibles</Text>
      <FlatList
        data={monitors}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('MonitorDetail', { monitorId: item.id, monitorName: item.name })}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.specialty}>{item.specialty || 'Sin especialidad'}</Text>
            <Text style={styles.rate}>
              {item.hourlyRate ? `${item.hourlyRate} euros/hora` : 'Tarifa no definida'}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 2,
  },
  rate: {
    fontSize: 13,
    color: '#aaa',
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
    fontSize: 15,
  },
});

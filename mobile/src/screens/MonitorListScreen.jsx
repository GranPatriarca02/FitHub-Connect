// Listado de monitores (datos de ejemplo por ahora)
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

// Datos de prueba mientras no conectemos con el backend
const MOCK_MONITORS = [
  { id: 1, name: 'Carlos Garcia', specialty: 'Musculacion', hourlyRate: 25 },
  { id: 2, name: 'Ana Lopez', specialty: 'Yoga', hourlyRate: 20 },
  { id: 3, name: 'David Ruiz', specialty: 'CrossFit', hourlyRate: 30 },
  { id: 4, name: 'Laura Fernandez', specialty: 'Pilates', hourlyRate: 22 },
];

export default function MonitorListScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monitores Disponibles</Text>
      <FlatList
        data={MOCK_MONITORS}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('MonitorDetail', { monitor: item })}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.specialty}>{item.specialty}</Text>
            <Text style={styles.rate}>{item.hourlyRate} euros/hora</Text>
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
});

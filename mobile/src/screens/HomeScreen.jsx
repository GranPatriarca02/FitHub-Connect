// Pantalla principal con acceso a las secciones
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenido a FitHub</Text>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('MonitorList')}
      >
        <Text style={styles.cardTitle}>Monitores</Text>
        <Text style={styles.cardDesc}>Busca entrenadores y consulta su disponibilidad</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => {}}>
        <Text style={styles.cardTitle}>Mis Rutinas</Text>
        <Text style={styles.cardDesc}>Revisa tus rutinas de entrenamiento</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => {}}>
        <Text style={styles.cardTitle}>Mi Perfil</Text>
        <Text style={styles.cardDesc}>Configura tu cuenta y preferencias</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: '#aaa',
  },
});

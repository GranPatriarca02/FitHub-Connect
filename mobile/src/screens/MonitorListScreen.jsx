import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getMonitors } from '../api';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ESPECIALIDADES = ['Todos', 'Musculacion', 'Yoga', 'CrossFit', 'Pilates', 'Funcional'];

export default function MonitorListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [monitores, setMonitores] = useState([]);
  const [filtro, setFiltro] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function loadMonitores() {
      try {
        const data = await getMonitors();
        setMonitores(data);
      } catch (error) {
        console.error("Error cargando monitores:", error);
        Alert.alert("Error de conexión", "No se pudo conectar con el servidor. Verifica que el backend esté corriendo.");
      } finally {
        setCargando(false);
      }
    }
    loadMonitores();
  }, []);

  const monitorsFiltrados = monitores.filter((m) => {
    const coincideBusqueda = m.name.toLowerCase().includes(busqueda.toLowerCase()) ||
      (m.specialty && m.specialty.toLowerCase().includes(busqueda.toLowerCase()));
    const coincideFiltro = filtro === 'Todos' || (m.specialty && m.specialty.toLowerCase().includes(filtro.toLowerCase()));
    return coincideBusqueda && coincideFiltro;
  });

  return (
    <LinearGradient colors={['#0a0a0a', '#121212', '#1a1a2e']} style={styles.gradient}>
      <View style={styles.container}>

        {/* Buscador */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#555" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar monitor o especialidad..."
            placeholderTextColor="#555"
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>

        {/* Filtros de especialidad */}
        <FlatList
          data={ESPECIALIDADES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          style={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, filtro === item && styles.filterChipActive]}
              onPress={() => setFiltro(item)}
            >
              <Text style={[styles.filterChipText, filtro === item && styles.filterChipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />

        {cargando ? (
          <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
        ) : (
          <>
            {/* Resultados */}
            <Text style={styles.resultCount}>
              {monitorsFiltrados.length} {monitorsFiltrados.length === 1 ? 'monitor' : 'monitores'}
            </Text>

            <FlatList
              data={monitorsFiltrados}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No se encontraron monitores.</Text>
                  <Text style={styles.emptySubtext}>Asegurate de que haya entrenadores en la base de datos.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => navigation.navigate('MonitorDetail', { monitor: item })}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <LinearGradient
                      colors={['#4CAF50', '#2E7D32']}
                      style={styles.avatarCircle}
                    >
                      <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                    </LinearGradient>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{item.name}</Text>
                      <Text style={styles.cardSpecialty}>{item.specialty}</Text>
                    </View>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color="#FFD700" style={{ marginRight: 2 }} />
                      <Text style={styles.ratingText}>{item.rating || '5.0'}</Text>
                    </View>
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardSessions}>{item.sessions || 0} sesiones</Text>
                    <Text style={styles.cardRate}>{item.hourlyRate}€/hora</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  filterList: {
    marginBottom: 14,
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  filterChipActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterChipText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  resultCount: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  cardSpecialty: {
    fontSize: 13,
    color: '#4CAF50',
  },
  ratingBadge: {
    backgroundColor: '#1a2a1a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ratingText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  cardSessions: {
    fontSize: 13,
    color: '#666',
  },
  cardRate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});

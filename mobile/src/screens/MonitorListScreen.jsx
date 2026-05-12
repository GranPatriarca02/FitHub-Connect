import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getMonitors } from '../api';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppLayout, { theme } from './AppLayout';

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
    <AppLayout title="Monitores" navigation={navigation} showBackButton={true}>
      <View style={styles.container}>

        {/* Buscador */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={theme.textBody} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar monitor o especialidad..."
            placeholderTextColor="#555"
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>

        {/* Filtros de especialidad */}
        <View>
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
        </View>

        {cargando ? (
          <ActivityIndicator size="large" color={theme.brand} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={monitorsFiltrados}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListHeaderComponent={
              <Text style={styles.resultCount}>
                {monitorsFiltrados.length} {monitorsFiltrados.length === 1 ? 'monitor' : 'monitores'} encontrados
              </Text>
            }
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
                    colors={[theme.brand, '#15803d']}
                    style={styles.avatarCircle}
                  >
                    <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                  </LinearGradient>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    <Text style={styles.cardSpecialty}>{item.specialty || 'Entrenador'}</Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" style={{ marginRight: 2 }} />
                    <Text style={styles.ratingText}>{item.rating || '5.0'}</Text>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardSessions}>{item.sessions || 0} sesiones</Text>
                  <Text style={styles.cardRate}>{item.hourlyRate}€/h</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  filterList: {
    marginBottom: 20,
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  filterChipActive: {
    backgroundColor: theme.brand,
    borderColor: theme.brand,
  },
  filterChipText: {
    color: theme.textBody,
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  resultCount: {
    fontSize: 14,
    color: theme.textBody,
    marginBottom: 15,
    fontWeight: '500'
  },
  card: {
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  cardSpecialty: {
    fontSize: 14,
    color: theme.textBrand,
    fontWeight: '500'
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.borderDefault,
  },
  cardSessions: {
    fontSize: 13,
    color: theme.textBody,
  },
  cardRate: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.brand,
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
    color: theme.textBody,
    fontSize: 14,
    textAlign: 'center',
  },
});

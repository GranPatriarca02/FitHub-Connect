// SubscribersListScreen.jsx
// ---------------------------------------------------------------
// Pantalla "Mis Suscriptores" - vista del entrenador.
// Muestra la lista de usuarios que tienen una suscripción activa
// con el entrenador autenticado. Cada elemento contiene dos
// acciones: abrir el plan de entrenamiento personalizado o abrir
// el (futuro) chat privado con ese suscriptor.
// ---------------------------------------------------------------

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import AppLayout, { theme } from './AppLayout';
import { getTrainerSubscribers } from '../api';

// Formatea la fecha de alta de la suscripción a un texto amigable.
const formatSubscribedDate = (iso) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Sin fecha';
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Sin fecha';
  }
};

// Componente de tarjeta de un suscriptor (memorizable y modular).
function SubscriberCard({ subscriber, onOpenPlan, onOpenChat }) {
  const initial = (subscriber.name || '?').charAt(0).toUpperCase();

  return (
    <View style={styles.card}>
      {/* Cabecera con avatar + datos básicos */}
      <View style={styles.cardHeader}>
        <LinearGradient
          colors={[theme.brand, '#15803d']}
          style={styles.avatarCircle}
        >
          <Text style={styles.avatarText}>{initial}</Text>
        </LinearGradient>

        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{subscriber.name}</Text>
          <Text style={styles.cardEmail} numberOfLines={1}>{subscriber.email}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={12} color={theme.textBrand} />
            <Text style={styles.metaText}>
              Suscrito desde {formatSubscribedDate(subscriber.subscribedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Activo</Text>
        </View>
      </View>

      {/* Acciones por suscriptor */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          activeOpacity={0.85}
          onPress={() => onOpenPlan(subscriber)}
        >
          <MaterialCommunityIcons name="clipboard-list-outline" size={18} color="#fff" />
          <Text style={styles.actionBtnPrimaryText}>Plan de Entrenamiento</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnSecondary]}
          activeOpacity={0.85}
          onPress={() => onOpenChat(subscriber)}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.textBrand} />
          <Text style={styles.actionBtnSecondaryText}>Mensajes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SubscribersListScreen({ navigation }) {
  const [subscribers, setSubscribers] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [refresh, setRefresh] = useState(0);

  // Recarga al volver a la pantalla.
  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        setCargando(true);
        try {
          const trainerId = await AsyncStorage.getItem('userId');
          if (!trainerId) {
            throw new Error('No se ha encontrado el ID del entrenador.');
          }
          const data = await getTrainerSubscribers(trainerId);
          setSubscribers(Array.isArray(data) ? data : []);
        } catch (e) {
          console.error('Error cargando suscriptores:', e);
          Alert.alert(
            'Error',
            'No se pudo cargar la lista de suscriptores. Inténtalo de nuevo más tarde.'
          );
        } finally {
          setCargando(false);
        }
      };
      cargar();
    }, [refresh])
  );

  // Filtra por nombre o email.
  const subscribersFiltrados = subscribers.filter((s) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
  });

  // Handler: abrir plan de entrenamiento personalizado.
  const handleOpenPlan = (subscriber) => {
    navigation.navigate('SubscriberTrainingPlan', {
      subscriberId: subscriber.id,
      subscriberName: subscriber.name,
      subscriberEmail: subscriber.email,
    });
  };

  // Handler: abrir chat. Por ahora solo dejamos placeholder visual
  // ya que la integración del chat la realiza otro miembro del equipo.
  const handleOpenChat = (subscriber) => {
    // eslint-disable-next-line no-console
    console.log('[Chat - En desarrollo] Abrir chat con suscriptor:', subscriber);
    Alert.alert(
      'Chat en desarrollo',
      `La mensajería privada con ${subscriber.name} estará disponible próximamente.`
    );
  };

  return (
    <AppLayout title="Mis Suscriptores" navigation={navigation} showBackButton={true}>
      <View style={styles.container}>
        {/* Buscador */}
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color={theme.textBody}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o email..."
            placeholderTextColor="#555"
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>

        {cargando ? (
          <ActivityIndicator
            size="large"
            color={theme.brand}
            style={{ marginTop: 50 }}
          />
        ) : (
          <FlatList
            data={subscribersFiltrados}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
            refreshing={false}
            onRefresh={() => setRefresh((n) => n + 1)}
            ListHeaderComponent={
              <View style={styles.headerInfo}>
                <Text style={styles.resultCount}>
                  {subscribersFiltrados.length}{' '}
                  {subscribersFiltrados.length === 1
                    ? 'suscriptor activo'
                    : 'suscriptores activos'}
                </Text>
                <Text style={styles.headerSubText}>
                  Personaliza rutinas y comunícate con cada uno de tus alumnos.
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="account-multiple-outline"
                  size={56}
                  color={theme.textBody}
                />
                <Text style={styles.emptyText}>Aún no tienes suscriptores</Text>
                <Text style={styles.emptySubtext}>
                  Cuando un usuario se suscriba a tu plan aparecerá aquí.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <SubscriberCard
                subscriber={item}
                onOpenPlan={handleOpenPlan}
                onOpenChat={handleOpenChat}
              />
            )}
          />
        )}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  // Buscador
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },

  // Cabecera de la lista
  headerInfo: { marginBottom: 18 },
  resultCount: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubText: { fontSize: 13, color: theme.textBody },

  // Tarjeta
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
    marginBottom: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 2 },
  cardEmail: { fontSize: 12, color: theme.textBody },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metaText: { color: theme.textBrand, fontSize: 11, marginLeft: 4, fontWeight: '500' },

  // Badge de estado activo
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.brandSofter,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.brand,
    marginRight: 6,
  },
  statusText: { fontSize: 11, fontWeight: '700', color: theme.textBrand },

  // Botones de acción
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.borderDefault,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnPrimary: {
    backgroundColor: theme.brand,
    marginRight: 8,
  },
  actionBtnPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  actionBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.brand,
    marginLeft: 8,
  },
  actionBtnSecondaryText: {
    color: theme.textBrand,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },

  // Estado vacío
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtext: {
    color: theme.textBody,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

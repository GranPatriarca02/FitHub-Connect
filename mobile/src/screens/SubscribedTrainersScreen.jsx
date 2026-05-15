// SubscribedTrainersScreen.jsx
// ---------------------------------------------------------------
// Pantalla "Mis Entrenadores" - vista del usuario suscriptor.
// Muestra la lista de entrenadores a los que el usuario está
// suscrito actualmente. Cada elemento permite:
//   - Tocar la tarjeta o pulsar "Ver Contenido Exclusivo" para
//     acceder al contenido / rutinas premium de ese entrenador.
//   - Pulsar "Mensajes" (placeholder visual, sin lógica detrás).
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
import { getUserSubscriptions } from '../api';

// Convierte un ISO date al formato "dd MMM yyyy".
const formatDate = (iso) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return null;
  }
};

// Calcula días restantes hasta una fecha (puede ser negativo).
const daysLeft = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
};

// Tarjeta de un entrenador suscrito, extraída como subcomponente
// para mantener el render principal legible y modular.
function TrainerSubscriptionCard({ subscription, onOpenContent, onOpenChat }) {
  const initial = (subscription.monitorName || '?').charAt(0).toUpperCase();
  const expiresFmt = formatDate(subscription.expiresAt);
  const remaining = daysLeft(subscription.expiresAt);
  const isExpiringSoon = remaining !== null && remaining <= 7 && remaining >= 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => onOpenContent(subscription)}
    >
      {/* CABECERA */}
      <View style={styles.cardHeader}>
        <LinearGradient
          colors={['#FFD700', '#B8860B']}
          style={styles.avatarCircle}
        >
          <Text style={styles.avatarText}>{initial}</Text>
          <View style={styles.premiumBadge}>
            <MaterialCommunityIcons name="star" size={10} color="#000" />
          </View>
        </LinearGradient>

        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {subscription.monitorName || 'Entrenador'}
          </Text>
          {!!subscription.specialty && (
            <Text style={styles.cardSpecialty} numberOfLines={1}>
              {subscription.specialty}
            </Text>
          )}
          {expiresFmt && (
            <View style={styles.metaRow}>
              <Ionicons
                name="time-outline"
                size={12}
                color={isExpiringSoon ? '#f59e0b' : theme.textBrand}
              />
              <Text
                style={[
                  styles.metaText,
                  { color: isExpiringSoon ? '#f59e0b' : theme.textBrand },
                ]}
              >
                {isExpiringSoon && remaining > 0
                  ? `Caduca en ${remaining} día${remaining === 1 ? '' : 's'}`
                  : `Renueva el ${expiresFmt}`}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Premium</Text>
        </View>
      </View>

      {/* ACCIONES POR ENTRENADOR */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          activeOpacity={0.85}
          onPress={() => onOpenContent(subscription)}
        >
          <MaterialCommunityIcons name="lock-open-variant-outline" size={18} color="#fff" />
          <Text style={styles.actionBtnPrimaryText}>Ver Contenido Exclusivo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnSecondary]}
          activeOpacity={0.85}
          onPress={() => onOpenChat(subscription)}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.textBrand} />
          <Text style={styles.actionBtnSecondaryText}>Mensajes</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function SubscribedTrainersScreen({ navigation }) {
  const [subs, setSubs] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        setCargando(true);
        try {
          const userId = await AsyncStorage.getItem('userId');
          if (!userId) {
            throw new Error('No se ha encontrado el ID del usuario.');
          }
          const data = await getUserSubscriptions(userId);
          setSubs(Array.isArray(data) ? data : []);
        } catch (e) {
          console.error('Error cargando suscripciones:', e);
          Alert.alert(
            'Error',
            'No se pudo cargar la lista de entrenadores. Inténtalo de nuevo más tarde.'
          );
        } finally {
          setCargando(false);
        }
      };
      cargar();
    }, [refresh])
  );

  const subsFiltrados = subs.filter((s) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return (
      (s.monitorName || '').toLowerCase().includes(q) ||
      (s.specialty || '').toLowerCase().includes(q)
    );
  });

  // Handler: navegar al contenido exclusivo del entrenador.
  const handleOpenContent = (sub) => {
    navigation.navigate('TrainerExclusiveContent', {
      monitorId: sub.monitorId,
      monitorName: sub.monitorName,
      specialty: sub.specialty,
      expiresAt: sub.expiresAt,
    });
  };

  // Handler: chat. Sin lógica - solo placeholder visual.
  // La integración real la implementará otro miembro del equipo.
  const handleOpenChat = (sub) => {
    // Navegamos a 'ChatRoom' pasando los datos del entrenador
    navigation.navigate('ChatRoom', {
      trainerId: sub.monitorId,
      trainerName: sub.monitorName,
      // Puedes pasar también el avatar si lo tienes
    });
  };

  return (
    <AppLayout title="Mis Entrenadores" navigation={navigation} showBackButton={true}>
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
            placeholder="Buscar por nombre o especialidad..."
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
            data={subsFiltrados}
            keyExtractor={(item, idx) => String(item.monitorId ?? idx)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
            refreshing={false}
            onRefresh={() => setRefresh((n) => n + 1)}
            ListHeaderComponent={
              <View style={styles.headerInfo}>
                <Text style={styles.resultCount}>
                  {subsFiltrados.length}{' '}
                  {subsFiltrados.length === 1
                    ? 'suscripción activa'
                    : 'suscripciones activas'}
                </Text>
                <Text style={styles.headerSubText}>
                  Accede a los planes y contenido exclusivo de tus entrenadores.
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="star-outline"
                  size={56}
                  color={theme.textBody}
                />
                <Text style={styles.emptyText}>Todavía no estás suscrito</Text>
                <Text style={styles.emptySubtext}>
                  Suscríbete a un entrenador desde su perfil para desbloquear su contenido premium.
                </Text>
                <TouchableOpacity
                  style={styles.emptyCta}
                  onPress={() => navigation.navigate('MonitorList')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyCtaText}>Explorar entrenadores</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => (
              <TrainerSubscriptionCard
                subscription={item}
                onOpenContent={handleOpenContent}
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
  // ... (Tus estilos se mantienen exactamente iguales)
  container: { flex: 1, padding: 20 },
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
  headerInfo: { marginBottom: 18 },
  resultCount: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubText: { fontSize: 13, color: theme.textBody },
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
    position: 'relative',
  },
  avatarText: { color: '#000', fontSize: 22, fontWeight: 'bold' },
  premiumBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.bgSecondarySoft,
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 2 },
  cardSpecialty: { fontSize: 12, color: theme.textBrand, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metaText: { fontSize: 11, marginLeft: 4, fontWeight: '500' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD700',
    marginRight: 6,
  },
  statusText: { fontSize: 11, fontWeight: '700', color: '#FFD700' },
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
    lineHeight: 18,
  },
  emptyCta: {
    marginTop: 18,
    backgroundColor: theme.brand,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyCtaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
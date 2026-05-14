// SubscriberTrainingPlanScreen.jsx
// ---------------------------------------------------------------
// Estructura base de la vista en la que un entrenador asigna o
// crea rutinas personalizadas EXCLUSIVAS para un suscriptor.
//
// Esta pantalla forma parte de la primera entrega: deja el
// esqueleto navegable y los puntos de extensión preparados. La
// lógica completa (asignación efectiva, persistencia de rutinas
// exclusivas, etc.) se completará en una iteración posterior.
// ---------------------------------------------------------------

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import AppLayout, { theme } from './AppLayout';

export default function SubscriberTrainingPlanScreen({ route, navigation }) {
  const {
    subscriberId,
    subscriberName = 'Suscriptor',
    subscriberEmail = '',
  } = route?.params || {};

  // Estado local para listar las rutinas asignadas a este suscriptor.
  // Por ahora es un mock: se reemplazará por una llamada al backend
  // (p. ej. /routines/assigned?to={subscriberId}) en la siguiente fase.
  const [rutinasAsignadas] = useState([
    // Ejemplo visual; vacío en producción hasta que el entrenador
    // asigne la primera rutina personalizada al suscriptor.
  ]);

  // Acción: asignar una rutina ya existente del catálogo del entrenador.
  const handleAsignarExistente = () => {
    // TODO (siguiente iteración):
    // 1) Navegar a un selector con `getMyRoutines(userId)`.
    // 2) Al confirmar, llamar a un endpoint del tipo
    //    POST /routines/{id}/assign  { targetUserId: subscriberId }.
    Alert.alert(
      'Próximamente',
      `Aquí podrás elegir una rutina existente y asignarla en exclusiva a ${subscriberName}.`
    );
  };

  // Acción: crear una rutina personalizada nueva desde cero.
  const handleCrearPersonalizada = () => {
    // TODO (siguiente iteración):
    // Navegar a un formulario de creación de rutina prefijando que
    // el visibility/scope sea "EXCLUSIVE" y el target = subscriberId.
    Alert.alert(
      'Próximamente',
      `Aquí podrás crear una rutina nueva exclusiva para ${subscriberName}.`
    );
  };

  return (
    <AppLayout
      title="Plan de Entrenamiento"
      navigation={navigation}
      showBackButton={true}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* CABECERA - INFO DEL SUSCRIPTOR */}
        <LinearGradient
          colors={['rgba(34,197,94,0.15)', 'rgba(34,197,94,0.02)']}
          style={styles.heroCard}
        >
          <View style={styles.heroRow}>
            <LinearGradient
              colors={[theme.brand, '#15803d']}
              style={styles.avatarCircle}
            >
              <Text style={styles.avatarText}>
                {(subscriberName || '?').charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.subscriberLabel}>Plan exclusivo para</Text>
              <Text style={styles.subscriberName} numberOfLines={1}>
                {subscriberName}
              </Text>
              {!!subscriberEmail && (
                <Text style={styles.subscriberEmail} numberOfLines={1}>
                  {subscriberEmail}
                </Text>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* ACCIONES PRINCIPALES */}
        <Text style={styles.sectionTitle}>Asignar rutinas</Text>
        <Text style={styles.sectionHint}>
          Las rutinas que asignes desde aquí serán visibles solo para este suscriptor.
        </Text>

        <TouchableOpacity
          style={styles.bigAction}
          activeOpacity={0.85}
          onPress={handleAsignarExistente}
        >
          <View style={[styles.bigActionIcon, { backgroundColor: theme.brandSofter }]}>
            <MaterialCommunityIcons name="folder-multiple-outline" size={24} color={theme.brand} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.bigActionTitle}>Asignar una rutina existente</Text>
            <Text style={styles.bigActionSubtitle}>
              Reutiliza una rutina de tu catálogo personal.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textBody} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bigAction}
          activeOpacity={0.85}
          onPress={handleCrearPersonalizada}
        >
          <View style={[styles.bigActionIcon, { backgroundColor: theme.brandSofter }]}>
            <MaterialCommunityIcons name="plus-circle-outline" size={24} color={theme.brand} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.bigActionTitle}>Crear rutina personalizada</Text>
            <Text style={styles.bigActionSubtitle}>
              Diseña una rutina nueva exclusiva para este alumno.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textBody} />
        </TouchableOpacity>

        {/* RUTINAS ACTUALMENTE ASIGNADAS */}
        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
          Rutinas asignadas
        </Text>

        {rutinasAsignadas.length === 0 ? (
          <View style={styles.emptyBlock}>
            <MaterialCommunityIcons
              name="clipboard-text-outline"
              size={42}
              color={theme.textBody}
            />
            <Text style={styles.emptyTitle}>Sin rutinas asignadas</Text>
            <Text style={styles.emptySubtitle}>
              Cuando asignes o crees rutinas para este suscriptor aparecerán aquí.
            </Text>
          </View>
        ) : (
          rutinasAsignadas.map((r) => (
            <View key={r.id} style={styles.routineRow}>
              <Text style={styles.routineName}>{r.name}</Text>
            </View>
          ))
        )}

        {/* DEBUG INFO (puede retirarse) */}
        {__DEV__ && subscriberId != null && (
          <Text style={styles.debugText}>subscriberId: {String(subscriberId)}</Text>
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },

  // Hero / cabecera
  heroCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.borderDefault,
    marginBottom: 24,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  subscriberLabel: { color: theme.textBody, fontSize: 12, fontWeight: '500' },
  subscriberName: { color: '#fff', fontSize: 19, fontWeight: '800', marginTop: 2 },
  subscriberEmail: { color: theme.textBrand, fontSize: 12, marginTop: 2 },

  // Secciones
  sectionTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionHint: { color: theme.textBody, fontSize: 12, marginBottom: 14 },

  // Acciones principales
  bigAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgSecondarySoft,
    borderWidth: 1,
    borderColor: theme.borderDefault,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  bigActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigActionTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  bigActionSubtitle: { color: theme.textBody, fontSize: 12, marginTop: 2 },

  // Bloque vacío
  emptyBlock: {
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.borderDefault,
    paddingVertical: 28,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: theme.textBody,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Rutina asignada (placeholder)
  routineRow: {
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.borderDefault,
    marginBottom: 10,
  },
  routineName: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Debug
  debugText: {
    marginTop: 18,
    color: theme.textBody,
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.6,
  },
});

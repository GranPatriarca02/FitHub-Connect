// TrainerExclusiveContentScreen.jsx
// ---------------------------------------------------------------
// Vista del contenido y rutinas premium asignadas por un
// entrenador concreto al usuario suscriptor.
//
// Esta pantalla forma parte de la primera entrega: deja la
// estructura visual lista y los puntos de extensión preparados.
// La lógica completa (descarga de rutinas exclusivas, vídeos
// premium, recursos descargables...) se completará en una
// iteración posterior cuando se cierre el contrato del endpoint.
// ---------------------------------------------------------------

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import AppLayout, { theme } from './AppLayout';
import { getAssignedRoutinesByMonitor } from '../api';

// Formateador básico de fecha.
const formatDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function TrainerExclusiveContentScreen({ route, navigation }) {
  const {
    monitorId,
    monitorName = 'Entrenador',
    specialty = '',
    expiresAt,
  } = route?.params || {};

  // Estado: rutinas exclusivas que este entrenador ha asignado
  // al usuario actual. Se cargan desde el backend mediante
  // GET /routines/assigned?byMonitorId={monitorId}.
  const [rutinas, setRutinas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        setCargando(true);
        try {
          const userId = await AsyncStorage.getItem('userId');
          if (!userId || monitorId == null) {
            setRutinas([]);
            return;
          }
          const data = await getAssignedRoutinesByMonitor(userId, monitorId);
          setRutinas(Array.isArray(data) ? data : []);
        } catch (e) {
          console.error('Error cargando contenido exclusivo:', e);
          Alert.alert(
            'Error',
            'No se pudo cargar el contenido exclusivo de este entrenador.'
          );
        } finally {
          setCargando(false);
        }
      };
      cargar();
    }, [monitorId])
  );

  // Handler para abrir una rutina asignada.
  const handleOpenRutina = (r) => {
    navigation.navigate('RoutineDetail', { routineId: r.id });
  };

  const expiresFmt = formatDate(expiresAt);

  return (
    <AppLayout
      title="Contenido Exclusivo"
      navigation={navigation}
      showBackButton={true}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* CABECERA - INFO DEL ENTRENADOR */}
        <LinearGradient
          colors={['rgba(255,215,0,0.15)', 'rgba(255,215,0,0.02)']}
          style={styles.heroCard}
        >
          <View style={styles.heroRow}>
            <LinearGradient
              colors={['#FFD700', '#B8860B']}
              style={styles.avatarCircle}
            >
              <Text style={styles.avatarText}>
                {(monitorName || '?').charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.heroLabel}>Suscripción premium con</Text>
              <Text style={styles.heroName} numberOfLines={1}>
                {monitorName}
              </Text>
              {!!specialty && (
                <Text style={styles.heroSpecialty} numberOfLines={1}>
                  {specialty}
                </Text>
              )}
            </View>
          </View>

          {expiresFmt && (
            <View style={styles.heroFooter}>
              <Ionicons name="time-outline" size={14} color="#FFD700" />
              <Text style={styles.heroFooterText}>
                Acceso activo hasta {expiresFmt}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* SECCIÓN: RUTINAS EXCLUSIVAS */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="clipboard-list-outline"
            size={18}
            color={theme.brand}
          />
          <Text style={styles.sectionTitle}>Rutinas asignadas para ti</Text>
        </View>
        <Text style={styles.sectionHint}>
          Planes de entrenamiento personalizados que {monitorName} ha creado en exclusiva para ti.
        </Text>

        {cargando ? (
          <ActivityIndicator
            size="small"
            color={theme.brand}
            style={{ marginTop: 20 }}
          />
        ) : rutinas.length === 0 ? (
          <View style={styles.emptyBlock}>
            <MaterialCommunityIcons
              name="lock-clock"
              size={42}
              color={theme.textBody}
            />
            <Text style={styles.emptyTitle}>Aún no hay rutinas asignadas</Text>
            <Text style={styles.emptySubtitle}>
              Cuando {monitorName} te asigne una rutina personalizada aparecerá aquí.
            </Text>
          </View>
        ) : (
          rutinas.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={styles.routineRow}
              activeOpacity={0.85}
              onPress={() => handleOpenRutina(r)}
            >
              <View style={styles.routineIcon}>
                <Ionicons name="barbell-outline" size={20} color={theme.brand} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.routineName}>{r.title || r.name}</Text>
                {!!r.description && (
                  <Text style={styles.routineDesc} numberOfLines={2}>
                    {r.description}
                  </Text>
                )}
                <View style={styles.routineMetaRow}>
                  {!!r.difficulty && (
                    <Text style={styles.routineMetaChip}>{r.difficulty}</Text>
                  )}
                  {!!r.goal && (
                    <Text style={styles.routineMetaChip}>{r.goal}</Text>
                  )}
                  {typeof r.exerciseCount === 'number' && (
                    <Text style={styles.routineMetaChip}>
                      {r.exerciseCount} ejercicio{r.exerciseCount === 1 ? '' : 's'}
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textBody} />
            </TouchableOpacity>
          ))
        )}

        {/* SECCIÓN: OTROS RECURSOS PREMIUM (futuro) */}
        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <MaterialCommunityIcons
            name="star-circle-outline"
            size={18}
            color={theme.brand}
          />
          <Text style={styles.sectionTitle}>Más contenido exclusivo</Text>
        </View>
        <Text style={styles.sectionHint}>
          Vídeos, guías y recursos extra publicados por tu entrenador.
        </Text>

        <View style={styles.placeholderBlock}>
          <MaterialCommunityIcons
            name="movie-open-play-outline"
            size={28}
            color={theme.textBody}
          />
          <Text style={styles.placeholderText}>
            Próximamente: vídeos y recursos premium publicados por {monitorName}.
          </Text>
        </View>

        {/* DEBUG (puede retirarse) */}
        {__DEV__ && monitorId != null && (
          <Text style={styles.debugText}>monitorId: {String(monitorId)}</Text>
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },

  // Hero
  heroCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
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
  avatarText: { color: '#000', fontSize: 24, fontWeight: 'bold' },
  heroLabel: { color: theme.textBody, fontSize: 12, fontWeight: '500' },
  heroName: { color: '#fff', fontSize: 19, fontWeight: '800', marginTop: 2 },
  heroSpecialty: { color: '#FFD700', fontSize: 12, marginTop: 2, fontWeight: '600' },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,215,0,0.2)',
  },
  heroFooterText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Secciones
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sectionTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    marginLeft: 8,
  },
  sectionHint: { color: theme.textBody, fontSize: 12, marginBottom: 14 },

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

  // Fila de rutina
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.borderDefault,
    marginBottom: 10,
  },
  routineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.brandSofter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routineName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  routineDesc: { color: theme.textBody, fontSize: 12, marginTop: 2 },
  routineMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  routineMetaChip: {
    color: theme.textBrand,
    fontSize: 10,
    fontWeight: '600',
    backgroundColor: theme.brandSofter,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
    marginTop: 4,
  },

  // Placeholder de contenido futuro
  placeholderBlock: {
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.borderDefault,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  placeholderText: {
    color: theme.textBody,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },

  // Debug
  debugText: {
    marginTop: 18,
    color: theme.textBody,
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.6,
  },
});

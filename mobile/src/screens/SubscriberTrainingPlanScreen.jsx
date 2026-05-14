// SubscriberTrainingPlanScreen.jsx
// ---------------------------------------------------------------
// Vista en la que un entrenador asigna o crea rutinas EXCLUSIVAS
// para un suscriptor concreto.
//
// Reutiliza:
//   - RoutineCard           (lista de rutinas asignadas)
//   - CreateRoutineModal    (modal de creación de rutina)
//   - createRoutine /
//     createRoutineForSubscriber / getMyRoutines /
//     getAssignedRoutines / assignRoutineToUser
//   - AppLayout + theme     (estética común a toda la app)
// ---------------------------------------------------------------

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, TextInput, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import AppLayout, { theme } from './AppLayout';
import { RoutineCard, CreateRoutineModal } from '../components/routines';
import {
  getMyRoutines,
  getAssignedRoutines,
  assignRoutineToUser,
  unassignRoutine,
  createRoutineForSubscriber,
} from '../api';

export default function SubscriberTrainingPlanScreen({ route, navigation }) {
  const {
    subscriberId,
    subscriberName = 'Suscriptor',
    subscriberEmail = '',
  } = route?.params || {};

  // --- Estado base ---
  const [trainerId, setTrainerId] = useState(null);
  const [assigned, setAssigned] = useState([]);      // rutinas asignadas a este suscriptor
  const [myRoutines, setMyRoutines] = useState([]);  // catálogo del entrenador (para el selector)
  const [cargando, setCargando] = useState(true);

  // --- Modal "Asignar Rutina Existente" ---
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [asignando, setAsignando] = useState(false);

  // --- Modal "Crear Rutina Personalizada" (CreateRoutineModal compartido) ---
  const [createVisible, setCreateVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // Estado controlado del modal compartido
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevaDesc, setNuevaDesc] = useState('');
  const [nuevaDificultad, setNuevaDificultad] = useState('Beginner');
  const [nuevoObjetivo, setNuevoObjetivo] = useState('Hipertrofia');
  const [nuevaPremium, setNuevaPremium] = useState(true);

  const resetCreateModal = () => {
    setNuevoTitulo('');
    setNuevaDesc('');
    setNuevaDificultad('Beginner');
    setNuevoObjetivo('Hipertrofia');
    setNuevaPremium(true);
  };

  // -----------------------------------------------------------
  // Carga inicial: rutinas asignadas a este suscriptor + catálogo
  // -----------------------------------------------------------
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const uid = await AsyncStorage.getItem('userId');
      setTrainerId(uid);
      if (!uid || subscriberId == null) {
        setAssigned([]);
        setMyRoutines([]);
        return;
      }
      const [asign, mine] = await Promise.all([
        getAssignedRoutines(subscriberId, uid),
        getMyRoutines(uid),
      ]);
      setAssigned(Array.isArray(asign) ? asign : []);
      setMyRoutines(Array.isArray(mine) ? mine : []);
    } catch (e) {
      console.error('Error cargando plan del suscriptor:', e);
      Alert.alert(
        'Error',
        'No se pudo cargar el plan de entrenamiento. Inténtalo de nuevo.'
      );
    } finally {
      setCargando(false);
    }
  }, [subscriberId]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  // -----------------------------------------------------------
  // Rutinas elegibles para asignar (no asignadas ya y filtradas)
  // -----------------------------------------------------------
  const assignedIds = useMemo(
    () => new Set(assigned.map((r) => String(r.id))),
    [assigned]
  );

  const seleccionables = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return myRoutines
      .filter((r) => !assignedIds.has(String(r.id)))
      .filter((r) => {
        if (!q) return true;
        return (
          (r.title || '').toLowerCase().includes(q) ||
          (r.goal || '').toLowerCase().includes(q) ||
          (r.difficulty || '').toLowerCase().includes(q)
        );
      });
  }, [myRoutines, assignedIds, pickerQuery]);

  // -----------------------------------------------------------
  // Acciones
  // -----------------------------------------------------------
  const handleAsignarExistente = async (routine) => {
    if (!trainerId || subscriberId == null) return;
    setAsignando(true);
    try {
      await assignRoutineToUser(routine.id, subscriberId, trainerId);
      setPickerVisible(false);
      setPickerQuery('');
      await cargar();
      Alert.alert('Rutina asignada', `"${routine.title}" se ha vinculado a ${subscriberName}.`);
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo asignar la rutina.');
    } finally {
      setAsignando(false);
    }
  };

  const handleCrearPersonalizada = async () => {
    if (!nuevoTitulo.trim()) {
      Alert.alert('Campo obligatorio', 'Indica un nombre para la rutina.');
      return;
    }
    if (!trainerId || subscriberId == null) return;
    setGuardando(true);
    try {
      await createRoutineForSubscriber(trainerId, subscriberId, {
        title: nuevoTitulo.trim(),
        description: nuevaDesc.trim() || null,
        difficulty: nuevaDificultad,
        goal: nuevoObjetivo,
        isPremium: nuevaPremium,
        // isPublic y assignedToUserId los pone el wrapper.
      });
      setCreateVisible(false);
      resetCreateModal();
      await cargar();
      Alert.alert('Rutina creada', 'La rutina exclusiva se ha creado y asignada al suscriptor.');
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo crear la rutina.');
    } finally {
      setGuardando(false);
    }
  };

  const handleQuitarAsignacion = (routine) => {
    Alert.alert(
      'Quitar asignación',
      `¿Quieres que "${routine.title}" deje de estar asignada a ${subscriberName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            try {
              await unassignRoutine(routine.id, subscriberId, trainerId);
              await cargar();
            } catch (e) {
              Alert.alert('Error', e.message || 'No se pudo quitar la asignación.');
            }
          },
        },
      ]
    );
  };

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------
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
          onPress={() => { setPickerQuery(''); setPickerVisible(true); }}
        >
          <View style={[styles.bigActionIcon, { backgroundColor: theme.brandSofter }]}>
            <MaterialCommunityIcons name="folder-multiple-outline" size={24} color={theme.brand} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.bigActionTitle}>Asignar Rutina Existente</Text>
            <Text style={styles.bigActionSubtitle}>
              Reutiliza una rutina de tu catálogo personal.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textBody} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bigAction}
          activeOpacity={0.85}
          onPress={() => setCreateVisible(true)}
        >
          <View style={[styles.bigActionIcon, { backgroundColor: theme.brandSofter }]}>
            <MaterialCommunityIcons name="plus-circle-outline" size={24} color={theme.brand} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.bigActionTitle}>Crear Rutina Personalizada</Text>
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

        {cargando ? (
          <ActivityIndicator size="small" color={theme.brand} style={{ marginTop: 20 }} />
        ) : assigned.length === 0 ? (
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
          assigned.map((r) => (
            <RoutineCard
              key={r.id}
              routine={r}
              isOwner
              onPress={() => navigation.navigate('RoutineDetail', { routineId: r.id })}
              rightSlot={
                <TouchableOpacity
                  onPress={() => handleQuitarAsignacion(r)}
                  style={styles.unassignBtn}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="link-off" size={16} color="#f59e0b" />
                </TouchableOpacity>
              }
            />
          ))
        )}
      </ScrollView>

      {/* -------------------------------------------------------- */}
      {/* MODAL: "Asignar Rutina Existente" - selector de rutina   */}
      {/* -------------------------------------------------------- */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <LinearGradient colors={['#1e1e1e', '#121212']} style={styles.pickerCard}>
            <View style={styles.modalTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Asignar rutina existente</Text>
                <Text style={styles.modalSub}>
                  Elige una de tu catálogo para {subscriberName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPickerVisible(false)} disabled={asignando}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={theme.textBody} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por título, objetivo o dificultad..."
                placeholderTextColor="#555"
                value={pickerQuery}
                onChangeText={setPickerQuery}
              />
            </View>

            {asignando && (
              <ActivityIndicator size="small" color={theme.brand} style={{ marginTop: 8 }} />
            )}

            <FlatList
              data={seleccionables}
              keyExtractor={(item) => String(item.id)}
              style={{ marginTop: 4 }}
              contentContainerStyle={{ paddingBottom: 8 }}
              ListEmptyComponent={
                <View style={styles.pickerEmpty}>
                  <MaterialCommunityIcons
                    name="folder-search-outline"
                    size={36}
                    color={theme.textBody}
                  />
                  <Text style={styles.pickerEmptyText}>
                    {myRoutines.length === 0
                      ? 'Todavía no tienes rutinas creadas en tu catálogo.'
                      : 'Todas tus rutinas ya están asignadas a este suscriptor.'}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleAsignarExistente(item)}
                  disabled={asignando}
                >
                  <RoutineCard routine={item} isOwner />
                </TouchableOpacity>
              )}
            />
          </LinearGradient>
        </View>
      </Modal>

      {/* -------------------------------------------------------- */}
      {/* MODAL: "Crear Rutina Personalizada" - REUTILIZADO        */}
      {/* -------------------------------------------------------- */}
      <CreateRoutineModal
        visible={createVisible}
        onClose={() => { if (!guardando) { setCreateVisible(false); resetCreateModal(); } }}
        titulo={nuevoTitulo}
        setTitulo={setNuevoTitulo}
        desc={nuevaDesc}
        setDesc={setNuevaDesc}
        dificultad={nuevaDificultad}
        setDificultad={setNuevaDificultad}
        objetivo={nuevoObjetivo}
        setObjetivo={setNuevoObjetivo}
        premium={nuevaPremium}
        setPremium={setNuevaPremium}
        isTrainer={true}
        onCrear={handleCrearPersonalizada}
        guardando={guardando}
        title={`Rutina personalizada para ${subscriberName}`}
        subtitle="Solo será visible para este suscriptor."
        ctaLabel="Crear y asignar"
      />
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

  // Botón inline en cabecera de RoutineCard para retirar la asignación
  unassignBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },

  // ------- Picker de rutinas existentes -------
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  pickerCard: {
    backgroundColor: theme.bgSecondarySoft,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: theme.borderDefault,
    maxHeight: '85%',
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  modalSub: { fontSize: 12, color: theme.textBody, marginTop: 4, marginBottom: 14 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgPrimary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },

  pickerEmpty: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  pickerEmptyText: {
    color: theme.textBody,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 18,
  },
});

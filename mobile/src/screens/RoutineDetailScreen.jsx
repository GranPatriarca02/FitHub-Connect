import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import {
  getRoutineDetail,
  getExercises,
  addExerciseToRoutine,
  removeExerciseFromRoutine,
  updateRoutineExercise,
} from '../api';

const GRUPOS = ['Todos', 'PECHO', 'ESPALDA', 'PIERNAS', 'HOMBROS', 'BRAZOS', 'CORE', 'CARDIO'];

export default function RoutineDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { routineId } = route.params;

  const [userId, setUserId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Catálogo
  const [catalogo, setCatalogo] = useState([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [grupoFiltro, setGrupoFiltro] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');

  // Modales
  const [catalogVisible, setCatalogVisible] = useState(false);
  const [paramsVisible, setParamsVisible] = useState(false);
  const [selected, setSelected] = useState(null); // ejercicio seleccionado del catálogo
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [rest, setRest] = useState('60');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      const uid = await AsyncStorage.getItem('userId');
      setUserId(uid);
      const data = await getRoutineDetail(routineId, uid);
      setDetail(data);
    } catch (e) {
      Alert.alert('Error', 'No se pudo cargar la rutina');
    } finally {
      setCargando(false);
    }
  }, [routineId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const esPropia = detail && userId && String(detail.creatorId) === String(userId);

  const abrirCatalogo = async () => {
    setCatalogVisible(true);
    try {
      setCargandoCatalogo(true);
      const data = await getExercises();
      setCatalogo(data);
    } catch (e) {
      Alert.alert('Error', 'No se pudo cargar el catálogo de ejercicios');
    } finally {
      setCargandoCatalogo(false);
    }
  };

  const seleccionar = (ex) => {
    setSelected(ex);
    setSets('3');
    setReps('10');
    setRest('60');
    setNotas('');
    setCatalogVisible(false);
    setParamsVisible(true);
  };

  const confirmarAnadir = async () => {
    if (!selected) return;
    const setsN = parseInt(sets, 10);
    const restN = parseInt(rest, 10);
    if (!setsN || setsN < 1) return Alert.alert('Revisa', 'Nº de series no válido');
    if (!reps.trim()) return Alert.alert('Revisa', 'Indica las repeticiones');
    if (isNaN(restN) || restN < 0) return Alert.alert('Revisa', 'Descanso no válido');

    setGuardando(true);
    try {
      await addExerciseToRoutine(routineId, userId, {
        exerciseId: selected.id,
        sets: setsN,
        reps: reps.trim(),
        restSeconds: restN,
        notes: notas.trim() || null,
      });
      setParamsVisible(false);
      setSelected(null);
      cargar();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  };

  const quitarEjercicio = (re) => {
    Alert.alert(
      'Quitar ejercicio',
      `¿Quitar "${re.name}" de la rutina?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeExerciseFromRoutine(routineId, re.id, userId);
              cargar();
            } catch (e) {
              Alert.alert('Error', 'No se pudo quitar el ejercicio');
            }
          },
        },
      ]
    );
  };

  const filtrados = catalogo.filter((ex) => {
    const byGroup = grupoFiltro === 'Todos' || (ex.muscleGroup && ex.muscleGroup.toUpperCase() === grupoFiltro);
    const q = busqueda.trim().toLowerCase();
    const byText = !q || ex.name.toLowerCase().includes(q) || (ex.equipment || '').toLowerCase().includes(q);
    return byGroup && byText;
  });

  if (cargando || !detail) {
    return (
      <LinearGradient colors={['#0a0a0a', '#121212', '#1a1a2e']} style={styles.gradient}>
        <ActivityIndicator color="#4CAF50" style={{ marginTop: 80 }} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0a0a0a', '#121212', '#1a1a2e']} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Cabecera ---- */}
        <View style={styles.headerCard}>
          <LinearGradient colors={['#1a2a1a', '#1b5e20']} style={styles.headerBanner}>
            <MaterialCommunityIcons name="clipboard-text" size={38} color="#4CAF50" />
          </LinearGradient>
          <View style={{ padding: 18 }}>
            <Text style={styles.title}>{detail.title}</Text>
            <Text style={styles.author}>
              Creada por {esPropia ? 'ti' : detail.creatorName}
              {detail.isPublic ? '  •  Pública' : ''}
            </Text>

            {detail.description ? (
              <Text style={styles.desc}>{detail.description}</Text>
            ) : null}

            <View style={styles.tagRow}>
              {detail.difficulty ? (
                <View style={styles.tag}>
                  <MaterialCommunityIcons name="speedometer" size={12} color="#4CAF50" />
                  <Text style={styles.tagText}>{detail.difficulty}</Text>
                </View>
              ) : null}
              {detail.goal ? (
                <View style={styles.tag}>
                  <MaterialCommunityIcons name="target" size={12} color="#4FC3F7" />
                  <Text style={[styles.tagText, { color: '#4FC3F7' }]}>{detail.goal}</Text>
                </View>
              ) : null}
              <View style={styles.tag}>
                <MaterialCommunityIcons name="dumbbell" size={12} color="#FFD700" />
                <Text style={[styles.tagText, { color: '#FFD700' }]}>
                  {detail.exercises.length} {detail.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ---- Lista de ejercicios ---- */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Ejercicios</Text>
          {esPropia && (
            <TouchableOpacity style={styles.addBtn} onPress={abrirCatalogo} activeOpacity={0.85}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Añadir</Text>
            </TouchableOpacity>
          )}
        </View>

        {detail.exercises.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="dumbbell" size={42} color="#2a2a2a" />
            <Text style={styles.emptyTitle}>Rutina vacía</Text>
            <Text style={styles.emptyText}>
              {esPropia
                ? 'Añade ejercicios desde el catálogo para empezar a entrenar.'
                : 'El creador aún no ha añadido ejercicios.'}
            </Text>
            {esPropia && (
              <TouchableOpacity style={styles.emptyBtn} onPress={abrirCatalogo}>
                <Text style={styles.emptyBtnText}>Añadir ejercicios</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          detail.exercises.map((re, idx) => (
            <ExerciseRow
              key={re.id}
              index={idx + 1}
              re={re}
              canEdit={esPropia}
              onRemove={() => quitarEjercicio(re)}
              onOpenVideo={() => re.videoUrl && Linking.openURL(re.videoUrl)}
            />
          ))
        )}
      </ScrollView>

      {/* ---- Modal catálogo ---- */}
      <Modal transparent visible={catalogVisible} animationType="slide" onRequestClose={() => setCatalogVisible(false)}>
        <View style={styles.modalOverlay}>
          <LinearGradient colors={['#1e1e1e', '#121212']} style={styles.modalCardFull}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>Añadir ejercicio</Text>
              <TouchableOpacity onPress={() => setCatalogVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#555" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre o equipo..."
                placeholderTextColor="#555"
                value={busqueda}
                onChangeText={setBusqueda}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {GRUPOS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.chip, grupoFiltro === g && styles.chipActive]}
                  onPress={() => setGrupoFiltro(g)}
                >
                  <Text style={[styles.chipText, grupoFiltro === g && styles.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {cargandoCatalogo ? (
              <ActivityIndicator color="#4CAF50" style={{ marginTop: 30 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {filtrados.length === 0 ? (
                  <Text style={styles.noContent}>No hay ejercicios que coincidan.</Text>
                ) : (
                  filtrados.map((ex) => (
                    <TouchableOpacity
                      key={ex.id}
                      style={styles.catalogItem}
                      activeOpacity={0.85}
                      onPress={() => seleccionar(ex)}
                    >
                      <View style={styles.catalogIcon}>
                        <MaterialCommunityIcons name="dumbbell" size={18} color="#4CAF50" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.catalogItemName}>{ex.name}</Text>
                        <Text style={styles.catalogItemMeta}>
                          {ex.muscleGroup || '—'}
                          {ex.equipment ? `  •  ${ex.equipment}` : ''}
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={22} color="#4CAF50" />
                    </TouchableOpacity>
                  ))
                )}
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </LinearGradient>
        </View>
      </Modal>

      {/* ---- Modal parámetros (series / reps / descanso) ---- */}
      <Modal transparent visible={paramsVisible} animationType="slide" onRequestClose={() => setParamsVisible(false)}>
        <View style={styles.modalOverlay}>
          <LinearGradient colors={['#1e1e1e', '#121212']} style={styles.modalCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>{selected?.name || 'Configurar'}</Text>
              <TouchableOpacity onPress={() => setParamsVisible(false)} disabled={guardando}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Define series, repeticiones y descanso</Text>

            <View style={styles.threeCol}>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Series</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={sets}
                  onChangeText={setSets}
                  keyboardType="numeric"
                  placeholder="3"
                  placeholderTextColor="#444"
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Reps</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={reps}
                  onChangeText={setReps}
                  placeholder="8-12"
                  placeholderTextColor="#444"
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Descanso (s)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={rest}
                  onChangeText={setRest}
                  keyboardType="numeric"
                  placeholder="60"
                  placeholderTextColor="#444"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Notas</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMulti]}
              value={notas}
              onChangeText={setNotas}
              placeholder="Tempo, técnica, etc."
              placeholderTextColor="#444"
              multiline
              maxLength={200}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setParamsVisible(false)} disabled={guardando}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, guardando && { opacity: 0.6 }]}
                onPress={confirmarAnadir}
                disabled={guardando}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.confirmGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {guardando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmBtnText}>Añadir</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// ---------- COMPONENTES ----------

function ExerciseRow({ index, re, canEdit, onRemove, onOpenVideo }) {
  return (
    <View style={styles.exerciseRow}>
      <View style={styles.indexCircle}>
        <Text style={styles.indexText}>{index}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.exerciseName}>{re.name}</Text>
        <Text style={styles.exerciseMeta}>
          {re.muscleGroup || '—'}
          {re.equipment ? `  •  ${re.equipment}` : ''}
        </Text>
        <View style={styles.exerciseStats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{re.sets}</Text>
            <Text style={styles.statLabel}>series</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{re.reps}</Text>
            <Text style={styles.statLabel}>reps</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{re.restSeconds}s</Text>
            <Text style={styles.statLabel}>descanso</Text>
          </View>
        </View>
        {re.notes ? <Text style={styles.notes}>“{re.notes}”</Text> : null}
      </View>
      <View style={{ gap: 8 }}>
        {re.videoUrl ? (
          <TouchableOpacity style={styles.iconBtn} onPress={onOpenVideo}>
            <Ionicons name="play" size={16} color="#4CAF50" />
          </TouchableOpacity>
        ) : null}
        {canEdit ? (
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#2a1a1a' }]} onPress={onRemove}>
            <Ionicons name="trash-outline" size={16} color="#FF5252" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// ---------- ESTILOS ----------

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 20, paddingBottom: 60 },

  headerCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 20,
  },
  headerBanner: {
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  author: { fontSize: 12, color: '#777', marginBottom: 12 },
  desc: { fontSize: 13, color: '#aaa', lineHeight: 19, marginBottom: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1a2a1a',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    borderWidth: 1, borderColor: '#2a3a2a',
  },
  tagText: { color: '#4CAF50', fontSize: 11, fontWeight: '600' },

  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14, marginTop: 4,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#4CAF50',
    textTransform: 'uppercase', letterSpacing: 1.2,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  exerciseRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  indexCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1a2a1a',
    borderWidth: 1, borderColor: '#2a3a2a',
    alignItems: 'center', justifyContent: 'center',
  },
  indexText: { color: '#4CAF50', fontSize: 13, fontWeight: '700' },
  exerciseName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  exerciseMeta: { fontSize: 11, color: '#777', marginBottom: 8 },
  exerciseStats: { flexDirection: 'row', gap: 14, marginBottom: 4 },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  statLabel: { color: '#666', fontSize: 11 },
  notes: { color: '#888', fontSize: 11, fontStyle: 'italic', marginTop: 4 },
  iconBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#1a2a1a',
    alignItems: 'center', justifyContent: 'center',
  },

  emptyCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginTop: 10, marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#777', textAlign: 'center', marginBottom: 16, lineHeight: 19 },
  emptyBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Modales
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 32,
    borderWidth: 1, borderColor: '#333',
  },
  modalCardFull: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 24,
    borderWidth: 1, borderColor: '#333',
    height: '88%',
  },
  modalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 19, fontWeight: 'bold', color: '#fff' },
  modalSub: { fontSize: 12, color: '#555', marginBottom: 18 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#2a2a2a', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#333',
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 13, padding: 0 },

  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: '#2a2a2a', borderRadius: 20, marginRight: 8,
    borderWidth: 1, borderColor: '#333',
  },
  chipActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  chipText: { color: '#888', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  noContent: { color: '#555', fontSize: 13, marginTop: 20, textAlign: 'center' },

  catalogItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1e1e1e',
    padding: 12, borderRadius: 14,
    borderWidth: 1, borderColor: '#2a2a2a',
    marginBottom: 8,
  },
  catalogIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#1a2a1a',
    alignItems: 'center', justifyContent: 'center',
  },
  catalogItemName: { color: '#fff', fontSize: 13, fontWeight: '700' },
  catalogItemMeta: { color: '#777', fontSize: 11, marginTop: 2 },

  threeCol: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  fieldLabel: { fontSize: 12, color: '#666', marginBottom: 8, letterSpacing: 0.3 },
  fieldInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontSize: 14,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
  },
  fieldInputMulti: { height: 70, textAlignVertical: 'top' },

  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, backgroundColor: '#2a2a2a', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  cancelBtnText: { color: '#888', fontSize: 14, fontWeight: '600' },
  confirmBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  confirmGradient: { paddingVertical: 15, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { getRoutines, createRoutine, deleteRoutine } from '../api';

const DIFICULTADES = ['Beginner', 'Intermediate', 'Advanced'];
const OBJETIVOS = ['Fuerza', 'Hipertrofia', 'Pérdida de peso', 'Resistencia', 'Movilidad'];

export default function RoutinesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState('FREE');
  const [routines, setRoutines] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Campos del modal
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevaDesc, setNuevaDesc] = useState('');
  const [nuevaDificultad, setNuevaDificultad] = useState('Beginner');
  const [nuevoObjetivo, setNuevoObjetivo] = useState('Hipertrofia');
  const [nuevaPublica, setNuevaPublica] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        setCargando(true);
        try {
          const uid = await AsyncStorage.getItem('userId');
          const role = (await AsyncStorage.getItem('userRole')) || 'FREE';
          setUserId(uid);
          setUserRole(role);
          if (!uid) return;
          const data = await getRoutines(uid);
          setRoutines(data);
        } catch (e) {
          console.error(e);
          Alert.alert('Error', 'No se pudieron cargar las rutinas');
        } finally {
          setCargando(false);
        }
      };
      cargar();
    }, [])
  );

  const isTrainer = userRole === 'TRAINER';

  const resetModal = () => {
    setNuevoTitulo('');
    setNuevaDesc('');
    setNuevaDificultad('Beginner');
    setNuevoObjetivo('Hipertrofia');
    setNuevaPublica(false);
  };

  const handleCrear = async () => {
    if (!nuevoTitulo.trim()) {
      Alert.alert('Campo obligatorio', 'El título es necesario');
      return;
    }
    setGuardando(true);
    try {
      await createRoutine(userId, {
        title: nuevoTitulo.trim(),
        description: nuevaDesc.trim() || null,
        difficulty: nuevaDificultad,
        goal: nuevoObjetivo,
        isPublic: isTrainer ? nuevaPublica : false,
      });
      setModalVisible(false);
      resetModal();
      const data = await getRoutines(userId);
      setRoutines(data);
      Alert.alert('¡Listo!', 'Rutina creada. Ahora añade tus ejercicios.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = (r) => {
    Alert.alert(
      'Eliminar rutina',
      `¿Seguro que quieres eliminar "${r.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRoutine(r.id, userId);
              setRoutines((prev) => prev.filter((x) => x.id !== r.id));
            } catch (e) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          },
        },
      ]
    );
  };

  const misRutinas = routines.filter((r) => String(r.creatorId) === String(userId));
  const rutinasPublicas = routines.filter((r) => String(r.creatorId) !== String(userId) && r.isPublic);

  return (
    <LinearGradient colors={['#0a0a0a', '#121212', '#1a1a2e']} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Cabecera ---- */}
        <View style={styles.pageHeader}>
          <View style={styles.headerIconWrap}>
            <MaterialCommunityIcons name="clipboard-text" size={26} color="#4CAF50" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Mis Rutinas</Text>
            <Text style={styles.pageSub}>
              {isTrainer ? 'Diseña y publica entrenamientos' : 'Tus entrenamientos guardados'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.publishBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.publishBtnText}>Crear</Text>
          </TouchableOpacity>
        </View>

        {/* ---- Acceso al catálogo de ejercicios ---- */}
        <TouchableOpacity
          style={styles.catalogBanner}
          onPress={() => navigation.navigate('Exercises')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#1a2a1a', '#1b5e20']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.catalogGradient}
          >
            <MaterialCommunityIcons name="dumbbell" size={24} color="#4CAF50" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.catalogTitle}>Catálogo de ejercicios</Text>
              <Text style={styles.catalogSub}>
                {isTrainer ? 'Consulta o crea nuevos ejercicios' : 'Explora todos los ejercicios disponibles'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#4CAF50" />
          </LinearGradient>
        </TouchableOpacity>

        {cargando ? (
          <ActivityIndicator color="#4CAF50" style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.sectionLabel}>Creadas por ti</Text>
            {misRutinas.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="clipboard-plus-outline" size={48} color="#2a2a2a" />
                <Text style={styles.emptyTitle}>Aún no has creado rutinas</Text>
                <Text style={styles.emptyText}>
                  Pulsa "Crear" y empieza a montar tu primer entreno.
                </Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalVisible(true)}>
                  <Text style={styles.emptyBtnText}>Crear mi primera rutina</Text>
                </TouchableOpacity>
              </View>
            ) : (
              misRutinas.map((r) => (
                <RoutineCard
                  key={r.id}
                  routine={r}
                  isOwner
                  onPress={() => navigation.navigate('RoutineDetail', { routineId: r.id })}
                  onDelete={() => handleEliminar(r)}
                />
              ))
            )}

            {rutinasPublicas.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Rutinas públicas</Text>
                {rutinasPublicas.map((r) => (
                  <RoutineCard
                    key={r.id}
                    routine={r}
                    onPress={() => navigation.navigate('RoutineDetail', { routineId: r.id })}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* ---- Modal crear rutina ---- */}
      <CreateRoutineModal
        visible={modalVisible}
        onClose={() => { setModalVisible(false); resetModal(); }}
        titulo={nuevoTitulo}
        setTitulo={setNuevoTitulo}
        desc={nuevaDesc}
        setDesc={setNuevaDesc}
        dificultad={nuevaDificultad}
        setDificultad={setNuevaDificultad}
        objetivo={nuevoObjetivo}
        setObjetivo={setNuevoObjetivo}
        publica={nuevaPublica}
        setPublica={setNuevaPublica}
        isTrainer={isTrainer}
        onCrear={handleCrear}
        guardando={guardando}
      />
    </LinearGradient>
  );
}

// ----------------- COMPONENTES -----------------

function RoutineCard({ routine, isOwner = false, onPress, onDelete }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.cardIcon}>
          <MaterialCommunityIcons name="clipboard-text" size={22} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{routine.title}</Text>
          <Text style={styles.cardAuthor}>
            {isOwner ? 'Tuya' : `Por ${routine.creatorName}`}
            {routine.isPublic && !isOwner ? '  •  Pública' : ''}
          </Text>
        </View>
        {isOwner && onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color="#FF5252" />
          </TouchableOpacity>
        )}
      </View>

      {routine.description ? (
        <Text style={styles.cardDesc} numberOfLines={2}>{routine.description}</Text>
      ) : null}

      <View style={styles.tagRow}>
        {routine.difficulty ? (
          <View style={styles.tag}>
            <MaterialCommunityIcons name="speedometer" size={12} color="#4CAF50" />
            <Text style={styles.tagText}>{routine.difficulty}</Text>
          </View>
        ) : null}
        {routine.goal ? (
          <View style={styles.tag}>
            <MaterialCommunityIcons name="target" size={12} color="#4FC3F7" />
            <Text style={[styles.tagText, { color: '#4FC3F7' }]}>{routine.goal}</Text>
          </View>
        ) : null}
        <View style={styles.tag}>
          <MaterialCommunityIcons name="dumbbell" size={12} color="#FFD700" />
          <Text style={[styles.tagText, { color: '#FFD700' }]}>
            {routine.exerciseCount} {routine.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CreateRoutineModal({
  visible, onClose, titulo, setTitulo, desc, setDesc,
  dificultad, setDificultad, objetivo, setObjetivo,
  publica, setPublica, isTrainer, onCrear, guardando,
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <LinearGradient colors={['#1e1e1e', '#121212']} style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>Nueva rutina</Text>
              <TouchableOpacity onPress={onClose} disabled={guardando}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Define el título y añade luego tus ejercicios</Text>

            <Text style={styles.fieldLabel}>Título *</Text>
            <TextInput
              style={styles.fieldInput}
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Ej: Push Pull Legs — lunes"
              placeholderTextColor="#444"
              maxLength={100}
            />

            <Text style={styles.fieldLabel}>Descripción</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMulti]}
              value={desc}
              onChangeText={setDesc}
              placeholder="Notas, objetivo del día, material necesario..."
              placeholderTextColor="#444"
              multiline
              numberOfLines={3}
              maxLength={300}
            />

            <Text style={styles.fieldLabel}>Dificultad</Text>
            <View style={styles.chipRow}>
              {DIFICULTADES.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, dificultad === d && styles.chipActive]}
                  onPress={() => setDificultad(d)}
                >
                  <Text style={[styles.chipText, dificultad === d && styles.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Objetivo</Text>
            <View style={styles.chipRow}>
              {OBJETIVOS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.chip, objetivo === g && styles.chipActive]}
                  onPress={() => setObjetivo(g)}
                >
                  <Text style={[styles.chipText, objetivo === g && styles.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {isTrainer && (
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Hacer pública</Text>
                  <Text style={styles.toggleHint}>Tus usuarios Premium podrán verla y copiarla</Text>
                </View>
                <Switch
                  value={publica}
                  onValueChange={setPublica}
                  trackColor={{ false: '#2a2a2a', true: '#2E7D32' }}
                  thumbColor={publica ? '#4CAF50' : '#666'}
                />
              </View>
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={guardando}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, guardando && { opacity: 0.6 }]}
                onPress={onCrear}
                disabled={guardando}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.confirmGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {guardando ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Crear rutina</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
}

// ----------------- ESTILOS -----------------

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 20, paddingBottom: 60 },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 22,
  },
  headerIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#1a2a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3a2a',
  },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  pageSub: { fontSize: 12, color: '#666' },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  publishBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  catalogBanner: { borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  catalogGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a3a2a',
    borderRadius: 16,
  },
  catalogTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  catalogSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4CAF50',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 14,
    marginTop: 4,
  },

  // Tarjeta de rutina
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  cardIcon: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  cardAuthor: { fontSize: 12, color: '#777' },
  cardDesc: { fontSize: 13, color: '#999', marginBottom: 10, lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1a2a1a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a3a2a',
  },
  tagText: { color: '#4CAF50', fontSize: 11, fontWeight: '600' },
  deleteBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#2a1a1a',
    justifyContent: 'center', alignItems: 'center',
  },

  // Empty state
  emptyCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 12, marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#777', textAlign: 'center', marginBottom: 18, lineHeight: 19 },
  emptyBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 32,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: '92%',
  },
  modalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  modalSub: { fontSize: 12, color: '#555', marginBottom: 22 },
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
  fieldInputMulti: { height: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  chipActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  chipText: { color: '#888', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
  },
  toggleLabel: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  toggleHint: { color: '#666', fontSize: 11 },

  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#888', fontSize: 14, fontWeight: '600' },
  confirmBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  confirmGradient: { paddingVertical: 15, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

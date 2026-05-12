import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Linking, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import {
  getRoutineDetail,
  getExercises,
  addExerciseToRoutine,
  removeExerciseFromRoutine,
} from '../api';
import AppLayout, { theme } from './AppLayout';

const GRUPOS = ['Todos', 'PECHO', 'ESPALDA', 'PIERNAS', 'HOMBROS', 'BRAZOS', 'CORE', 'CARDIO'];

export default function RoutineDetailScreen({ route, navigation }) {
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
  const [selected, setSelected] = useState(null);
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [rest, setRest] = useState('60');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Custom Confirmation Modals
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      const uid = await AsyncStorage.getItem('userId');
      setUserId(uid);
      const data = await getRoutineDetail(routineId, uid);
      setDetail(data);
    } catch (e) {
      console.error("Error cargando rutina", e);
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
    setSelectedExercise(re);
    setDeleteConfirmVisible(true);
  };

  const executeRemove = async () => {
    if (!selectedExercise) return;
    try {
      await removeExerciseFromRoutine(routineId, selectedExercise.id, userId);
      setDeleteConfirmVisible(false);
      cargar();
    } catch (e) {
      Alert.alert('Error', 'No se pudo quitar el ejercicio');
    }
  };

  const filtrados = catalogo.filter((ex) => {
    const byGroup = grupoFiltro === 'Todos' || (ex.muscleGroup && ex.muscleGroup.toUpperCase() === grupoFiltro);
    const q = busqueda.trim().toLowerCase();
    const byText = !q || ex.name.toLowerCase().includes(q) || (ex.equipment || '').toLowerCase().includes(q);
    return byGroup && byText;
  });

  if (cargando || !detail) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.brand} size="large" />
      </View>
    );
  }

  return (
    <AppLayout title="Detalle Rutina" navigation={navigation} showBackButton={true}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Banner Rutina */}
        <View style={styles.headerCard}>
          <LinearGradient colors={[theme.brand, '#15803d']} style={styles.headerBanner}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={44} color="#fff" />
          </LinearGradient>
          <View style={styles.headerBody}>
            <Text style={styles.title}>{detail.title}</Text>
            <View style={styles.authorRow}>
               <Text style={styles.authorText}>Creada por {esPropia ? 'ti' : detail.creatorName}</Text>
               {detail.isPublic && (
                  <View style={styles.publicBadge}>
                    <Text style={styles.publicText}>Pública</Text>
                  </View>
               )}
            </View>

            {detail.description && (
              <Text style={styles.descText}>{detail.description}</Text>
            )}

            <View style={styles.tagsRow}>
               <View style={styles.tag}>
                  <MaterialCommunityIcons name="speedometer" size={14} color={theme.brand} />
                  <Text style={styles.tagText}>{detail.difficulty || 'Media'}</Text>
               </View>
               <View style={styles.tag}>
                  <MaterialCommunityIcons name="target" size={14} color="#4FC3F7" />
                  <Text style={[styles.tagText, {color: '#4FC3F7'}]}>{detail.goal || 'General'}</Text>
               </View>
               <View style={styles.tag}>
                  <MaterialCommunityIcons name="dumbbell" size={14} color="#FFD700" />
                  <Text style={[styles.tagText, {color: '#FFD700'}]}>{detail.exercises.length} Ejercicios</Text>
               </View>
            </View>
          </View>
        </View>

        {/* Lista de Ejercicios */}
        <View style={styles.sectionHeader}>
           <Text style={styles.sectionLabel}>Plan de Entrenamiento</Text>
           {esPropia && (
             <TouchableOpacity style={styles.addBtn} onPress={abrirCatalogo}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addBtnText}>Añadir</Text>
             </TouchableOpacity>
           )}
        </View>

        {detail.exercises.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="dumbbell" size={48} color={theme.borderDefault} />
            <Text style={styles.emptyTitle}>Rutina vacía</Text>
            <Text style={styles.emptyText}>{esPropia ? 'Personaliza tu rutina añadiendo ejercicios del catálogo.' : 'Esta rutina no tiene ejercicios asignados.'}</Text>
            {esPropia && (
              <TouchableOpacity style={styles.emptyBtn} onPress={abrirCatalogo}>
                <Text style={styles.emptyBtnText}>Explorar Catálogo</Text>
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

      {/* Modal Catálogo */}
      <Modal transparent visible={catalogVisible} animationType="slide">
        <View style={styles.modalOverlay}>
           <View style={styles.catalogModal}>
              <View style={styles.modalHeader}>
                 <Text style={styles.modalTitle}>Catálogo de Ejercicios</Text>
                 <TouchableOpacity onPress={() => setCatalogVisible(false)}>
                    <Ionicons name="close" size={26} color="#fff" />
                 </TouchableOpacity>
              </View>

              <View style={styles.searchBarWrap}>
                 <Ionicons name="search" size={20} color="#666" style={{marginRight: 10}} />
                 <TextInput
                    style={styles.searchField}
                    placeholder="Buscar ejercicio..."
                    placeholderTextColor="#444"
                    value={busqueda}
                    onChangeText={setBusqueda}
                 />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                 {GRUPOS.map(g => (
                   <TouchableOpacity
                      key={g}
                      style={[styles.filterChip, grupoFiltro === g && styles.filterChipActive]}
                      onPress={() => setGrupoFiltro(g)}
                   >
                      <Text style={[styles.filterChipText, grupoFiltro === g && {color: '#fff'}]}>{g}</Text>
                   </TouchableOpacity>
                 ))}
              </ScrollView>

              {cargandoCatalogo ? (
                <ActivityIndicator color={theme.brand} style={{marginTop: 40}} />
              ) : (
                <ScrollView contentContainerStyle={{paddingBottom: 20}}>
                   {filtrados.map(ex => (
                     <TouchableOpacity key={ex.id} style={styles.catalogItem} onPress={() => seleccionar(ex)}>
                        <View style={styles.catalogIconWrap}>
                           <MaterialCommunityIcons name="dumbbell" size={20} color={theme.brand} />
                        </View>
                        <View style={{flex: 1}}>
                           <Text style={styles.catalogName}>{ex.name}</Text>
                           <Text style={styles.catalogMeta}>{ex.muscleGroup} • {ex.equipment || 'Libre'}</Text>
                        </View>
                        <Ionicons name="add-circle-outline" size={24} color={theme.brand} />
                     </TouchableOpacity>
                   ))}
                </ScrollView>
              )}
           </View>
        </View>
      </Modal>

      {/* Modal Parámetros */}
      <Modal transparent visible={paramsVisible} animationType="fade">
        <View style={styles.modalOverlayCenter}>
           <View style={styles.paramsCard}>
              <Text style={styles.paramsTitle}>{selected?.name}</Text>
              <Text style={styles.paramsSub}>Configura los objetivos de este ejercicio</Text>

              <View style={styles.gridParams}>
                 <View style={styles.paramCol}>
                    <Text style={styles.paramLabel}>Series</Text>
                    <TextInput style={styles.paramInput} value={sets} onChangeText={setSets} keyboardType="numeric" />
                 </View>
                 <View style={styles.paramCol}>
                    <Text style={styles.paramLabel}>Reps</Text>
                    <TextInput style={styles.paramInput} value={reps} onChangeText={setReps} />
                 </View>
                 <View style={styles.paramCol}>
                    <Text style={styles.paramLabel}>Descanso (s)</Text>
                    <TextInput style={styles.paramInput} value={rest} onChangeText={setRest} keyboardType="numeric" />
                 </View>
              </View>

              <Text style={styles.paramLabel}>Notas Adicionales</Text>
              <TextInput
                style={styles.notesInput}
                value={notas}
                onChangeText={setNotas}
                placeholder="Ej: Controlar la fase excéntrica..."
                placeholderTextColor="#444"
                multiline
              />

              <View style={styles.modalActions}>
                 <TouchableOpacity style={styles.btnCancel} onPress={() => setParamsVisible(false)}>
                    <Text style={{color: '#888', fontWeight: '700'}}>Cancelar</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={styles.btnSave} onPress={confirmarAnadir} disabled={guardando}>
                    <LinearGradient colors={[theme.brand, '#15803d']} style={styles.btnSaveGradient}>
                       {guardando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{color: '#fff', fontWeight: '800'}}>Añadir Ejercicio</Text>}
                    </LinearGradient>
                 </TouchableOpacity>
              </View>
           </View>
        </View>
      </Modal>

      {/* Confirmación Borrado */}
      <Modal visible={deleteConfirmVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
           <View style={styles.deleteCard}>
              <MaterialCommunityIcons name="trash-can-outline" size={40} color={theme.danger} />
              <Text style={styles.deleteTitle}>¿Eliminar Ejercicio?</Text>
              <Text style={styles.deleteDesc}>Se quitará de la rutina permanentemente.</Text>
              <View style={styles.deleteActions}>
                 <TouchableOpacity style={styles.btnCancel} onPress={() => setDeleteConfirmVisible(false)}><Text style={{color: '#888'}}>No, volver</Text></TouchableOpacity>
                 <TouchableOpacity style={[styles.btnSave, {backgroundColor: theme.danger}]} onPress={executeRemove}><Text style={{color: '#fff', fontWeight: '700'}}>Sí, eliminar</Text></TouchableOpacity>
              </View>
           </View>
        </View>
      </Modal>

    </AppLayout>
  );
}

function ExerciseRow({ index, re, canEdit, onRemove, onOpenVideo }) {
  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <View style={styles.indexBadge}><Text style={styles.indexNum}>{index}</Text></View>
        <View style={{flex: 1}}>
          <Text style={styles.exName}>{re.name}</Text>
          <Text style={styles.exMeta}>{re.muscleGroup} • {re.equipment || 'Libre'}</Text>
        </View>
        {re.videoUrl && (
          <TouchableOpacity onPress={onOpenVideo} style={styles.videoBtn}>
            <Ionicons name="play" size={14} color={theme.brand} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.exStatsGrid}>
         <View style={styles.exStat}><Text style={styles.exStatVal}>{re.sets}</Text><Text style={styles.exStatLab}>Series</Text></View>
         <View style={styles.exStat}><Text style={styles.exStatVal}>{re.reps}</Text><Text style={styles.exStatLab}>Reps</Text></View>
         <View style={styles.exStat}><Text style={styles.exStatVal}>{re.restSeconds}s</Text><Text style={styles.exStatLab}>Rest</Text></View>
      </View>

      {re.notes && <Text style={styles.exNotes}>“{re.notes}”</Text>}

      {canEdit && (
        <TouchableOpacity style={styles.deleteExBtn} onPress={onRemove}>
          <Ionicons name="trash-outline" size={16} color={theme.danger} />
          <Text style={{color: theme.danger, fontSize: 12, fontWeight: '700', marginLeft: 4}}>Quitar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bgPrimary },
  container: { padding: 20, paddingBottom: 40 },
  headerCard: {
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 24, overflow: 'hidden',
    borderWidth: 1, borderColor: theme.borderDefault,
    marginBottom: 24,
  },
  headerBanner: { height: 100, justifyContent: 'center', alignItems: 'center' },
  headerBody: { padding: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  authorText: { color: theme.textBody, fontSize: 13, fontWeight: '600' },
  publicBadge: { backgroundColor: theme.brandSofter, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  publicText: { color: theme.brand, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  descText: { color: theme.textBody, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  tagText: { color: theme.brand, fontSize: 12, fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: theme.textBrand, textTransform: 'uppercase', letterSpacing: 1.5 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.brand, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  emptyCard: { alignItems: 'center', paddingVertical: 40, backgroundColor: theme.bgSecondarySoft, borderRadius: 20, borderWidth: 1, borderColor: theme.borderDefault },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 12, marginBottom: 4 },
  emptyText: { color: theme.textBody, fontSize: 14, textAlign: 'center', maxWidth: 220, marginBottom: 20 },
  emptyBtn: { backgroundColor: theme.brand, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700' },

  exerciseCard: {
    backgroundColor: theme.bgSecondarySoft, borderRadius: 20,
    padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: theme.borderDefault,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  indexBadge: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.brandSofter, justifyContent: 'center', alignItems: 'center' },
  indexNum: { color: theme.brand, fontWeight: '800', fontSize: 14 },
  exName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  exMeta: { color: theme.textBody, fontSize: 12, marginTop: 2 },
  videoBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  exStatsGrid: { flexDirection: 'row', gap: 20, marginBottom: 12, paddingHorizontal: 4 },
  exStat: { alignItems: 'flex-start' },
  exStatVal: { color: '#fff', fontSize: 15, fontWeight: '800' },
  exStatLab: { color: theme.textBody, fontSize: 10, textTransform: 'uppercase', marginTop: 2 },
  exNotes: { color: '#888', fontSize: 12, fontStyle: 'italic', backgroundColor: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 10, marginBottom: 12 },
  deleteExBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', padding: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  catalogModal: { height: '90%', backgroundColor: theme.bgSecondarySoft, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, borderWidth: 1, borderColor: theme.borderDefault },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  searchBarWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgPrimary, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, borderWidth: 1, borderColor: theme.borderDefault },
  searchField: { flex: 1, color: '#fff', fontSize: 15 },
  filterRow: { flexDirection: 'row', marginBottom: 20 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.bgPrimary, marginRight: 8, borderWidth: 1, borderColor: theme.borderDefault },
  filterChipActive: { backgroundColor: theme.brand, borderColor: theme.brand },
  filterChipText: { color: theme.textBody, fontSize: 12, fontWeight: '700' },
  catalogItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.borderDefault },
  catalogIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.brandSofter, justifyContent: 'center', alignItems: 'center' },
  catalogName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  catalogMeta: { color: theme.textBody, fontSize: 11, marginTop: 2 },

  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  paramsCard: { width: '100%', maxWidth: 400, backgroundColor: theme.bgSecondarySoft, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: theme.borderDefault },
  paramsTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  paramsSub: { color: theme.textBody, fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  gridParams: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  paramCol: { flex: 1 },
  paramLabel: { color: theme.textBody, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  paramInput: { backgroundColor: theme.bgPrimary, borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'center', borderWidth: 1, borderColor: theme.borderDefault },
  notesInput: { backgroundColor: theme.bgPrimary, borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: theme.borderDefault, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  btnCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: theme.bgPrimary },
  btnSave: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  btnSaveGradient: { paddingVertical: 14, alignItems: 'center' },

  deleteCard: { width: '100%', maxWidth: 320, backgroundColor: theme.bgSecondarySoft, borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: theme.borderDefault },
  deleteTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 12 },
  deleteDesc: { color: theme.textBody, fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 24 },
  deleteActions: { flexDirection: 'row', gap: 12 },
});

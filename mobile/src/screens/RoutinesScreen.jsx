import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { getRoutines, createRoutine, deleteRoutine } from '../api';
import AppLayout, { theme } from './AppLayout';
import { RoutineCard, CreateRoutineModal } from '../components/routines';

export default function RoutinesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState('FREE');
  const [routines, setRoutines] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Custom Actions Modals
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  
  // Alert Modal
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMsg, setAlertMsg] = useState('');

  // Campos del modal
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevaDesc, setNuevaDesc] = useState('');
  const [nuevaDificultad, setNuevaDificultad] = useState('Beginner');
  const [nuevoObjetivo, setNuevoObjetivo] = useState('Hipertrofia');
  const [nuevaPremium, setNuevaPremium] = useState(true);

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
          setAlertTitle('Error');
          setAlertMsg('No se pudieron cargar las rutinas');
          setAlertVisible(true);
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
    setNuevaPremium(true);
  };

  const handleCrear = async () => {
    if (!nuevoTitulo.trim()) {
      setAlertTitle('Campo obligatorio');
      setAlertMsg('Indica un nombre para la rutina');
      setAlertVisible(true);
      return;
    }
    setGuardando(true);
    try {
      await createRoutine(userId, {
        title: nuevoTitulo.trim(),
        description: nuevaDesc.trim() || null,
        difficulty: nuevaDificultad,
        goal: nuevoObjetivo,
        // Las rutinas del entrenador siempre son públicas (igual que sus vídeos).
        // El único interruptor que ve el entrenador decide si son Premium o Gratis.
        isPublic: isTrainer ? true : false,
        isPremium: isTrainer ? nuevaPremium : false,
      });
      setModalVisible(false);
      resetModal();
      const data = await getRoutines(userId);
      setRoutines(data);
      setAlertTitle('Listo');
      setAlertMsg('Rutina creada. Ahora añade tus ejercicios.');
      setAlertVisible(true);
    } catch (e) {
      setAlertTitle('Error');
      setAlertMsg(e.message);
      setAlertVisible(true);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = (r) => {
    setSelectedRoutine(r);
    setDeleteConfirmVisible(true);
  };

  const executeDelete = async () => {
    if (!selectedRoutine) return;
    try {
      await deleteRoutine(selectedRoutine.id, userId);
      setRoutines((prev) => prev.filter((x) => x.id !== selectedRoutine.id));
      setDeleteConfirmVisible(false);
    } catch (e) {
      if (Platform.OS === 'web') alert('No se pudo eliminar');
      else Alert.alert('Error', 'No se pudo eliminar');
    }
  };

  const misRutinas = routines.filter((r) => String(r.creatorId) === String(userId));
  const rutinasPublicas = routines.filter((r) => String(r.creatorId) !== String(userId) && r.isPublic);

  return (
    <AppLayout title="Rutinas" navigation={navigation} showBackButton={true}>
      <ScrollView
        contentContainerStyle={[styles.container]}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Cabecera ---- */}
        <View style={styles.pageHeader}>
          <View style={styles.headerIconWrap}>
            <MaterialCommunityIcons name="clipboard-text" size={26} color={theme.brand} />
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
            colors={[theme.brandSofter, 'rgba(21,128,61,0.2)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.catalogGradient}
          >
            <MaterialCommunityIcons name="dumbbell" size={24} color={theme.brand} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.catalogTitle}>Catálogo de ejercicios</Text>
              <Text style={styles.catalogSub}>
                {isTrainer ? 'Consulta o crea nuevos ejercicios' : 'Explora todos los ejercicios disponibles'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.brand} />
          </LinearGradient>
        </TouchableOpacity>

        {cargando ? (
          <ActivityIndicator color={theme.brand} style={{ marginTop: 40 }} />
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
        premium={nuevaPremium}
        setPremium={setNuevaPremium}
        isTrainer={isTrainer}
        onCrear={handleCrear}
        guardando={guardando}
      />

      {/* Modal de Confirmacion de Borrado */}
      <Modal
        visible={deleteConfirmVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.modalOverlayGeneric}>
          <View style={styles.confirmBox}>
            <MaterialCommunityIcons name="alert-circle" size={48} color="#FF5252" style={{ marginBottom: 16 }} />
            <Text style={styles.confirmTitle}>¿Eliminar rutina?</Text>
            <Text style={styles.confirmDesc}>Esta accion no se puede deshacer. Se borraran todos los ejercicios que contiene.</Text>
            
            <View style={styles.confirmFooter}>
              <TouchableOpacity 
                style={[styles.confirmBtnCancel, { flex: 1 }]} 
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={styles.confirmBtnCancelText}>No, mantener</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmBtnDelete} 
                onPress={executeDelete}
              >
                <Text style={styles.confirmBtnDeleteText}>Si, eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Alerta Personalizado (Error/Exito) */}
      <Modal
        visible={alertVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={styles.modalOverlayGeneric}>
          <View style={styles.confirmBox}>
            <MaterialCommunityIcons 
              name={alertTitle === 'Error' ? "alert-circle" : (alertTitle === 'Campo obligatorio' || alertTitle === 'Aviso' ? "alert" : "check-circle")} 
              size={48} 
              color={alertTitle === 'Error' ? "#FF5252" : (alertTitle === 'Campo obligatorio' || alertTitle === 'Aviso' ? "#FFD700" : "#4CAF50")} 
              style={{ marginBottom: 16 }} 
            />
            <Text style={styles.confirmTitle}>{alertTitle}</Text>
            <Text style={styles.confirmDesc}>{alertMsg}</Text>
            
            <TouchableOpacity 
              style={[styles.confirmBtnCancel, { 
                width: '100%', 
                backgroundColor: alertTitle === 'Error' ? 'rgba(255,82,82,0.1)' : (alertTitle === 'Campo obligatorio' || alertTitle === 'Aviso' ? 'rgba(255,215,0,0.1)' : 'rgba(76,175,80,0.1)') 
              }]} 
              onPress={() => setAlertVisible(false)}
            >
              <Text style={[styles.confirmBtnCancelText, { 
                color: alertTitle === 'Error' ? '#FF5252' : (alertTitle === 'Campo obligatorio' || alertTitle === 'Aviso' ? '#FFD700' : '#4CAF50') 
              }]}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </AppLayout>
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
    backgroundColor: theme.brandSofter,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 2 },
  pageSub: { fontSize: 12, color: theme.textBody },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.brand,
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
    borderColor: theme.borderDefault,
    borderRadius: 16,
  },
  catalogTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  catalogSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textBrand,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 14,
    marginTop: 4,
  },

  // Tarjeta de rutina
  card: {
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.borderDefault,
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
  tagText: { color: theme.brand, fontSize: 11, fontWeight: '600' },
  deleteBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#2a1a1a',
    justifyContent: 'center', alignItems: 'center',
  },

  // Empty state
  emptyCard: {
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.borderDefault,
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 12, marginBottom: 6 },
  emptyText: { fontSize: 13, color: theme.textBody, textAlign: 'center', marginBottom: 18, lineHeight: 19 },
  emptyBtn: {
    backgroundColor: theme.brand,
    paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: theme.bgSecondarySoft,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 32,
    borderWidth: 1,
    borderColor: theme.borderDefault,
    maxHeight: '92%',
  },
  modalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  modalSub: { fontSize: 12, color: theme.textBody, marginBottom: 22 },
  fieldLabel: { fontSize: 12, color: theme.textBody, marginBottom: 8, letterSpacing: 0.3 },
  fieldInput: {
    backgroundColor: theme.bgPrimary,
    color: '#fff',
    fontSize: 14,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.borderDefault,
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
  chipActive: { backgroundColor: theme.brand, borderColor: theme.brand },
  chipText: { color: theme.textBody, fontSize: 12, fontWeight: '600' },
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

  // Estilos del único interruptor (estilo Videos)
  visibilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgPrimary,
    padding: 15,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  visibilityTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  visibilityDesc: { color: '#666', fontSize: 11 },
  toggleBtn: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 4,
    justifyContent: 'center',
  },
  toggleBtnOn: { backgroundColor: theme.brand },
  toggleBtnOff: { backgroundColor: '#444' },
  toggleCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleCircleOn: { alignSelf: 'flex-end' },
  toggleCircleOff: { alignSelf: 'flex-start' },

  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelBtnText: { color: theme.textBody, fontSize: 14, fontWeight: '600' },
  confirmBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  confirmGradient: { paddingVertical: 15, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Generic Modal Styles
  modalOverlayGeneric: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.85)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  confirmBox: {
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  confirmTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  confirmDesc: {
    color: theme.textBody,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmFooter: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmBtnCancel: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    minHeight: 48,
  },
  confirmBtnCancelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtnDelete: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.danger,
    justifyContent: 'center',
    minHeight: 48,
  },
  confirmBtnDeleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

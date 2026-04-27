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
import { getExercises, createExercise, deleteExercise } from '../api';

const GRUPOS = ['Todos', 'PECHO', 'ESPALDA', 'PIERNAS', 'HOMBROS', 'BRAZOS', 'CORE', 'CARDIO', 'FULL_BODY'];
const DIFICULTADES = ['Beginner', 'Intermediate', 'Advanced'];

export default function ExercisesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState('FREE');
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [grupo, setGrupo] = useState('Todos');

  // Modal crear ejercicio
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nName, setNName] = useState('');
  const [nDesc, setNDesc] = useState('');
  const [nGroup, setNGroup] = useState('PECHO');
  const [nDiff, setNDiff] = useState('Beginner');
  const [nEquip, setNEquip] = useState('');
  const [nUrl, setNUrl] = useState('');

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      const uid = await AsyncStorage.getItem('userId');
      const role = (await AsyncStorage.getItem('userRole')) || 'FREE';
      setUserId(uid);
      setUserRole(role);
      const data = await getExercises();
      setLista(data);
    } catch (e) {
      Alert.alert('Error', 'No se pudo cargar el catálogo');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const isTrainer = userRole === 'TRAINER';

  const resetModal = () => {
    setNName(''); setNDesc(''); setNGroup('PECHO');
    setNDiff('Beginner'); setNEquip(''); setNUrl('');
  };

  const crear = async () => {
    if (!nName.trim()) return Alert.alert('Campo obligatorio', 'Indica el nombre del ejercicio');
    setGuardando(true);
    try {
      await createExercise(userId, {
        name: nName.trim(),
        description: nDesc.trim() || null,
        muscleGroup: nGroup,
        difficulty: nDiff,
        equipment: nEquip.trim() || null,
        videoUrl: nUrl.trim() || null,
      });
      setModalVisible(false);
      resetModal();
      cargar();
      Alert.alert('¡Listo!', 'Ejercicio añadido al catálogo');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  };

  const borrar = (ex) => {
    Alert.alert(
      'Eliminar ejercicio',
      `¿Eliminar "${ex.name}" del catálogo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExercise(ex.id, userId);
              setLista((prev) => prev.filter((x) => x.id !== ex.id));
            } catch (e) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          },
        },
      ]
    );
  };

  const filtrados = lista.filter((ex) => {
    const byGroup = grupo === 'Todos' || (ex.muscleGroup && ex.muscleGroup.toUpperCase() === grupo);
    const q = busqueda.trim().toLowerCase();
    const byText = !q || ex.name.toLowerCase().includes(q) || (ex.equipment || '').toLowerCase().includes(q);
    return byGroup && byText;
  });

  return (
    <LinearGradient colors={['#0a0a0a', '#121212', '#1a1a2e']} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View style={styles.headerIconWrap}>
            <MaterialCommunityIcons name="dumbbell" size={26} color="#4CAF50" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Ejercicios</Text>
            <Text style={styles.pageSub}>
              {isTrainer ? 'Catálogo oficial + los que crees tú' : 'Catálogo completo de FitHub'}
            </Text>
          </View>
          {isTrainer && (
            <TouchableOpacity
              style={styles.publishBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.publishBtnText}>Crear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Buscador */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#555" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar ejercicio o equipo..."
            placeholderTextColor="#555"
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>

        {/* Filtro grupo muscular */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {GRUPOS.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.chip, grupo === g && styles.chipActive]}
              onPress={() => setGrupo(g)}
            >
              <Text style={[styles.chipText, grupo === g && styles.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {cargando ? (
          <ActivityIndicator color="#4CAF50" style={{ marginTop: 40 }} />
        ) : filtrados.length === 0 ? (
          <Text style={styles.noContent}>Ningún ejercicio coincide con tu búsqueda.</Text>
        ) : (
          filtrados.map((ex) => (
            <View key={ex.id} style={styles.card}>
              <View style={styles.cardIcon}>
                <MaterialCommunityIcons name="dumbbell" size={20} color="#4CAF50" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardName} numberOfLines={1}>{ex.name}</Text>
                  {!ex.creatorId ? (
                    <View style={styles.badgeOfficial}>
                      <Ionicons name="shield-checkmark" size={10} color="#4CAF50" />
                      <Text style={styles.badgeOfficialText}>Oficial</Text>
                    </View>
                  ) : (
                    <View style={styles.badgeTrainer}>
                      <MaterialCommunityIcons name="dumbbell" size={10} color="#4FC3F7" />
                      <Text style={styles.badgeTrainerText}>{ex.creatorName}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardMeta}>
                  {ex.muscleGroup || '—'}
                  {ex.equipment ? `  •  ${ex.equipment}` : ''}
                  {ex.difficulty ? `  •  ${ex.difficulty}` : ''}
                </Text>
                {ex.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>{ex.description}</Text>
                ) : null}
              </View>
              <View style={{ gap: 8 }}>
                {ex.videoUrl ? (
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => Linking.openURL(ex.videoUrl)}
                  >
                    <Ionicons name="play" size={16} color="#4CAF50" />
                  </TouchableOpacity>
                ) : null}
                {isTrainer && ex.creatorId && String(ex.creatorId) === String(userId) ? (
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: '#2a1a1a' }]}
                    onPress={() => borrar(ex)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FF5252" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal crear ejercicio */}
      <Modal transparent visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <LinearGradient colors={['#1e1e1e', '#121212']} style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalTopRow}>
                <Text style={styles.modalTitle}>Nuevo ejercicio</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} disabled={guardando}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSub}>Se sumará al catálogo y podrás añadirlo a rutinas</Text>

              <Text style={styles.fieldLabel}>Nombre *</Text>
              <TextInput
                style={styles.fieldInput}
                value={nName}
                onChangeText={setNName}
                placeholder="Ej: Press inclinado con mancuernas"
                placeholderTextColor="#444"
                maxLength={120}
              />

              <Text style={styles.fieldLabel}>Descripción</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputMulti]}
                value={nDesc}
                onChangeText={setNDesc}
                placeholder="Consejos de técnica, músculos implicados..."
                placeholderTextColor="#444"
                multiline
                maxLength={300}
              />

              <Text style={styles.fieldLabel}>Grupo muscular</Text>
              <View style={styles.chipRow}>
                {GRUPOS.slice(1).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, nGroup === g && styles.chipActive]}
                    onPress={() => setNGroup(g)}
                  >
                    <Text style={[styles.chipText, nGroup === g && styles.chipTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Dificultad</Text>
              <View style={styles.chipRow}>
                {DIFICULTADES.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, nDiff === d && styles.chipActive]}
                    onPress={() => setNDiff(d)}
                  >
                    <Text style={[styles.chipText, nDiff === d && styles.chipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Material</Text>
              <TextInput
                style={styles.fieldInput}
                value={nEquip}
                onChangeText={setNEquip}
                placeholder="Ej: Barra, Mancuernas, Peso corporal..."
                placeholderTextColor="#444"
                maxLength={80}
              />

              <Text style={styles.fieldLabel}>URL video (opcional)</Text>
              <TextInput
                style={styles.fieldInput}
                value={nUrl}
                onChangeText={setNUrl}
                placeholder="https://..."
                placeholderTextColor="#444"
                autoCapitalize="none"
                keyboardType="url"
              />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={guardando}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, guardando && { opacity: 0.6 }]}
                  onPress={crear}
                  disabled={guardando}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.confirmGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {guardando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmBtnText}>Crear ejercicio</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// --------- ESTILOS ---------

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 20, paddingBottom: 60 },

  pageHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20,
  },
  headerIconWrap: {
    width: 50, height: 50, borderRadius: 16,
    backgroundColor: '#1a2a1a',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#2a3a2a',
  },
  pageTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  pageSub: { fontSize: 12, color: '#666' },
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 12,
  },
  publishBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e1e1e', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#2a2a2a',
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, padding: 0 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: '#1e1e1e', borderRadius: 20, marginRight: 8,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  chipActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  chipText: { color: '#888', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  noContent: { color: '#555', fontSize: 13, marginTop: 20, textAlign: 'center' },

  card: {
    flexDirection: 'row', gap: 12,
    backgroundColor: '#1e1e1e',
    borderRadius: 16, padding: 14,
    marginBottom: 10,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  cardIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#1a2a1a',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardName: { color: '#fff', fontSize: 14, fontWeight: '700', flexShrink: 1 },
  cardMeta: { color: '#777', fontSize: 11, marginBottom: 4 },
  cardDesc: { color: '#999', fontSize: 12, lineHeight: 17 },

  badgeOfficial: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#1a2a1a',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    borderWidth: 1, borderColor: '#2a3a2a',
  },
  badgeOfficialText: { color: '#4CAF50', fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  badgeTrainer: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#1a1f2a',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    borderWidth: 1, borderColor: '#253040',
    maxWidth: 140,
  },
  badgeTrainerText: { color: '#4FC3F7', fontSize: 9, fontWeight: '700' },

  iconBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#1a2a1a',
    alignItems: 'center', justifyContent: 'center',
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 32,
    borderWidth: 1, borderColor: '#333',
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

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { getExercises, createExercise, deleteExercise } from '../api';
import AppLayout, { theme } from './AppLayout';

const GRUPOS = ['Todos', 'PECHO', 'ESPALDA', 'PIERNAS', 'HOMBROS', 'BRAZOS', 'CORE', 'CARDIO', 'FULL_BODY'];
const DIFICULTADES = ['Beginner', 'Intermediate', 'Advanced'];

export default function ExercisesScreen({ navigation }) {
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
  const [nNEquip, setNEquip] = useState('');
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
      console.error("Error cargando ejercicios", e);
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
    if (!nName.trim() || !nDesc.trim() || !nNEquip.trim()) {
      Alert.alert('Campos obligatorios', 'Indica el nombre, descripción y material necesario.');
      return;
    }
    
    setGuardando(true);
    try {
      await createExercise(userId, {
        name: nName.trim(),
        description: nDesc.trim(),
        muscleGroup: nGroup,
        difficulty: nDiff,
        equipment: nNEquip.trim(),
        videoUrl: nUrl.trim() || null,
      });
      setModalVisible(false);
      resetModal();
      cargar();
      Alert.alert('¡Listo!', 'El ejercicio se ha añadido al catálogo correctamente.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  };

  const borrar = (ex) => {
    Alert.alert(
      'Eliminar ejercicio',
      `¿Seguro que quieres eliminar "${ex.name}" del catálogo?`,
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
              Alert.alert('Error', 'No se pudo eliminar el ejercicio.');
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
    <AppLayout title="Ejercicios" navigation={navigation} showBackButton={true}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Banner Informativo */}
        <View style={styles.infoCard}>
           <View style={styles.infoIcon}>
              <MaterialCommunityIcons name="dumbbell" size={26} color={theme.textBrand} />
           </View>
           <View style={{flex: 1}}>
              <Text style={styles.infoTitle}>Biblioteca de Técnica</Text>
              <Text style={styles.infoDesc}>
                 {isTrainer ? 'Gestiona tus ejercicios personalizados y consulta el catálogo oficial.' : 'Aprende la ejecución correcta de cada ejercicio de nuestra base de datos.'}
              </Text>
           </View>
           {isTrainer && (
              <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
                 <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
           )}
        </View>

        {/* Buscador y Filtros */}
        <View style={styles.searchWrap}>
           <Ionicons name="search" size={18} color="#666" style={{marginRight: 10}} />
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
                style={[styles.filterChip, grupo === g && styles.filterChipActive]}
                onPress={() => setGrupo(g)}
             >
                <Text style={[styles.filterChipText, grupo === g && {color: '#fff'}]}>{g}</Text>
             </TouchableOpacity>
           ))}
        </ScrollView>

        {cargando ? (
           <ActivityIndicator color={theme.brand} style={{marginTop: 40}} />
        ) : filtrados.length === 0 ? (
           <View style={styles.emptyState}>
              <MaterialCommunityIcons name="cloud-search-outline" size={48} color={theme.borderDefault} />
              <Text style={styles.emptyText}>No hay resultados para tu búsqueda</Text>
           </View>
        ) : (
           filtrados.map(ex => (
             <TouchableOpacity key={ex.id} style={styles.exerciseCard} activeOpacity={0.9} onPress={() => ex.videoUrl && Linking.openURL(ex.videoUrl)}>
                <View style={styles.cardHeader}>
                   <View style={styles.cardIconWrap}>
                      <MaterialCommunityIcons name="dumbbell" size={20} color={theme.brand} />
                   </View>
                   <View style={{flex: 1}}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                        <Text style={styles.cardName}>{ex.name}</Text>
                        {!ex.creatorId && <MaterialCommunityIcons name="shield-check" size={14} color={theme.brand} />}
                      </View>
                      <Text style={styles.cardMeta}>{ex.muscleGroup} • {ex.equipment || 'Libre'}</Text>
                   </View>
                   {ex.videoUrl && <Ionicons name="play-circle" size={28} color={theme.brand} />}
                </View>

                {ex.description && (
                   <Text style={styles.cardDesc} numberOfLines={2}>{ex.description}</Text>
                )}

                <View style={styles.cardFooter}>
                   <View style={styles.diffBadge}>
                      <Text style={styles.diffText}>{ex.difficulty || 'Intermediate'}</Text>
                   </View>
                   {isTrainer && ex.creatorId && String(ex.creatorId) === String(userId) && (
                      <TouchableOpacity style={styles.deleteAction} onPress={() => borrar(ex)}>
                         <Ionicons name="trash-outline" size={16} color={theme.danger} />
                      </TouchableOpacity>
                   )}
                </View>
             </TouchableOpacity>
           ))
        )}

      </ScrollView>

      {/* Modal Crear Ejercicio */}
      <Modal transparent visible={modalVisible} animationType="slide">
        <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                 <Text style={styles.modalTitle}>Nuevo Ejercicio</Text>
                 <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={26} color="#fff" />
                 </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                 <Text style={styles.fieldLabel}>Nombre del Ejercicio *</Text>
                 <TextInput
                    style={styles.inputField}
                    value={nName}
                    onChangeText={setNName}
                    placeholder="Ej: Press Banca"
                    placeholderTextColor="#444"
                 />

                 <Text style={styles.fieldLabel}>Descripción / Técnica *</Text>
                 <TextInput
                    style={[styles.inputField, {height: 100, textAlignVertical: 'top'}]}
                    value={nDesc}
                    onChangeText={setNDesc}
                    placeholder="Instrucciones para la ejecución..."
                    placeholderTextColor="#444"
                    multiline
                 />

                 <Text style={styles.fieldLabel}>Grupo Muscular</Text>
                 <View style={styles.chipGrid}>
                    {GRUPOS.slice(1).map(g => (
                      <TouchableOpacity
                         key={g}
                         style={[styles.smallChip, nGroup === g && styles.smallChipActive]}
                         onPress={() => setNGroup(g)}
                      >
                         <Text style={[styles.smallChipText, nGroup === g && {color: '#fff'}]}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                 </View>

                 <Text style={styles.fieldLabel}>Material Necesario *</Text>
                 <TextInput
                    style={styles.inputField}
                    value={nNEquip}
                    onChangeText={setNEquip}
                    placeholder="Ej: Mancuernas, Barra..."
                    placeholderTextColor="#444"
                 />

                 <Text style={styles.fieldLabel}>Enlace a Video (Opcional)</Text>
                 <TextInput
                    style={styles.inputField}
                    value={nUrl}
                    onChangeText={setNUrl}
                    placeholder="https://youtube.com/..."
                    placeholderTextColor="#444"
                    autoCapitalize="none"
                 />

                 <TouchableOpacity style={styles.submitBtn} onPress={crear} disabled={guardando}>
                    <LinearGradient colors={[theme.brand, '#15803d']} style={styles.submitGradient}>
                       {guardando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitText}>Crear Ejercicio Profesional</Text>}
                    </LinearGradient>
                 </TouchableOpacity>
              </ScrollView>
           </View>
        </View>
      </Modal>

    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  infoCard: {
    backgroundColor: theme.bgSecondarySoft, borderRadius: 20,
    padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16,
    borderWidth: 1, borderColor: theme.borderDefault, marginBottom: 24,
  },
  infoIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: theme.brandSofter, justifyContent: 'center', alignItems: 'center' },
  infoTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  infoDesc: { color: theme.textBody, fontSize: 13, lineHeight: 18 },
  createBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.brand, justifyContent: 'center', alignItems: 'center' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bgSecondarySoft,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16,
    borderWidth: 1, borderColor: theme.borderDefault,
  },
  searchField: { flex: 1, color: '#fff', fontSize: 15 },

  filterRow: { flexDirection: 'row', marginBottom: 24 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.bgSecondarySoft, marginRight: 8, borderWidth: 1, borderColor: theme.borderDefault },
  filterChipActive: { backgroundColor: theme.brand, borderColor: theme.brand },
  filterChipText: { color: theme.textBody, fontSize: 12, fontWeight: '700' },

  exerciseCard: {
    backgroundColor: theme.bgSecondarySoft, borderRadius: 20,
    padding: 18, marginBottom: 16, borderWidth: 1, borderColor: theme.borderDefault,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  cardIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.brandSofter, justifyContent: 'center', alignItems: 'center' },
  cardName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cardMeta: { color: theme.textBody, fontSize: 12, marginTop: 2 },
  cardDesc: { color: '#888', fontSize: 13, lineHeight: 18, marginBottom: 14 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  diffBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  diffText: { color: theme.brand, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  deleteAction: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: theme.textBody, fontSize: 14, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContent: { height: '85%', backgroundColor: theme.bgSecondarySoft, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, borderWidth: 1, borderColor: theme.borderDefault },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  fieldLabel: { color: theme.textBody, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, marginTop: 16 },
  inputField: { backgroundColor: theme.bgPrimary, borderRadius: 14, padding: 16, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: theme.borderDefault },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: theme.bgPrimary, borderWidth: 1, borderColor: theme.borderDefault },
  smallChipActive: { backgroundColor: theme.brand, borderColor: theme.brand },
  smallChipText: { color: theme.textBody, fontSize: 11, fontWeight: '700' },
  submitBtn: { marginTop: 32, borderRadius: 16, overflow: 'hidden' },
  submitGradient: { paddingVertical: 18, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

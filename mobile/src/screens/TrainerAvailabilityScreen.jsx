import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { API_URL } from '../api';

const DIAS_SEMANA = [
  { en: 'MONDAY',    es: 'Lunes' },
  { en: 'TUESDAY',   es: 'Martes' },
  { en: 'WEDNESDAY', es: 'Miércoles' },
  { en: 'THURSDAY',  es: 'Jueves' },
  { en: 'FRIDAY',    es: 'Viernes' },
  { en: 'SATURDAY',  es: 'Sábado' },
  { en: 'SUNDAY',    es: 'Domingo' },
];

export default function TrainerAvailabilityScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [monitorId, setMonitorId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [disponibilidad, setDisponibilidad] = useState([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState(DIAS_SEMANA[0]);

  // Modal añadir franja
  const [modalVisible, setModalVisible] = useState(false);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('10:00');

  // Cargar monitorId del usuario logueado
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        setCargando(true);
        try {
          const userId = await AsyncStorage.getItem('userId');
          const res = await fetch(`${API_URL}/monitors/me`, {
            headers: { 'X-User-Id': userId },
          });
          if (!res.ok) throw new Error('No se encontró perfil de monitor');
          const data = await res.json();
          setMonitorId(data.monitorId);
          await cargarDisponibilidad(data.monitorId);
        } catch (e) {
          Alert.alert('Error', e.message || 'No se pudo cargar tu perfil de entrenador');
        } finally {
          setCargando(false);
        }
      };
      init();
    }, [])
  );

  const cargarDisponibilidad = async (mid) => {
    try {
      const res = await fetch(`${API_URL}/availability/${mid}`);
      if (res.ok) {
        const data = await res.json();
        setDisponibilidad(data);
      }
    } catch (e) {
      // Error silencioso, se muestra lista vacía
    }
  };

  // Franjas del día seleccionado (solo las activas)
  const franjasDelDia = disponibilidad.filter(
    (f) => f.dayOfWeek === diaSeleccionado.en && f.isAvailable
  );

  // Validar formato HH:mm
  const validarHora = (hora) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(hora);

  const handleAñadirFranja = async () => {
    if (!validarHora(horaInicio) || !validarHora(horaFin)) {
      Alert.alert('Formato incorrecto', 'Usa el formato HH:MM (ej: 09:00)');
      return;
    }
    if (horaInicio >= horaFin) {
      Alert.alert('Hora inválida', 'La hora de inicio debe ser anterior a la de fin');
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/availability/${monitorId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayOfWeek: diaSeleccionado.en,
          startTime: `${horaInicio}:00`,
          endTime: `${horaFin}:00`,
          isAvailable: true,
        }),
      });
      if (!res.ok) throw new Error('Error al guardar la franja');
      setModalVisible(false);
      await cargarDisponibilidad(monitorId);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarFranja = (franja) => {
    Alert.alert(
      'Eliminar franja',
      `¿Quieres eliminar el horario ${franja.startTime.substring(0, 5)} – ${franja.endTime.substring(0, 5)} del ${diaSeleccionado.es}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/availability/${monitorId}/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  dayOfWeek: franja.dayOfWeek,
                  startTime: franja.startTime,
                  endTime: franja.endTime,
                  isAvailable: false,
                }),
              });
              if (!res.ok) throw new Error('Error al eliminar');
              await cargarDisponibilidad(monitorId);
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  if (cargando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando tu perfil...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#0a0a0a', '#121212', '#1a1a2e']} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera */}
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <MaterialCommunityIcons name="clock-edit-outline" size={28} color="#4CAF50" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Mi Disponibilidad</Text>
            <Text style={styles.headerSub}>
              Publica los horarios en los que estás disponible
            </Text>
          </View>
        </View>

        {/* Selector de Día */}
        <Text style={styles.sectionLabel}>Día de la semana</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.diasRow}>
          {DIAS_SEMANA.map((dia) => {
            const activo = diaSeleccionado.en === dia.en;
            const tieneHorarios = disponibilidad.some(
              (f) => f.dayOfWeek === dia.en && f.isAvailable
            );
            return (
              <TouchableOpacity
                key={dia.en}
                style={[styles.diaBox, activo && styles.diaBoxActivo]}
                onPress={() => setDiaSeleccionado(dia)}
                activeOpacity={0.7}
              >
                <Text style={[styles.diaNombre, activo && styles.diaNombreActivo]}>
                  {dia.es.substring(0, 3)}
                </Text>
                {tieneHorarios && (
                  <View style={[styles.dotIndicator, activo && styles.dotIndicatorActivo]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Lista de franjas del día */}
        <View style={styles.franjasHeader}>
          <Text style={styles.sectionLabel}>
            Horarios — {diaSeleccionado.es}
          </Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setHoraInicio('09:00');
              setHoraFin('10:00');
              setModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Añadir</Text>
          </TouchableOpacity>
        </View>

        {franjasDelDia.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clock-remove-outline" size={48} color="#333" />
            <Text style={styles.emptyTitle}>Sin horarios</Text>
            <Text style={styles.emptyText}>
              Pulsa "Añadir" para publicar tu disponibilidad este día
            </Text>
          </View>
        ) : (
          franjasDelDia.map((franja) => (
            <View key={franja.id} style={styles.franjaCard}>
              <View style={styles.franjaLeft}>
                <MaterialCommunityIcons name="clock-outline" size={22} color="#4CAF50" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.franjaTime}>
                    {franja.startTime.substring(0, 5)} – {franja.endTime.substring(0, 5)}
                  </Text>
                  <Text style={styles.franjaDia}>{diaSeleccionado.es}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleEliminarFranja(franja)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color="#FF5252" />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Resumen global */}
        <View style={styles.resumenCard}>
          <Text style={styles.resumenTitle}>Resumen semanal</Text>
          {DIAS_SEMANA.map((dia) => {
            const franjas = disponibilidad.filter(
              (f) => f.dayOfWeek === dia.en && f.isAvailable
            );
            return (
              <View key={dia.en} style={styles.resumenRow}>
                <Text style={styles.resumenDia}>{dia.es}</Text>
                <Text style={styles.resumenCount}>
                  {franjas.length > 0
                    ? `${franjas.length} franja${franjas.length > 1 ? 's' : ''}`
                    : 'Sin horario'}
                </Text>
              </View>
            );
          })}
        </View>

      </ScrollView>

      {/* Modal Añadir Franja */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient colors={['#1e1e1e', '#121212']} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nueva franja horaria</Text>
            <Text style={styles.modalDia}>{diaSeleccionado.es}</Text>

            <View style={styles.timeRow}>
              <View style={styles.timeInputWrapper}>
                <Text style={styles.timeLabel}>Hora de inicio</Text>
                <TextInput
                  style={styles.timeInput}
                  value={horaInicio}
                  onChangeText={setHoraInicio}
                  placeholder="09:00"
                  placeholderTextColor="#555"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
              <MaterialCommunityIcons
                name="arrow-right"
                size={24}
                color="#555"
                style={{ marginTop: 28 }}
              />
              <View style={styles.timeInputWrapper}>
                <Text style={styles.timeLabel}>Hora de fin</Text>
                <TextInput
                  style={styles.timeInput}
                  value={horaFin}
                  onChangeText={setHoraFin}
                  placeholder="10:00"
                  placeholderTextColor="#555"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            </View>

            <Text style={styles.formatNote}>Formato: HH:MM (ej: 09:00, 14:30)</Text>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={guardando}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, guardando && { opacity: 0.6 }]}
                onPress={handleAñadirFranja}
                disabled={guardando}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#4CAF50', '#2E7D32']}
                  style={styles.confirmGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {guardando ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Guardar franja</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    gap: 16,
  },
  loadingText: { color: '#888', fontSize: 14 },

  container: { padding: 20, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
  },
  headerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#1a2a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3a2a',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  headerSub: { fontSize: 12, color: '#666' },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4CAF50',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  diasRow: { flexDirection: 'row', marginBottom: 24 },
  diaBox: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    minWidth: 60,
  },
  diaBoxActivo: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  diaNombre: { fontSize: 13, color: '#888', fontWeight: '600' },
  diaNombreActivo: { color: '#fff' },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginTop: 4,
  },
  dotIndicatorActivo: { backgroundColor: '#fff' },

  franjasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#555' },
  emptyText: { fontSize: 13, color: '#444', textAlign: 'center', maxWidth: 240 },

  franjaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  franjaLeft: { flexDirection: 'row', alignItems: 'center' },
  franjaTime: { fontSize: 16, fontWeight: '700', color: '#fff' },
  franjaDia: { fontSize: 12, color: '#666', marginTop: 2 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a2020',
  },

  resumenCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 18,
    padding: 20,
    marginTop: 28,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  resumenTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4CAF50',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  resumenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  resumenDia: { fontSize: 14, color: '#ccc', fontWeight: '500' },
  resumenCount: { fontSize: 14, color: '#666' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  modalDia: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 24,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 8,
  },
  timeInputWrapper: { flex: 1 },
  timeLabel: { fontSize: 12, color: '#666', marginBottom: 8 },
  timeInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    borderRadius: 14,
    padding: 16,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  formatNote: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#888', fontSize: 15, fontWeight: '600' },
  confirmBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  confirmGradient: { paddingVertical: 16, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { API_URL } from '../api';
import AppLayout, { theme } from './AppLayout';

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
  const [monitorId, setMonitorId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState(DIAS_SEMANA[0]);

  // Modal añadir franja
  const [modalVisible, setModalVisible] = useState(false);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('10:00');

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
      console.error("Error cargando disponibilidad", e);
    }
  };

  const franjasDelDia = disponibilidad.filter(
    (f) => f.dayOfWeek === diaSeleccionado.en && f.isAvailable
  );

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
        <ActivityIndicator size="large" color={theme.brand} />
      </View>
    );
  }

  return (
    <AppLayout title="Mi Disponibilidad" navigation={navigation} showBackButton={true}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Info Header */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <MaterialCommunityIcons name="calendar-clock" size={26} color={theme.textBrand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Agenda Semanal</Text>
            <Text style={styles.infoDesc}>Organiza tus horas de trabajo para que los clientes puedan reservar.</Text>
          </View>
        </View>

        {/* Selector de Día */}
        <Text style={styles.sectionLabel}>Selecciona el Día</Text>
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

        {/* Lista de franjas */}
        <View style={styles.franjasHeader}>
          <Text style={styles.sectionLabel}>Horarios ({diaSeleccionado.es})</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setHoraInicio('09:00');
              setHoraFin('10:00');
              setModalVisible(true);
            }}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Añadir</Text>
          </TouchableOpacity>
        </View>

        {franjasDelDia.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clock-remove-outline" size={48} color={theme.borderDefault} />
            <Text style={styles.emptyTitle}>Sin horarios definidos</Text>
            <Text style={styles.emptyText}>Pulsa en añadir para indicar que estás disponible este día.</Text>
          </View>
        ) : (
          franjasDelDia.map((franja) => (
            <View key={franja.id} style={styles.franjaCard}>
              <View style={styles.franjaLeft}>
                <View style={styles.clockIconWrap}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color={theme.brand} />
                </View>
                <View>
                  <Text style={styles.franjaTime}>
                    {franja.startTime.substring(0, 5)} – {franja.endTime.substring(0, 5)}
                  </Text>
                  <Text style={styles.franjaLabel}>Sesión de entrenamiento</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleEliminarFranja(franja)}
              >
                <Ionicons name="trash-outline" size={18} color={theme.danger} />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Resumen Semanal - Minimalista */}
        <View style={styles.resumenCard}>
          <Text style={styles.resumenTitle}>Horas Totales Semanales</Text>
          <View style={styles.resumenGrid}>
            {DIAS_SEMANA.map((dia) => {
              const count = disponibilidad.filter(f => f.dayOfWeek === dia.en && f.isAvailable).length;
              return (
                <View key={dia.en} style={styles.resumenItem}>
                  <Text style={[styles.resumenDayShort, count > 0 && {color: theme.brand}]}>{dia.es.substring(0, 1)}</Text>
                  <View style={[styles.resumenDot, count > 0 ? {backgroundColor: theme.brand} : {backgroundColor: 'rgba(255,255,255,0.1)'}]} />
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>

      {/* Modal Añadir */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Añadir Horario</Text>
              <Text style={styles.modalSub}>{diaSeleccionado.es}</Text>
            </View>

            <View style={styles.timeInputsRow}>
              <View style={styles.timeCol}>
                <Text style={styles.timeLabel}>Inicio</Text>
                <TextInput
                  style={styles.timeField}
                  value={horaInicio}
                  onChangeText={setHoraInicio}
                  placeholder="09:00"
                  placeholderTextColor="#444"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={{paddingTop: 35}}>
                <Ionicons name="arrow-forward" size={20} color="#444" />
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.timeLabel}>Fin</Text>
                <TextInput
                  style={styles.timeField}
                  value={horaFin}
                  onChangeText={setHoraFin}
                  placeholder="10:00"
                  placeholderTextColor="#444"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
               <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                 <Text style={{color: '#888', fontWeight: '600'}}>Cancelar</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.modalSave} onPress={handleAñadirFranja}>
                 <LinearGradient colors={[theme.brand, '#15803d']} style={styles.modalSaveGradient}>
                    {guardando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{color: '#fff', fontWeight: '700'}}>Guardar</Text>}
                 </LinearGradient>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </AppLayout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bgPrimary },
  container: { padding: 20, paddingBottom: 40 },
  infoCard: {
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: theme.borderDefault,
    marginBottom: 24,
  },
  infoIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: theme.brandSofter,
    justifyContent: 'center', alignItems: 'center',
  },
  infoTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  infoDesc: { color: theme.textBody, fontSize: 13, lineHeight: 18 },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: theme.textBrand,
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16,
  },

  diasRow: { flexDirection: 'row', marginBottom: 28 },
  diaBox: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 14, marginRight: 10,
    borderWidth: 1, borderColor: theme.borderDefault,
    alignItems: 'center', minWidth: 65,
  },
  diaBoxActivo: { backgroundColor: theme.brand, borderColor: theme.brand },
  diaNombre: { fontSize: 14, color: theme.textBody, fontWeight: '700' },
  diaNombreActivo: { color: '#fff' },
  dotIndicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.brand, marginTop: 6 },
  dotIndicatorActivo: { backgroundColor: '#fff' },

  franjasHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.brand, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  emptyText: { fontSize: 13, color: theme.textBody, textAlign: 'center', maxWidth: 220 },

  franjaCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.bgSecondarySoft, borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: theme.borderDefault,
  },
  franjaLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  clockIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: theme.brandSofter,
    justifyContent: 'center', alignItems: 'center',
  },
  franjaTime: { fontSize: 17, fontWeight: '800', color: '#fff' },
  franjaLabel: { fontSize: 12, color: theme.textBody, marginTop: 2 },
  deleteBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center', alignItems: 'center',
  },

  resumenCard: {
    backgroundColor: theme.bgSecondarySoft, borderRadius: 20,
    padding: 20, marginTop: 20,
    borderWidth: 1, borderColor: theme.borderDefault,
  },
  resumenTitle: { fontSize: 13, fontWeight: '800', color: '#fff', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 },
  resumenGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  resumenItem: { alignItems: 'center', gap: 10 },
  resumenDayShort: { fontSize: 12, color: '#444', fontWeight: '800' },
  resumenDot: { width: 8, height: 8, borderRadius: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: {
    width: '100%', maxWidth: 400,
    backgroundColor: theme.bgSecondarySoft,
    borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: theme.borderDefault,
  },
  modalHeader: { marginBottom: 24, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  modalSub: { fontSize: 14, color: theme.brand, fontWeight: '700', marginTop: 4 },
  timeInputsRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 30 },
  timeCol: { width: 100 },
  timeLabel: { color: theme.textBody, fontSize: 12, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  timeField: {
    backgroundColor: theme.bgPrimary, borderRadius: 12,
    color: '#fff', fontSize: 22, fontWeight: '800',
    paddingVertical: 12, textAlign: 'center',
    borderWidth: 1, borderColor: theme.borderDefault,
  },
  modalFooter: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: theme.bgPrimary },
  modalSave: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  modalSaveGradient: { paddingVertical: 14, alignItems: 'center' },
});

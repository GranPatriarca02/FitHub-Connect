// CreateRoutineModal.jsx
// ---------------------------------------------------------------
// Modal de creación de rutina. Componente controlado: el padre le
// pasa los valores y los setters, y este modal sólo dibuja la UI.
//
// Extraído desde RoutinesScreen.jsx para reutilizarlo desde
// SubscriberTrainingPlanScreen (crear rutinas personalizadas para
// un suscriptor) sin duplicar código.
//
// El padre decide qué hacer con los valores al pulsar "Crear":
// puede llamar a createRoutine(...) con isPublic: true (rutinas
// del catálogo) o con isPublic: false + assignedToUserId
// (rutinas exclusivas para un suscriptor).
//
// Opcionalmente acepta `title` y `subtitle` para personalizar la
// cabecera (p.ej. "Rutina personalizada para Lucía").
// ---------------------------------------------------------------

import React from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../screens/AppLayout';

const DIFICULTADES = ['Beginner', 'Intermediate', 'Advanced'];
const OBJETIVOS = ['Fuerza', 'Hipertrofia', 'Pérdida de peso', 'Resistencia', 'Movilidad'];

export default function CreateRoutineModal({
  visible, onClose,
  titulo, setTitulo,
  desc, setDesc,
  dificultad, setDificultad,
  objetivo, setObjetivo,
  premium, setPremium,
  isTrainer,
  hidePremium = false,
  onCrear,
  guardando,
  // Personalización opcional de cabecera
  title = 'Nueva rutina',
  subtitle = 'Define el título y añade luego tus ejercicios',
  ctaLabel = 'Crear rutina',
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <LinearGradient colors={['#1e1e1e', '#121212']} style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} disabled={guardando}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>{subtitle}</Text>

            {/* Único interruptor (estilo Videos) - en la parte SUPERIOR */}
            {isTrainer && !hidePremium && (
              <View style={styles.visibilityContainer}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.visibilityTitle}>¿Contenido Premium?</Text>
                  <Text style={styles.visibilityDesc}>
                    {premium
                      ? 'Solo usuarios suscritos podrán verla.'
                      : 'Todos los usuarios podrán verla (Promoción).'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setPremium(!premium)}
                  style={[styles.toggleBtn, premium ? styles.toggleBtnOn : styles.toggleBtnOff]}
                >
                  <View style={[styles.toggleCircle, premium ? styles.toggleCircleOn : styles.toggleCircleOff]} />
                </TouchableOpacity>
              </View>
            )}

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
                <LinearGradient colors={[theme.brand, '#15803d']} style={styles.confirmGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {guardando ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.confirmBtnText}>{ctaLabel}</Text>
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

const styles = StyleSheet.create({
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
});

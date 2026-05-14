// RoutineCard.jsx
// ---------------------------------------------------------------
// Tarjeta visual de una rutina. Componente puro/reutilizable.
//
// Extraído desde RoutinesScreen.jsx para poder reutilizarlo desde
// otras pantallas (p.ej. SubscriberTrainingPlanScreen) sin duplicar
// código. Mantiene la misma estética y los mismos estilos que en
// la pantalla original.
//
// Props
//   routine    : objeto rutina (id, title, description, difficulty,
//                goal, isPublic, isPremium, creatorName, exerciseCount...)
//   isOwner    : (bool) si la rutina pertenece al usuario actual
//   onPress    : handler tap tarjeta (apertura del detalle)
//   onDelete   : handler papelera (sólo si isOwner). Si no se pasa,
//                el icono se oculta.
//   rightSlot  : ReactNode opcional para inyectar acciones extra a
//                la derecha (ej: "Quitar asignación" en la vista de
//                plan de un suscriptor).
// ---------------------------------------------------------------

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '../../screens/AppLayout';

export default function RoutineCard({
  routine,
  isOwner = false,
  onPress,
  onDelete,
  rightSlot = null,
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <LinearGradient colors={[theme.brand, '#15803d']} style={styles.cardIcon}>
          <MaterialCommunityIcons name="clipboard-text" size={22} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{routine.title}</Text>
          <Text style={styles.cardAuthor}>
            {isOwner ? 'Tuya' : `Por ${routine.creatorName}`}
            {routine.isPublic && !isOwner ? '  •  Pública' : ''}
            {routine.isPremium && (
              <Text style={{ color: '#FFD700' }}>  •  Premium</Text>
            )}
          </Text>
        </View>
        {routine.isPremium && (
          <MaterialCommunityIcons name="crown" size={18} color="#FFD700" style={{ marginRight: 8 }} />
        )}
        {rightSlot}
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
            <MaterialCommunityIcons name="speedometer" size={12} color={theme.brand} />
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

const styles = StyleSheet.create({
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
});

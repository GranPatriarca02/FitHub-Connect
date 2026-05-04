// Cliente HTTP
// URL base

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getApiUrl = () => {
  // 1. Prioridad: Variables de entorno
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  // 2. WEB
  if (Platform.OS === 'web') {
    return 'http://localhost:8080';
  }

  // 3. ANDROID (Emulador)
  const isDevice = Constants.expoConfig?.extra?.eas?.projectId || Constants.deviceType === 'REAL';

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080';
  }

  return 'http://localhost:8080';
};

export const API_URL = getApiUrl();

/**
 * Obtiene la lista de todos los monitores
 * GET /monitors
 */
export async function getMonitors() {
  try {
    const response = await fetch(`${API_URL}/monitors`);
    if (!response.ok) {
      throw new Error(`Error al obtener monitores: ${response.status}`);
    }
    return response.json();
  } catch (err) {
    throw err;
  }
}

export async function getMonitorDetail(id) {
  const response = await fetch(`${API_URL}/monitors/${id}`);
  if (!response.ok) {
    throw new Error(`Error al obtener detalle del monitor: ${response.status}`);
  }
  return response.json();
}

export async function healthCheck() {
  try {
    const response = await fetch(`${API_URL}/`);
    return response.ok;
  } catch (err) {
    return false;
  }
}

// ======================================================
// RUTINAS Y EJERCICIOS
// ======================================================

// ---- RUTINAS ----

/**
 * Lista rutinas visibles para el usuario (propias + públicas).
 * GET /routines
 */
export async function getRoutines(userId) {
  const res = await fetch(`${API_URL}/routines`, {
    headers: { 'X-User-Id': String(userId) },
  });
  if (!res.ok) throw new Error(`Error al obtener rutinas: ${res.status}`);
  return res.json();
}

/**
 * Lista sólo las rutinas creadas por el usuario.
 * GET /routines/my
 */
export async function getMyRoutines(userId) {
  const res = await fetch(`${API_URL}/routines/my`, {
    headers: { 'X-User-Id': String(userId) },
  });
  if (!res.ok) throw new Error(`Error al obtener mis rutinas: ${res.status}`);
  return res.json();
}

/**
 * Detalle de una rutina con sus ejercicios.
 * GET /routines/{id}
 */
export async function getRoutineDetail(routineId, userId) {
  const res = await fetch(`${API_URL}/routines/${routineId}`, {
    headers: { 'X-User-Id': String(userId) },
  });
  if (!res.ok) throw new Error(`Error al obtener la rutina: ${res.status}`);
  return res.json();
}

/**
 * Crear una rutina.
 * POST /routines
 */
export async function createRoutine(userId, routine) {
  const res = await fetch(`${API_URL}/routines`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': String(userId),
    },
    body: JSON.stringify(routine),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error creando rutina: ${res.status}`);
  }
  return res.json();
}

/**
 * Eliminar una rutina.
 * DELETE /routines/{id}
 */
export async function deleteRoutine(routineId, userId) {
  const res = await fetch(`${API_URL}/routines/${routineId}`, {
    method: 'DELETE',
    headers: { 'X-User-Id': String(userId) },
  });
  if (!res.ok) throw new Error(`Error eliminando rutina: ${res.status}`);
  return res.json();
}

/**
 * Añadir un ejercicio existente a la rutina.
 * POST /routines/{id}/exercises
 */
export async function addExerciseToRoutine(routineId, userId, payload) {
  const res = await fetch(`${API_URL}/routines/${routineId}/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': String(userId),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error añadiendo ejercicio: ${res.status}`);
  }
  return res.json();
}

/**
 * Actualizar parámetros de un ejercicio dentro de la rutina.
 * PUT /routines/{id}/exercises/{reId}
 */
export async function updateRoutineExercise(routineId, reId, userId, payload) {
  const res = await fetch(`${API_URL}/routines/${routineId}/exercises/${reId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': String(userId),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Error actualizando ejercicio: ${res.status}`);
  return res.json();
}

/**
 * Retirar un ejercicio de la rutina.
 * DELETE /routines/{id}/exercises/{reId}
 */
export async function removeExerciseFromRoutine(routineId, reId, userId) {
  const res = await fetch(`${API_URL}/routines/${routineId}/exercises/${reId}`, {
    method: 'DELETE',
    headers: { 'X-User-Id': String(userId) },
  });
  if (!res.ok) throw new Error(`Error retirando ejercicio: ${res.status}`);
  return res.json();
}

// ---- EJERCICIOS ----

/**
 * Obtiene el catálogo de ejercicios.
 * GET /exercises  (opcional ?muscleGroup=PECHO)
 */
export async function getExercises(muscleGroup) {
  const qs = muscleGroup && muscleGroup !== 'Todos'
    ? `?muscleGroup=${encodeURIComponent(muscleGroup)}`
    : '';
  const res = await fetch(`${API_URL}/exercises${qs}`);
  if (!res.ok) throw new Error(`Error al obtener ejercicios: ${res.status}`);
  return res.json();
}

/**
 * Crea un nuevo ejercicio (solo TRAINER).
 * POST /exercises
 */
export async function createExercise(userId, exercise) {
  const res = await fetch(`${API_URL}/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': String(userId),
    },
    body: JSON.stringify(exercise),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error creando ejercicio: ${res.status}`);
  }
  return res.json();
}

/**
 * Elimina un ejercicio creado por el propio monitor.
 * DELETE /exercises/{id}
 */
export async function deleteExercise(exerciseId, userId) {
  const res = await fetch(`${API_URL}/exercises/${exerciseId}`, {
    method: 'DELETE',
    headers: { 'X-User-Id': String(userId) },
  });
  if (!res.ok) throw new Error(`Error eliminando ejercicio: ${res.status}`);
  return res.json();
}

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

/**
 * Borra una franja horaria del entrenador por su id.
 * DELETE /availability/{availabilityId}
 */
export async function deleteAvailability(availabilityId) {
  const res = await fetch(`${API_URL}/availability/${availabilityId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error eliminando franja: ${res.status}`);
  }
  // Devolver json si hay contenido, si no un objeto vacio
  return res.json().catch(() => ({ message: 'Eliminado' }));
}

// ======================================================
// SUSCRIPCIONES (lado usuario suscriptor)
// ======================================================

/**
 * Devuelve la lista de entrenadores a los que el usuario está suscrito.
 * GET /subscriptions/user/{userId}
 *
 * Respuesta esperada (cada item):
 *   { monitorId, monitorName, specialty, expiresAt, status }
 */
export async function getUserSubscriptions(userId) {
  try {
    const res = await fetch(`${API_URL}/subscriptions/user/${userId}`);
    if (!res.ok) {
      throw new Error(`Error al obtener suscripciones: ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    // Fallback con datos simulados para no bloquear la UI durante el desarrollo.
    console.warn('getUserSubscriptions fallback to mock:', err?.message);
    return _mockUserSubscriptions();
  }
}

function _mockUserSubscriptions() {
  const future = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();
  return [
    { monitorId: '1', monitorName: 'Alex Pérez',     specialty: 'Musculación', expiresAt: future(20), status: 'ACTIVE' },
    { monitorId: '2', monitorName: 'Sofía Martínez', specialty: 'Yoga',        expiresAt: future(8),  status: 'ACTIVE' },
    { monitorId: '3', monitorName: 'Diego Herrera',  specialty: 'HIIT',        expiresAt: future(45), status: 'ACTIVE' },
  ];
}

// ======================================================
// SUSCRIPTORES (lado entrenador)
// ======================================================

/**
 * Devuelve la lista de usuarios suscritos al entrenador autenticado.
 * GET /subscriptions/trainer/{trainerUserId}
 *
 * El endpoint del backend localiza el Monitor asociado al userId del
 * entrenador y devuelve los usuarios con suscripción ACTIVE a ese monitor.
 * Si el entrenador todavía no tiene suscriptores se devuelve un array vacío
 * (no se inventan datos: la pantalla muestra el estado vacío real).
 */
export async function getTrainerSubscribers(trainerUserId) {
  const res = await fetch(
    `${API_URL}/subscriptions/trainer/${trainerUserId}`,
    { headers: { 'X-User-Id': String(trainerUserId) } }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error al obtener suscriptores: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
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

// ======================================================
// RUTINAS ASIGNADAS A UN SUSCRIPTOR (1 a 1)
// ======================================================
//
// El entrenador puede asignar rutinas EXCLUSIVAS a un suscriptor
// concreto. Toda la persistencia está en el backend (columna
// assigned_to_user_id de la tabla routines):
//   - getAssignedRoutines:           lista (vista entrenador)
//   - getAssignedRoutinesByMonitor:  lista (vista suscriptor)
//   - assignRoutineToUser:           vincula una rutina existente
//   - unassignRoutine:               retira la asignación
//   - createRoutineForSubscriber:    crea ya marcada como exclusiva

/**
 * Devuelve la lista de rutinas que un entrenador ha asignado a un suscriptor.
 * GET /routines/assigned?subscriberId={id}
 */
export async function getAssignedRoutines(subscriberId, trainerId) {
  const url = `${API_URL}/routines/assigned?subscriberId=${encodeURIComponent(subscriberId)}`;
  const res = await fetch(url, {
    headers: { 'X-User-Id': String(trainerId) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error obteniendo rutinas asignadas: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Devuelve las rutinas asignadas al usuario actual por un monitor concreto.
 * Pensada para la pantalla "Contenido Exclusivo" del suscriptor.
 * GET /routines/assigned?byMonitorId={monitorId}
 *
 * @param userId       id del usuario actual (suscriptor)
 * @param monitorId    id del Monitor (no del User entrenador)
 */
export async function getAssignedRoutinesByMonitor(userId, monitorId) {
  const url = `${API_URL}/routines/assigned?byMonitorId=${encodeURIComponent(monitorId)}`;
  const res = await fetch(url, {
    headers: { 'X-User-Id': String(userId) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error obteniendo rutinas asignadas: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Asigna una rutina ya existente del entrenador a un suscriptor.
 * POST /routines/{routineId}/assign  { subscriberId }
 */
export async function assignRoutineToUser(routineId, subscriberId, trainerId) {
  const res = await fetch(`${API_URL}/routines/${routineId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': String(trainerId),
    },
    body: JSON.stringify({ subscriberId: Number(subscriberId) }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error asignando rutina: ${res.status}`);
  }
  return res.json();
}

/**
 * Retira la asignación exclusiva de una rutina para un suscriptor.
 * DELETE /routines/{routineId}/assign?subscriberId={id}
 */
export async function unassignRoutine(routineId, subscriberId, trainerId) {
  const url = `${API_URL}/routines/${routineId}/assign?subscriberId=${encodeURIComponent(subscriberId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'X-User-Id': String(trainerId) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error retirando rutina: ${res.status}`);
  }
  return res.json();
}

/**
 * Wrapper semántico sobre createRoutine para crear una rutina ya
 * marcada como exclusiva de un suscriptor. El payload incluye:
 *   - assignedToUserId: id del suscriptor destinatario (lo procesa
 *                       el backend en la propia creación).
 *   - isPublic: false (no aparece en el catálogo público).
 *   - isPremium: true por defecto (es contenido exclusivo).
 */
export async function createRoutineForSubscriber(trainerId, subscriberId, routine) {
  const payload = {
    ...routine,
    isPublic: false,
    isPremium: routine.isPremium ?? true,
    assignedToUserId: Number(subscriberId),
  };
  return createRoutine(trainerId, payload);
}

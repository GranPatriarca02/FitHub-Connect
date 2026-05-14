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
 * Nota: si el backend todavía no expone este endpoint, el método
 * cae a un mock para que la UI pueda renderizar mientras se integra.
 * El otro desarrollador del equipo podrá conectar la lógica real
 * sin tocar la capa de presentación.
 */
export async function getTrainerSubscribers(trainerUserId) {
  try {
    const res = await fetch(
      `${API_URL}/subscriptions/trainer/${trainerUserId}`,
      { headers: { 'X-User-Id': String(trainerUserId) } }
    );
    if (res.ok) {
      return res.json();
    }
    // Si el endpoint aún no existe (404) usamos datos simulados.
    if (res.status === 404) {
      return _mockSubscribers();
    }
    throw new Error(`Error al obtener suscriptores: ${res.status}`);
  } catch (err) {
    // Fallback en caso de error de red para no romper la pantalla.
    console.warn('getTrainerSubscribers fallback to mock:', err?.message);
    return _mockSubscribers();
  }
}

// Datos de muestra mientras se conecta el endpoint real.
function _mockSubscribers() {
  const today = new Date();
  const daysAgo = (n) => new Date(today.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
  return [
    { id: 101, name: 'Lucía Romero',  email: 'lucia.romero@example.com',  subscribedAt: daysAgo(3),  status: 'ACTIVE' },
    { id: 102, name: 'Marcos Vidal',  email: 'marcos.vidal@example.com',  subscribedAt: daysAgo(12), status: 'ACTIVE' },
    { id: 103, name: 'Elena Castro',  email: 'elena.castro@example.com',  subscribedAt: daysAgo(28), status: 'ACTIVE' },
    { id: 104, name: 'Pablo Núñez',   email: 'pablo.nunez@example.com',   subscribedAt: daysAgo(60), status: 'ACTIVE' },
  ];
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
// concreto. Aquí concentramos las llamadas:
//   - getAssignedRoutines:   lista de rutinas asignadas a un suscriptor
//   - assignRoutineToUser:   vincula una rutina existente a un suscriptor
//   - unassignRoutine:       retira la asignación
//   - createRoutineForSubscriber: crea una rutina ya marcada como
//                              exclusiva (assignedToUserId).
//
// El backend todavía no expone estos endpoints, así que mientras se
// implementan usamos un "store" en memoria para que la UI funcione
// extremo a extremo. Cuando el backend esté listo, basta sustituir
// el cuerpo del fetch y el resto del código (pantallas) no cambia.

const _assignedRoutinesStore = new Map(); // subscriberId -> Routine[]

function _key(id) { return String(id); }

/**
 * Devuelve la lista de rutinas que un entrenador ha asignado a un suscriptor.
 * GET /routines/assigned?subscriberId={id}
 */
export async function getAssignedRoutines(subscriberId, trainerId) {
  try {
    const url = `${API_URL}/routines/assigned?subscriberId=${encodeURIComponent(subscriberId)}`;
    const res = await fetch(url, {
      headers: { 'X-User-Id': String(trainerId) },
    });
    if (res.ok) return res.json();
    if (res.status === 404) {
      return _assignedRoutinesStore.get(_key(subscriberId)) || [];
    }
    throw new Error(`Error obteniendo rutinas asignadas: ${res.status}`);
  } catch (err) {
    console.warn('getAssignedRoutines fallback to memory store:', err?.message);
    return _assignedRoutinesStore.get(_key(subscriberId)) || [];
  }
}

/**
 * Asigna una rutina ya existente del entrenador a un suscriptor.
 * POST /routines/{routineId}/assign  { subscriberId }
 */
export async function assignRoutineToUser(routineId, subscriberId, trainerId) {
  try {
    const res = await fetch(`${API_URL}/routines/${routineId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': String(trainerId),
      },
      body: JSON.stringify({ subscriberId }),
    });
    if (res.ok) return res.json();
    if (res.status !== 404) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Error asignando rutina: ${res.status}`);
    }
    // 404 - el endpoint todavía no existe: caemos al store en memoria.
  } catch (err) {
    console.warn('assignRoutineToUser fallback to memory store:', err?.message);
  }

  // Fallback: leemos la rutina del catálogo del entrenador y la
  // guardamos en el store para que getAssignedRoutines la vea.
  try {
    const mine = await getMyRoutines(trainerId);
    const routine = (mine || []).find((r) => String(r.id) === String(routineId));
    if (!routine) throw new Error('La rutina ya no existe en tu catálogo.');

    const k = _key(subscriberId);
    const current = _assignedRoutinesStore.get(k) || [];
    if (current.some((r) => String(r.id) === String(routineId))) {
      return { ok: true, alreadyAssigned: true };
    }
    _assignedRoutinesStore.set(k, [...current, { ...routine, assignedToUserId: subscriberId }]);
    return { ok: true };
  } catch (e) {
    throw e;
  }
}

/**
 * Retira la asignación exclusiva de una rutina para un suscriptor.
 * DELETE /routines/{routineId}/assign?subscriberId={id}
 */
export async function unassignRoutine(routineId, subscriberId, trainerId) {
  try {
    const url = `${API_URL}/routines/${routineId}/assign?subscriberId=${encodeURIComponent(subscriberId)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'X-User-Id': String(trainerId) },
    });
    if (res.ok) return res.json();
    if (res.status !== 404) {
      throw new Error(`Error retirando rutina: ${res.status}`);
    }
  } catch (err) {
    console.warn('unassignRoutine fallback to memory store:', err?.message);
  }

  const k = _key(subscriberId);
  const current = _assignedRoutinesStore.get(k) || [];
  _assignedRoutinesStore.set(
    k,
    current.filter((r) => String(r.id) !== String(routineId))
  );
  return { ok: true };
}

/**
 * Wrapper semántico sobre createRoutine para crear una rutina ya
 * marcada como exclusiva de un suscriptor. El payload incluye:
 *   - assignedToUserId: id del suscriptor destinatario.
 *   - isPublic: false (no aparece en el catálogo público).
 *   - isPremium: true (es contenido exclusivo).
 *
 * El backend, una vez exponga el campo assignedToUserId, podrá
 * persistir la asignación en la misma transacción de creación.
 * Mientras tanto, este helper también guarda la rutina creada en
 * el store en memoria para que aparezca en getAssignedRoutines.
 */
export async function createRoutineForSubscriber(trainerId, subscriberId, routine) {
  const payload = {
    ...routine,
    isPublic: false,
    isPremium: routine.isPremium ?? true,
    assignedToUserId: subscriberId,
  };
  const created = await createRoutine(trainerId, payload);

  // Espejo en memoria por si el backend todavía no procesa
  // assignedToUserId: garantizamos que aparece en la lista de
  // asignadas al recargar la pantalla.
  try {
    const k = _key(subscriberId);
    const current = _assignedRoutinesStore.get(k) || [];
    if (!current.some((r) => String(r.id) === String(created.id))) {
      _assignedRoutinesStore.set(k, [
        ...current,
        { ...created, assignedToUserId: subscriberId },
      ]);
    }
  } catch (_) { /* noop */ }

  return created;
}

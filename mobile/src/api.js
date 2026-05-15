// Cliente HTTP - API Gateway
import AsyncStorage from '@react-native-async-storage/async-storage';

const getApiUrl = () => {
  // Prioridad absoluta: Variables de entorno del archivo .env
  return process.env.EXPO_PUBLIC_API_URL;
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
  return res.json().catch(() => ({ message: 'Eliminado' }));
}

// ======================================================
// SUSCRIPCIONES (lado usuario suscriptor)
// ======================================================

/**
 * Devuelve la lista de entrenadores a los que el usuario está suscrito.
 * GET /subscriptions/user/{userId}
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
    console.error('Error en getUserSubscriptions:', err?.message);
    return [];
  }
}

// ======================================================
// SUSCRIPTORES (lado entrenador)
// ======================================================

/**
 * Devuelve la lista de usuarios suscritos al entrenador autenticado.
 * GET /subscriptions/trainer/{trainerUserId}
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

// ======================================================
// SESIONES PROGRAMADAS DEL ENTRENADOR
// ======================================================

/**
 * Devuelve las próximas reservas (PENDING/CONFIRMED) del entrenador
 * GET /bookings/trainer/{trainerUserId}/upcoming
 */
export async function getTrainerUpcomingSessions(trainerUserId) {
  const res = await fetch(
    `${API_URL}/bookings/trainer/${trainerUserId}/upcoming`,
    { headers: { 'X-User-Id': String(trainerUserId) } }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error al obtener próximas sesiones: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Devuelve las próximas reservas (PENDING/CONFIRMED) del usuario
 * GET /bookings/user/{userId}/upcoming
 */
export async function getUserUpcomingSessions(userId) {
  const res = await fetch(
    `${API_URL}/bookings/user/${userId}/upcoming`,
    { headers: { 'X-User-Id': String(userId) } }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error al obtener próximas sesiones: ${res.status}`);
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
 * GET /routines/assigned?byMonitorId={monitorId}
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
 * POST /routines/{routineId}/assign
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
 * Crea una rutina asignada directamente a un suscriptor.
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

// ======================================================
// SISTEMA DE CHAT (ChatMessage)
// ======================================================

/**
 * Envía un mensaje de chat a otro usuario.
 * MODIFICADO: Utiliza WebSockets atómicos directamente mediante wsInstance para mitigar errores 404 en Ktor.
 */
export function sendChatMessage(wsInstance, receiverId, content) {
  if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) {
    console.error("El WebSocket no está listo o está desconectado. No se envió el mensaje.");
    return false;
  }

  const payload = {
    type: "SEND_MESSAGE",
    receiverId: parseInt(receiverId),
    content: content
  };

  wsInstance.send(JSON.stringify(payload));
  return true;
}

/**
 * Obtiene el historial de conversación con otro usuario.
 */
export async function getChatHistory(myId, otherUserId) {
  try {
    const res = await fetch(`${API_URL}/social/chat/history/${otherUserId}`, {
      headers: { 'X-User-Id': String(myId) },
    });

    if (res.ok) {
      return res.json();
    }

    if (res.status === 404) {
      return [];
    }
    throw new Error(`Error obteniendo historial: ${res.status}`);
  } catch (err) {
    console.warn('getChatHistory error:', err?.message);
    return [];
  }
}

/**
 * Obtiene la lista de contactos.
 */
export async function getMyContacts(myId) {
  try {
    const res = await fetch(`${API_URL}/social/chat/contacts`, {
      headers: { 'X-User-Id': String(myId) },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }

    return await _getSmartFallback(myId);
  } catch (err) {
    console.warn('Error en getMyContacts, intentando fallback:', err);
    return await _getSmartFallback(myId);
  }
}

/**
 * Lógica de emergencia para rellenar la lista de contactos (Alumnos/Entrenadores)
 */
async function _getSmartFallback(myId) {
  try {
    const userRole = await AsyncStorage.getItem('userRole');

    if (userRole === 'TRAINER') {
      const subscribers = await getTrainerSubscribers(myId);
      return Array.isArray(subscribers) ? subscribers.map(s => ({
        id: s.id,
        name: s.name,
        role: 'Alumno'
      })) : [];
    } else {
      const subs = await getUserSubscriptions(myId);
      return Array.isArray(subs) ? subs.map(s => ({
        id: parseInt(s.monitorId),
        name: s.monitorName,
        role: 'Entrenador'
      })) : [];
    }
  } catch (e) {
    console.error("Error crítico en el fallback de contactos:", e);
    return [];
  }
}

export async function markChatAsRead(myId, senderId) {
  try {
    const res = await fetch(`${API_URL}/social/chat/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': String(myId),
      },
      body: JSON.stringify({
        senderId: parseInt(senderId),
      }),
    });

    if (!res.ok) return false;
    return true;
  } catch (err) {
    console.error('Error en markChatAsRead:', err);
    return false;
  }
}
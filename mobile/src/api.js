// Cliente HTTP
// URL base

export const API_URL = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8080';

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

// Modulo centralizado para llamadas al backend
// Lee la URL base del .env (API_URL) o usa localhost por defecto

const API_URL = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:8080';

/**
 * Obtiene la lista de todos los monitores
 * GET /monitors
 */
export async function getMonitors() {
  const response = await fetch(`${API_URL}/monitors`);
  if (!response.ok) {
    throw new Error(`Error al obtener monitores: ${response.status}`);
  }
  return response.json();
}

/**
 * Obtiene el detalle de un monitor con su disponibilidad
 * GET /monitors/{id}
 */
export async function getMonitorDetail(id) {
  const response = await fetch(`${API_URL}/monitors/${id}`);
  if (!response.ok) {
    throw new Error(`Error al obtener detalle del monitor: ${response.status}`);
  }
  return response.json();
}

/**
 * Comprueba que el backend esta accesible
 * GET /
 */
export async function healthCheck() {
  try {
    const response = await fetch(`${API_URL}/`);
    return response.ok;
  } catch {
    return false;
  }
}

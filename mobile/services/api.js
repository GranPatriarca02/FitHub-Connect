import Constants from 'expo-constants';

// Sacamos la URL del .env vía app.config.js
export const API_URL = Constants.expoConfig?.extra?.backendUrl;

// Opcional: exportar rutas específicas para no escribir "/auth/..." en las screens
export const ENDPOINTS = {
    login: `${API_URL}/auth/login`,
    register: `${API_URL}/auth/register`,
};
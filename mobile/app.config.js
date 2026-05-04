import 'dotenv/config';

export default ({ config }) => {
    return {
        ...config,
        // Puedes sobrescribir o añadir lo siguiente:
        name: "FitHub Connect", // El nombre que verás en el móvil
        slug: "fithub-connect", // El identificador para la URL de Expo
        extra: {
            backendUrl: process.env.BACKEND_URL,
        },
    };
};
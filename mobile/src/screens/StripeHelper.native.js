// Mock de Stripe nativo para evitar crash por falta de StripeProvider
export const useStripePlatform = () => {
    return {
        initPaymentSheet: async () => ({ error: null }),
        presentPaymentSheet: async () => ({ error: null }),
        isWeb: false
    };
};
export const useStripePlatform = () => {
    return {
        initPaymentSheet: async () => ({ error: null }),
        presentPaymentSheet: async () => ({ error: null }),
        isWeb: true
    };
};
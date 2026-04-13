import { Platform } from 'react-native';

export const useStripePlatform = () => {
    return {
        initPaymentSheet: async () => ({ error: null }),
        presentPaymentSheet: async () => ({ error: null }),
        isWeb: Platform.OS === 'web'
    };
};
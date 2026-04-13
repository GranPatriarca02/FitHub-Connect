import { useStripe } from '@stripe/stripe-react-native';

export const useStripePlatform = () => {
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    return {
        initPaymentSheet,
        presentPaymentSheet,
        isWeb: false
    };
};
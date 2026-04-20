import React from 'react';
import { useStripe, StripeProvider } from '@stripe/stripe-react-native';

// IMPORTANTE: Se lee del archivo .env (EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY)
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY; 

export const StripeWrapper = ({ children }) => {
    return (
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
            {children}
        </StripeProvider>
    );
};

export const useStripePlatform = () => {
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    return {
        initPaymentSheet,
        presentPaymentSheet,
        isWeb: false
    };
};
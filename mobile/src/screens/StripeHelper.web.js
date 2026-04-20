import React from 'react';

export const StripeWrapper = ({ children }) => {
    return <>{children}</>;
};

export const useStripePlatform = () => {
    return {
        initPaymentSheet: async () => ({ error: null }),
        presentPaymentSheet: async () => ({ error: null }),
        isWeb: true
    };
};

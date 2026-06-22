/**
 * Razorpay Checkout Component
 *
 * Handles Razorpay payment gateway integration for subscriptions.
 */

import { useState, useEffect } from 'react';
import Loader from '../common/Loader.jsx';
import paymentApi from '../../services/api/payment.api.js';

const RazorpayCheckout = ({
  organizationId,
  plan,
  billingCycle,
  onSuccess,
  onError,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load Razorpay key from config
    loadConfig();
  }, []);

  useEffect(() => {
    // Load Razorpay script
    loadRazorpayScript();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await paymentApi.getConfig();
      if (config.data?.razorpay?.keyId) {
        setRazorpayKey(config.data.razorpay.keyId);
      }
    } catch (err) {
      console.error('Failed to load payment config:', err);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      // Create order on backend
      const orderResponse = await paymentApi.createRazorpayOrder(
        organizationId,
        plan.id || plan._id,
        billingCycle
      );

      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create order');
      }

      const orderData = orderResponse.data;

      // Calculate amount based on billing cycle
      let amount = plan.billing?.price || 0;
      if (billingCycle === 'yearly' && plan.yearlyDiscount) {
        amount = plan.billing.price * 12 * (1 - plan.yearlyDiscount);
      }

      // Initialize Razorpay
      const options = {
        key: razorpayKey || orderData.keyId,
        amount: orderData.amount || Math.round(amount * 100), // Amount in paise
        currency: orderData.currency || 'INR',
        order_id: orderData.orderId,
        name: 'API Token Manager',
        description: `${plan.name || plan.displayName} - ${billingCycle === 'yearly' ? 'Annual' : 'Monthly'} Subscription`,
        image: '/logo.png', // Logo URL
        prefill: {
          name: '', // Customer name
          email: '', // Customer email
          contact: '' // Customer phone
        },
        notes: {
          organizationId,
          planId: plan.id || plan._id,
          billingCycle
        },
        theme: {
          color: '#DC2626' // Primary brand color
        },
        handler: async (response) => {
          try {
            // Verify payment on backend
            const verifyResponse = await paymentApi.verifyRazorpayPayment(organizationId, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyResponse.success) {
              onSuccess?.(verifyResponse);
            } else {
              throw new Error(verifyResponse.message || 'Payment verification failed');
            }
          } catch (err) {
            setError(err.message || 'Payment verification failed');
            onError?.(err);
          }
        },
        modal: {
          ondismiss: () => {
            onCancel?.();
          }
        }
      };

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (response) => {
        setError(response.error.description || 'Payment failed');
        onError?.(response.error);
      });
      razorpay.open();

    } catch (err) {
      setError(err.message || 'Failed to initiate payment');
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full px-6 py-3 bg-[#DC2626] text-white font-semibold rounded-lg hover:bg-[#B91C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader size="sm" inline />
            Processing...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Pay with Razorpay
          </>
        )}
      </button>

      <p className="mt-3 text-xs text-gray-500 text-center">
        Secure payment powered by Razorpay
      </p>
    </div>
  );
};

export default RazorpayCheckout;

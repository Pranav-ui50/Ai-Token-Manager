/**
 * Registration Cancel Page
 *
 * Displayed when payment is cancelled or fails.
 * Allows user to retry payment or start over.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import registrationPaymentApi from '../../services/api/registrationPayment.api.js';

const RegistrationCancelPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState(null);

  const pendingId = location.state?.pendingId;
  const errorMessage = location.state?.error;

  // Cancel the pending registration on mount
  useEffect(() => {
    if (pendingId) {
      registrationPaymentApi.cancelRegistration(pendingId).catch(console.error);
    }
  }, [pendingId]);

  // Handle retry payment
  const handleRetry = async (paymentProvider) => {
    if (!pendingId) {
      // No pending ID, redirect to registration
      navigate('/register');
      return;
    }

    setRetrying(true);
    setError(null);

    try {
      const result = await registrationPaymentApi.retryPayment(pendingId, paymentProvider);

      if (!result.success) {
        setError(result.error?.message || 'Failed to retry payment');
        return;
      }

      if (result.data.paymentProvider === 'razorpay' && result.data.key) {
        // Open Razorpay
        openRazorpay(result.data);
      } else if (result.data.checkoutUrl) {
        // Redirect to Stripe
        window.location.href = result.data.checkoutUrl;
      }
    } catch (err) {
      console.error('Retry payment error:', err);
      setError(err.response?.data?.error?.message || 'Failed to retry payment');
    } finally {
      setRetrying(false);
    }
  };

  // Open Razorpay checkout
  const openRazorpay = (paymentData) => {
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }

    const options = {
      key: paymentData.key,
      amount: paymentData.amount * 100,
      currency: paymentData.currency || 'USD',
      order_id: paymentData.orderId,
      name: 'API Token Manager',
      description: 'Subscription Payment',
      handler: async (response) => {
        try {
          const result = await registrationPaymentApi.verifyRazorpayPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );

          if (result.success) {
            // Store tokens
            localStorage.setItem('accessToken', result.data.accessToken);
            localStorage.setItem('refreshToken', result.data.refreshToken);
            localStorage.setItem('user', JSON.stringify(result.data.user));
            navigate('/registration/success', { replace: true });
          } else {
            setError('Payment verification failed');
          }
        } catch (err) {
          setError(err.message || 'Payment verification failed');
        }
      },
      theme: {
        color: '#DC2626'
      },
      modal: {
        ondismiss: () => {
          setRetrying(false);
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        {/* Cancel Icon */}
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Payment Cancelled
        </h1>
        <p className="text-gray-600 mb-8">
          Your payment was not completed. Your account has not been created.
        </p>

        {/* Error Message */}
        {(error || errorMessage) && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error || errorMessage}</span>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">What happened?</h3>
          <p className="text-sm text-gray-600 text-left">
            You cancelled the payment process before it was completed. No charges were made to your account,
            and no user account was created. You can retry the payment or start a new registration.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {pendingId && (
            <button
              onClick={() => handleRetry('razorpay')}
              disabled={retrying}
              className="w-full py-3.5 bg-[#DC2626] text-white font-semibold rounded-xl hover:bg-[#B91C1C] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {retrying ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry Payment
                </>
              )}
            </button>
          )}

          <Link
            to="/register"
            className="w-full py-3.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Start New Registration
          </Link>

          <Link
            to="/pricing"
            className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium"
          >
            View all plans
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegistrationCancelPage;
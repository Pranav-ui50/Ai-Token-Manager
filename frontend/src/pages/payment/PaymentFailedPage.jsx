/**
 * Payment Failed Page
 *
 * Displayed when payment fails or is cancelled.
 */

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Loader from '../../components/common/Loader.jsx';
import { useAuth } from '../../hooks/useAuth.js';

const PaymentFailedPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [retrying, setRetrying] = useState(false);

  const errorReason = searchParams.get('reason');
  const planId = searchParams.get('plan');

  // Get error message based on reason
  const getErrorMessage = () => {
    switch (errorReason) {
      case 'cancelled':
        return {
          title: 'Payment Cancelled',
          message: 'You cancelled the payment process. No charges were made to your account.'
        };
      case 'insufficient_funds':
        return {
          title: 'Insufficient Funds',
          message: 'Your payment was declined due to insufficient funds. Please try a different payment method.'
        };
      case 'card_declined':
        return {
          title: 'Card Declined',
          message: 'Your card was declined. Please try a different payment method or contact your bank.'
        };
      case 'expired_card':
        return {
          title: 'Card Expired',
          message: 'Your card has expired. Please update your payment method and try again.'
        };
      default:
        return {
          title: 'Payment Failed',
          message: 'We could not process your payment. Please try again or contact support if the problem persists.'
        };
    }
  };

  const errorInfo = getErrorMessage();

  // Handle retry
  const handleRetry = async () => {
    setRetrying(true);
    // Redirect to checkout with the same plan
    navigate(`/checkout${planId ? `?plan=${planId}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {errorInfo.title}
        </h1>
        <p className="text-gray-600 mb-8">
          {errorInfo.message}
        </p>

        {/* Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Your account status</h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">Payment Required</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Your account has been created but is pending payment. You can start with a free trial or retry payment.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="inline-flex items-center justify-center px-6 py-3 bg-[#DC2626] text-white font-semibold rounded-xl hover:bg-[#B91C1C] transition-colors shadow-lg shadow-[#DC2626]/25 disabled:opacity-50"
          >
            {retrying ? (
              <>
                <Loader size="sm" inline className="mr-2" />
                Processing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry Payment
              </>
            )}
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 transition-colors"
          >
            Start with Free Trial
          </Link>
        </div>

        {/* Help Links */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm">
          <Link
            to="/pricing"
            className="text-[#DC2626] hover:text-[#B91C1C] font-medium"
          >
            View all plans
          </Link>
          <span className="hidden sm:inline text-gray-300">|</span>
          <Link
            to="/contact"
            className="text-gray-600 hover:text-gray-900"
          >
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailedPage;

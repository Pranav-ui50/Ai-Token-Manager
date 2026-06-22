/**
 * Payment Success Page
 *
 * Displayed after successful payment completion.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Loader from '../../components/common/Loader.jsx';
import { useAuth } from '../../hooks/useAuth.js';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getCurrentUser, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [session_id] = useState(searchParams.get('session_id'));

  // Refresh user data to get updated subscription
  useEffect(() => {
    const refreshUserData = async () => {
      try {
        await getCurrentUser();
      } catch (error) {
        console.error('Failed to refresh user data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      refreshUserData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, getCurrentUser]);

  // Auto-redirect to dashboard after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-8">
          Thank you for your subscription. Your account has been activated and you can now access all features.
        </p>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center gap-2 text-gray-500 mb-6">
            <Loader size="sm" inline />
            <span>Updating your account...</span>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">What happens next?</h3>
          <div className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Subscription Activated</p>
                <p className="text-sm text-gray-500">Your subscription is now active</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Full Access</p>
                <p className="text-sm text-gray-500">All features are now unlocked</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Invoice Sent</p>
                <p className="text-sm text-gray-500">Check your email for the receipt</p>
              </div>
            </div>
          </div>
        </div>

        {/* Session ID (for support) */}
        {session_id && (
          <p className="text-xs text-gray-400 mb-6">
            Session ID: {session_id}
          </p>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 bg-[#DC2626] text-white font-semibold rounded-xl hover:bg-[#B91C1C] transition-colors shadow-lg shadow-[#DC2626]/25"
          >
            Go to Dashboard
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
          <Link
            to="/billing"
            className="inline-flex items-center justify-center px-6 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 transition-colors"
          >
            View Billing
          </Link>
        </div>

        {/* Auto-redirect notice */}
        <p className="mt-6 text-sm text-gray-500">
          Redirecting to dashboard in 5 seconds...
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
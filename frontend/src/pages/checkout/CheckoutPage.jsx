/**
 * Checkout Page
 *
 * Payment checkout page for subscription plans.
 * Supports both Stripe and Razorpay payment gateways.
 * - INR currency: Razorpay only (auto-redirected)
 * - USD/EUR/GBP: Stripe only
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Loader from '../../components/common/Loader.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import paymentApi from '../../services/api/payment.api.js';
import publicApi from '../../services/api/public.api.js';
import billingApi from '../../services/api/billing.api.js';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { currentOrganization, getOrganization } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [paymentProvider, setPaymentProvider] = useState(null); // Will be set from config
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [convertedAmount, setConvertedAmount] = useState(null); // For Razorpay INR conversion
  const [currency, setCurrency] = useState('USD'); // Currency from URL or organization
  const [currentSubscription, setCurrentSubscription] = useState(null); // Current active subscription
  const [daysRemaining, setDaysRemaining] = useState(null); // Days remaining in current plan
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Success modal state

  const planId = searchParams.get('plan');
  const billingParam = searchParams.get('billing');
  const currencyParam = searchParams.get('currency');

  // Fetch plan details and payment config
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Set currency from URL or organization settings
        const orgCurrency = currentOrganization?.settings?.currency || 'USD';
        const selectedCurrency = currencyParam || orgCurrency;
        setCurrency(selectedCurrency);

        // Fetch plan details
        if (planId) {
          const planResponse = await publicApi.getPlanById(planId);
          if (planResponse.success && planResponse.data) {
            setPlan(planResponse.data);
          }
        }

        // Fetch current subscription info
        if (currentOrganization?._id || currentOrganization?.id) {
          try {
            const billingRes = await billingApi.getBilling(currentOrganization._id || currentOrganization.id);
            if (billingRes.data?.subscription) {
              setCurrentSubscription(billingRes.data.subscription);

              // Calculate days remaining in current plan
              if (billingRes.data.subscription.currentPeriodEnd) {
                const endDate = new Date(billingRes.data.subscription.currentPeriodEnd);
                const now = new Date();
                const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                setDaysRemaining(daysLeft);
              }
            }
          } catch (err) {
            console.log('No existing subscription found');
          }
        }

        // Set billing cycle from URL (normalize 'month' to 'monthly', 'year' to 'yearly')
        if (billingParam) {
          const normalizedBilling = billingParam.toLowerCase() === 'year' || billingParam.toLowerCase() === 'yearly'
            ? 'yearly'
            : 'monthly';
          setBillingCycle(normalizedBilling);
        }

        // Fetch payment config
        const configResponse = await paymentApi.getConfig();
        if (configResponse.success && configResponse.data) {
          setPaymentConfig(configResponse.data);

          // Set default provider based on available providers
          const providers = configResponse.data.providers || [];
          const defaultProvider = configResponse.data.defaultProvider;

          // Auto-select payment provider based on currency
          // INR -> Razorpay, USD/EUR/GBP -> Stripe
          if (selectedCurrency === 'INR') {
            // For INR, only use Razorpay
            if (providers.includes('razorpay')) {
              setPaymentProvider('razorpay');
            } else {
              setError('Razorpay is required for INR payments. Please contact support.');
            }
          } else {
            // For USD/EUR/GBP, use Stripe
            if (providers.includes('stripe')) {
              setPaymentProvider('stripe');
            } else if (providers.length > 0) {
              setPaymentProvider(providers[0]);
            }
          }

          console.log('[Checkout] Payment config loaded:', {
            providers,
            defaultProvider,
            currency: selectedCurrency,
            selectedProvider: selectedCurrency === 'INR' ? 'razorpay' : 'stripe'
          });
        }
      } catch (err) {
        console.error('Failed to fetch checkout data:', err);
        setError('Failed to load checkout details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [planId, billingParam, currencyParam, currentOrganization]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      navigate('/login?redirect=/checkout' + (planId ? `?plan=${planId}` : ''));
    }
  }, [isAuthenticated, loading, navigate, planId]);

  // Check if user has an organization
  useEffect(() => {
    if (isAuthenticated && user && !loading) {
      const orgId = user.organization?._id || user.organization;
      if (!orgId) {
        setError('You need to create an organization before subscribing to a plan. Please complete your account setup.');
      }
    }
  }, [isAuthenticated, user, loading]);

  // Currency conversion rate (should match backend)
  const USD_TO_INR_RATE = 83.5;

  // Currency symbols
  const CURRENCY_SYMBOLS = {
    USD: '$',
    INR: '₹',
    EUR: '€',
    GBP: '£'
  };

  // Calculate pricing
  const calculatePrice = () => {
    if (!plan) return { amount: 0, display: 'Free', monthlyPrice: 0 };

    const monthlyPrice = plan.billing?.price || 0;
    const yearlyDiscount = 0.2; // 20% discount for yearly plans

    const price = billingCycle === 'yearly'
      ? (plan.billing?.yearlyPrice || monthlyPrice * 12 * (1 - yearlyDiscount))
      : monthlyPrice;

    // Convert to INR if currency is INR
    const convertedPrice = currency === 'INR' ? price * USD_TO_INR_RATE : price;
    const symbol = CURRENCY_SYMBOLS[currency] || '$';

    return {
      amount: price,
      convertedAmount: convertedPrice,
      monthlyPrice: monthlyPrice,
      display: price === 0 ? 'Free' : `${symbol}${convertedPrice.toFixed(2)}`
    };
  };

  // Handle Stripe checkout
  const handleStripeCheckout = async () => {
    try {
      setProcessing(true);
      setError(null);

      const successUrl = `${window.location.origin}/payment/success`;
      const cancelUrl = `${window.location.origin}/payment/cancel`;

      const response = await paymentApi.createStripeCheckout(
        user.organization?._id || user.organization,
        planId || plan?.slug || 'free',
        billingCycle,
        successUrl,
        cancelUrl
      );

      if (response.success && response.data?.url) {
        // Redirect to Stripe checkout
        window.location.href = response.data.url;
      } else {
        // Extract error message and details
        const errorMsg = response.error?.message || 'Failed to create checkout session';
        const errorDetails = response.error?.details?.map(d => d.message).join('. ') || '';
        setError(errorDetails ? `${errorMsg}: ${errorDetails}` : errorMsg);
      }
    } catch (err) {
      console.error('Stripe checkout error:', err);
      // Extract error message and details
      const errorMsg = err.response?.data?.error?.message || 'Failed to initiate Stripe checkout';
      const errorDetails = err.response?.data?.error?.details?.map(d => d.message).join('. ') || '';
      setError(errorDetails ? `${errorMsg}: ${errorDetails}` : errorMsg);
    } finally {
      setProcessing(false);
    }
  };

  // Handle Razorpay checkout
  const handleRazorpayCheckout = async () => {
    try {
      setProcessing(true);
      setError(null);

      // Create Razorpay order
      const orderResponse = await paymentApi.createRazorpayOrder(
        user.organization?._id || user.organization,
        planId || plan?.slug || 'free',
        billingCycle
      );

      if (!orderResponse.success) {
        // Extract error message and details
        const errorMsg = orderResponse.error?.message || 'Failed to create order';
        const errorDetails = orderResponse.error?.details?.map(d => d.message).join('. ') || '';
        setError(errorDetails ? `${errorMsg}: ${errorDetails}` : errorMsg);
        setProcessing(false);
        return;
      }

      const orderData = orderResponse.data;

      // Store converted amount for display
      if (orderData.originalCurrency && orderData.originalCurrency !== 'INR') {
        setConvertedAmount({
          originalPrice: orderData.originalPrice,
          originalCurrency: orderData.originalCurrency,
          convertedAmount: orderData.amount / 100, // Convert from paise to INR
          display: `₹${(orderData.amount / 100).toFixed(2)} (approx. $${orderData.originalPrice.toFixed(2)} ${orderData.originalCurrency})`
        });
      }

      // Load Razorpay SDK if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      // Open Razorpay modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'API Token Manager',
        description: `${orderData.planName || plan?.name || 'Subscription'} - ${billingCycle}`,
        order_id: orderData.orderId,
        handler: async (paymentData) => {
          try {
            console.log('[Checkout] Payment data received:', paymentData);
            console.log('[Checkout] User:', user);
            console.log('[Checkout] Organization:', user?.organization);

            const orgId = user?.organization?._id || user?.organization;
            console.log('[Checkout] Organization ID:', orgId);

            if (!orgId) {
              setError('Organization not found. Please complete your account setup.');
              setProcessing(false);
              return;
            }

            // Verify payment
            const verifyResponse = await paymentApi.verifyRazorpayPayment(
              orgId,
              paymentData
            );

            if (verifyResponse.success) {
              // Refresh organization context to get updated members after plan upgrade
              try {
                await getOrganization(orgId);
              } catch (refreshErr) {
                console.error('[Checkout] Failed to refresh organization:', refreshErr);
                // Don't block success modal on refresh failure
              }
              // Show success modal instead of redirecting
              setShowSuccessModal(true);
              setProcessing(false);
            } else {
              setError(verifyResponse.error?.message || 'Payment verification failed');
              setProcessing(false);
            }
          } catch (verifyErr) {
            console.error('Payment verification error:', verifyErr);
            // Check if this is a duplicate payment error (409) - payment already processed
            const errorCode = verifyErr.response?.status;
            const errorData = verifyErr.response?.data?.error;

            if (errorCode === 409 || errorData?.code === 'DUPLICATE_ERROR') {
              // Payment was already processed - this is actually a success
              console.log('[Checkout] Payment already processed (idempotent request)');
              setShowSuccessModal(true);
              setProcessing(false);
              return;
            }

            setError('Payment verification failed. Please contact support.');
            setProcessing(false);
          }
        },
        prefill: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email
        },
        theme: {
          color: '#DC2626'
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Razorpay checkout error:', err);
      console.error('Error response full:', JSON.stringify(err.response?.data, null, 2));

      // Extract error message and details
      const errorData = err.response?.data?.error;
      let errorMsg = 'Failed to initiate Razorpay checkout';

      if (errorData) {
        if (errorData.message) {
          errorMsg = errorData.message;
        }
        if (errorData.code) {
          errorMsg = `${errorMsg} (${errorData.code})`;
        }
        if (errorData.details && errorData.details.length > 0) {
          const detailMsgs = errorData.details.map(d => d.message || d).join('. ');
          errorMsg = `${errorMsg}: ${detailMsgs}`;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }

      console.error('Final error message:', errorMsg);
      setError(errorMsg);
      setProcessing(false);
    }
  };

  // Handle payment submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if payment provider is available
    if (!paymentProvider) {
      setError('No payment provider available. Please contact support.');
      return;
    }

    // Check if provider is supported
    if (!paymentConfig?.providers?.includes(paymentProvider)) {
      setError(`Payment provider "${paymentProvider}" is not available. Please try again.`);
      return;
    }

    if (paymentProvider === 'stripe') {
      await handleStripeCheckout();
    } else if (paymentProvider === 'razorpay') {
      await handleRazorpayCheckout();
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader fullPage text="Loading checkout details..." />
      </div>
    );
  }

  // No plan selected
  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Plan Selected</h2>
          <p className="text-gray-600 mb-4">Please select a plan to continue with checkout.</p>
          <Link
            to="/pricing"
            className="inline-flex items-center px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors"
          >
            View Plans
          </Link>
        </div>
      </div>
    );
  }

  // Check if user has an organization
  const userOrgId = user?.organization?._id || user?.organization;
  if (!userOrgId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Organization Required</h2>
          <p className="text-gray-600 mb-4">You need to create an organization before subscribing to a plan.</p>
          <Link
            to="/organizations/new"
            className="inline-flex items-center px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors"
          >
            Create Organization
          </Link>
        </div>
      </div>
    );
  }

  const price = calculatePrice();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Subscription</h1>
          <p className="mt-2 text-gray-600">You're just one step away from getting started</p>
        </div>

        {/* Checkout Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Plan Summary */}
          <div className="bg-gradient-to-r from-[#DC2626]/10 to-[#DC2626]/5 p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{plan.name}</h2>
                <p className="text-sm text-gray-600 mt-1">{plan.description || 'Subscription plan'}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{price.display}</p>
                <p className="text-sm text-gray-500">
                  per {billingCycle === 'yearly' ? 'year' : 'month'}
                </p>
              </div>
            </div>

            {/* Billing Cycle */}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                disabled={processing}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-[#DC2626] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                disabled={processing}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-[#DC2626] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                Yearly
                <span className="ml-1 text-xs opacity-75">(Save 20%)</span>
              </button>
            </div>
          </div>

          {/* Current Subscription Info - Show if upgrading within 10 days */}
          {currentSubscription && currentSubscription.status === 'active' && daysRemaining !== null && daysRemaining <= 10 && (
            <div className="mx-6 mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900">Current Active Plan</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    You have an active <span className="font-medium capitalize">{currentSubscription.plan || 'plan'}</span> subscription
                    with <span className="font-medium">{daysRemaining} days</span> remaining.
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    Your new plan will start after your current plan ends. You won't be charged for overlapping days.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Payment Provider Selection - Only show when multiple providers available */}
            {paymentConfig?.providers?.length > 0 && currency !== 'INR' && paymentConfig.providers.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {paymentConfig.providers.includes('stripe') && (
                    <button
                      type="button"
                      onClick={() => setPaymentProvider('stripe')}
                      disabled={processing}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        paymentProvider === 'stripe'
                          ? 'border-[#DC2626] bg-[#DC2626]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <rect width="24" height="24" rx="4" fill="#635BFF"/>
                          <path d="M13.9 9.5c0-.7.6-1.1 1.5-1.1 1.2 0 2.3.4 3.2.9V6.5c-.9-.4-2.1-.7-3.5-.7-2.5 0-4.1 1.2-4.1 3.1 0 3.1 4.3 2.6 4.3 4 0 .7-.6 1.1-1.6 1.1-1.3 0-2.5-.5-3.5-1.2v3c1 .5 2.2.8 3.5.8 2.6 0 4.2-1.2 4.2-3.2 0-3.3-4.3-2.7-4.3-4z" fill="white"/>
                        </svg>
                        <span className="font-medium text-gray-900">Stripe</span>
                      </div>
                    </button>
                  )}
                  {paymentConfig.providers.includes('razorpay') && (
                    <button
                      type="button"
                      onClick={() => setPaymentProvider('razorpay')}
                      disabled={processing}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        paymentProvider === 'razorpay'
                          ? 'border-[#DC2626] bg-[#DC2626]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <rect width="24" height="24" rx="4" fill="#2D5BFF"/>
                          <path d="M12 4C7.58 4 4 7.58 4 12s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" fill="white"/>
                        </svg>
                        <div className="flex flex-col items-start">
                          <span className="font-medium text-gray-900">Razorpay</span>
                          {paymentConfig.razorpay?.keyId?.includes('test') && (
                            <span className="text-xs text-amber-600 font-medium">Test Mode</span>
                          )}
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Stripe Only Display for non-INR currencies */}
            {currency !== 'INR' && paymentConfig?.providers?.includes('stripe') && paymentConfig.providers.length === 1 && (
              <div className="p-5 rounded-xl border-2 border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                      <rect width="24" height="24" rx="4" fill="#635BFF"/>
                      <path d="M13.9 9.5c0-.7.6-1.1 1.5-1.1 1.2 0 2.3.4 3.2.9V6.5c-.9-.4-2.1-.7-3.5-.7-2.5 0-4.1 1.2-4.1 3.1 0 3.1 4.3 2.6 4.3 4 0 .7-.6 1.1-1.6 1.1-1.3 0-2.5-.5-3.5-1.2v3c1 .5 2.2.8 3.5.8 2.6 0 4.2-1.2 4.2-3.2 0-3.3-4.3-2.7-4.3-4z" fill="white"/>
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">Stripe</p>
                      <p className="text-sm text-gray-500">Secure payment with cards</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Currency Info for INR */}
            {currency === 'INR' && price.amount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">Payment will be processed in INR (Indian Rupees)</span>
                </div>
              </div>
            )}

            {/* Account Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-2">Account</p>
              <p className="font-medium text-gray-900">{user?.email}</p>
              <p className="text-sm text-gray-500">{user?.organization?.name || 'Personal Account'}</p>
            </div>

            {/* Price Summary */}
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">{price.display}</span>
              </div>
              {billingCycle === 'yearly' && plan.billing?.price > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Yearly discount</span>
                  <span>-20%</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>{price.display}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={processing || !plan}
              className="w-full py-3.5 bg-[#DC2626] text-white font-semibold rounded-xl hover:bg-[#B91C1C] focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#DC2626]/25"
            >
              {processing ? (
                <>
                  <Loader size="sm" inline />
                  Processing...
                </>
              ) : (
                <>
                  Pay {price.display}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>

            {/* Terms */}
            <p className="text-xs text-center text-gray-500">
              By completing this purchase, you agree to our{' '}
              <Link to="#" className="text-[#DC2626] hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link to="#" className="text-[#DC2626] hover:underline">Privacy Policy</Link>
            </p>
          </form>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link
            to="/pricing"
            className="text-sm text-gray-600 hover:text-[#DC2626] transition-colors"
          >
            ← Back to pricing
          </Link>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-8 text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Your plan is active now!
            </h2>
            <p className="text-gray-600 mb-6">
              Thank you for subscribing to {plan?.name || 'our service'}. Your subscription has been activated successfully.
            </p>

            {/* Info Card */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-700">Subscription activated</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-700">All features are now unlocked</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-700">Invoice sent to your email</span>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center justify-center px-6 py-3 bg-[#DC2626] text-white font-semibold rounded-xl hover:bg-[#B91C1C] transition-colors shadow-lg shadow-[#DC2626]/25"
              >
                Go to Dashboard
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
              <button
                onClick={() => navigate('/billing')}
                className="inline-flex items-center justify-center px-6 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 transition-colors"
              >
                View Billing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;

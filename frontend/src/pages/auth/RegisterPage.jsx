/**
 * Register Page
 *
 * Modern Red & White themed registration page with organization creation.
 * Supports plan preselection via URL parameter.
 *
 * Flow:
 * - Free plan: Direct registration (account created immediately)
 * - Paid plan: Payment first, account created only after successful payment
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { storage } from '../../utils/helpers.js';
import { AUTH_KEYS } from '../../utils/constants.js';
import publicApi from '../../services/api/public.api.js';
import registrationPaymentApi from '../../services/api/registrationPayment.api.js';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, isLoading: authLoading, error, clearError, isAuthenticated } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const planId = searchParams.get('plan');

  // Currency from URL (read-only, passed from landing page)
  const currency = searchParams.get('currency') || 'USD';
  const billingParam = searchParams.get('billing') || 'month';

  // Currency conversion rates (approximate)
  const conversionRates = {
    USD: 1,
    INR: 83.5,
    EUR: 0.92,
    GBP: 0.79
  };

  // Currency symbols
  const currencySymbols = {
    USD: '$',
    INR: '₹',
    EUR: '€',
    GBP: '£'
  };

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [billingCycle, setBillingCycle] = useState(billingParam === 'year' ? 'yearly' : 'monthly');

  // Helper to format price with currency conversion
  const formatPrice = (price) => {
    const symbol = currencySymbols[currency] || '$';
    const convertedPrice = Math.round(price * (conversionRates[currency] || 1));
    return `${symbol}${convertedPrice.toLocaleString('en-US')}`;
  };

  // Fetch selected plan details if plan ID is provided
  useEffect(() => {
    if (planId) {
      fetchPlanDetails();
    }
  }, [planId]);

  const fetchPlanDetails = async () => {
    try {
      setLoadingPlan(true);
      const response = await publicApi.getPlanById(planId);
      if (response.success && response.data) {
        setSelectedPlan(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch plan details:', err);
    } finally {
      setLoadingPlan(false);
    }
  };

  // Redirect to dashboard when authenticated (for free plans)
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }

    if (error) {
      clearError();
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.firstName) {
      errors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName) {
      errors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = 'Please enter a valid Email ID';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.organizationName) {
      errors.organizationName = 'Organization name is required';
    } else if (formData.organizationName.length < 2) {
      errors.organizationName = 'Organization name must be at least 2 characters';
    }

    if (!agreeTerms) {
      errors.terms = 'You must agree to the terms and conditions';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle free plan registration
  const handleFreeRegistration = async () => {
    const result = await register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
      organizationName: formData.organizationName,
      planId: 'free',
      billingCycle: 'monthly'
    });

    if (result.success) {
      // AuthContext will handle login and redirect
      console.log('[Register] Free plan registration successful');
    }
    return result;
  };

  // Handle paid plan registration with payment
  const handlePaidRegistration = async () => {
    const planToSend = selectedPlan?.slug || selectedPlan?.id || planId;

    // Calculate the converted price based on selected currency
    const basePrice = selectedPlan?.billing?.price || 0;
    const convertedPrice = Math.round(basePrice * (conversionRates[currency] || 1));

    try {
      console.log('[Register] Initiating payment for paid plan:', planToSend, 'currency:', currency, 'amount:', convertedPrice);

      // Call API to initiate payment
      const result = await registrationPaymentApi.initiatePayment({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        organizationName: formData.organizationName,
        planId: planToSend,
        billingCycle: billingCycle,
        paymentProvider: 'razorpay', // Default to Razorpay
        currency: currency,
        amount: convertedPrice // Send converted amount
      });

      console.log('[Register] Payment initiation result:', result);

      if (!result.success) {
        setFormErrors({ submit: result.error?.message || 'Failed to initiate payment' });
        return;
      }

      // If no payment required (free plan), this shouldn't happen but handle it
      if (!result.data?.requiresPayment) {
        // Account was created directly (free plan fallback)
        if (result.data?.accessToken) {
          storage.set(AUTH_KEYS.TOKEN, result.data.accessToken);
          storage.set(AUTH_KEYS.REFRESH_TOKEN, result.data.refreshToken);
          storage.set(AUTH_KEYS.USER, result.data.user);
          navigate('/dashboard', { replace: true });
        }
        return;
      }

      // Open payment gateway
      if (result.data.paymentProvider === 'razorpay') {
        await openRazorpayCheckout(result.data);
      } else if (result.data.paymentProvider === 'stripe') {
        // Redirect to Stripe checkout
        window.location.href = result.data.checkoutUrl;
      }

    } catch (err) {
      console.error('[Register] Payment initiation error:', err);
      setFormErrors({ submit: err.response?.data?.error?.message || 'Failed to initiate payment' });
    }
  };

  // Open Razorpay checkout
  const openRazorpayCheckout = async (paymentData) => {
    try {
      // Load Razorpay SDK
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

      const options = {
        key: paymentData.key,
        amount: paymentData.amount * 100, // Convert to paise
        currency: paymentData.currency || 'INR',
        order_id: paymentData.orderId,
        name: 'API Token Manager',
        description: `${selectedPlan?.name || 'Subscription'} - ${billingCycle}`,
        // Enable all payment methods
        method: {
          upi: true,
          netbanking: true,
          card: true,
          wallet: true,
          emi: true,
          paylater: true
        },
        // Configure payment method order (optional - shows most relevant first)
        config: {
          display: {
            blocks: {
              upi: {
                name: 'Pay via UPI',
                instruments: [
                  { method: 'upi' },
                  { method: 'upi', flows: ['collect', 'qr'] }
                ]
              },
              cards: {
                name: 'Pay with Card',
                instruments: [
                  { method: 'card' },
                  { method: 'emi' },
                  { method: 'cardless_emi' }
                ]
              },
              netbanking: {
                name: 'Net Banking',
                instruments: [
                  { method: 'netbanking' }
                ]
              },
              wallets: {
                name: 'Wallets & Pay Later',
                instruments: [
                  { method: 'wallet' },
                  { method: 'paylater' }
                ]
              }
            },
            sequence: ['block.upi', 'block.cards', 'block.netbanking', 'block.wallets'],
            preferences: {
              show_default_blocks: true
            }
          }
        },
        handler: async (response) => {
          try {
            console.log('[Register] Razorpay payment successful:', response);

            // Verify payment and complete registration
            const result = await registrationPaymentApi.verifyRazorpayPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );

            console.log('[Register] Verification result:', result);

            if (result.success) {
              // The data might be nested: result.data contains { success, user, accessToken, refreshToken }
              const responseData = result.data || result;

              // Store tokens and user
              if (responseData.accessToken) {
                storage.set(AUTH_KEYS.TOKEN, responseData.accessToken);
                storage.set(AUTH_KEYS.REFRESH_TOKEN, responseData.refreshToken);
                storage.set(AUTH_KEYS.USER, responseData.user);

                console.log('[Register] Tokens stored, redirecting to dashboard');

                // Redirect directly to dashboard
                window.location.href = '/dashboard';
              } else {
                console.error('[Register] No access token in response:', responseData);
                setFormErrors({ submit: 'Payment successful but login failed. Please try logging in.' });
              }
            } else {
              setFormErrors({ submit: result.error?.message || 'Payment verification failed' });
            }
          } catch (err) {
            console.error('[Register] Payment verification error:', err);
            setFormErrors({ submit: err.response?.data?.error?.message || err.message || 'Payment verification failed' });
          }
        },
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email
        },
        theme: {
          color: '#DC2626'
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            // Redirect to cancel page with option to retry
            navigate('/registration/cancel', {
              state: { pendingId: paymentData.pendingRegistrationId }
            });
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error('[Register] Razorpay error:', err);
      setFormErrors({ submit: 'Failed to open payment gateway' });
    }
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setFormErrors({});

    // Check if it's a free plan or paid plan
    const isPaidPlan = selectedPlan && selectedPlan.billing?.price > 0;

    try {
      if (isPaidPlan) {
        await handlePaidRegistration();
      } else {
        await handleFreeRegistration();
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    const password = formData.password;
    if (!password) return { strength: 0, label: '', color: 'bg-gray-200', width: '0%' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    const levels = [
      { strength: 1, label: 'Very Weak', color: 'bg-red-500', width: '20%' },
      { strength: 2, label: 'Weak', color: 'bg-orange-500', width: '40%' },
      { strength: 3, label: 'Fair', color: 'bg-yellow-500', width: '60%' },
      { strength: 4, label: 'Good', color: 'bg-emerald-500', width: '80%' },
      { strength: 5, label: 'Strong', color: 'bg-green-500', width: '100%' }
    ];

    return levels[strength - 1] || { strength: 0, label: '', color: 'bg-gray-200', width: '0%' };
  };

  const passwordStrength = getPasswordStrength();
  const isPaidPlan = selectedPlan && selectedPlan.billing?.price > 0;

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#DC2626] relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-white/10" />
        <div className="absolute bottom-[-150px] right-[-150px] w-[500px] h-[500px] rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-white/10" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <span className="text-white text-xl font-bold">API Token Manager</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-bold text-white mb-4 leading-tight">
            Start Managing<br />Your API Tokens
          </h1>
          <p className="text-lg text-white/80 mb-6 max-w-lg">
            Create your account and organization to take control of your API security with powerful tools designed for modern development teams.
          </p>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-white/90">Instant token creation</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-white/90">Role-based access control</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-white/90">Quick setup in minutes</span>
            </div>
          </div>

          {/* Payment Notice for Paid Plans */}
          {isPaidPlan && (
            <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-white mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div className="text-xs text-white">
                  <p className="font-semibold">Secure Payment Required</p>
                  <p className="mt-0.5 text-white/80">Your account will be created after successful payment.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 bg-[#DC2626] rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">API Token Manager</span>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left mb-5">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h2>
            <p className="text-sm text-gray-500">Join thousands of developers managing API tokens</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Error Message */}
            {(error || formErrors.submit) && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{formErrors.submit || error}</span>
              </div>
            )}

            {/* Selected Plan Banner */}
            {loadingPlan ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#DC2626]"></div>
                <span className="text-sm text-gray-600">Loading plan details...</span>
              </div>
            ) : selectedPlan ? (
              <div className="bg-gradient-to-r from-[#DC2626]/10 to-[#DC2626]/5 border border-[#DC2626]/20 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#DC2626] rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Selected Plan</p>
                      <p className="font-semibold text-gray-900 text-sm">{selectedPlan.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      {selectedPlan.billing?.price === 0
                        ? 'Free'
                        : formatPrice(billingCycle === 'yearly' ? (selectedPlan.billing?.yearlyPrice || selectedPlan.billing?.price * 12 * 0.8) : selectedPlan.billing?.price || 0)}
                      {selectedPlan.billing?.price > 0 && <span className="text-xs font-normal text-gray-500">/{billingCycle === 'yearly' ? 'year' : 'mo'}</span>}
                    </p>
                    {selectedPlan.credits?.includedCredits && (
                      <p className="text-xs text-gray-500">{selectedPlan.credits.includedCredits.toLocaleString()} tokens</p>
                    )}
                  </div>
                </div>
                <Link to="/pricing" className="text-xs text-[#DC2626] hover:underline mt-1 inline-block">
                  Change plan
                </Link>
              </div>
            ) : null}

            {/* Billing Cycle Toggle - Show for paid plans */}
            {isPaidPlan && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-700 mb-2">Billing Cycle</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      billingCycle === 'monthly'
                        ? 'bg-[#DC2626] text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('yearly')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      billingCycle === 'yearly'
                        ? 'bg-[#DC2626] text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Yearly
                    <span className="ml-1 text-xs opacity-75">(Save 20%)</span>
                  </button>
                </div>
                {billingCycle === 'yearly' && selectedPlan.billing?.price > 0 && (
                  <p className="mt-1.5 text-xs text-green-600 font-medium">
                    You save {formatPrice((selectedPlan.billing.price * 12) - (selectedPlan.billing?.yearlyPrice || selectedPlan.billing.price * 12 * 0.8))}/year
                  </p>
                )}
              </div>
            )}

            {/* Organization Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <input
                  type="text"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleChange}
                  placeholder="Your company or team name"
                  maxLength={100}
                  className={`w-full pl-10 pr-3 py-2.5 bg-white border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-transparent transition-all ${
                    formErrors.organizationName ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  required
                />
              </div>
              {formErrors.organizationName && (
                <p className="mt-1 text-xs text-red-500">{formErrors.organizationName}</p>
              )}
            </div>

            {/* Name Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="First name"
                    maxLength={100}
                    className={`w-full pl-10 pr-3 py-2.5 bg-white border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-transparent transition-all ${
                      formErrors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    required
                  />
                </div>
                {formErrors.firstName && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last name"
                    maxLength={100}
                    className={`w-full pl-10 pr-3 py-2.5 bg-white border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-transparent transition-all ${
                      formErrors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    required
                  />
                </div>
                {formErrors.lastName && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  maxLength={100}
                  className={`w-full pl-10 pr-3 py-2.5 bg-white border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-transparent transition-all ${
                    formErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  required
                />
              </div>
              {formErrors.email && (
                <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    maxLength={100}
                    className={`w-full pl-10 pr-3 py-2.5 bg-white border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-transparent transition-all ${
                      formErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all flex items-center justify-center"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: passwordStrength.width }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{passwordStrength.label}</span>
                  </div>
                </div>
              )}
              {formErrors.password && (
                <p className="mt-1 text-xs text-red-500">{formErrors.password}</p>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    maxLength={100}
                    className={`w-full pl-10 pr-3 py-2.5 bg-white border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-transparent transition-all ${
                      formErrors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all flex items-center justify-center"
                >
                  {showConfirmPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {formErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{formErrors.confirmPassword}</p>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2">
              <label className="flex items-start gap-2 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 border-2 rounded-md transition-all flex items-center justify-center ${agreeTerms ? 'bg-[#DC2626] border-[#DC2626]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                    {agreeTerms && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-600">
                  I agree to the{' '}
                  <Link to="#" className="text-[#DC2626] hover:text-[#B91C1C] font-medium">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="#" className="text-[#DC2626] hover:text-[#B91C1C] font-medium">
                    Privacy Policy
                  </Link>
                </span>
              </label>
            </div>
            {formErrors.terms && (
              <p className="text-xs text-red-500">{formErrors.terms}</p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || authLoading}
              className="w-full py-2.5 bg-[#DC2626] text-white font-semibold rounded-lg hover:bg-[#B91C1C] focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting || authLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isPaidPlan ? 'Processing...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {isPaidPlan ? 'Proceed to Payment' : 'Create Account'}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>

            {/* Login Link */}
            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-[#DC2626] hover:text-[#B91C1C] font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
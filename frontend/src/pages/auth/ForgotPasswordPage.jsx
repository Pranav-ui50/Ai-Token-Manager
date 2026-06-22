/**
 * Forgot Password Page
 *
 * Modern Red & White themed forgot password page.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import Loader from '../../components/common/Loader.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { showToast } from '../../utils/toasts.js';

const ForgotPasswordPage = () => {
  const { forgotPassword, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resetLink, setResetLink] = useState(null);

  // Handle input change
  const handleChange = (e) => {
    setEmail(e.target.value);

    if (emailError) {
      setEmailError('');
    }

    if (error) {
      clearError();
    }
  };

  // Validate email
  const validateEmail = () => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (email.length > 60) {
      setEmailError('Email cannot exceed 60 characters');
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError('Please enter a valid Email ID');
      return false;
    }
    return true;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail()) {
      return;
    }

    const result = await forgotPassword(email);

    if (result.success) {
      showToast.passwordResetSent();
      setSubmitted(true);
      // In development, show the reset link
      if (result.resetLink) {
        setResetLink(result.resetLink);
      }
    } else {
      showToast.error(result.error?.message || 'Failed to send reset link. Please try again.');
    }
  };

  // Success view
  if (submitted) {
    return (
      <div className="min-h-screen flex bg-[#F8FAFC]">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-[#DC2626] relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-white/10" />
          <div className="absolute bottom-[-150px] right-[-150px] w-[500px] h-[500px] rounded-full bg-white/5" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-white/10" />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <span className="text-white text-2xl font-bold">API Token Manager</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
              Check Your Email
            </h1>
            <p className="text-xl text-white/80 mb-8 max-w-lg">
              We've sent you instructions to reset your password. Check your inbox and follow the link.
            </p>
          </div>
        </div>

        {/* Right Side - Success Message */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md text-center">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
              <div className="w-10 h-10 bg-[#DC2626] rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">API Token Manager</span>
            </div>

            <div className="bg-white rounded-2xl shadow-soft p-8">
              {/* Success Icon */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                <svg className="h-8 w-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Check Your Email
              </h2>
              <p className="text-gray-600 mb-6">
                If an account exists with{' '}
                <span className="font-medium text-gray-900">{email}</span>, we've sent
                instructions to reset your password.
              </p>

              {/* Development mode: Show reset link */}
              {resetLink && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-sm text-yellow-800 font-medium mb-2">
                    Development Mode
                  </p>
                  <p className="text-xs text-yellow-700 mb-3">
                    Click the link below to reset your password:
                  </p>
                  <a
                    href={resetLink}
                    className="text-sm text-[#DC2626] hover:text-[#B91C1C] underline break-all"
                  >
                    {resetLink}
                  </a>
                </div>
              )}

              <div className="space-y-3">
                <Link to="/login">
                  <button className="w-full py-3.5 bg-[#DC2626] text-white font-semibold rounded-xl hover:bg-[#B91C1C] focus:outline-none transition-all shadow-lg shadow-[#DC2626]/25 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Login
                  </button>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setResetLink(null);
                  }}
                  className="text-sm text-[#DC2626] hover:text-[#B91C1C] font-medium transition-colors"
                >
                  Didn't receive the email? Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#DC2626] relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-white/10" />
        <div className="absolute bottom-[-150px] right-[-150px] w-[500px] h-[500px] rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-white/10" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <span className="text-white text-2xl font-bold">API Token Manager</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
            Forgot Your<br />Password?
          </h1>
          <p className="text-xl text-white/80 mb-8 max-w-lg">
            No worries! Enter your Email ID and we'll send you a link to reset your password.
          </p>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-white/90 text-lg">Secure password reset</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-white/90 text-lg">Your data stays protected</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-white/90 text-lg">Reset link expires in 1 hour</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-[#DC2626] rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">API Token Manager</span>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Reset your password</h2>
            <p className="text-gray-500">Enter your email and we'll send you a reset link</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  maxLength={60}
                  className={`w-full pl-11 pr-4 py-3.5 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 transition-all ${
                    emailError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  required
                />
              </div>
              {emailError && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {emailError}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#DC2626] text-white font-semibold rounded-xl hover:bg-[#B91C1C] focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#DC2626]/25"
            >
              {isLoading ? (
                <>
                  <Loader size="sm" inline />
                  Sending...
                </>
              ) : (
                <>
                  Send Reset Link
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </>
              )}
            </button>

            {/* Login Link */}
            <p className="text-center text-sm text-gray-600 pt-2">
              Remember your password?{' '}
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

export default ForgotPasswordPage;
/**
 * Error Page (500)
 *
 * Displayed when a server error occurs.
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const ErrorPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Illustration */}
        <div className="mb-8">
          <svg
            className="mx-auto h-48 w-48 text-red-400 dark:text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={0.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Code */}
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
          500
        </h1>

        {/* Error Message */}
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-4">
          Server Error
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Oops! Something went wrong on our end. Our team has been notified and we're working to fix it. Please try again later.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Try Again
          </button>
          <Link
            to="/dashboard"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>

        {/* Help Links */}
        <div className="mt-12 text-sm text-gray-500 dark:text-gray-400">
          <p className="mb-2">If this problem persists:</p>
          <div className="flex justify-center gap-4">
            <Link to="/support" className="text-blue-600 dark:text-blue-400 hover:underline">
              Contact Support
            </Link>
            <span>•</span>
            <a href="mailto:support@example.com" className="text-blue-600 dark:text-blue-400 hover:underline">
              Email Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;

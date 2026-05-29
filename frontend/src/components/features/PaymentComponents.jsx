/**
 * Payment Components
 *
 * React components for Stripe and Razorpay payment integration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useAuthStore } from '../../store';

// Stripe promise (lazy loaded)
let stripePromise = null;
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

/**
 * Payment Method Card Component
 */
export const PaymentMethodCard = ({
  method,
  onSetDefault,
  onRemove,
  isSelected = false,
  onSelect
}) => {
  const brandIcons = {
    visa: '💳',
    mastercard: '💳',
    amex: '💳',
    discover: '💳',
    other: '💳'
  };

  return (
    <div
      className={`
        border rounded-lg p-4 cursor-pointer transition-all
        ${isSelected
          ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
        }
      `}
      onClick={() => onSelect?.(method)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{brandIcons[method.brand] || brandIcons.other}</span>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {method.brand?.toUpperCase() || 'Card'} ending in {method.last4}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Expires {method.expiryMonth}/{method.expiryYear}
            </p>
          </div>
        </div>
        {method.isDefault && (
          <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
            Default
          </span>
        )}
      </div>

      <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        {!method.isDefault && onSetDefault && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSetDefault(method.id);
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Set as Default
          </button>
        )}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(method.id);
            }}
            className="text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Add Payment Method Component (Stripe)
 */
export const AddPaymentMethod = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cardData, setCardData] = useState({
    number: '',
    exp_month: '',
    exp_year: '',
    cvc: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // In production, use Stripe Elements for PCI compliance
      // This is a simplified version for demonstration
      const stripe = await getStripe();

      // Create payment method
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: {
          number: cardData.number.replace(/\s/g, ''),
          exp_month: parseInt(cardData.exp_month),
          exp_year: parseInt(cardData.exp_year),
          cvc: cardData.cvc
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Save to backend
      const response = await fetch('/api/payment/methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type: 'card',
          last4: paymentMethod.card.last4,
          brand: paymentMethod.card.brand,
          expiryMonth: paymentMethod.card.exp_month,
          expiryYear: paymentMethod.card.exp_year,
          externalId: paymentMethod.id,
          provider: 'stripe'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save payment method');
      }

      const data = await response.json();
      onSuccess?.(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : v;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Add Payment Method
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Card Number
            </label>
            <input
              type="text"
              value={cardData.number}
              onChange={(e) => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Month
              </label>
              <input
                type="text"
                value={cardData.exp_month}
                onChange={(e) => setCardData({ ...cardData, exp_month: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                placeholder="MM"
                maxLength={2}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Year
              </label>
              <input
                type="text"
                value={cardData.exp_year}
                onChange={(e) => setCardData({ ...cardData, exp_year: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="YYYY"
                maxLength={4}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CVC
              </label>
              <input
                type="text"
                value={cardData.cvc}
                onChange={(e) => setCardData({ ...cardData, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="123"
                maxLength={4}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Card'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

/**
 * Stripe Checkout Component
 */
export const StripeCheckout = ({ planId, billingCycle, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckout = async () => {
    setLoading(true);
    setError('');

    try {
      // Create checkout session
      const response = await fetch('/api/payment/checkout/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          planId,
          billingCycle
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create checkout session');
      }

      const { data } = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await getStripe();
      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      });

      if (error) {
        throw new Error(error.message);
      }

      // onSuccess will be called via webhook
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Complete Payment with Stripe
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        You will be redirected to Stripe to complete your payment securely.
      </p>

      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </>
          ) : (
            'Proceed to Payment'
          )}
        </button>
      </div>
    </div>
  );
};

/**
 * Razorpay Checkout Component
 */
export const RazorpayCheckout = ({ planId, billingCycle, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleCheckout = async () => {
    setLoading(true);
    setError('');

    try {
      // Create Razorpay order
      const response = await fetch('/api/payment/order/razorpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          planId,
          billingCycle
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create order');
      }

      const { data } = await response.json();

      // Open Razorpay checkout
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: 'API Token Manager',
        description: `${planId} - ${billingCycle} subscription`,
        prefill: data.prefill,
        handler: async (response) => {
          try {
            // Verify payment
            const verifyResponse = await fetch('/api/payment/verify/razorpay', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                orderId: data.orderId,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature
              })
            });

            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }

            const result = await verifyResponse.json();
            onSuccess?.(result.data);
          } catch (err) {
            setError(err.message);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            onCancel?.();
          }
        },
        theme: {
          color: '#6366f1'
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Complete Payment with Razorpay
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Pay using UPI, Net Banking, Wallets, or Cards via Razorpay.
      </p>

      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          {loading ? 'Processing...' : 'Pay with Razorpay'}
        </button>
      </div>
    </div>
  );
};

/**
 * Payment Provider Selection Component
 */
export const PaymentProviderSelect = ({ onSelect, selectedProvider }) => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch('/api/payment/config', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const { data } = await response.json();
          setProviders([
            data.stripe?.enabled ? { id: 'stripe', name: 'Credit/Debit Card', icon: '💳', available: true } : null,
            data.razorpay?.enabled ? { id: 'razorpay', name: 'Razorpay (UPI, Cards)', icon: '🏦', available: true } : null
          ].filter(Boolean));
        }
      } catch (err) {
        console.error('Failed to fetch payment providers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  if (loading) {
    return <div className="animate-pulse h-24 bg-gray-200 rounded-lg" />;
  }

  if (providers.length === 0) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-700 dark:text-yellow-400">
          No payment providers configured. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Payment Method</h4>
      {providers.map((provider) => (
        <button
          key={provider.id}
          onClick={() => onSelect(provider.id)}
          className={`
            w-full flex items-center space-x-3 p-4 rounded-lg border transition-all
            ${selectedProvider === provider.id
              ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
            }
          `}
        >
          <span className="text-2xl">{provider.icon}</span>
          <span className="font-medium text-gray-900 dark:text-white">{provider.name}</span>
          {selectedProvider === provider.id && (
            <svg className="w-5 h-5 text-blue-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
};

/**
 * Billing History Component
 */
export const BillingHistory = ({ invoices }) => {
  const formatDate = (date) => new Date(date).toLocaleDateString();
  const formatAmount = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  const statusColors = {
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
  };

  if (!invoices || invoices.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Billing History
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No invoices yet
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Billing History
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Invoice
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {invoice.invoiceNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(invoice.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {formatAmount(invoice.total, invoice.currency)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${statusColors[invoice.status] || statusColors.pending}`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => window.open(`/api/billing/invoices/${invoice.id}/download`, '_blank')}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default {
  PaymentMethodCard,
  AddPaymentMethod,
  StripeCheckout,
  RazorpayCheckout,
  PaymentProviderSelect,
  BillingHistory
};
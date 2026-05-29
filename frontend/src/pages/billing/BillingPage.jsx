/**
 * Billing Page
 *
 * Manage billing, subscription plans, payment methods, and invoices.
 * Red & White theme styling with full API integration.
 */

import { useState, useEffect } from 'react';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import billingApi from '../../services/api/billing.api.js';
import Modal from '../../components/common/Modal.jsx';
import Button from '../../components/common/Button.jsx';

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-blue-100 text-blue-700',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700'
};

const PAYMENT_BRAND_COLORS = {
  visa: 'bg-blue-600',
  mastercard: 'bg-orange-500',
  amex: 'bg-blue-400',
  discover: 'bg-orange-400',
  other: 'bg-gray-500'
};

function BillingPage() {
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingData, setBillingData] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // Modal states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBillingDetailsModal, setShowBillingDetailsModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Billing details form
  const [billingDetails, setBillingDetails] = useState({
    companyName: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    taxId: '',
    vatNumber: ''
  });

  // Payment method form
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'card',
    last4: '',
    brand: 'visa',
    expiryMonth: '',
    expiryYear: ''
  });

  const organizationId = currentOrganization?._id || currentOrganization?.id;

  useEffect(() => {
    if (organizationId) {
      loadBillingData();
      loadPlans();
    }
  }, [organizationId]);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      setError('');

      const [billingRes, usageRes, invoicesRes] = await Promise.all([
        billingApi.getBilling(organizationId),
        billingApi.getUsage(organizationId),
        billingApi.getInvoices(organizationId)
      ]);

      setBillingData(billingRes.data);
      setUsageData(usageRes.data);
      setInvoices(invoicesRes.data);

      if (billingRes.data?.billingDetails) {
        setBillingDetails(billingRes.data.billingDetails);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      setPlansLoading(true);
      const res = await billingApi.getAvailablePlans();
      setPlans(res.data);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setPlansLoading(false);
    }
  };

  const handleUpgrade = async (plan) => {
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) return;

    setIsSubmitting(true);
    setError('');

    try {
      await billingApi.updateSubscription(organizationId, {
        plan: selectedPlan.id,
        billingCycle: 'monthly'
      });

      setShowUpgradeModal(false);
      setSelectedPlan(null);
      await loadBillingData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upgrade plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubscription = async (reason) => {
    setIsSubmitting(true);
    setError('');

    try {
      await billingApi.cancelSubscription(organizationId, reason);
      setShowCancelModal(false);
      await loadBillingData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      await billingApi.reactivateSubscription(organizationId);
      await loadBillingData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reactivate subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPaymentMethod = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await billingApi.addPaymentMethod(organizationId, newPaymentMethod);
      setShowPaymentModal(false);
      setNewPaymentMethod({
        type: 'card',
        last4: '',
        brand: 'visa',
        expiryMonth: '',
        expiryYear: ''
      });
      await loadBillingData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add payment method');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePaymentMethod = async (methodId) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;

    try {
      await billingApi.removePaymentMethod(organizationId, methodId);
      await loadBillingData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove payment method');
    }
  };

  const handleSetDefaultPaymentMethod = async (methodId) => {
    try {
      await billingApi.setDefaultPaymentMethod(organizationId, methodId);
      await loadBillingData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set default payment method');
    }
  };

  const handleUpdateBillingDetails = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await billingApi.updateBillingDetails(organizationId, billingDetails);
      setShowBillingDetailsModal(false);
      await loadBillingData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update billing details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId, invoiceNumber) => {
    try {
      const response = await billingApi.downloadInvoice(organizationId, invoiceId, 'pdf');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download invoice');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (price) => {
    if (price === 'custom' || price === 'Contact Sales') return 'Custom';
    return `$${price}`;
  };

  const getUsagePercentage = (used, limit) => {
    if (limit === 'unlimited') return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC2626]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-sm text-gray-500">Manage your subscription and billing details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowBillingDetailsModal(true)}>
            Billing Details
          </Button>
          <Button variant="secondary" onClick={() => setShowPaymentModal(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Payment Methods
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Current Plan Card */}
      {billingData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#DC2626] to-[#B91C1C] px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Current Plan</p>
                <h2 className="text-white text-2xl font-bold">{billingData.plan?.displayName || billingData.plan?.name || 'Free'}</h2>
              </div>
              <div className="text-right">
                <p className="text-white text-3xl font-bold">
                  {formatPrice(billingData.plan?.price)}
                  {billingData.plan?.price !== 'custom' && billingData.plan?.price !== 0 && (
                    <span className="text-lg font-normal">/mo</span>
                  )}
                </p>
                <div className="flex items-center gap-2 justify-end mt-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[billingData.subscription?.status] || STATUS_COLORS.trial}`}>
                    {getStatusLabel(billingData.subscription?.status || 'trial')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Actions */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {billingData.subscription?.status === 'cancelled' ? (
                <span>Your subscription has been cancelled. Access until: {formatDate(billingData.subscription?.currentPeriodEnd)}</span>
              ) : billingData.subscription?.status === 'trial' ? (
                <span>Trial ends: {formatDate(billingData.subscription?.trialEndsAt)}</span>
              ) : (
                <span>Next billing date: {formatDate(billingData.subscription?.currentPeriodEnd)}</span>
              )}
            </div>
            <div className="flex gap-2">
              {billingData.subscription?.status === 'cancelled' && (
                <Button variant="primary" onClick={handleReactivate} disabled={isSubmitting}>
                  Reactivate
                </Button>
              )}
              {billingData.subscription?.status === 'active' && billingData.subscription?.plan !== 'free' && (
                <Button variant="secondary" onClick={() => setShowCancelModal(true)}>
                  Cancel Subscription
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Usage Summary */}
      {usageData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage This Period</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {Object.entries(usageData.usage || {}).map(([key, value]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="text-sm text-gray-500">
                    {value.used} / {value.limit === 'unlimited' ? '∞' : value.limit}
                  </span>
                </div>
                {value.limit !== 'unlimited' && (
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getUsageColor(value.percentage)}`}
                      style={{ width: `${Math.min(value.percentage, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
        {plansLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC2626]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = billingData?.subscription?.plan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-xl shadow-sm border-2 overflow-hidden ${
                    plan.id === 'professional' ? 'border-[#DC2626]' : 'border-gray-100'
                  }`}
                >
                  {plan.id === 'professional' && (
                    <div className="absolute top-0 right-0 bg-[#DC2626] text-white text-xs font-medium px-3 py-1">
                      Popular
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900">{plan.displayName || plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900">{formatPrice(plan.price)}</span>
                      {plan.price !== 'custom' && plan.price !== 0 && (
                        <span className="text-gray-500">/mo</span>
                      )}
                    </div>

                    <ul className="mt-6 space-y-3">
                      <li className="flex items-center gap-2 text-sm">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-600">
                          {plan.features?.maxProjects === 'unlimited' ? 'Unlimited' : plan.features?.maxProjects} Projects
                        </span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-600">
                          {plan.features?.maxTeamMembers === 'unlimited' ? 'Unlimited' : plan.features?.maxTeamMembers} Team Members
                        </span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-600">
                          {plan.features?.apiCalls === 'unlimited' ? 'Unlimited' : plan.features?.apiCalls?.toLocaleString()} API Calls
                        </span>
                      </li>
                    </ul>

                    <button
                      onClick={() => handleUpgrade(plan)}
                      disabled={isCurrentPlan}
                      className={`mt-6 w-full py-2.5 px-4 rounded-lg font-medium transition-colors ${
                        isCurrentPlan
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : plan.id === 'professional'
                            ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                            : 'border-2 border-[#DC2626] text-[#DC2626] hover:bg-red-50'
                      }`}
                    >
                      {isCurrentPlan ? 'Current Plan' : plan.price === 'custom' ? 'Contact Sales' : 'Upgrade'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Billing History / Invoices */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Billing History</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No billing history yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{invoice.number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invoice.paidAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${invoice.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                        invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDownloadInvoice(invoice.id, invoice.number)}
                        className="text-[#DC2626] hover:text-[#B91C1C] font-medium text-sm"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Methods Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Payment Methods"
        size="md"
      >
        <div className="p-6 space-y-4">
          {/* Existing Payment Methods */}
          {billingData?.paymentMethods?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Saved Payment Methods</h3>
              {billingData.paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="bg-gray-50 rounded-lg p-4 flex items-center gap-4"
                >
                  <div className={`w-12 h-8 ${PAYMENT_BRAND_COLORS[method.brand] || 'bg-gray-500'} rounded flex items-center justify-center`}>
                    <span className="text-white text-xs font-bold uppercase">{method.brand}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">•••• {method.last4}</p>
                    <p className="text-xs text-gray-500">
                      Expires {method.expiryMonth}/{method.expiryYear}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {method.isDefault ? (
                      <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">Default</span>
                    ) : (
                      <button
                        onClick={() => handleSetDefaultPaymentMethod(method.id)}
                        className="text-xs text-[#DC2626] hover:underline"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleRemovePaymentMethod(method.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Payment Method Form */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Payment Method</h3>
            <form onSubmit={handleAddPaymentMethod} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Card Number (Last 4)</label>
                  <input
                    type="text"
                    value={newPaymentMethod.last4}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, last4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    placeholder="4242"
                    maxLength={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none "
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Card Brand</label>
                  <select
                    value={newPaymentMethod.brand}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, brand: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none "
                  >
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="amex">American Express</option>
                    <option value="discover">Discover</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Month</label>
                  <input
                    type="number"
                    value={newPaymentMethod.expiryMonth}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, expiryMonth: e.target.value })}
                    placeholder="01"
                    min={1}
                    max={12}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none "
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Year</label>
                  <input
                    type="number"
                    value={newPaymentMethod.expiryYear}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, expiryYear: e.target.value })}
                    placeholder={new Date().getFullYear()}
                    min={new Date().getFullYear()}
                    max={new Date().getFullYear() + 20}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none "
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowPaymentModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? 'Adding...' : 'Add Payment Method'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Modal>

      {/* Billing Details Modal */}
      <Modal
        isOpen={showBillingDetailsModal}
        onClose={() => setShowBillingDetailsModal(false)}
        title="Billing Details"
        size="md"
      >
        <div className="p-6">
          <form onSubmit={handleUpdateBillingDetails} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={billingDetails.companyName}
                onChange={(e) => setBillingDetails({ ...billingDetails, companyName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none "
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={billingDetails.address}
                onChange={(e) => setBillingDetails({ ...billingDetails, address: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none "
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={billingDetails.city}
                  onChange={(e) => setBillingDetails({ ...billingDetails, city: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={billingDetails.state}
                  onChange={(e) => setBillingDetails({ ...billingDetails, state: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none "
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={billingDetails.country}
                  onChange={(e) => setBillingDetails({ ...billingDetails, country: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={billingDetails.postalCode}
                  onChange={(e) => setBillingDetails({ ...billingDetails, postalCode: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none "
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                <input
                  type="text"
                  value={billingDetails.taxId}
                  onChange={(e) => setBillingDetails({ ...billingDetails, taxId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
                <input
                  type="text"
                  value={billingDetails.vatNumber}
                  onChange={(e) => setBillingDetails({ ...billingDetails, vatNumber: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none "
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowBillingDetailsModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Upgrade Plan Modal */}
      <Modal
        isOpen={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          setSelectedPlan(null);
        }}
        title={`Upgrade to ${selectedPlan?.displayName || selectedPlan?.name || ''} Plan`}
        size="md"
      >
        {selectedPlan && (
          <div className="p-6 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{selectedPlan.displayName || selectedPlan.name}</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(selectedPlan.price)}
                  {selectedPlan.price !== 'custom' && selectedPlan.price !== 0 && '/mo'}
                </span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-700">
                {selectedPlan.price === 'custom'
                  ? 'Contact our sales team for enterprise pricing.'
                  : `Your card will be charged ${formatPrice(selectedPlan.price)} immediately. You can cancel anytime.`}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowUpgradeModal(false);
                  setSelectedPlan(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmUpgrade}
                disabled={isSubmitting || selectedPlan.price === 'custom'}
                className="flex-1"
              >
                {isSubmitting ? 'Processing...' : 'Confirm Upgrade'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Subscription Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Subscription"
        size="md"
      >
        <CancelSubscriptionForm
          onCancel={() => setShowCancelModal(false)}
          onSubmit={handleCancelSubscription}
          isSubmitting={isSubmitting}
        />
      </Modal>
    </div>
  );
}

// Cancel Subscription Form Component
function CancelSubscriptionForm({ onCancel, onSubmit, isSubmitting }) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(reason);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700">
          Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reason for cancellation (optional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Tell us why you're leaving..."
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none "
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Keep Subscription
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Cancelling...' : 'Cancel Subscription'}
        </Button>
      </div>
    </form>
  );
}

export default BillingPage;
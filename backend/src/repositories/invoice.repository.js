/**
 * Invoice Repository
 *
 * Repository for Invoice model operations.
 * Extends BaseRepository with invoice-specific methods.
 */

import BaseRepository from './base.repository.js';
import Invoice from '../models/Invoice.js';
import mongoose from 'mongoose';

class InvoiceRepository extends BaseRepository {
  constructor() {
    super(Invoice);
  }

  /**
   * Find invoices by organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated invoices
   */
  async findByOrganization(organizationId, options = {}) {
    const { page = 1, limit = 10, status, startDate, endDate } = options;

    const conditions = { organization: organizationId };

    if (status) conditions.status = status;
    if (startDate || endDate) {
      conditions.createdAt = {};
      if (startDate) conditions.createdAt.$gte = new Date(startDate);
      if (endDate) conditions.createdAt.$lte = new Date(endDate);
    }

    return await this.findWithPagination(conditions, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: 'createdBy',
      ...options
    });
  }

  /**
   * Find invoice by invoice number
   * @param {string} invoiceNumber - Invoice number
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Invoice document
   */
  async findByInvoiceNumber(invoiceNumber, options = {}) {
    return await this.findOne({ invoiceNumber }, options);
  }

  /**
   * Find invoices by status
   * @param {string} organizationId - Organization ID
   * @param {string} status - Invoice status
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of invoices
   */
  async findByStatus(organizationId, status, options = {}) {
    return await this.find(
      { organization: organizationId, status },
      { ...options, sort: { createdAt: -1 } }
    );
  }

  /**
   * Find overdue invoices
   * @param {string} organizationId - Organization ID (optional)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of overdue invoices
   */
  async findOverdue(organizationId = null, options = {}) {
    const conditions = {
      status: 'pending',
      dueDate: { $lt: new Date() }
    };

    if (organizationId) {
      conditions.organization = organizationId;
    }

    return await this.find(conditions, {
      ...options,
      sort: { dueDate: 1 },
      populate: 'organization'
    });
  }

  /**
   * Find invoices by payment provider
   * @param {string} provider - Payment provider (stripe, razorpay)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of invoices
   */
  async findByPaymentProvider(provider, options = {}) {
    return await this.find(
      { 'payment.provider': provider },
      options
    );
  }

  /**
   * Find invoice by external ID
   * @param {string} externalId - External invoice ID
   * @param {string} provider - Payment provider
   * @returns {Promise<Object|null>} Invoice document
   */
  async findByExternalId(externalId, provider = null) {
    const conditions = { externalInvoiceId: externalId };
    if (provider) conditions['payment.provider'] = provider;
    return await this.findOne(conditions);
  }

  /**
   * Mark invoice as paid
   * @param {string} invoiceId - Invoice ID
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object|null>} Updated invoice
   */
  async markAsPaid(invoiceId, paymentData) {
    const invoice = await this.findById(invoiceId);
    if (!invoice) return null;

    return await invoice.markAsPaid(paymentData);
  }

  /**
   * Mark invoice as failed
   * @param {string} invoiceId - Invoice ID
   * @param {string} reason - Failure reason
   * @returns {Promise<Object|null>} Updated invoice
   */
  async markAsFailed(invoiceId, reason) {
    const invoice = await this.findById(invoiceId);
    if (!invoice) return null;

    return await invoice.markAsFailed(reason);
  }

  /**
   * Refund invoice
   * @param {string} invoiceId - Invoice ID
   * @param {number} amount - Refund amount
   * @param {string} reason - Refund reason
   * @returns {Promise<Object|null>} Updated invoice
   */
  async refund(invoiceId, amount, reason = null) {
    const invoice = await this.findById(invoiceId);
    if (!invoice) return null;

    return await invoice.refund(amount, reason);
  }

  /**
   * Cancel invoice
   * @param {string} invoiceId - Invoice ID
   * @param {string} userId - User ID who cancelled
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object|null>} Updated invoice
   */
  async cancel(invoiceId, userId, reason = null) {
    const invoice = await this.findById(invoiceId);
    if (!invoice) return null;

    return await invoice.cancelInvoice(userId, reason);
  }

  /**
   * Add webhook event to invoice
   * @param {string} invoiceId - Invoice ID
   * @param {string} provider - Payment provider
   * @param {string} eventType - Event type
   * @param {string} eventId - Event ID
   * @returns {Promise<Object|null>} Updated invoice
   */
  async addWebhookEvent(invoiceId, provider, eventType, eventId) {
    const invoice = await this.findById(invoiceId);
    if (!invoice) return null;

    return await invoice.addWebhookEvent(provider, eventType, eventId);
  }

  /**
   * Get revenue statistics
   * @param {string} organizationId - Organization ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Revenue statistics
   */
  async getRevenueStats(organizationId, startDate, endDate) {
    const stats = await this.aggregate([
      {
        $match: {
          organization: mongoose.Types.ObjectId.createFromHexString(organizationId),
          status: 'paid',
          'payment.paidAt': {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalInvoices: { $sum: 1 },
          averageInvoice: { $avg: '$total' },
          byCurrency: {
            $push: {
              currency: '$currency',
              total: '$total'
            }
          }
        }
      }
    ]);

    return stats[0] || {
      totalRevenue: 0,
      totalInvoices: 0,
      averageInvoice: 0,
      byCurrency: []
    };
  }

  /**
   * Generate invoice number
   * @param {string} organizationId - Organization ID
   * @returns {Promise<string>} Generated invoice number
   */
  async generateInvoiceNumber(organizationId) {
    const prefix = 'INV';
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    const startOfMonth = new Date(year, new Date().getMonth(), 1);
    const count = await this.count({
      organization: organizationId,
      createdAt: { $gte: startOfMonth }
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}-${year}${month}-${sequence}`;
  }

  /**
   * Search invoices
   * @param {string} organizationId - Organization ID
   * @param {string} query - Search query
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated results
   */
  async search(organizationId, query, options = {}) {
    const { page = 1, limit = 10 } = options;

    return await this.findWithPagination(
      {
        organization: organizationId,
        $or: [
          { invoiceNumber: { $regex: query, $options: 'i' } },
          { 'items.description': { $regex: query, $options: 'i' } }
        ]
      },
      { ...options, page, limit }
    );
  }
}

export default new InvoiceRepository();
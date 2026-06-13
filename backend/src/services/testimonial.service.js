/**
 * Testimonial Service
 *
 * Handles all testimonial-related business logic.
 */

import Testimonial from '../models/Testimonial.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class TestimonialService {
  /**
   * Get all active testimonials (public)
   * @returns {Array} Active testimonials ordered by display_order
   */
  async getActiveTestimonials() {
    const testimonials = await Testimonial.getActive();
    return testimonials;
  }

  /**
   * Get all testimonials (admin)
   * @returns {Array} All testimonials
   */
  async getAllTestimonials() {
    const testimonials = await Testimonial.getAll();
    return testimonials;
  }

  /**
   * Get testimonial by ID
   * @param {string} testimonialId - Testimonial ID
   * @returns {Object} Testimonial
   */
  async getTestimonialById(testimonialId) {
    const testimonial = await Testimonial.findById(testimonialId)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    if (!testimonial) {
      throw new AppError('Testimonial not found', 404, 'TESTIMONIAL_NOT_FOUND');
    }

    return testimonial;
  }

  /**
   * Create a new testimonial
   * @param {Object} data - Testimonial data
   * @param {string} userId - Admin user ID
   * @returns {Object} Created testimonial
   */
  async createTestimonial(data, userId) {
    const { name, role, company, content, rating, isVerified, source } = data;

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1.0 and 5.0', 400, 'INVALID_RATING');
    }

    // Get highest display order
    const highestOrder = await Testimonial.findOne()
      .sort({ displayOrder: -1 })
      .select('displayOrder');
    const displayOrder = (highestOrder?.displayOrder || 0) + 1;

    const testimonial = await Testimonial.create({
      name,
      role,
      company,
      content,
      rating,
      isVerified: isVerified ?? false,
      source: source || 'requested',
      displayOrder,
      createdBy: userId
    });

    logger.info(`Testimonial created: ${testimonial._id} by user: ${userId}`);

    return testimonial;
  }

  /**
   * Update a testimonial
   * @param {string} testimonialId - Testimonial ID
   * @param {Object} data - Update data
   * @param {string} userId - Admin user ID
   * @returns {Object} Updated testimonial
   */
  async updateTestimonial(testimonialId, data, userId) {
    const { name, role, company, content, rating, isVerified, source } = data;

    const testimonial = await Testimonial.findById(testimonialId);

    if (!testimonial) {
      throw new AppError('Testimonial not found', 404, 'TESTIMONIAL_NOT_FOUND');
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      throw new AppError('Rating must be between 1.0 and 5.0', 400, 'INVALID_RATING');
    }

    // Update fields
    if (name) testimonial.name = name;
    if (role) testimonial.role = role;
    if (company) testimonial.company = company;
    if (content) testimonial.content = content;
    if (rating !== undefined) testimonial.rating = rating;
    if (isVerified !== undefined) testimonial.isVerified = isVerified;
    if (source) testimonial.source = source;
    testimonial.updatedBy = userId;

    await testimonial.save();

    logger.info(`Testimonial updated: ${testimonialId} by user: ${userId}`);

    return testimonial;
  }

  /**
   * Delete a testimonial (soft delete)
   * @param {string} testimonialId - Testimonial ID
   * @param {string} userId - Admin user ID
   * @returns {boolean} Success
   */
  async deleteTestimonial(testimonialId, userId) {
    const testimonial = await Testimonial.findById(testimonialId);

    if (!testimonial) {
      throw new AppError('Testimonial not found', 404, 'TESTIMONIAL_NOT_FOUND');
    }

    await Testimonial.findByIdAndDelete(testimonialId);

    logger.info(`Testimonial deleted: ${testimonialId} by user: ${userId}`);

    return true;
  }

  /**
   * Toggle testimonial active status
   * @param {string} testimonialId - Testimonial ID
   * @param {string} userId - Admin user ID
   * @returns {Object} Updated testimonial
   */
  async toggleTestimonial(testimonialId, userId) {
    const testimonial = await Testimonial.findById(testimonialId);

    if (!testimonial) {
      throw new AppError('Testimonial not found', 404, 'TESTIMONIAL_NOT_FOUND');
    }

    testimonial.isActive = !testimonial.isActive;
    testimonial.updatedBy = userId;

    await testimonial.save();

    logger.info(`Testimonial toggled: ${testimonialId} to ${testimonial.isActive} by user: ${userId}`);

    return testimonial;
  }

  /**
   * Reorder testimonials
   * @param {Array} orderIds - Array of testimonial IDs in new order
   * @returns {boolean} Success
   */
  async reorderTestimonials(orderIds) {
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      throw new AppError('Invalid order data', 400, 'INVALID_ORDER_DATA');
    }

    await Testimonial.reorder(orderIds);

    logger.info(`Testimonials reordered`);

    return true;
  }
}

export default new TestimonialService();
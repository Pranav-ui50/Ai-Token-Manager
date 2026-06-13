/**
 * Testimonial Controller
 *
 * Handles HTTP requests for testimonials.
 */

import testimonialService from '../services/testimonial.service.js';
import { AppError } from '../middlewares/error.middleware.js';

/**
 * Get all active testimonials (public)
 * GET /api/testimonials
 */
export const getActiveTestimonials = async (req, res, next) => {
  try {
    const testimonials = await testimonialService.getActiveTestimonials();
    res.json({
      success: true,
      data: testimonials
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all testimonials (admin)
 * GET /api/admin/testimonials
 */
export const getAllTestimonials = async (req, res, next) => {
  try {
    const testimonials = await testimonialService.getAllTestimonials();
    res.json({
      success: true,
      data: testimonials
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get testimonial by ID
 * GET /api/admin/testimonials/:id
 */
export const getTestimonialById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const testimonial = await testimonialService.getTestimonialById(id);
    res.json({
      success: true,
      data: testimonial
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create testimonial
 * POST /api/admin/testimonials
 */
export const createTestimonial = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const testimonial = await testimonialService.createTestimonial(req.body, userId);
    res.status(201).json({
      success: true,
      data: testimonial,
      message: 'Testimonial created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update testimonial
 * PUT /api/admin/testimonials/:id
 */
export const updateTestimonial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const testimonial = await testimonialService.updateTestimonial(id, req.body, userId);
    res.json({
      success: true,
      data: testimonial,
      message: 'Testimonial updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete testimonial
 * DELETE /api/admin/testimonials/:id
 */
export const deleteTestimonial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    await testimonialService.deleteTestimonial(id, userId);
    res.json({
      success: true,
      message: 'Testimonial deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle testimonial active status
 * PATCH /api/admin/testimonials/:id/toggle
 */
export const toggleTestimonial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const testimonial = await testimonialService.toggleTestimonial(id, userId);
    res.json({
      success: true,
      data: testimonial,
      message: `Testimonial ${testimonial.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reorder testimonials
 * PATCH /api/admin/testimonials/reorder
 */
export const reorderTestimonials = async (req, res, next) => {
  try {
    const { orderIds } = req.body;
    await testimonialService.reorderTestimonials(orderIds);
    res.json({
      success: true,
      message: 'Testimonials reordered successfully'
    });
  } catch (error) {
    next(error);
  }
};
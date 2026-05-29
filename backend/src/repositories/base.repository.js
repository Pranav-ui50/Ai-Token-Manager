/**
 * Base Repository
 *
 * Abstract base class for all repositories.
 * Provides common CRUD operations and query builders.
 */

import { AppError } from '../middlewares/error.middleware.js';

/**
 * @abstract
 * Base repository class that provides common database operations.
 * All specific repositories should extend this class.
 */
class BaseRepository {
  /**
   * Create a new repository instance
   * @param {Model} model - Mongoose model
   */
  constructor(model) {
    if (this.constructor === BaseRepository) {
      throw new Error('BaseRepository is an abstract class and cannot be instantiated directly');
    }
    this.model = model;
  }

  /**
   * Create a new document
   * @param {Object} data - Document data
   * @param {Object} options - Create options
   * @returns {Promise<Object>} Created document
   */
  async create(data, options = {}) {
    const document = await this.model.create(data, options);
    return document;
  }

  /**
   * Find document by ID
   * @param {string} id - Document ID
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Document or null
   */
  async findById(id, options = {}) {
    const { select, populate } = options;

    let query = this.model.findById(id);

    if (select) query = query.select(select);
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach(p => query = query.populate(p));
      } else {
        query = query.populate(populate);
      }
    }

    return await query;
  }

  /**
   * Find one document by conditions
   * @param {Object} conditions - Query conditions
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Document or null
   */
  async findOne(conditions, options = {}) {
    const { select, populate, sort } = options;

    let query = this.model.findOne(conditions);

    if (select) query = query.select(select);
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach(p => query = query.populate(p));
      } else {
        query = query.populate(populate);
      }
    }
    if (sort) query = query.sort(sort);

    return await query;
  }

  /**
   * Find documents by conditions
   * @param {Object} conditions - Query conditions
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of documents
   */
  async find(conditions = {}, options = {}) {
    const { select, populate, sort, skip, limit } = options;

    let query = this.model.find(conditions);

    if (select) query = query.select(select);
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach(p => query = query.populate(p));
      } else {
        query = query.populate(populate);
      }
    }
    if (sort) query = query.sort(sort);
    if (skip) query = query.skip(skip);
    if (limit) query = query.limit(limit);

    return await query;
  }

  /**
   * Find documents with pagination
   * @param {Object} conditions - Query conditions
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated result with documents and metadata
   */
  async findWithPagination(conditions = {}, options = {}) {
    const {
      select,
      populate,
      sort = { createdAt: -1 },
      page = 1,
      limit = 10
    } = options;

    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      this.find(conditions, { select, populate, sort, skip, limit }),
      this.model.countDocuments(conditions)
    ]);

    return {
      data: documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update document by ID
   * @param {string} id - Document ID
   * @param {Object} updates - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Object|null>} Updated document or null
   */
  async findByIdAndUpdate(id, updates, options = {}) {
    const { new: returnNew = true, runValidators = true, populate } = options;

    let query = this.model.findByIdAndUpdate(
      id,
      updates,
      { new: returnNew, runValidators }
    );

    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach(p => query = query.populate(p));
      } else {
        query = query.populate(populate);
      }
    }

    return await query;
  }

  /**
   * Update one document by conditions
   * @param {Object} conditions - Query conditions
   * @param {Object} updates - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Update result
   */
  async updateOne(conditions, updates, options = {}) {
    return await this.model.updateOne(conditions, updates, options);
  }

  /**
   * Update multiple documents
   * @param {Object} conditions - Query conditions
   * @param {Object} updates - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Update result
   */
  async updateMany(conditions, updates, options = {}) {
    return await this.model.updateMany(conditions, updates, options);
  }

  /**
   * Delete document by ID
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} Deleted document or null
   */
  async findByIdAndDelete(id) {
    return await this.model.findByIdAndDelete(id);
  }

  /**
   * Delete one document by conditions
   * @param {Object} conditions - Query conditions
   * @returns {Promise<Object>} Delete result
   */
  async deleteOne(conditions) {
    return await this.model.deleteOne(conditions);
  }

  /**
   * Delete multiple documents
   * @param {Object} conditions - Query conditions
   * @returns {Promise<Object>} Delete result
   */
  async deleteMany(conditions) {
    return await this.model.deleteMany(conditions);
  }

  /**
   * Count documents
   * @param {Object} conditions - Query conditions
   * @returns {Promise<number>} Count of documents
   */
  async count(conditions = {}) {
    return await this.model.countDocuments(conditions);
  }

  /**
   * Check if document exists
   * @param {Object} conditions - Query conditions
   * @returns {Promise<boolean>} True if exists
   */
  async exists(conditions) {
    const document = await this.model.findOne(conditions).select('_id');
    return !!document;
  }

  /**
   * Aggregate pipeline
   * @param {Array} pipeline - Aggregation pipeline
   * @returns {Promise<Array>} Aggregation results
   */
  async aggregate(pipeline) {
    return await this.model.aggregate(pipeline);
  }

  /**
   * Populate document references
   * @param {Object} document - Document to populate
   * @param {Object|string} populate - Populate options
   * @returns {Promise<Object>} Populated document
   */
  async populate(document, populate) {
    return await this.model.populate(document, populate);
  }

  /**
   * Start a database transaction
   * @param {Function} callback - Transaction callback
   * @returns {Promise<any>} Transaction result
   */
  async withTransaction(callback) {
    const session = await this.model.startSession();
    try {
      session.startTransaction();
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Find or throw error
   * @param {Object} conditions - Query conditions
   * @param {string} message - Error message
   * @param {number} statusCode - Error status code
   * @returns {Promise<Object>} Document
   * @throws {AppError} If not found
   */
  async findOrFail(conditions, message = 'Resource not found', statusCode = 404) {
    const document = await this.findOne(conditions);
    if (!document) {
      throw new AppError(message, statusCode, 'NOT_FOUND');
    }
    return document;
  }

  /**
   * Find by ID or throw error
   * @param {string} id - Document ID
   * @param {string} message - Error message
   * @param {number} statusCode - Error status code
   * @returns {Promise<Object>} Document
   * @throws {AppError} If not found
   */
  async findOrFailById(id, message = 'Resource not found', statusCode = 404) {
    const document = await this.findById(id);
    if (!document) {
      throw new AppError(message, statusCode, 'NOT_FOUND');
    }
    return document;
  }
}

export default BaseRepository;
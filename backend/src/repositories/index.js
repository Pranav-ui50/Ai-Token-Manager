/**
 * Repositories Index
 *
 * Export all repository instances.
 * Provides a data access layer separate from business logic.
 */

import userRepository from './user.repository.js';
import organizationRepository from './organization.repository.js';
import featureRepository from './feature.repository.js';
import projectRepository from './project.repository.js';
import invoiceRepository from './invoice.repository.js';
import BaseRepository from './base.repository.js';

export {
  userRepository,
  organizationRepository,
  featureRepository,
  projectRepository,
  invoiceRepository,
  BaseRepository
};

export default {
  user: userRepository,
  organization: organizationRepository,
  feature: featureRepository,
  project: projectRepository,
  invoice: invoiceRepository,
  BaseRepository
};
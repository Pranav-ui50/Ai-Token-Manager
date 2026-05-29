/**
 * User Repository Integration Tests
 *
 * Integration tests for user repository.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import User from '../../../src/models/User.js';
import Role from '../../../src/models/Role.js';
import Organization from '../../../src/models/Organization.js';
import userRepository from '../../../src/repositories/user.repository.js';

describe('UserRepository Integration', () => {
  let testRole;
  let testOrganization;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Role.deleteMany({});
    await Organization.deleteMany({});

    // Create test role
    testRole = await Role.create({
      name: 'test_role',
      displayName: 'Test Role',
      permissions: ['view_projects', 'manage_projects']
    });

    // Create test organization
    testOrganization = await Organization.create({
      name: 'Test Org',
      owner: null // Will be updated after user creation
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'hashedpassword',
        role: testRole._id,
        organization: testOrganization._id
      };

      const user = await userRepository.create(userData);

      expect(user._id).toBeDefined();
      expect(user.email).toBe(userData.email.toLowerCase());
      expect(user.firstName).toBe(userData.firstName);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      await userRepository.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        password: 'hashedpassword',
        role: testRole._id,
        organization: testOrganization._id
      });

      const found = await userRepository.findByEmail('JANE.DOE@EXAMPLE.COM');

      expect(found).toBeDefined();
      expect(found.email).toBe('jane.doe@example.com');
    });

    it('should return null for non-existent email', async () => {
      const found = await userRepository.findByEmail('nonexistent@example.com');
      expect(found).toBeNull();
    });
  });

  describe('findByOrganization', () => {
    it('should find users by organization', async () => {
      // Create users
      await userRepository.create([
        {
          firstName: 'User1',
          lastName: 'Test',
          email: 'user1@example.com',
          password: 'hashed',
          role: testRole._id,
          organization: testOrganization._id
        },
        {
          firstName: 'User2',
          lastName: 'Test',
          email: 'user2@example.com',
          password: 'hashed',
          role: testRole._id,
          organization: testOrganization._id
        }
      ]);

      const users = await userRepository.findByOrganization(testOrganization._id);

      expect(users.length).toBe(2);
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      const user = await userRepository.create({
        firstName: 'Pass',
        lastName: 'Test',
        email: 'pass@example.com',
        password: 'oldpassword',
        role: testRole._id,
        organization: testOrganization._id
      });

      const updated = await userRepository.updatePassword(user._id, 'newhashedpassword');

      expect(updated).toBeDefined();
      const refreshed = await userRepository.findById(user._id);
      expect(refreshed.password).toBe('newhashedpassword');
    });
  });

  describe('verifyEmail', () => {
    it('should verify user email', async () => {
      const user = await userRepository.create({
        firstName: 'Verify',
        lastName: 'Test',
        email: 'verify@example.com',
        password: 'hashed',
        role: testRole._id,
        organization: testOrganization._id,
        isEmailVerified: false
      });

      const updated = await userRepository.verifyEmail(user._id);

      expect(updated.isEmailVerified).toBe(true);
      expect(updated.emailVerifiedAt).toBeDefined();
    });
  });

  describe('search', () => {
    it('should search users by name and email', async () => {
      await userRepository.create([
        {
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
          password: 'hashed',
          role: testRole._id,
          organization: testOrganization._id
        },
        {
          firstName: 'Bob',
          lastName: 'Jones',
          email: 'bob@example.com',
          password: 'hashed',
          role: testRole._id,
          organization: testOrganization._id
        }
      ]);

      const result = await userRepository.search('alice', { organization: testOrganization._id });

      expect(result.data.length).toBe(1);
      expect(result.data[0].firstName).toBe('Alice');
    });

    it('should paginate results', async () => {
      // Create 25 users
      const users = Array.from({ length: 25 }, (_, i) => ({
        firstName: `User${i}`,
        lastName: 'Test',
        email: `user${i}@example.com`,
        password: 'hashed',
        role: testRole._id,
        organization: testOrganization._id
      }));

      await userRepository.create(users);

      const page1 = await userRepository.search('User', { page: 1, limit: 10 });
      const page2 = await userRepository.search('User', { page: 2, limit: 10 });

      expect(page1.data.length).toBe(10);
      expect(page1.pagination.page).toBe(1);
      expect(page2.pagination.page).toBe(2);
    });
  });
});
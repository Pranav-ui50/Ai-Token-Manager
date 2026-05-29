/**
 * Base Repository Tests
 *
 * Tests for the base repository class.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';

// Test model
const testSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true },
  age: { type: Number },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const TestModel = mongoose.model('TestModel', testSchema);

// Mock repository extending base
class TestRepository {
  constructor() {
    this.model = TestModel;
  }

  async create(data) {
    return await this.model.create(data);
  }

  async findById(id) {
    return await this.model.findById(id);
  }

  async findOne(conditions) {
    return await this.model.findOne(conditions);
  }

  async find(conditions = {}) {
    return await this.model.find(conditions);
  }

  async findByIdAndUpdate(id, updates) {
    return await this.model.findByIdAndUpdate(id, updates, { new: true });
  }

  async deleteOne(conditions) {
    return await this.model.deleteOne(conditions);
  }

  async count(conditions = {}) {
    return await this.model.countDocuments(conditions);
  }
}

describe('BaseRepository', () => {
  let repository;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    repository = new TestRepository();
    // Clear test collection
    await TestModel.deleteMany({});
  });

  describe('create', () => {
    it('should create a new document', async () => {
      const data = { name: 'Test User', email: 'test@example.com', age: 25 };
      const doc = await repository.create(data);

      expect(doc._id).toBeDefined();
      expect(doc.name).toBe(data.name);
      expect(doc.email).toBe(data.email);
      expect(doc.isActive).toBe(true);
    });

    it('should fail when required field is missing', async () => {
      await expect(repository.create({ email: 'test@example.com' }))
        .rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find document by id', async () => {
      const created = await repository.create({ name: 'Find Me', email: 'find@example.com' });
      const found = await repository.findById(created._id);

      expect(found).toBeDefined();
      expect(found.name).toBe('Find Me');
    });

    it('should return null for non-existent id', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const found = await repository.findById(fakeId);

      expect(found).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should find one document by condition', async () => {
      await repository.create({ name: 'Unique', email: 'unique@example.com' });
      const found = await repository.findOne({ name: 'Unique' });

      expect(found).toBeDefined();
      expect(found.email).toBe('unique@example.com');
    });
  });

  describe('find', () => {
    it('should find all documents', async () => {
      await repository.create([
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' },
        { name: 'User 3', email: 'user3@example.com' }
      ]);

      const docs = await repository.find();
      expect(docs.length).toBe(3);
    });

    it('should filter documents by condition', async () => {
      await repository.create([
        { name: 'Active', email: 'active@example.com', isActive: true },
        { name: 'Inactive', email: 'inactive@example.com', isActive: false }
      ]);

      const active = await repository.find({ isActive: true });
      expect(active.length).toBe(1);
      expect(active[0].name).toBe('Active');
    });
  });

  describe('findByIdAndUpdate', () => {
    it('should update document and return new', async () => {
      const created = await repository.create({ name: 'Old Name', email: 'update@example.com' });
      const updated = await repository.findByIdAndUpdate(created._id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
    });
  });

  describe('deleteOne', () => {
    it('should delete document', async () => {
      const created = await repository.create({ name: 'To Delete', email: 'delete@example.com' });
      await repository.deleteOne({ _id: created._id });

      const found = await repository.findById(created._id);
      expect(found).toBeNull();
    });
  });

  describe('count', () => {
    it('should count documents', async () => {
      await repository.create([
        { name: 'Count 1', email: 'count1@example.com' },
        { name: 'Count 2', email: 'count2@example.com' }
      ]);

      const count = await repository.count();
      expect(count).toBe(2);
    });

    it('should count with filter', async () => {
      await repository.create([
        { name: 'Count', email: 'filter1@example.com', isActive: true },
        { name: 'Count', email: 'filter2@example.com', isActive: false }
      ]);

      const activeCount = await repository.count({ isActive: true });
      expect(activeCount).toBe(1);
    });
  });
});
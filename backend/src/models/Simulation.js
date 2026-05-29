/**
 * Simulation Model
 *
 * MongoDB model for storing simulation scenarios and results.
 * Implements FR-35 to FR-39: Simulation & Forecasting
 */

import mongoose from 'mongoose';

const SIMULATION_TYPES = ['growth', 'pricing_change', 'custom', 'expense_forecast', 'revenue_forecast'];
const SIMULATION_STATUS = ['draft', 'running', 'completed', 'failed', 'archived'];

const simulationSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: [true, 'Simulation name is required'],
      trim: true,
      maxlength: [100, 'Simulation name cannot exceed 100 characters']
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: ''
    },
    type: {
      type: String,
      enum: SIMULATION_TYPES,
      required: [true, 'Simulation type is required']
    },
    status: {
      type: String,
      enum: SIMULATION_STATUS,
      default: 'draft'
    },

    // Organization & Project
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization is required'],
      index: true
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null
    },

    // Input Parameters
    parameters: {
      // Time period
      startDate: {
        type: Date,
        required: true
      },
      endDate: {
        type: Date,
        required: true
      },

      // Growth scenario (FR-35)
      growth: {
        userGrowthRate: {
          type: Number,
          default: 0 // Monthly growth rate percentage
        },
        tokenUsageGrowthRate: {
          type: Number,
          default: 0
        },
        newUsersPerMonth: {
          type: Number,
          default: 0
        },
        churnRate: {
          type: Number,
          default: 0
        }
      },

      // Pricing change scenario (FR-36)
      pricingChange: {
        modelId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'AIModel',
          default: null
        },
        currentInputPrice: {
          type: Number,
          default: 0
        },
        currentOutputPrice: {
          type: Number,
          default: 0
        },
        newInputPrice: {
          type: Number,
          default: 0
        },
        newOutputPrice: {
          type: Number,
          default: 0
        },
        effectiveDate: {
          type: Date,
          default: null
        },
        applyToAllModels: {
          type: Boolean,
          default: false
        }
      },

      // Operational expense forecasting (FR-37)
      operationalExpenses: {
        infrastructureCost: {
          type: Number,
          default: 0
        },
        infrastructureGrowthRate: {
          type: Number,
          default: 0
        },
        laborCosts: {
          type: Number,
          default: 0
        },
        otherCosts: {
          type: Number,
          default: 0
        },
        costOptimizationFactor: {
          type: Number,
          default: 0 // Expected cost reduction percentage
        }
      },

      // Revenue/Profit forecasting (FR-38)
      revenueForecast: {
        subscriptionRevenue: {
          type: Number,
          default: 0
        },
        usageBasedRevenue: {
          type: Number,
          default: 0
        },
        revenueGrowthRate: {
          type: Number,
          default: 0
        },
        averageRevenuePerUser: {
          type: Number,
          default: 0
        },
        tokenPriceMarkup: {
          type: Number,
          default: 0 // Markup percentage on token costs
        }
      },

      // Custom parameters
      custom: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
      }
    },

    // Base Data (snapshot at simulation time)
    baseData: {
      totalUsers: {
        type: Number,
        default: 0
      },
      activeUsers: {
        type: Number,
        default: 0
      },
      totalTokenUsage: {
        type: Number,
        default: 0
      },
      totalCost: {
        type: Number,
        default: 0
      },
      totalRevenue: {
        type: Number,
        default: 0
      },
      features: [{
        featureId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Feature'
        },
        name: String,
        tokenUsage: Number,
        cost: Number
      }],
      models: [{
        modelId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'AIModel'
        },
        name: String,
        inputPrice: Number,
        outputPrice: Number
      }]
    },

    // Results
    results: {
      // Monthly projections
      monthlyProjections: [{
        month: Number,
        year: Number,
        date: Date,
        users: {
          total: Number,
          active: Number,
          new: Number,
          churned: Number
        },
        tokens: {
          input: Number,
          output: Number,
          total: Number
        },
        costs: {
          tokenCost: Number,
          infrastructureCost: Number,
          operationalCost: Number,
          totalCost: Number
        },
        revenue: {
          subscription: Number,
          usage: Number,
          total: Number
        },
        profit: {
          gross: Number,
          net: Number,
          margin: Number
        }
      }],

      // Summary metrics
      summary: {
        totalProjectedUsers: {
          type: Number,
          default: 0
        },
        totalProjectedTokens: {
          type: Number,
          default: 0
        },
        totalProjectedCost: {
          type: Number,
          default: 0
        },
        totalProjectedRevenue: {
          type: Number,
          default: 0
        },
        totalProjectedProfit: {
          type: Number,
          default: 0
        },
        averageMonthlyProfit: {
          type: Number,
          default: 0
        },
        profitMargin: {
          type: Number,
          default: 0
        },
        breakEvenUsers: {
          type: Number,
          default: 0
        },
        roi: {
          type: Number,
          default: 0
        },
        costSavings: {
          type: Number,
          default: 0
        }
      },

      // Comparison with baseline
      comparison: {
        costChange: {
          type: Number,
          default: 0
        },
        revenueChange: {
          type: Number,
          default: 0
        },
        profitChange: {
          type: Number,
          default: 0
        },
        userGrowthAchieved: {
          type: Number,
          default: 0
        }
      },

      // Chart data for frontend
      chartData: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
      }
    },

    // Scenario Comparison (FR-39)
    comparisonScenarios: [{
      simulationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Simulation'
      },
      name: String,
      comparedAt: Date
    }],

    // Execution Info
    execution: {
      startedAt: {
        type: Date,
        default: null
      },
      completedAt: {
        type: Date,
        default: null
      },
      duration: {
        type: Number,
        default: 0 // in milliseconds
      },
      error: {
        message: String,
        stack: String
      },
      progress: {
        type: Number,
        default: 0 // 0-100
      }
    },

    // Metadata
    tags: [{
      type: String,
      trim: true
    }],
    isPublic: {
      type: Boolean,
      default: false
    },
    isTemplate: {
      type: Boolean,
      default: false
    },

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes
simulationSchema.index({ organization: 1, createdAt: -1 });
simulationSchema.index({ organization: 1, status: 1 });
simulationSchema.index({ organization: 1, type: 1 });
simulationSchema.index({ createdBy: 1 });
simulationSchema.index({ 'tags': 1 });

// Virtual for duration in human-readable format
simulationSchema.virtual('durationFormatted').get(function () {
  if (!this.execution.duration) return '-';
  const seconds = Math.floor(this.execution.duration / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
});

// Static method to find by organization
simulationSchema.statics.findByOrganization = function (organizationId, filters = {}) {
  const query = { organization: organizationId };
  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;

  return this.find(query)
    .populate('createdBy', 'firstName lastName email')
    .populate('project', 'name')
    .sort({ createdAt: -1 });
};

// Static method to find templates
simulationSchema.statics.findTemplates = function (organizationId) {
  return this.find({
    $or: [
      { organization: organizationId, isTemplate: true },
      { isPublic: true, isTemplate: true }
    ]
  }).sort({ name: 1 });
};

// Static method to get simulation statistics
simulationSchema.statics.getStatistics = async function (organizationId) {
  const stats = await this.aggregate([
    { $match: { organization: mongoose.Types.ObjectId.createFromHexString(organizationId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        running: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
        draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        avgProfitMargin: { $avg: '$results.summary.profitMargin' },
        totalProjectedProfit: { $sum: '$results.summary.totalProjectedProfit' }
      }
    }
  ]);

  return stats[0] || {
    total: 0,
    completed: 0,
    running: 0,
    draft: 0,
    failed: 0,
    avgProfitMargin: 0,
    totalProjectedProfit: 0
  };
};

// Method to run simulation
simulationSchema.methods.run = async function () {
  this.status = 'running';
  this.execution.startedAt = new Date();
  this.execution.progress = 0;
  await this.save();
};

// Method to complete simulation
simulationSchema.methods.complete = async function (results) {
  this.status = 'completed';
  this.results = results;
  this.execution.completedAt = new Date();
  this.execution.duration = this.execution.completedAt - this.execution.startedAt;
  this.execution.progress = 100;
  await this.save();
};

// Method to fail simulation
simulationSchema.methods.fail = async function (error) {
  this.status = 'failed';
  this.execution.completedAt = new Date();
  this.execution.duration = this.execution.completedAt - this.execution.startedAt;
  this.execution.error = {
    message: error.message,
    stack: error.stack
  };
  await this.save();
};

// Method to duplicate simulation
simulationSchema.methods.duplicate = async function (userId) {
  const simulation = this.toObject();
  delete simulation._id;
  delete simulation.createdAt;
  delete simulation.updatedAt;
  delete simulation.__v;

  simulation.name = `${this.name} (Copy)`;
  simulation.status = 'draft';
  simulation.createdBy = userId;
  simulation.execution = {
    startedAt: null,
    completedAt: null,
    duration: 0,
    error: null,
    progress: 0
  };

  return await this.constructor.create(simulation);
};

const Simulation = mongoose.model('Simulation', simulationSchema);

export default Simulation;
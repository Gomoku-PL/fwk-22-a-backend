import mongoose from 'mongoose';

// Clear any existing model to prevent re-registration issues
if (mongoose.models.ConsentLog) {
  delete mongoose.models.ConsentLog;
}

const consentLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  eventType: {
    type: String,
    enum: ['consent_given', 'consent_withdrawn', 'consent_updated', 'consent_viewed'],
    required: true,
    index: true
  },
  purposes: {
    marketing: {
      type: Boolean,
      default: null
    },
    analytics: {
      type: Boolean,
      default: null
    },
    personalization: {
      type: Boolean,
      default: null
    },
    thirdParty: {
      type: Boolean,
      default: null
    }
  },
  previousPurposes: {
    marketing: {
      type: Boolean,
      default: null
    },
    analytics: {
      type: Boolean,
      default: null
    },
    personalization: {
      type: Boolean,
      default: null
    },
    thirdParty: {
      type: Boolean,
      default: null
    }
  },
  legalBasis: {
    type: String,
    enum: ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'],
    default: 'consent'
  },
  consentMethod: {
    type: String,
    enum: ['web_form', 'api_call', 'cookie_banner', 'email_opt_in', 'phone_consent'],
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    default: null
  },
  dataController: {
    type: String,
    default: 'FWK-22-A Backend System',
    required: true
  },
  processingPurpose: {
    type: String,
    required: true
  },
  dataCategories: [{
    type: String,
    enum: ['personal_data', 'behavioral_data', 'preference_data', 'technical_data']
  }],
  retentionPeriod: {
    type: String,
    default: '7 years',
    required: true
  },
  auditId: {
    type: String,
    required: true
    // Note: unique and index are handled by schema.index() below
  },
  complianceVersion: {
    type: String,
    default: 'GDPR-2018',
    required: true
  }
}, {
  timestamps: true,
  collection: 'consent_logs'
});

// Compound indexes for efficient audit queries
consentLogSchema.index({ userId: 1, createdAt: -1 });
consentLogSchema.index({ eventType: 1, createdAt: -1 });
consentLogSchema.index({ auditId: 1 }, { unique: true });
consentLogSchema.index({ createdAt: -1 });

// Virtual for audit summary
consentLogSchema.virtual('auditSummary').get(function() {
  return {
    eventId: this.auditId,
    userId: this.userId,
    event: this.eventType,
    timestamp: this.createdAt,
    compliance: this.complianceVersion
  };
});

// Static method for audit trail queries
consentLogSchema.statics.getAuditTrail = function(filters = {}) {
  const query = {};
  
  if (filters.userId) query.userId = filters.userId;
  if (filters.eventType) query.eventType = filters.eventType;
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

// Static method for compliance reporting
consentLogSchema.statics.getComplianceReport = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: {
          eventType: '$eventType',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        },
        count: { $sum: 1 },
        users: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        _id: 0,
        eventType: '$_id.eventType',
        date: '$_id.date',
        count: 1,
        uniqueUsers: { $size: '$users' }
      }
    },
    {
      $sort: { date: -1, eventType: 1 }
    }
  ]);
};

export default mongoose.model('ConsentLog', consentLogSchema);
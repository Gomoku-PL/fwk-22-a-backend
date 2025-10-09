import mongoose from 'mongoose';

const consentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  purposes: {
    marketing: {
      type: Boolean,
      default: false
    },
    analytics: {
      type: Boolean,
      default: false
    },
    personalization: {
      type: Boolean,
      default: false
    },
    thirdParty: {
      type: Boolean,
      default: false
    }
  },
  consentDate: {
    type: Date,
    default: null
  },
  withdrawalDate: {
    type: Date,
    default: null
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  legalBasis: {
    type: String,
    enum: ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'],
    default: 'consent'
  }
}, {
  timestamps: true,
  collection: 'consents'
});

// Compound index for efficient queries
consentSchema.index({ userId: 1, createdAt: -1 });

// Virtual to check if any consent is active
consentSchema.virtual('hasActiveConsent').get(function() {
  return Object.values(this.purposes).some(consent => consent === true);
});

// Method to check specific purpose consent
consentSchema.methods.hasConsentFor = function(purpose) {
  return this.purposes[purpose] === true;
};

// Static method to find active consent for user
consentSchema.statics.findActiveConsent = function(userId) {
  return this.findOne({ userId }).sort({ createdAt: -1 });
};

export default mongoose.model('Consent', consentSchema);
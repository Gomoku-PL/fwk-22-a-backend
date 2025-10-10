import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Clear any existing model and connection cache
try {
  if (mongoose.models.User) {
    delete mongoose.models.User;
  }
  if (mongoose.modelSchemas.User) {
    delete mongoose.modelSchemas.User;
  }
} catch (error) {
  // Ignore cache clearing errors
}

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true, // Creates a unique index automatically
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true, // Creates a unique index automatically
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockUntil: {
    type: Date,
    default: null
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  lastLoginIP: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 604800 // 7 days
    }
  }],
  securityEvents: [{
    eventType: {
      type: String,
      enum: [
        'login_success',
        'login_failed',
        'account_locked',
        'password_changed',
        'token_refresh',
        'logout'
      ]
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String,
    details: String
  }]
}, {
  timestamps: true,
  collection: 'users'
});

// ✅ Only keep necessary indexes — no duplicates
userSchema.index({ accountLockUntil: 1 });
userSchema.index({ 'securityEvents.timestamp': -1 });

// Virtual field
userSchema.virtual('isLocked').get(function() {
  return !!(this.accountLockUntil && this.accountLockUntil > Date.now());
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Increment failed login attempts
userSchema.methods.incFailedAttempts = function() {
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours

  if (this.accountLockUntil && this.accountLockUntil < Date.now()) {
    return this.updateOne({
      $unset: { accountLockUntil: 1 },
      $set: { failedLoginAttempts: 1 }
    });
  }

  const updates = { $inc: { failedLoginAttempts: 1 } };

  if (this.failedLoginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { accountLockUntil: Date.now() + lockTime };
  }

  return this.updateOne(updates);
};

// Reset failed login attempts
userSchema.methods.resetFailedAttempts = function() {
  return this.updateOne({
    $unset: { failedLoginAttempts: 1, accountLockUntil: 1 }
  });
};

// Add security event to audit trail
userSchema.methods.addSecurityEvent = function(eventType, ipAddress, userAgent, details = '') {
  this.securityEvents.push({
    eventType,
    ipAddress,
    userAgent,
    details,
    timestamp: new Date()
  });

  // Retain only the last 50 events
  if (this.securityEvents.length > 50) {
    this.securityEvents = this.securityEvents.slice(-50);
  }

  return this.save();
};

export default mongoose.model('User', userSchema);

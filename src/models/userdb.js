import bcrypt from "bcryptjs";

/**
 * In-memory user database for authentication
 * GDPR Article 32 compliant with security logging
 */
class UserDatabase {
  constructor() {
    this.users = new Map(); // email -> user object
    this.usersByUsername = new Map(); // username -> user object
    this.securityEvents = []; // Global security audit log

    // Create default demo user
    this.initializeDefaultUsers();
  }

  async initializeDefaultUsers() {
    const demoUsers = [
      {
        email: "demo@example.com",
        username: "demo",
        password: "Demo123!@#",
      },
      {
        email: "admin@example.com",
        username: "admin",
        password: "Admin123!@#",
      },
    ];

    for (const userData of demoUsers) {
      await this.createUser(userData);
    }
  }

  async createUser(userData) {
    const { email, username, password } = userData;

    if (
      this.users.has(email.toLowerCase()) ||
      this.usersByUsername.has(username.toLowerCase())
    ) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = {
      id: this.generateId(),
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password: hashedPassword,
      failedLoginAttempts: 0,
      accountLockUntil: null,
      lastLoginAt: null,
      lastLoginIP: null,
      isActive: true,
      emailVerified: true,
      refreshTokens: [],
      securityEvents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(email.toLowerCase(), user);
    this.usersByUsername.set(username.toLowerCase(), user);

    return this.sanitizeUser(user);
  }

  async findUserByEmail(email) {
    return this.users.get(email.toLowerCase()) || null;
  }

  async findUserByUsername(username) {
    return this.usersByUsername.get(username.toLowerCase()) || null;
  }

  async findUserByEmailOrUsername(identifier) {
    const user =
      (await this.findUserByEmail(identifier)) ||
      (await this.findUserByUsername(identifier));
    return user;
  }

  async comparePassword(user, candidatePassword) {
    return bcrypt.compare(candidatePassword, user.password);
  }

  isAccountLocked(user) {
    return !!(user.accountLockUntil && user.accountLockUntil > Date.now());
  }

  async incrementFailedAttempts(user) {
    const maxAttempts = 5;
    const lockTime = 2 * 60 * 60 * 1000; // 2 hours

    if (user.accountLockUntil && user.accountLockUntil < Date.now()) {
      user.accountLockUntil = null;
      user.failedLoginAttempts = 1;
    } else {
      user.failedLoginAttempts += 1;

      if (
        user.failedLoginAttempts >= maxAttempts &&
        !this.isAccountLocked(user)
      ) {
        user.accountLockUntil = Date.now() + lockTime;
      }
    }

    user.updatedAt = new Date();
    return user;
  }

  async resetFailedAttempts(user) {
    user.failedLoginAttempts = 0;
    user.accountLockUntil = null;
    user.updatedAt = new Date();
    return user;
  }

  async updateLastLogin(user, ipAddress) {
    user.lastLoginAt = new Date();
    user.lastLoginIP = ipAddress;
    user.updatedAt = new Date();
    return user;
  }

  addSecurityEvent(user, eventType, ipAddress, userAgent, details = "") {
    const event = {
      eventType,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      details,
      userId: user.id,
    };

    // Add to user's security events
    user.securityEvents.push(event);

    // Keep only last 50 events per user
    if (user.securityEvents.length > 50) {
      user.securityEvents = user.securityEvents.slice(-50);
    }

    // Add to global security log
    this.securityEvents.push(event);

    // Keep only last 1000 global events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    user.updatedAt = new Date();
  }

  addRefreshToken(user, token) {
    user.refreshTokens.push({
      token,
      createdAt: new Date(),
    });

    // Clean old tokens (older than 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    user.refreshTokens = user.refreshTokens.filter(
      (t) => t.createdAt.getTime() > sevenDaysAgo,
    );

    user.updatedAt = new Date();
  }

  removeRefreshToken(user, token) {
    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== token);
    user.updatedAt = new Date();
  }

  getSecurityEvents(userId = null, limit = 100) {
    let events = this.securityEvents;

    if (userId) {
      events = events.filter((event) => event.userId === userId);
    }

    return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  sanitizeUser(user) {
    const sanitized = { ...user };
    delete sanitized.password;
    delete sanitized.refreshTokens;
    return sanitized;
  }

  generateId() {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  getStats() {
    return {
      totalUsers: this.users.size,
      activeUsers: Array.from(this.users.values()).filter((u) => u.isActive)
        .length,
      lockedUsers: Array.from(this.users.values()).filter((u) =>
        this.isAccountLocked(u),
      ).length,
      totalSecurityEvents: this.securityEvents.length,
      storageType: "memory",
    };
  }

  clear() {
    this.users.clear();
    this.usersByUsername.clear();
    this.securityEvents = [];
    this.initializeDefaultUsers();
    return { message: "User database cleared and reinitialized" };
  }
}

export default new UserDatabase();

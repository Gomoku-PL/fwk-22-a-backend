/**
 * In-memory consent database for GDPR compliance
 * Stores user consent preferences temporarily
 */

class ConsentDatabase {
  constructor() {
    // Store consent records: userId -> consentRecord
    this.consents = new Map();
    // Store consent history for audit
    this.consentHistory = new Map(); // userId -> array of historical records
  }

  /**
   * Get current consent for user
   */
  getConsent(userId) {
    return this.consents.get(userId) || null;
  }

  /**
   * Update consent for user
   */
  setConsent(userId, consentData) {
    const timestamp = new Date().toISOString();
    const consentRecord = {
      userId,
      ...consentData,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Store current consent
    this.consents.set(userId, consentRecord);

    // Add to history
    if (!this.consentHistory.has(userId)) {
      this.consentHistory.set(userId, []);
    }
    this.consentHistory.get(userId).push({...consentRecord});

    return consentRecord;
  }

  /**
   * Get consent history for user
   */
  getConsentHistory(userId) {
    return this.consentHistory.get(userId) || [];
  }

  /**
   * Check if user has consent for specific purpose
   */
  hasConsent(userId, purpose) {
    const consent = this.getConsent(userId);
    return consent && consent.purposes && consent.purposes[purpose] === true;
  }

  /**
   * Remove all consent for user
   */
  removeConsent(userId) {
    const withdrawnConsent = {
      purposes: {
        marketing: false,
        analytics: false,
        personalization: false,
        thirdParty: false
      },
      withdrawalDate: new Date().toISOString(),
      consentDate: null,
      ipAddress: 'system',
      userAgent: 'system-withdrawal'
    };
    
    return this.setConsent(userId, withdrawnConsent);
  }

  /**
   * Get all users with active consent (for admin purposes)
   */
  getAllConsents() {
    return Array.from(this.consents.values());
  }

  /**
   * Clear all data (for testing)
   */
  clear() {
    this.consents.clear();
    this.consentHistory.clear();
  }

  /**
   * Get database stats
   */
  getStats() {
    return {
      totalUsers: this.consents.size,
      totalHistoryRecords: Array.from(this.consentHistory.values())
        .reduce((sum, history) => sum + history.length, 0),
      storageType: 'memory'
    };
  }
}

// Export singleton instance
export default new ConsentDatabase();
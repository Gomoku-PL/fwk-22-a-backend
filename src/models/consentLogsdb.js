/**
 * In-memory consent logs database for audit tracking
 * GDPR Article 30 compliance
 */

class ConsentLogsDatabase {
  constructor() {
    this.logs = [];
    this.logsByUser = new Map(); // userId -> array of logs
    this.logsByAuditId = new Map(); // auditId -> log
  }

  /**
   * Add consent log entry
   */
  addLog(logData) {
    const timestamp = new Date().toISOString();
    const auditId = this.generateAuditId();

    const logEntry = {
      ...logData,
      auditId,
      createdAt: timestamp,
      updatedAt: timestamp,
      complianceVersion: "GDPR-2018",
      dataController: "FWK-22-A Backend System",
      retentionPeriod: "7 years",
    };

    // Store in main logs array
    this.logs.push(logEntry);

    // Index by user
    if (!this.logsByUser.has(logData.userId)) {
      this.logsByUser.set(logData.userId, []);
    }
    this.logsByUser.get(logData.userId).push(logEntry);

    // Index by audit ID
    this.logsByAuditId.set(auditId, logEntry);

    return logEntry;
  }

  /**
   * Get audit trail with filters
   */
  getAuditTrail(filters = {}) {
    let filteredLogs = [...this.logs];

    if (filters.userId) {
      filteredLogs = filteredLogs.filter(
        (log) => log.userId === filters.userId,
      );
    }

    if (filters.eventType) {
      filteredLogs = filteredLogs.filter(
        (log) => log.eventType === filters.eventType,
      );
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filteredLogs = filteredLogs.filter(
        (log) => new Date(log.createdAt) >= startDate,
      );
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      filteredLogs = filteredLogs.filter(
        (log) => new Date(log.createdAt) <= endDate,
      );
    }

    return filteredLogs.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  }

  /**
   * Get logs for specific user
   */
  getUserLogs(userId) {
    return this.logsByUser.get(userId) || [];
  }

  /**
   * Get log by audit ID
   */
  getLogByAuditId(auditId) {
    return this.logsByAuditId.get(auditId);
  }

  /**
   * Generate compliance report
   */
  getComplianceReport(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const filteredLogs = this.logs.filter((log) => {
      const logDate = new Date(log.createdAt);
      return logDate >= start && logDate <= end;
    });

    const reportData = {};

    filteredLogs.forEach((log) => {
      const date = log.createdAt.split("T")[0]; // Extract date part
      const key = `${date}_${log.eventType}`;

      if (!reportData[key]) {
        reportData[key] = {
          eventType: log.eventType,
          date,
          count: 0,
          users: new Set(),
        };
      }

      reportData[key].count++;
      reportData[key].users.add(log.userId);
    });

    return Object.values(reportData)
      .map((item) => ({
        ...item,
        uniqueUsers: item.users.size,
        users: undefined, // Remove Set object
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Get statistics
   */
  getStats() {
    const eventTypeCounts = {};
    const userCounts = new Set();

    this.logs.forEach((log) => {
      eventTypeCounts[log.eventType] =
        (eventTypeCounts[log.eventType] || 0) + 1;
      userCounts.add(log.userId);
    });

    return {
      totalLogs: this.logs.length,
      uniqueUsers: userCounts.size,
      eventTypes: eventTypeCounts,
      storageType: "memory",
    };
  }

  /**
   * Generate unique audit ID
   */
  generateAuditId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `AUDIT_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Clear all logs (for testing)
   */
  clear() {
    this.logs = [];
    this.logsByUser.clear();
    this.logsByAuditId.clear();
  }
}

export default new ConsentLogsDatabase();

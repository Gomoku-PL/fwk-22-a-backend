import cron from "node-cron";
import UserModel from "../models/user.model.js";
import ConsentModel from "../models/consent.model.js";
import ConsentLogsModel from "../models/consentLogs.model.js";
import userDb from "../models/userdb.js";
import consentDb from "../models/consentdb.js";
import consentLogsDb from "../models/consentLogsdb.js";
import { isUsingMongoDB } from "../config/database.js";
import consentLogsService from "./consentLogs.service.js";

/**
 * Data Retention Service - GDPR compliance
 * Handles automated data cleanup and retention policies
 */
class DataRetentionService {
  constructor() {
    this.retentionConfig = {
      userData: {
        inactive: parseInt(process.env.USER_RETENTION_INACTIVE_DAYS) || 1095,
        deleted: parseInt(process.env.USER_RETENTION_DELETED_DAYS) || 30,
      },
      consentData: {
        withdrawn:
          parseInt(process.env.CONSENT_RETENTION_WITHDRAWN_DAYS) || 2555,
        logs: parseInt(process.env.CONSENT_LOGS_RETENTION_DAYS) || 2555,
      },
      securityEvents: {
        general: parseInt(process.env.SECURITY_EVENTS_RETENTION_DAYS) || 1095,
        breach: parseInt(process.env.SECURITY_BREACH_RETENTION_DAYS) || 2555,
      },
      gameData: {
        completed: parseInt(process.env.GAME_DATA_RETENTION_DAYS) || 365,
        abandoned: parseInt(process.env.GAME_DATA_ABANDONED_DAYS) || 90,
      },
    };

    this.cronJob = null;
    this.isRunning = false;
    this.lastRunTime = null;
    this.retentionStats = {
      totalRuns: 0,
      lastCleanupResults: null,
      errors: [],
    };
  }

  // Initialize scheduler
  async initialize() {
    try {
      const schedule = process.env.RETENTION_CRON_SCHEDULE || "0 2 * * *";

      this.cronJob = cron.schedule(
        schedule,
        async () => {
          await this.performScheduledCleanup();
        },
        {
          scheduled: false,
          timezone: "Europe/Warsaw",
        }
      );

      this.cronJob.start();

      console.log(`Data retention scheduler initialized (${schedule})`);
      console.log("GDPR Articles 5 & 17 compliance monitoring active");

      await this.logRetentionEvent("retention_scheduler_started", "system", {
        schedule,
        retentionConfig: this.retentionConfig,
      });

      return true;
    } catch (error) {
      console.error("Failed to initialize data retention scheduler:", error);
      this.retentionStats.errors.push({
        timestamp: new Date(),
        error: error.message,
        context: "initialization",
      });
      return false;
    }
  }

  // Stop scheduler
  async stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob.destroy();
      console.log("Data retention scheduler stopped");

      await this.logRetentionEvent("retention_scheduler_stopped", "system");
    }
  }

  // Main cleanup process
  async performScheduledCleanup() {
    if (this.isRunning) {
      console.log("Cleanup already in progress, skipping scheduled run");
      return;
    }

    console.log("Starting scheduled data retention cleanup...");
    this.isRunning = true;
    this.lastRunTime = new Date();
    this.retentionStats.totalRuns++;

    const results = {
      startTime: new Date(),
      userData: { processed: 0, anonymized: 0, deleted: 0, errors: 0 },
      consentData: { processed: 0, deleted: 0, errors: 0 },
      consentLogs: { processed: 0, deleted: 0, errors: 0 },
      securityEvents: { processed: 0, deleted: 0, errors: 0 },
      gameData: { processed: 0, deleted: 0, errors: 0 },
      endTime: null,
      duration: null,
      totalItemsProcessed: 0,
      totalItemsRemoved: 0,
    };

    try {
      const userResults = await this.cleanupUserData();
      results.userData = userResults;

      const consentResults = await this.cleanupConsentData();
      results.consentData = consentResults;

      const logsResults = await this.cleanupConsentLogs();
      results.consentLogs = logsResults;

      const securityResults = await this.cleanupSecurityEvents();
      results.securityEvents = securityResults;

      const gameResults = await this.cleanupGameData();
      results.gameData = gameResults;

      results.endTime = new Date();
      results.duration = results.endTime - results.startTime;

      Object.values(results).forEach((section) => {
        if (typeof section === "object" && section.processed) {
          results.totalItemsProcessed += section.processed;
          results.totalItemsRemoved +=
            (section.deleted || 0) + (section.anonymized || 0);
        }
      });

      this.retentionStats.lastCleanupResults = results;

      console.log("Data retention cleanup completed successfully");
      console.log(
        `Processed: ${results.totalItemsProcessed}, Removed: ${results.totalItemsRemoved}`
      );
      console.log(`Duration: ${Math.round(results.duration / 1000)}s`);

      await this.logRetentionEvent(
        "retention_cleanup_completed",
        "system",
        results
      );
    } catch (error) {
      console.error("Error during scheduled cleanup:", error);

      results.endTime = new Date();
      results.error = error.message;

      this.retentionStats.errors.push({
        timestamp: new Date(),
        error: error.message,
        context: "scheduled_cleanup",
        results,
      });

      await this.logRetentionEvent("retention_cleanup_failed", "system", {
        error: error.message,
        partialResults: results,
      });
    } finally {
      this.isRunning = false;
    }

    return results;
  }

  // User data cleanup
  async cleanupUserData() {
    const results = { processed: 0, anonymized: 0, deleted: 0, errors: 0 };

    try {
      if (isUsingMongoDB()) {
        // MongoDB implementation
        const cutoffInactive = new Date();
        cutoffInactive.setDate(
          cutoffInactive.getDate() - this.retentionConfig.userData.inactive
        );

        const cutoffDeleted = new Date();
        cutoffDeleted.setDate(
          cutoffDeleted.getDate() - this.retentionConfig.userData.deleted
        );

        const inactiveUsers = await UserModel.find({
          $or: [
            { lastLoginAt: { $lt: cutoffInactive } },
            { lastLoginAt: null, createdAt: { $lt: cutoffInactive } },
          ],
          isActive: true,
        });

        results.processed += inactiveUsers.length;

        for (const user of inactiveUsers) {
          try {
            await this.anonymizeUser(user._id);
            results.anonymized++;

            await this.logRetentionEvent("user_data_anonymized", user.email, {
              userId: user._id,
              lastLoginAt: user.lastLoginAt,
              reason: "inactive_retention_period_exceeded",
            });
          } catch (error) {
            results.errors++;
            console.error(`Error anonymizing user ${user._id}:`, error);
          }
        }

        const deletedUsers = await UserModel.find({
          isActive: false,
          updatedAt: { $lt: cutoffDeleted },
        });

        for (const user of deletedUsers) {
          try {
            await UserModel.deleteOne({ _id: user._id });
            results.deleted++;

            await this.logRetentionEvent(
              "user_data_deleted",
              "anonymized_user",
              {
                userId: user._id,
                reason: "deleted_retention_period_exceeded",
              }
            );
          } catch (error) {
            results.errors++;
            console.error(`Error deleting user ${user._id}:`, error);
          }
        }
      } else {
        // In-memory implementation
        const cutoffInactive = new Date();
        cutoffInactive.setDate(
          cutoffInactive.getDate() - this.retentionConfig.userData.inactive
        );

        const allUsers = Array.from(userDb.users.values());
        results.processed = allUsers.length;

        for (const user of allUsers) {
          const lastActivity = user.lastLoginAt
            ? new Date(user.lastLoginAt)
            : new Date(user.createdAt);

          if (lastActivity < cutoffInactive && user.isActive) {
            try {
              // Anonymize in-memory user
              await this.anonymizeUserInMemory(user);
              results.anonymized++;

              await this.logRetentionEvent("user_data_anonymized", user.email, {
                userId: user.id,
                lastLoginAt: user.lastLoginAt,
                reason: "inactive_retention_period_exceeded",
              });
            } catch (error) {
              results.errors++;
              console.error(`Error anonymizing user ${user.id}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in user data cleanup:", error);
      results.errors++;
    }

    return results;
  }

  // Consent data cleanup
  async cleanupConsentData() {
    const results = { processed: 0, deleted: 0, errors: 0 };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(
        cutoffDate.getDate() - this.retentionConfig.consentData.withdrawn
      );

      if (isUsingMongoDB()) {
        // Find old withdrawn consents
        const oldConsents = await ConsentModel.find({
          withdrawalDate: { $lt: cutoffDate, $ne: null },
        });

        results.processed = oldConsents.length;

        for (const consent of oldConsents) {
          try {
            await ConsentModel.deleteOne({ _id: consent._id });
            results.deleted++;

            await this.logRetentionEvent(
              "consent_data_deleted",
              consent.userId,
              {
                consentId: consent._id,
                withdrawalDate: consent.withdrawalDate,
                reason: "withdrawn_consent_retention_period_exceeded",
              }
            );
          } catch (error) {
            results.errors++;
            console.error(`Error deleting consent ${consent._id}:`, error);
          }
        }
      } else {
        // In-memory cleanup
        const allConsents = consentDb.getAllConsents();
        results.processed = allConsents.length;

        for (const consent of allConsents) {
          if (
            consent.withdrawalDate &&
            new Date(consent.withdrawalDate) < cutoffDate
          ) {
            try {
              consentDb.consents.delete(consent.userId);

              // Also remove from history
              const history =
                consentDb.consentHistory.get(consent.userId) || [];
              consentDb.consentHistory.set(
                consent.userId,
                history.filter(
                  (h) =>
                    !h.withdrawalDate ||
                    new Date(h.withdrawalDate) >= cutoffDate
                )
              );

              results.deleted++;

              await this.logRetentionEvent(
                "consent_data_deleted",
                consent.userId,
                {
                  withdrawalDate: consent.withdrawalDate,
                  reason: "withdrawn_consent_retention_period_exceeded",
                }
              );
            } catch (error) {
              results.errors++;
              console.error(
                `Error deleting consent for user ${consent.userId}:`,
                error
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in consent data cleanup:", error);
      results.errors++;
    }

    return results;
  }

  // Consent logs cleanup
  async cleanupConsentLogs() {
    const results = { processed: 0, deleted: 0, errors: 0 };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(
        cutoffDate.getDate() - this.retentionConfig.consentData.logs
      );

      if (isUsingMongoDB()) {
        const oldLogs = await ConsentLogsModel.find({
          createdAt: { $lt: cutoffDate },
        });

        results.processed = oldLogs.length;

        for (const log of oldLogs) {
          try {
            await ConsentLogsModel.deleteOne({ _id: log._id });
            results.deleted++;
          } catch (error) {
            results.errors++;
            console.error(`Error deleting consent log ${log._id}:`, error);
          }
        }
      } else {
        // In-memory cleanup
        const initialCount = consentLogsDb.logs.length;
        results.processed = initialCount;

        // Filter out old logs
        consentLogsDb.logs = consentLogsDb.logs.filter((log) => {
          const logDate = new Date(log.createdAt);
          return logDate >= cutoffDate;
        });

        results.deleted = initialCount - consentLogsDb.logs.length;

        // Rebuild indexes
        consentLogsDb.logsByUser.clear();
        consentLogsDb.logsByAuditId.clear();

        consentLogsDb.logs.forEach((log) => {
          // Rebuild user index
          if (!consentLogsDb.logsByUser.has(log.userId)) {
            consentLogsDb.logsByUser.set(log.userId, []);
          }
          consentLogsDb.logsByUser.get(log.userId).push(log);

          // Rebuild audit ID index
          consentLogsDb.logsByAuditId.set(log.auditId, log);
        });
      }

      if (results.deleted > 0) {
        await this.logRetentionEvent("consent_logs_cleaned", "system", {
          logsDeleted: results.deleted,
          cutoffDate: cutoffDate,
          reason: "consent_logs_retention_period_exceeded",
        });
      }
    } catch (error) {
      console.error("Error in consent logs cleanup:", error);
      results.errors++;
    }

    return results;
  }

  // Security events cleanup
  async cleanupSecurityEvents() {
    const results = { processed: 0, deleted: 0, errors: 0 };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(
        cutoffDate.getDate() - this.retentionConfig.securityEvents.general
      );

      if (isUsingMongoDB()) {
        const users = await UserModel.find({});

        for (const user of users) {
          const initialEventCount = user.securityEvents.length;
          results.processed += initialEventCount;

          // Keep only recent events
          user.securityEvents = user.securityEvents.filter(
            (event) => new Date(event.timestamp) >= cutoffDate
          );

          const deletedCount = initialEventCount - user.securityEvents.length;
          results.deleted += deletedCount;

          if (deletedCount > 0) {
            await user.save();
          }
        }
      } else {
        // In-memory cleanup
        const initialGlobalEvents = userDb.securityEvents.length;
        results.processed += initialGlobalEvents;

        // Clean global security events
        userDb.securityEvents = userDb.securityEvents.filter(
          (event) => new Date(event.timestamp) >= cutoffDate
        );

        results.deleted += initialGlobalEvents - userDb.securityEvents.length;

        // Clean individual user security events
        for (const [email, user] of userDb.users) {
          const initialCount = user.securityEvents.length;
          results.processed += initialCount;

          user.securityEvents = user.securityEvents.filter(
            (event) => new Date(event.timestamp) >= cutoffDate
          );

          results.deleted += initialCount - user.securityEvents.length;
        }
      }

      if (results.deleted > 0) {
        await this.logRetentionEvent("security_events_cleaned", "system", {
          eventsDeleted: results.deleted,
          cutoffDate: cutoffDate,
          reason: "security_events_retention_period_exceeded",
        });
      }
    } catch (error) {
      console.error("Error in security events cleanup:", error);
      results.errors++;
    }

    return results;
  }

  // Game data cleanup
  async cleanupGameData() {
    const results = { processed: 0, deleted: 0, errors: 0 };

    try {
      // This is a placeholder for game data cleanup
      // Implementation would depend on how game data is stored

      await this.logRetentionEvent("game_data_cleanup_skipped", "system", {
        reason: "no_persistent_game_data_storage_configured",
      });
    } catch (error) {
      console.error("Error in game data cleanup:", error);
      results.errors++;
    }

    return results;
  }

  // Anonymize user data
  async anonymizeUser(userId) {
    if (isUsingMongoDB()) {
      const anonymizedData = {
        email: `anonymized_${userId.toString().substring(0, 8)}@deleted.local`,
        username: `anonymous_${userId.toString().substring(0, 8)}`,
        isActive: false,
        emailVerified: false,
        lastLoginAt: null,
        lastLoginIP: "0.0.0.0",
        refreshTokens: [],
        securityEvents: [],
      };

      await UserModel.updateOne({ _id: userId }, anonymizedData);
    } else {
      throw new Error("MongoDB required for user anonymization");
    }
  }

  /**
   * Anonymize user in memory storage
   */
  async anonymizeUserInMemory(user) {
    const anonymizedData = {
      ...user,
      email: `anonymized_${user.id.substring(0, 8)}@deleted.local`,
      username: `anonymous_${user.id.substring(0, 8)}`,
      isActive: false,
      emailVerified: false,
      lastLoginAt: null,
      lastLoginIP: "0.0.0.0",
      refreshTokens: [],
      securityEvents: [],
    };

    // Update in maps
    userDb.users.delete(user.email);
    userDb.usersByUsername.delete(user.username);

    userDb.users.set(anonymizedData.email, anonymizedData);
    userDb.usersByUsername.set(anonymizedData.username, anonymizedData);
  }

  /**
   * Manual cleanup trigger (for testing/admin purposes)
   */
  async performManualCleanup(targetTypes = ["all"]) {
    if (this.isRunning) {
      throw new Error("Cleanup already in progress");
    }

    console.log("Starting manual data retention cleanup...");

    await this.logRetentionEvent("manual_cleanup_started", "admin", {
      targetTypes,
      triggeredBy: "manual_request",
    });

    return await this.performScheduledCleanup();
  }

  /**
   * Get retention status and statistics
   */
  async getRetentionStatus() {
    const status = {
      isInitialized: !!this.cronJob,
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      nextRunTime: this.cronJob ? "Scheduled daily at 2:00 AM" : null,
      configuration: this.retentionConfig,
      statistics: this.retentionStats,
      storageType: isUsingMongoDB() ? "mongodb" : "memory",
      gdprCompliance: {
        article5: "Data minimization and storage limitation",
        article17: "Right to erasure (Right to be forgotten)",
      },
    };

    return status;
  }

  /**
   * Update retention configuration
   */
  async updateRetentionConfig(newConfig) {
    const oldConfig = { ...this.retentionConfig };

    // Merge new configuration
    this.retentionConfig = {
      ...this.retentionConfig,
      ...newConfig,
    };

    await this.logRetentionEvent("retention_config_updated", "admin", {
      oldConfig,
      newConfig: this.retentionConfig,
    });

    console.log("Data retention configuration updated");
    return this.retentionConfig;
  }

  /**
   * Log retention events for audit purposes
   */
  async logRetentionEvent(eventType, userId, details = {}) {
    try {
      await consentLogsService.logConsentEvent({
        userId: userId || "system",
        eventType: "consent_viewed", // Using existing event type
        purposes: { data_retention: true },
        consentMethod: "system_event",
        ipAddress: "127.0.0.1",
        userAgent: "DataRetentionService",
        sessionId: "retention_service",
        processingPurpose: `Data retention event: ${eventType}`,
        dataCategories: ["personal_data", "behavioral_data"],
        ...details,
      });
    } catch (error) {
      console.error("Failed to log retention event:", error);
    }
  }
}

export default new DataRetentionService();

import ConsentModel from "../models/consent.model.js";
import consentDb from "../models/consentdb.js";
import { isUsingMongoDB } from "../config/database.js";

/**
 * Unified Consent Service
 * Automatically switches between MongoDB and in-memory storage
 */
class ConsentService {
  /**
   * Get current consent for user
   */
  async getConsent(userId) {
    try {
      if (isUsingMongoDB()) {
        return await ConsentModel.findOne({ userId }).sort({ createdAt: -1 });
      } else {
        return consentDb.getConsent(userId);
      }
    } catch (error) {
      console.error("Error getting consent:", error);
      return null;
    }
  }

  /**
   * Set/Update consent for user
   */
  async setConsent(userId, consentData) {
    try {
      if (isUsingMongoDB()) {
        const consent = await ConsentModel.findOneAndUpdate(
          { userId },
          { userId, ...consentData },
          {
            upsert: true,
            new: true,
            runValidators: true,
          },
        );
        return consent.toObject();
      } else {
        return consentDb.setConsent(userId, consentData);
      }
    } catch (error) {
      console.error("Error setting consent:", error);
      throw error;
    }
  }

  /**
   * Get consent history for user
   */
  async getConsentHistory(userId) {
    try {
      if (isUsingMongoDB()) {
        return await ConsentModel.find({ userId })
          .sort({ createdAt: -1 })
          .select("-__v");
      } else {
        return consentDb.getConsentHistory(userId);
      }
    } catch (error) {
      console.error("Error getting consent history:", error);
      return [];
    }
  }

  /**
   * Check if user has consent for specific purpose
   */
  async hasConsent(userId, purpose) {
    try {
      if (isUsingMongoDB()) {
        const consent = await ConsentModel.findOne({ userId }).sort({
          createdAt: -1,
        });
        return (
          consent && consent.purposes && consent.purposes[purpose] === true
        );
      } else {
        return consentDb.hasConsent(userId, purpose);
      }
    } catch (error) {
      console.error("Error checking consent:", error);
      return false; // Fail-safe: no consent if error
    }
  }

  /**
   * Remove all consent for user
   */
  async removeConsent(userId) {
    try {
      if (isUsingMongoDB()) {
        // Don't actually delete for audit purposes, just set all to false
        const withdrawnConsent = {
          purposes: {
            marketing: false,
            analytics: false,
            personalization: false,
            thirdParty: false,
          },
          withdrawalDate: new Date(),
          consentDate: null,
        };
        return await this.setConsent(userId, withdrawnConsent);
      } else {
        return consentDb.removeConsent(userId);
      }
    } catch (error) {
      console.error("Error removing consent:", error);
      throw error;
    }
  }

  /**
   * Get statistics
   */
  async getStats() {
    try {
      if (isUsingMongoDB()) {
        const totalUsers =
          await ConsentModel.distinct("userId").countDocuments();
        const totalRecords = await ConsentModel.countDocuments();
        return {
          storageType: "mongodb",
          totalUsers,
          totalRecords,
        };
      } else {
        return {
          storageType: "memory",
          ...consentDb.getStats(),
        };
      }
    } catch (error) {
      console.error("Error getting stats:", error);
      return { error: error.message };
    }
  }

  /**
   * Clear all data (for testing)
   */
  async clear() {
    try {
      if (isUsingMongoDB()) {
        await ConsentModel.deleteMany({});
        return { message: "MongoDB consent data cleared" };
      } else {
        consentDb.clear();
        return { message: "In-memory consent data cleared" };
      }
    } catch (error) {
      console.error("Error clearing data:", error);
      throw error;
    }
  }
}

export default new ConsentService();

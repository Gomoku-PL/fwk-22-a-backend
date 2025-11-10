/**
 * Incident Controller
 * GDPR Articles 33 & 34 - Data Breach Notification
 * 
 * Handles security incident detection, logging, and notification:
 * - Detect and log security incidents
 * - Notify data protection authority within 72 hours
 * - Notify affected users without undue delay
 * - Maintain breach log for compliance
 */

import userDb from "../models/userdb.js";
import { isUsingMongoDB } from "../config/database.js";
import UserModel from "../models/user.model.js";

/**
 * In-memory incident storage
 * In production, use a proper database
 */
const incidents = [];
let incidentIdCounter = 1;

/**
 * Incident severity levels
 */
const SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

/**
 * Incident types
 */
const INCIDENT_TYPE = {
  UNAUTHORIZED_ACCESS: "unauthorized_access",
  DATA_BREACH: "data_breach",
  SYSTEM_COMPROMISE: "system_compromise",
  MALWARE: "malware",
  PHISHING: "phishing",
  DOS_ATTACK: "dos_attack",
  DATA_LOSS: "data_loss",
  CONFIGURATION_ERROR: "configuration_error",
};

/**
 * Register a new security incident
 * POST /api/incidents
 */
export const registerIncident = async (req, res) => {
  try {
    const {
      type,
      severity,
      description,
      affectedUsers,
      affectedData,
      detectionMethod,
    } = req.body;

    // Validate required fields
    if (!type || !severity || !description) {
      return res.status(400).json({
        success: false,
        message: "Type, severity, and description are required",
      });
    }

    // Validate severity
    if (!Object.values(SEVERITY).includes(severity)) {
      return res.status(400).json({
        success: false,
        message: `Invalid severity. Must be one of: ${Object.values(SEVERITY).join(", ")}`,
      });
    }

    // Validate incident type
    if (!Object.values(INCIDENT_TYPE).includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid incident type. Must be one of: ${Object.values(INCIDENT_TYPE).join(", ")}`,
      });
    }

    // Create incident record
    const incident = {
      id: incidentIdCounter++,
      type,
      severity,
      description,
      affectedUsers: affectedUsers || [],
      affectedData: affectedData || [],
      detectionMethod: detectionMethod || "manual",
      detectedAt: new Date().toISOString(),
      detectedBy: req.userId || "system",
      status: "open",
      notificationsSent: false,
      authorityNotified: false,
      resolvedAt: null,
      resolution: null,
    };

    incidents.push(incident);

    // Log the incident
    console.error("SECURITY INCIDENT REGISTERED:", {
      id: incident.id,
      type: incident.type,
      severity: incident.severity,
      description: incident.description,
      detectedAt: incident.detectedAt,
    });

    // Auto-notify if critical or high severity
    if (severity === SEVERITY.CRITICAL || severity === SEVERITY.HIGH) {
      await notifyAffectedUsers(incident);
      await notifyDataProtectionAuthority(incident);
    }

    res.status(201).json({
      success: true,
      message: "Security incident registered successfully",
      incident: {
        id: incident.id,
        type: incident.type,
        severity: incident.severity,
        detectedAt: incident.detectedAt,
        status: incident.status,
      },
    });
  } catch (error) {
    console.error("Error registering incident:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register incident",
      error: error.message,
    });
  }
};

/**
 * Get all incidents (admin only)
 * GET /api/incidents
 */
export const getAllIncidents = async (req, res) => {
  try {
    const { status, severity, type } = req.query;

    let filteredIncidents = [...incidents];

    // Filter by status
    if (status) {
      filteredIncidents = filteredIncidents.filter((i) => i.status === status);
    }

    // Filter by severity
    if (severity) {
      filteredIncidents = filteredIncidents.filter((i) => i.severity === severity);
    }

    // Filter by type
    if (type) {
      filteredIncidents = filteredIncidents.filter((i) => i.type === type);
    }

    // Sort by detection time (newest first)
    filteredIncidents.sort(
      (a, b) => new Date(b.detectedAt) - new Date(a.detectedAt)
    );

    res.json({
      success: true,
      count: filteredIncidents.length,
      incidents: filteredIncidents,
    });
  } catch (error) {
    console.error("Error retrieving incidents:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve incidents",
      error: error.message,
    });
  }
};

/**
 * Get incident by ID
 * GET /api/incidents/:id
 */
export const getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;
    const incident = incidents.find((i) => i.id === parseInt(id));

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found",
      });
    }

    res.json({
      success: true,
      incident,
    });
  } catch (error) {
    console.error("Error retrieving incident:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve incident",
      error: error.message,
    });
  }
};

/**
 * Update incident status
 * PATCH /api/incidents/:id
 */
export const updateIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;

    const incident = incidents.find((i) => i.id === parseInt(id));

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found",
      });
    }

    // Update incident
    if (status) {
      incident.status = status;
      
      if (status === "resolved" || status === "closed") {
        incident.resolvedAt = new Date().toISOString();
        incident.resolvedBy = req.userId || "system";
      }
    }

    if (resolution) {
      incident.resolution = resolution;
    }

    console.info("Incident updated:", {
      id: incident.id,
      status: incident.status,
      resolvedAt: incident.resolvedAt,
    });

    res.json({
      success: true,
      message: "Incident updated successfully",
      incident,
    });
  } catch (error) {
    console.error("Error updating incident:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update incident",
      error: error.message,
    });
  }
};

/**
 * Notify affected users about a data breach
 * POST /api/incidents/:id/notify-users
 */
export const notifyUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const incident = incidents.find((i) => i.id === parseInt(id));

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found",
      });
    }

    await notifyAffectedUsers(incident);

    res.json({
      success: true,
      message: "User notifications sent successfully",
      notifiedUsers: incident.affectedUsers.length,
    });
  } catch (error) {
    console.error("Error notifying users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to notify users",
      error: error.message,
    });
  }
};

/**
 * Notify data protection authority
 * POST /api/incidents/:id/notify-authority
 */
export const notifyAuthority = async (req, res) => {
  try {
    const { id } = req.params;
    const incident = incidents.find((i) => i.id === parseInt(id));

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found",
      });
    }

    await notifyDataProtectionAuthority(incident);

    res.json({
      success: true,
      message: "Data protection authority notified successfully",
    });
  } catch (error) {
    console.error("Error notifying authority:", error);
    res.status(500).json({
      success: false,
      message: "Failed to notify authority",
      error: error.message,
    });
  }
};

/**
 * Helper: Notify affected users (GDPR Article 34)
 */
async function notifyAffectedUsers(incident) {
  if (incident.notificationsSent) {
    console.info("User notifications already sent for incident:", incident.id);
    return;
  }

  console.info(
    `Notifying ${incident.affectedUsers.length} users about incident ${incident.id}`
  );

  // In production, implement actual email/notification system
  for (const userId of incident.affectedUsers) {
    try {
      // Get user details
      let user;
      if (isUsingMongoDB()) {
        user = await UserModel.findById(userId);
      } else {
        user = await userDb.findUserById(userId);
      }

      if (user) {
        // Send notification (implement your notification service)
        console.info(`Sending breach notification to user: ${user.email}`);
        
        // Example notification content
        const notification = {
          to: user.email,
          subject: "Important: Data Security Notification",
          body: `
            Dear user,
            
            We are writing to inform you about a security incident that may have affected your data.
            
            Incident Details:
            - Type: ${incident.type}
            - Severity: ${incident.severity}
            - Detected: ${new Date(incident.detectedAt).toLocaleString()}
            - Affected Data: ${incident.affectedData.join(", ")}
            
            What we're doing:
            We have immediately taken steps to secure your data and prevent further unauthorized access.
            
            What you should do:
            - Change your password immediately
            - Review your account activity
            - Enable two-factor authentication
            - Be cautious of phishing attempts
            
            If you have any questions or concerns, please contact our support team.
            
            We sincerely apologize for this incident.
          `,
        };

        // TODO: Implement actual email sending
        console.info("Notification prepared:", notification);
      }
    } catch (error) {
      console.error(`Failed to notify user ${userId}:`, error);
    }
  }

  incident.notificationsSent = true;
  incident.usersNotifiedAt = new Date().toISOString();
}

/**
 * Helper: Notify data protection authority (GDPR Article 33)
 */
async function notifyDataProtectionAuthority(incident) {
  if (incident.authorityNotified) {
    console.info("Authority already notified for incident:", incident.id);
    return;
  }

  console.info(
    "Notifying data protection authority about incident:",
    incident.id
  );

  // In production, implement actual authority notification system
  const notification = {
    incidentId: incident.id,
    dateOfBreach: incident.detectedAt,
    typeOfBreach: incident.type,
    severity: incident.severity,
    description: incident.description,
    affectedDataCategories: incident.affectedData,
    estimatedAffectedUsers: incident.affectedUsers.length,
    likelyConsequences: determineLikelyConsequences(incident),
    measuresTaken: "Immediate investigation, user notification, system hardening",
    contactPerson: process.env.DPO_EMAIL || "dpo@gomoku.com",
  };

  // TODO: Implement actual authority notification (API, email, etc.)
  console.info("Authority notification prepared:", notification);

  incident.authorityNotified = true;
  incident.authorityNotifiedAt = new Date().toISOString();
}

/**
 * Helper: Determine likely consequences of breach
 */
function determineLikelyConsequences(incident) {
  const consequences = [];

  if (incident.severity === SEVERITY.CRITICAL) {
    consequences.push("High risk of identity theft");
    consequences.push("Potential financial fraud");
  }

  if (incident.affectedData.includes("passwords")) {
    consequences.push("Unauthorized account access");
  }

  if (incident.affectedData.includes("email")) {
    consequences.push("Phishing attacks");
    consequences.push("Spam");
  }

  if (incident.affectedData.includes("personal_info")) {
    consequences.push("Privacy violation");
  }

  return consequences.join("; ");
}

/**
 * Get incident statistics
 * GET /api/incidents/stats
 */
export const getIncidentStats = async (req, res) => {
  try {
    const stats = {
      total: incidents.length,
      open: incidents.filter((i) => i.status === "open").length,
      resolved: incidents.filter((i) => i.status === "resolved").length,
      bySeverity: {
        low: incidents.filter((i) => i.severity === SEVERITY.LOW).length,
        medium: incidents.filter((i) => i.severity === SEVERITY.MEDIUM).length,
        high: incidents.filter((i) => i.severity === SEVERITY.HIGH).length,
        critical: incidents.filter((i) => i.severity === SEVERITY.CRITICAL).length,
      },
      byType: {},
    };

    // Count by type
    Object.values(INCIDENT_TYPE).forEach((type) => {
      stats.byType[type] = incidents.filter((i) => i.type === type).length;
    });

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error getting incident stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get incident statistics",
      error: error.message,
    });
  }
};

export default {
  registerIncident,
  getAllIncidents,
  getIncidentById,
  updateIncident,
  notifyUsers,
  notifyAuthority,
  getIncidentStats,
  SEVERITY,
  INCIDENT_TYPE,
};

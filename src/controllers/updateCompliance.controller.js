import updateComplianceService from "../services/updateCompliance.service.js";

/**
 * Compliance Update Controller - GDPR Article 24
 * Admin endpoints for compliance management
 */

// Helper function for success responses
const createSuccessResponse = (
  data,
  message = "Operation completed successfully"
) => ({
  success: true,
  message,
  data,
  timestamp: new Date().toISOString(),
});

// Helper function for error responses
const createErrorResponse = (error, statusCode = 500) => ({
  success: false,
  error: error.message || error,
  timestamp: new Date().toISOString(),
  statusCode,
});

// Get compliance status
export const getComplianceStatus = async (req, res) => {
  try {
    const status = updateComplianceService.getComplianceStatus();
    res.json(createSuccessResponse(status, "Compliance status retrieved"));
  } catch (error) {
    const errorResponse = createErrorResponse(error);
    res.status(errorResponse.statusCode).json(errorResponse);
  }
};

// Trigger manual compliance check
export const performManualCheck = async (req, res) => {
  try {
    const results = await updateComplianceService.performManualCheck();

    const message =
      results.updatesAvailable.length > 0
        ? `Found ${results.updatesAvailable.length} available updates`
        : "System is up to date";

    res.json(createSuccessResponse(results, message));
  } catch (error) {
    const errorResponse = createErrorResponse(error);
    res.status(errorResponse.statusCode).json(errorResponse);
  }
};

// Check for available updates
export const checkUpdates = async (req, res) => {
  try {
    const results = await updateComplianceService.checkForUpdates();
    res.json(createSuccessResponse(results, "Update check completed"));
  } catch (error) {
    const errorResponse = createErrorResponse(error);
    res.status(errorResponse.statusCode).json(errorResponse);
  }
};

// Apply pending updates
export const applyUpdates = async (req, res) => {
  try {
    const { updateIds } = req.body;

    if (!Array.isArray(updateIds) || updateIds.length === 0) {
      return res
        .status(400)
        .json(createErrorResponse("Update IDs array is required", 400));
    }

    // Get pending updates
    const status = updateComplianceService.getComplianceStatus();
    const updatesToApply = status.pendingUpdates || [];

    if (updatesToApply.length === 0) {
      return res.json(createSuccessResponse([], "No pending updates to apply"));
    }

    const results = await updateComplianceService.applyUpdates(updatesToApply);

    const message = `Applied ${results.applied.length} updates successfully`;
    res.json(createSuccessResponse(results, message));
  } catch (error) {
    const errorResponse = createErrorResponse(error);
    res.status(errorResponse.statusCode).json(errorResponse);
  }
};

// Generate compliance audit report
export const generateAuditReport = async (req, res) => {
  try {
    const { quarter } = req.query;

    // Get current check results for audit
    const checkResults = await updateComplianceService.checkForUpdates();
    const auditData = await updateComplianceService.generateQuarterlyAuditLog(
      checkResults
    );

    res.json(createSuccessResponse(auditData, "Audit report generated"));
  } catch (error) {
    const errorResponse = createErrorResponse(error);
    res.status(errorResponse.statusCode).json(errorResponse);
  }
};

// Update compliance configuration
export const updateConfiguration = async (req, res) => {
  try {
    const { checkSchedule, autoUpdate, notificationThreshold } = req.body;

    // Validate configuration
    const validatedConfig = validateComplianceConfig({
      checkSchedule,
      autoUpdate,
      notificationThreshold,
    });

    // Update service configuration
    if (validatedConfig.checkSchedule) {
      updateComplianceService.config.checkSchedule =
        validatedConfig.checkSchedule;
    }

    if (typeof validatedConfig.autoUpdate === "boolean") {
      updateComplianceService.config.autoUpdate = validatedConfig.autoUpdate;
    }

    if (validatedConfig.notificationThreshold) {
      updateComplianceService.config.notificationThreshold =
        validatedConfig.notificationThreshold;
    }

    res.json(
      createSuccessResponse(
        updateComplianceService.config,
        "Configuration updated"
      )
    );
  } catch (error) {
    const errorResponse = createErrorResponse(error, 400);
    res.status(errorResponse.statusCode).json(errorResponse);
  }
};

// Get compliance history
export const getComplianceHistory = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const status = updateComplianceService.getComplianceStatus();
    const history = status.recentHistory || [];

    const paginatedHistory = history.slice(offset, offset + parseInt(limit));

    const response = {
      history: paginatedHistory,
      total: history.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    };

    res.json(createSuccessResponse(response, "Compliance history retrieved"));
  } catch (error) {
    const errorResponse = createErrorResponse(error);
    res.status(errorResponse.statusCode).json(errorResponse);
  }
};

// Helper function to validate compliance configuration
const validateComplianceConfig = (config) => {
  const validated = {};

  if (config.checkSchedule) {
    // Basic cron validation
    if (
      typeof config.checkSchedule === "string" &&
      config.checkSchedule.split(" ").length === 5
    ) {
      validated.checkSchedule = config.checkSchedule;
    } else {
      throw new Error("Invalid cron schedule format");
    }
  }

  if (typeof config.autoUpdate === "boolean") {
    validated.autoUpdate = config.autoUpdate;
  }

  if (config.notificationThreshold) {
    const threshold = parseInt(config.notificationThreshold);
    if (isNaN(threshold) || threshold < 1 || threshold > 365) {
      throw new Error("Notification threshold must be between 1 and 365 days");
    }
    validated.notificationThreshold = threshold;
  }

  return validated;
};

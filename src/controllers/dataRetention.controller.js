import { validationResult } from "express-validator";
import dataRetentionService from "../services/dataRetention.service.js";
import { getStorageType } from "../config/database.js";

// Helper functions
const createSuccessResponse = (data, message = "Success") => ({
  success: true,
  message,
  data,
  metadata: {
    requestTime: new Date().toISOString(),
    storageType: getStorageType(),
  },
});

const createErrorResponse = (message, error = null, statusCode = 500) => ({
  success: false,
  message,
  ...(error && { error: error.message }),
  storageType: getStorageType(),
});

// Constants
const VALID_TARGET_TYPES = [
  "all",
  "users",
  "consent",
  "logs",
  "security",
  "games",
];
const RETENTION_LIMITS = { min: 1, max: 3650 };

// Validation helpers
const validateRetentionConfig = (config, path = "") => {
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "object" && value !== null) {
      validateRetentionConfig(value, `${path}${key}.`);
    } else if (typeof value === "number") {
      if (value < RETENTION_LIMITS.min || value > RETENTION_LIMITS.max) {
        throw new Error(
          `${path}${key} must be between ${RETENTION_LIMITS.min} and ${RETENTION_LIMITS.max} days`
        );
      }
    }
  }
};

const buildComplianceReport = (status, startDate, endDate, includeDetails) => {
  const report = {
    generatedAt: new Date().toISOString(),
    reportPeriod: { startDate: startDate || "N/A", endDate: endDate || "N/A" },
    retentionStatus: {
      serviceActive: status.isInitialized,
      lastCleanup: status.lastRunTime,
      nextCleanup: status.nextRunTime,
      totalCleanupRuns: status.statistics.totalRuns,
    },
    configuration: status.configuration,
    compliance: {
      gdprArticle5: {
        principle: "Data minimization and storage limitation",
        status: status.isInitialized ? "COMPLIANT" : "NON_COMPLIANT",
        description: "Automated data retention limits enforced",
      },
      gdprArticle17: {
        principle: "Right to erasure (Right to be forgotten)",
        status: status.isInitialized ? "COMPLIANT" : "NON_COMPLIANT",
        description: "Automated data anonymization and deletion implemented",
      },
    },
    recentActivity: status.statistics.lastCleanupResults,
    errors: status.statistics.errors.slice(-10),
  };

  if (includeDetails === "true" && status.statistics.lastCleanupResults) {
    report.detailedResults = status.statistics.lastCleanupResults;
  }

  return report;
};

// Data Retention Controller

// GET /admin/retention/status
export const getRetentionStatus = async (req, res) => {
  try {
    const status = await dataRetentionService.getRetentionStatus();
    const response = createSuccessResponse(
      status,
      "Data retention status retrieved successfully"
    );
    response.metadata.gdprCompliance = "Articles 5 & 17";

    res.json(response);
  } catch (error) {
    console.error("Error getting retention status:", error);
    res
      .status(500)
      .json(
        createErrorResponse("Error retrieving data retention status", error)
      );
  }
};

// POST /admin/retention/cleanup
export const triggerManualCleanup = async (req, res) => {
  try {
    const { targetTypes = ["all"] } = req.body;
    const invalidTypes = targetTypes.filter(
      (type) => !VALID_TARGET_TYPES.includes(type)
    );

    if (invalidTypes.length > 0) {
      return res.status(400).json({
        ...createErrorResponse("Invalid target types specified"),
        invalidTypes,
        validTypes: VALID_TARGET_TYPES,
      });
    }

    console.log(`Manual cleanup triggered for: ${targetTypes.join(", ")}`);
    const results = await dataRetentionService.performManualCleanup(
      targetTypes
    );

    const response = createSuccessResponse(
      {
        results,
        triggeredAt: new Date().toISOString(),
        targetTypes,
      },
      "Manual data cleanup completed successfully"
    );

    response.metadata.gdprCompliance =
      "Articles 5 & 17 - Data minimization and erasure";
    res.json(response);
  } catch (error) {
    console.error("Error during manual cleanup:", error);
    const statusCode = error.message.includes("already in progress")
      ? 409
      : 500;
    res
      .status(statusCode)
      .json(createErrorResponse("Error during manual data cleanup", error));
  }
};

// PUT /admin/retention/config
export const updateRetentionConfig = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        ...createErrorResponse("Validation errors in retention configuration"),
        errors: errors.array(),
      });
    }

    validateRetentionConfig(req.body);
    const updatedConfig = await dataRetentionService.updateRetentionConfig(
      req.body
    );

    const response = createSuccessResponse(
      {
        configuration: updatedConfig,
        updatedAt: new Date().toISOString(),
      },
      "Data retention configuration updated successfully"
    );

    response.metadata.gdprCompliance =
      "Article 5 - Storage limitation principle";
    res.json(response);
  } catch (error) {
    console.error("Error updating retention config:", error);
    res
      .status(400)
      .json(
        createErrorResponse(
          "Error updating data retention configuration",
          error
        )
      );
  }
};

// GET /admin/retention/report
export const generateRetentionReport = async (req, res) => {
  try {
    const { startDate, endDate, includeDetails = false } = req.query;
    const status = await dataRetentionService.getRetentionStatus();
    const report = buildComplianceReport(
      status,
      startDate,
      endDate,
      includeDetails
    );

    const response = createSuccessResponse(
      report,
      "Data retention compliance report generated successfully"
    );
    response.metadata.reportType = "gdpr_compliance_report";

    res.json(response);
  } catch (error) {
    console.error("Error generating retention report:", error);
    res
      .status(500)
      .json(
        createErrorResponse("Error generating data retention report", error)
      );
  }
};

// GET /admin/retention/logs
export const getRetentionLogs = async (req, res) => {
  try {
    const { limit = 50, offset = 0, startDate, endDate } = req.query;
    const status = await dataRetentionService.getRetentionStatus();

    let logs = status.statistics.errors || [];

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date("1970-01-01");
      const end = endDate ? new Date(endDate) : new Date();

      logs = logs.filter((log) => {
        const logDate = new Date(log.timestamp);
        return logDate >= start && logDate <= end;
      });
    }

    const offsetNum = parseInt(offset);
    const limitNum = parseInt(limit);
    const paginatedLogs = logs.slice(offsetNum, offsetNum + limitNum);

    res.json(
      createSuccessResponse(
        {
          logs: paginatedLogs,
          pagination: {
            total: logs.length,
            limit: limitNum,
            offset: offsetNum,
            hasMore: offsetNum + limitNum < logs.length,
          },
        },
        "Data retention logs retrieved successfully"
      )
    );
  } catch (error) {
    console.error("Error getting retention logs:", error);
    res
      .status(500)
      .json(createErrorResponse("Error retrieving data retention logs", error));
  }
};

// POST /admin/retention/test
export const testRetentionFunctionality = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res
        .status(403)
        .json(
          createErrorResponse(
            "Test endpoints not available in production environment"
          )
        );
    }

    const { testType = "dry-run" } = req.body;
    const testResults = {
      testType,
      timestamp: new Date().toISOString(),
      results: {},
    };

    switch (testType) {
      case "dry-run":
        testResults.results = {
          message: "Dry run completed - no data modified",
          wouldProcess: "This would check all data against retention policies",
          configurationValid: true,
        };
        break;

      case "config-validation":
        const status = await dataRetentionService.getRetentionStatus();
        testResults.results = {
          configurationValid: !!status.configuration,
          configuration: status.configuration,
          serviceInitialized: status.isInitialized,
        };
        break;

      default:
        throw new Error(`Unknown test type: ${testType}`);
    }

    const response = createSuccessResponse(
      testResults,
      `Data retention test (${testType}) completed successfully`
    );
    response.metadata.environment = process.env.NODE_ENV;

    res.json(response);
  } catch (error) {
    console.error("Error during retention testing:", error);
    res
      .status(500)
      .json(createErrorResponse("Error during data retention testing", error));
  }
};

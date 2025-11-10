import express from "express";
import cookieParser from "cookie-parser";

// Security Middleware
import { corsMiddleware, corsErrorHandler } from "./middleware/cors.js";
import {
  applySecurityMiddleware,
  apiLimiter,
  authLimiter,
  gdprLimiter,
} from "./middleware/security.js";
import csrfMiddleware from "./middleware/csrf.middleware.js";
import xssMiddleware from "./middleware/xss.middleware.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import gamesRoutes from "./routes/games.routes.js";
import healthRoutes from "./routes/health.routes.js";
import dataAccessRoutes from "./routes/dataAccess.routes.js";
import dataPortabilityRoutes from "./routes/dataPortability.routes.js";
import dataDeletionRoutes from "./routes/dataDeletion.routes.js";
import dataRetentionRoutes from "./routes/dataRetention.routes.js";
import consentRoutes from "./routes/consent.routes.js";
import consentAuditRoutes from "./routes/consentAudit.routes.js";
import incidentRoutes from "./routes/incident.routes.js";
import updateComplianceRoutes from "./routes/updateCompliance.routes.js";
import thirdPartyRoutes from "./routes/thirdParty.routes.js";

const app = express();

// Apply base security middleware (HTTPS, headers, sanitization, logging)
applySecurityMiddleware(app);

// CORS configuration
app.use(corsMiddleware);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parser (required for authentication)
app.use(cookieParser());

// XSS Protection
app.use(xssMiddleware);

// CSRF Protection (applied to state-changing routes)
// Note: CSRF middleware is applied per-route basis in route files

// Rate limiting - General API
app.use("/api/", apiLimiter);

// Health check (no rate limiting)
app.use(healthRoutes);

// Authentication routes (strict rate limiting)
app.use("/api/auth", authLimiter, authRoutes);

// GDPR-related routes (moderate rate limiting)
app.use("/api/data-access", gdprLimiter, dataAccessRoutes);
app.use("/api/data-portability", gdprLimiter, dataPortabilityRoutes);
app.use("/api/data", gdprLimiter, dataDeletionRoutes);
app.use("/api/data/retention", gdprLimiter, dataRetentionRoutes);
app.use("/api/consent", consentRoutes);
app.use("/api/consent/audit", consentAuditRoutes);
app.use("/api/compliance", updateComplianceRoutes);

// Incident management routes (admin only)
app.use("/api/incidents", incidentRoutes);

// Third-party integration routes
app.use("/api/third-party", thirdPartyRoutes);

// Game routes
app.use("/api/games", gamesRoutes);

// Simple health check endpoint
app.get("/health", (_req, res) => res.json({ 
  ok: true, 
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || "development"
}));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    path: req.path,
  });
});

// CORS error handler
app.use(corsErrorHandler);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);

  // CSRF errors
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({
      success: false,
      message: "Invalid CSRF token",
    });
  }

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.errors,
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;

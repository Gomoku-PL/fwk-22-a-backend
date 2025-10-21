import consentLogsService from "../../services/consentLogs.service.js";

export const regenerateSession = (req, res, next) => {
  if (!req.session) {
    return next(new Error("Session middleware not configured"));
  }

  const oldSessionId = req.sessionID;

  req.session.regenerate(async (err) => {
    if (err) {
      console.error("Session regeneration error:", err);
      return next(err);
    }

    const ipAddress = req.ip || req.connection.remoteAddress || "127.0.0.1";
    const userAgent = req.get("User-Agent") || "Unknown";

    try {
      await consentLogsService.logConsentEvent({
        userId: req.user?.email || "unknown",
        eventType: "consent_viewed",
        purposes: { security_audit: true },
        consentMethod: "session_regeneration",
        ipAddress,
        userAgent,
        processingPurpose: `Session regenerated for security - Old: ${oldSessionId}, New: ${req.sessionID}`,
      });
    } catch (logError) {
      console.error("Error logging session regeneration:", logError);
    }

    next();
  });
};

export const destroySession = (req, res, next) => {
  if (!req.session) {
    return next();
  }

  req.session.destroy((err) => {
    if (err) {
      console.error("Session destruction error:", err);
      return next(err);
    }

    res.clearCookie("connect.sid");
    next();
  });
};

export const validateSessionSecurity = (req, res, next) => {
  if (req.query.sessionId || req.body.sessionId || req.params.sessionId) {
    return res.status(400).json({
      success: false,
      message:
        "Session ID must not be transmitted in URL parameters or request body",
    });
  }
  next();
};

export const regenerateOnRoleChange = (req, res, next) => {
  if (!req.session) {
    return next();
  }

  const ipAddress = req.ip || req.connection.remoteAddress || "127.0.0.1";
  const userAgent = req.get("User-Agent") || "Unknown";
  const oldSessionId = req.sessionID;

  req.session.regenerate(async (err) => {
    if (err) {
      console.error("Session regeneration on role change error:", err);
      return next(err);
    }

    try {
      await consentLogsService.logConsentEvent({
        userId: req.user?.email || "unknown",
        eventType: "consent_viewed",
        purposes: { security_audit: true },
        consentMethod: "role_change_regeneration",
        ipAddress,
        userAgent,
        processingPurpose: `Session regenerated due to role change - Old: ${oldSessionId}, New: ${req.sessionID}`,
      });
    } catch (logError) {
      console.error(
        "Error logging role change session regeneration:",
        logError
      );
    }

    next();
  });
};

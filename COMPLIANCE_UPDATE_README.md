# Compliance Update Service - GDPR Article 24

## Overview

Service to track and manage GDPR compliance updates with automated monitoring and manual intervention capabilities.

## Configuration

Add to your `.env` file:

```env
GDPR_COMPLIANCE_VERSION=2018.1.0
COMPLIANCE_CHECK_SCHEDULE="0 0 1 */3 *"
AUTO_COMPLIANCE_UPDATE=false
COMPLIANCE_NOTIFICATION_DAYS=30
```

## API Endpoints

All endpoints require authentication.

### GET /api/admin/compliance/status

Get current compliance status and configuration.

### POST /api/admin/compliance/check

Trigger manual compliance check.

### GET /api/admin/compliance/updates

Check for available compliance updates.

### POST /api/admin/compliance/apply

Apply selected compliance updates.
Body: `{ "updateIds": ["update1", "update2"] }`

### GET /api/admin/compliance/audit

Generate compliance audit report.

### PUT /api/admin/compliance/config

Update compliance configuration.
Body: `{ "checkSchedule": "0 0 1 */3 *", "autoUpdate": false }`

### GET /api/admin/compliance/history

Get compliance update history with pagination.
Query: `?limit=50&offset=0`

## Features

- Quarterly automated compliance checks
- Manual compliance monitoring
- Version tracking and history
- Automated or manual update application
- Audit trail integration
- Configurable schedules and thresholds

## Integration

The service automatically initializes with the server and integrates with existing consent logging for audit trails.

# Data Retention Service

Automated data cleanup service implementing GDPR Articles 5 and 17 compliance.

## Features

- Scheduled data cleanup (daily at 2:00 AM by default)
- Configurable retention periods via environment variables
- User data anonymization before deletion
- Supports MongoDB and in-memory storage
- Admin endpoints for monitoring and manual cleanup

## API Endpoints

- `GET /admin/retention/status` - Get retention status
- `POST /admin/retention/cleanup` - Trigger manual cleanup
- `PUT /admin/retention/config` - Update configuration
- `GET /admin/retention/report` - Generate compliance report
- `GET /admin/retention/logs` - Get audit logs
- `POST /admin/retention/test` - Test functionality (dev only)

## Configuration

Copy `.env.example` to `.env` and adjust retention periods as needed.

Default retention periods:

- Inactive users: 3 years
- Deleted users: 30 days
- Consent data: 7 years
- Security events: 3 years

## Usage

The service automatically starts with the server. Use admin endpoints to monitor status and trigger manual cleanup if needed.

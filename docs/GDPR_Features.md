

This document outlines all GDPR-related backend features and API endpoints. It ensures compliance with "GDPR Articles 13 & 14" and provides guidance for users and auditors.

---

## Table of Contents
1. [Overview](#overview)
2. [User Data Access](#user-data-access)
3. [User Data Deletion](#user-data-deletion)
4. [User Data Rectification](#user-data-rectification)
5. [User Data Export / Portability](#user-data-export--portability)
6. [Consent Management](#consent-management)
7. [Data Retention Policies](#data-retention-policies)
8. [Update Compliance](#update-compliance)
9. [Error Handling & Examples](#error-handling--examples)

---

## Overview
- All personal data is processed according to GDPR principles: lawfulness, fairness, transparency, purpose limitation, data minimization, accuracy, storage limitation, integrity, and confidentiality.
- This documentation provides endpoints for users to exercise their GDPR rights, including access to personal data, deletion,(Right to be Forgotten) Rectification (Correction of Data) consent management and export of data.

---
**Lawful Basis for Processing:**  
User data is processed under **user consent** and **legitimate interest** (to provide and secure the service).

**Data Protection Contact:**  
For GDPR inquiries, contact our Data Protection Officer (DPO): privacy@gomoku-grup.com




## User Data Access
**Endpoint:** GET /user/data
**Controller:** dataAccess.controller.js
**Route:** dataAccess.route.js
**Description:** Retrieves all personal data for a specific user.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId    | string | yes      | Unique identifier of the user |

**Response Example:**
```json
{
  "userId": "12345",
  "name": "gomoku grup",
  "email": "gomoku-grup@example.com",
  "createdAt": "2025-10-15T12:00:00Z",
  "consentStatus": true
}
```

## User Data Deletion
**Endpoint:** DELETE /user/delete
**Controller:** dataDeletion.controller.js
**Route:** dataAccess.route.js
**Description:** Deletes all personal data of a user permanently.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId    | string | yes      | Unique identifier of the user |

**Response Example:**
```json
{
  "status": "success",
  "message": "User data deleted successfully."
}
```

## User Data Rectification

**Endpoint:** PUT/user/update
**Controller:** dataRectification.controller.js
**Route:** dataRectification.route.js
**Description:** Allows users to correct or update their personal information.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId    | string | yes      | Unique identifier of the user      |
| field     | string | yes      | The data field to update ("email") |
| value     | string | yes      | The new value for the field        |

**Response Example:**
```json
{
  "status": "success",
  "message": "User data updated successfully."
}
```


## User Data Export / Portability
**Endpoint:** GET /user/export  
**Controller:** dataPortability.controller.js  
**Route:** dataProtability.route.js  
**Description:** Provides a downloadable export of user personal data in JSON format.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId    | string | yes      | Unique identifier of the user |

**Response Example:**

```json

{
  "userId": "12345",
  "name": "gomoku grup",
  "email": "gomoku-grup@example.com",
  "createdAt": "2025-10-15T12:00:00Z",
  "consentStatus": true,
  "gamesPlayed": 42
}
``` 
## Consent Management
**Endpoint:** POST /user/consent
**Controller:** consent.controller.js
**Route:** consent.routes.js
**Description:** Records user consent for data processing.

**Parameters:**
| Parameter | Type    | Required | Description                      |
|-----------|---------|----------|-------------------------------   |
| userId    | string  | yes      | Unique identifier of the user    |
| consent   | boolean | yes      | User consent status (true/false) |



**Response Example:**

```json
{
  "status": "success",
  "message": "User consent updated successfully."
}
```

 ## Data Retention Policies
 **Endpoint:** GET /data/retention
 **Controller:** dataRetention.controller.js
 **Route:** dataRetention.routes.js
**Description:** Provides information about how long personal data is stored.

**Response Example:**

```json
{
  "userDataRetentionDays": 365,
  "logsRetentionDays": 180
}
```

## Update Compliance

**Description:** Outlines how GDPR compliance updates are maintained and verified.

**Details:** The backend team conducts quarterly compliance reviews to ensure that data-handling logic, logs, and endpoints remain GDPR-aligned.

Any updates to data schemas, controllers, or third-party integrations trigger a GDPR impact assessment.

Documentation is updated accordingly and reviewed by the Data Protection Officer (DPO).

**Response Example:**
N/A (informational section only).

## Error Handling & Examples

**Description:** Standardized error responses for GDPR-related endpoints.

**Example Responses:**

```json
{
  "status": "error",
  "message": "User not found or invalid userId."
}

```
```json
{
  "status": "error",
  "message": "Unauthorized access. Consent not granted."
}```

```json 
{
  "status": "error",
  "message": "Internal server error. Please try again later."
}
```












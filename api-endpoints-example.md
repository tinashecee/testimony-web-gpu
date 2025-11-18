# Audit Logging API Endpoints

To implement real audit logging, you'll need to add these endpoints to your backend API:

## 1. Health Check Endpoint
```
GET /audit/health
```
**Purpose**: Check if audit service is available
**Response**: `200 OK` if service is available

## 2. Log Audit Event
```
POST /audit/log
```
**Purpose**: Store a new audit log entry
**Headers**: 
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "user": "admin@court.gov.zw",
  "action": "Login",
  "resource": "Authentication",
  "details": "Successful login from IP 192.168.1.100",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "severity": "low",
  "category": "authentication",
  "sessionId": "abc123def456",
  "requestId": "req789"
}
```

**Response**: `201 Created` on success

## 3. Get Audit Logs
```
GET /audit/logs?category=authentication&severity=high&user=admin&start_date=2024-01-01&end_date=2024-01-31&limit=100
```
**Purpose**: Retrieve audit logs with optional filtering
**Headers**: 
- `Authorization: Bearer <token>`

**Query Parameters**:
- `category` (optional): Filter by category
- `severity` (optional): Filter by severity
- `user` (optional): Filter by user email
- `start_date` (optional): Filter by start date (ISO format)
- `end_date` (optional): Filter by end date (ISO format)
- `limit` (optional): Limit number of results (default: 1000)

**Response**:
```json
[
  {
    "id": "audit-001",
    "timestamp": "2024-01-15T10:30:00Z",
    "user": "admin@court.gov.zw",
    "action": "Login",
    "resource": "Authentication",
    "details": "Successful login from IP 192.168.1.100",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "severity": "low",
    "category": "authentication",
    "sessionId": "abc123def456",
    "requestId": "req789"
  }
]
```

## Database Schema Example

```sql
CREATE TABLE audit_logs (
    id VARCHAR(255) PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(500) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    category ENUM('authentication', 'data_access', 'system_config', 'license_management', 'user_management', 'recording_management') NOT NULL,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp),
    INDEX idx_user (user_email),
    INDEX idx_category (category),
    INDEX idx_severity (severity)
);
```

## Implementation Notes

1. **Security**: Ensure all audit endpoints require authentication
2. **Performance**: Add appropriate indexes for filtering
3. **Retention**: Implement log retention policies (e.g., delete logs older than 1 year)
4. **Backup**: Include audit logs in your backup strategy
5. **Monitoring**: Set up alerts for critical audit events

## Current Implementation

The frontend is currently set up to:
- Try to send logs to the server first
- Fall back to local storage if server is unavailable
- Display logs from both sources
- Export logs as CSV

This ensures the audit system works even if the backend endpoints aren't ready yet.

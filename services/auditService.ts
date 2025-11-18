const API_BASE_URL = "/api/audit";

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  severity: "low" | "medium" | "high" | "critical";
  category: "authentication" | "data_access" | "system_config" | "license_management" | "user_management" | "recording_management";
  sessionId?: string;
  requestId?: string;
}

export interface CreateAuditLogData {
  user: string;
  action: string;
  resource: string;
  details: string;
  severity: AuditLog['severity'];
  category: AuditLog['category'];
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
}

// Helper function to get client IP address
const getClientIP = (): string => {
  // In a real application, this would come from the server
  // For now, we'll use a placeholder
  return "192.168.1.100"; // This should be replaced with actual IP detection
};

// Helper function to get user agent
const getUserAgent = (): string => {
  if (typeof window !== 'undefined') {
    return window.navigator.userAgent;
  }
  return "Unknown";
};

// Helper function to generate session ID
const generateSessionId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Helper function to generate unique audit log ID
const generateAuditId = (): string => {
  return `audit-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

// Get or create session ID
const getSessionId = (): string => {
  if (typeof window !== 'undefined') {
    let sessionId = sessionStorage.getItem('audit_session_id');
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem('audit_session_id', sessionId);
    }
    return sessionId;
  }
  return "no-session";
};

// Helper function to get the token from cookies
const getToken = () => {
  if (typeof document !== 'undefined') {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];
  }
  return null;
};

// Helper function to get headers with authorization
const getAuthHeaders = (contentType = 'application/json') => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': contentType,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

class AuditService {
  private static instance: AuditService;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  // Initialize the audit service
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Test the connection to the audit endpoint
      const response = await fetch(`${API_BASE_URL}/audit/health`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        console.log('✅ Audit service initialized successfully');
        this.isInitialized = true;
      } else {
        console.warn('⚠️ Audit service endpoint not available, using local storage fallback');
        this.isInitialized = true; // Still mark as initialized for fallback
      }
    } catch (error) {
      console.warn('⚠️ Audit service initialization failed, using local storage fallback:', error);
      this.isInitialized = true; // Still mark as initialized for fallback
    }
  }

  // Log an audit event
  public async logEvent(data: CreateAuditLogData): Promise<void> {
    try {
      const auditLog: AuditLog = {
        id: generateAuditId(),
        timestamp: new Date().toISOString(),
        user: data.user,
        action: data.action,
        resource: data.resource,
        details: data.details,
        severity: data.severity,
        category: data.category,
        ipAddress: data.ipAddress || getClientIP(),
        userAgent: data.userAgent || getUserAgent(),
        sessionId: data.sessionId || getSessionId(),
        requestId: data.requestId || Math.random().toString(36).substring(2, 15),
      };

      // Try to send to server first
      try {
        const response = await fetch(`${API_BASE_URL}/log`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(auditLog),
        });

        if (response.ok) {
          console.log('✅ Audit log sent to server:', data.action);
          return;
        }
      } catch (error) {
        console.warn('⚠️ Failed to send audit log to server, using local storage:', error);
      }

      // Fallback to local storage
      this.storeLocally(auditLog);
    } catch (error) {
      console.error('❌ Failed to log audit event:', error);
    }
  }

  // Store audit log locally as fallback
  private storeLocally(auditLog: AuditLog): void {
    try {
      if (typeof window !== 'undefined') {
        const existingLogs = this.getLocalAuditLogs();
        existingLogs.push(auditLog);
        
        // Keep only the last 1000 logs to prevent storage issues
        if (existingLogs.length > 1000) {
          existingLogs.splice(0, existingLogs.length - 1000);
        }
        
        localStorage.setItem('audit_logs', JSON.stringify(existingLogs));
        console.log('✅ Audit log stored locally:', auditLog.action);
      }
    } catch (error) {
      console.error('❌ Failed to store audit log locally:', error);
    }
  }

  // Get audit logs from server
  public async getAuditLogs(filters?: {
    category?: AuditLog['category'];
    severity?: AuditLog['severity'];
    user?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.category) queryParams.append('category', filters.category);
      if (filters?.severity) queryParams.append('severity', filters.severity);
      if (filters?.user) queryParams.append('user', filters.user);
      if (filters?.startDate) queryParams.append('start_date', filters.startDate);
      if (filters?.endDate) queryParams.append('end_date', filters.endDate);
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());

      console.log('🔍 Fetching audit logs from server...');
      const response = await fetch(`${API_BASE_URL}/logs?${queryParams.toString()}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Successfully fetched audit logs from server:', data.length);
        return data;
      } else {
        console.warn('⚠️ Server returned non-ok status:', response.status, response.statusText);
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('CORS')) {
        console.warn('⚠️ CORS error - server may not be accessible, using local storage:', error.message);
      } else {
        console.warn('⚠️ Failed to fetch audit logs from server, using local storage:', error);
      }
    }

    // Fallback to local storage
    console.log('🔄 Falling back to local storage...');
    return this.getLocalAuditLogs(filters);
  }

  // Get audit logs from local storage
  public getLocalAuditLogs(filters?: {
    category?: AuditLog['category'];
    severity?: AuditLog['severity'];
    user?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): AuditLog[] {
    try {
      if (typeof window !== 'undefined') {
        const storedLogs = localStorage.getItem('audit_logs');
        if (!storedLogs) return [];

        let logs: AuditLog[] = JSON.parse(storedLogs);

        // Ensure all logs have IDs (for backward compatibility)
        let needsUpdate = false;
        logs = logs.map(log => {
          if (!log.id) {
            needsUpdate = true;
            return { ...log, id: generateAuditId() };
          }
          return log;
        });

        // Update storage if we added IDs
        if (needsUpdate) {
          localStorage.setItem('audit_logs', JSON.stringify(logs));
        }

        // Apply filters
        if (filters?.category) {
          logs = logs.filter(log => log.category === filters.category);
        }
        if (filters?.severity) {
          logs = logs.filter(log => log.severity === filters.severity);
        }
        if (filters?.user) {
          logs = logs.filter(log => log.user.toLowerCase().includes(filters.user!.toLowerCase()));
        }
        if (filters?.startDate) {
          logs = logs.filter(log => log.timestamp >= filters.startDate!);
        }
        if (filters?.endDate) {
          logs = logs.filter(log => log.timestamp <= filters.endDate!);
        }
        if (filters?.limit) {
          logs = logs.slice(-filters.limit);
        }

        return logs;
      }
    } catch (error) {
      console.error('❌ Failed to get local audit logs:', error);
    }

    return [];
  }

  // Export audit logs
  public async exportAuditLogs(filters?: {
    category?: AuditLog['category'];
    severity?: AuditLog['severity'];
    user?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<string> {
    const logs = await this.getAuditLogs(filters);
    
    // Create CSV content
    const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Details', 'IP Address', 'Severity', 'Category', 'Session ID'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.user,
        log.action,
        log.resource,
        `"${log.details}"`,
        log.ipAddress,
        log.severity,
        log.category,
        log.sessionId || ''
      ].join(','))
    ].join('\n');

    return csvContent;
  }

  // Clear local audit logs
  public clearLocalLogs(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('audit_logs');
        console.log('✅ Local audit logs cleared');
      }
    } catch (error) {
      console.error('❌ Failed to clear local audit logs:', error);
    }
  }
}

// Create a singleton instance
export const auditService = AuditService.getInstance();

// Convenience functions for common audit events
export const auditLogger = {
  // Authentication events
  login: (user: string, success: boolean, details?: string) => {
    auditService.logEvent({
      user,
      action: success ? 'Login' : 'Failed Login Attempt',
      resource: 'Authentication',
      details: details || (success ? 'Successful login' : 'Failed login attempt'),
      severity: success ? 'low' : 'medium',
      category: 'authentication',
    });
  },

  logout: (user: string) => {
    auditService.logEvent({
      user,
      action: 'Logout',
      resource: 'Authentication',
      details: 'User logged out',
      severity: 'low',
      category: 'authentication',
    });
  },

  // User management events
  createUser: (adminUser: string, newUser: string) => {
    auditService.logEvent({
      user: adminUser,
      action: 'Create User',
      resource: 'User Management',
      details: `Created new user: ${newUser}`,
      severity: 'high',
      category: 'user_management',
    });
  },

  updateUser: (adminUser: string, targetUser: string, changes: string) => {
    auditService.logEvent({
      user: adminUser,
      action: 'Update User',
      resource: 'User Management',
      details: `Updated user ${targetUser}: ${changes}`,
      severity: 'high',
      category: 'user_management',
    });
  },

  deleteUser: (adminUser: string, targetUser: string) => {
    auditService.logEvent({
      user: adminUser,
      action: 'Delete User',
      resource: 'User Management',
      details: `Deleted user: ${targetUser}`,
      severity: 'critical',
      category: 'user_management',
    });
  },

  // License management events
  generateLicense: (adminUser: string, courtName: string, details: string) => {
    auditService.logEvent({
      user: adminUser,
      action: 'Generate License',
      resource: 'License Management',
      details: `Generated license for ${courtName}: ${details}`,
      severity: 'high',
      category: 'license_management',
    });
  },

  // Recording management events
  viewRecording: (user: string, recordingId: string) => {
    auditService.logEvent({
      user,
      action: 'View Recording',
      resource: `Recording ID: ${recordingId}`,
      details: `Accessed recording file`,
      severity: 'medium',
      category: 'recording_management',
    });
  },

  deleteRecording: (user: string, recordingId: string) => {
    auditService.logEvent({
      user,
      action: 'Delete Recording',
      resource: `Recording ID: ${recordingId}`,
      details: `Permanently deleted recording`,
      severity: 'critical',
      category: 'recording_management',
    });
  },

  exportData: (user: string, dataType: string, recordCount: number) => {
    auditService.logEvent({
      user,
      action: 'Export Data',
      resource: 'Data Export',
      details: `Exported ${recordCount} ${dataType} records`,
      severity: 'medium',
      category: 'data_access',
    });
  },

  // System configuration events
  systemBackup: (details: string) => {
    auditService.logEvent({
      user: 'system@court.gov.zw',
      action: 'System Backup',
      resource: 'System Configuration',
      details,
      severity: 'low',
      category: 'system_config',
    });
  },

  // Generic event logger
  custom: (data: CreateAuditLogData) => {
    auditService.logEvent(data);
  },
};

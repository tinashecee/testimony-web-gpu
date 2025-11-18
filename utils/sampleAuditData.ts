// Sample audit data for testing when API is not available
import { AuditLog } from "@/services/auditService";

export const generateSampleAuditLogs = (): AuditLog[] => {
  const sampleLogs: AuditLog[] = [
    {
      id: "audit-1",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      user: "admin@court.com",
      action: "Login",
      resource: "Authentication",
      details: "Successful login",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      severity: "low",
      category: "authentication",
      sessionId: "session-1",
    },
    {
      id: "audit-2",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      user: "admin@court.com",
      action: "View Recording",
      resource: "Recording ID: 123",
      details: "Accessed recording file",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      severity: "medium",
      category: "recording_management",
      sessionId: "session-1",
    },
    {
      id: "audit-3",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      user: "morton@soxfort.com",
      action: "Create User",
      resource: "User Management",
      details: "Created new user: test@example.com",
      ipAddress: "192.168.1.101",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      severity: "high",
      category: "user_management",
      sessionId: "session-2",
    },
    {
      id: "audit-4",
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
      user: "admin@court.com",
      action: "Failed Login Attempt",
      resource: "Authentication",
      details: "Failed login attempt with invalid credentials",
      ipAddress: "192.168.1.102",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      severity: "medium",
      category: "authentication",
      sessionId: "session-3",
    },
    {
      id: "audit-5",
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      user: "morton@soxfort.com",
      action: "Generate License",
      resource: "License Management",
      details: "Generated license for High Court Harare",
      ipAddress: "192.168.1.101",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      severity: "high",
      category: "license_management",
      sessionId: "session-2",
    },
    {
      id: "audit-6",
      timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
      user: "admin@court.com",
      action: "Delete Recording",
      resource: "Recording ID: 456",
      details: "Permanently deleted recording",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      severity: "critical",
      category: "recording_management",
      sessionId: "session-1",
    },
    {
      id: "audit-7",
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      user: "test@example.com",
      action: "View Recording",
      resource: "Recording ID: 789",
      details: "Accessed recording file",
      ipAddress: "192.168.1.103",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      severity: "medium",
      category: "recording_management",
      sessionId: "session-4",
    },
    {
      id: "audit-8",
      timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
      user: "admin@court.com",
      action: "Export Data",
      resource: "Data Export",
      details: "Exported 150 recording records",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      severity: "medium",
      category: "data_access",
      sessionId: "session-1",
    },
    {
      id: "audit-9",
      timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(), // 9 days ago
      user: "morton@soxfort.com",
      action: "System Backup",
      resource: "System Configuration",
      details: "Automated system backup completed successfully",
      ipAddress: "192.168.1.101",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      severity: "low",
      category: "system_config",
      sessionId: "session-2",
    },
    {
      id: "audit-10",
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      user: "admin@court.com",
      action: "Update User",
      resource: "User Management",
      details: "Updated user test@example.com: changed role to court_recorder",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      severity: "high",
      category: "user_management",
      sessionId: "session-1",
    },
  ];

  return sampleLogs;
};

// Sample recording data for transcript reports
export const generateSampleRecordings = () => {
  return [
    {
      id: 1,
      case_number: "HC-2024-001",
      title: "State vs. John Doe - Criminal Case",
      notes: "High profile criminal case",
      annotations: [],
      date_stamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      judge_name: "Justice Smith",
      prosecution_counsel: "Prosecutor Johnson",
      defense_counsel: "Defense Attorney Brown",
      court: "High Court Harare",
      courtroom: "Courtroom 1",
      transcript:
        "The court is now in session. The case of State versus John Doe is called. The defendant is present and represented by counsel. The prosecution is ready to proceed. The court notes that this is a criminal matter involving charges of theft and fraud. The defendant has entered a plea of not guilty. The trial will commence with opening statements from both parties.",
      duration: "02:30:45",
      size: "125MB",
      status: "completed",
      file_path: "/recordings/hc-2024-001.m4a",
      assigned_to: "Sarah Johnson",
      transcript_status: "completed",
    },
    {
      id: 2,
      case_number: "MC-2024-002",
      title: "Smith vs. Jones - Civil Dispute",
      notes: "Contract dispute case",
      annotations: [],
      date_stamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      judge_name: "Magistrate Wilson",
      prosecution_counsel: "Plaintiff Attorney Davis",
      defense_counsel: "Defense Attorney Miller",
      court: "Magistrate Court Bulawayo",
      courtroom: "Courtroom 2",
      transcript:
        "This is a civil matter involving a contract dispute between the plaintiff and defendant. The plaintiff alleges breach of contract and seeks damages. The defendant denies the allegations and claims the contract was void due to misrepresentation. Both parties have submitted their evidence and the court will now hear arguments.",
      duration: "01:45:30",
      size: "89MB",
      status: "completed",
      file_path: "/recordings/mc-2024-002.m4a",
      assigned_to: "Michael Chen",
      transcript_status: "review",
    },
    {
      id: 3,
      case_number: "HC-2024-003",
      title: "Family Court Matter - Custody",
      notes: "Child custody dispute",
      annotations: [],
      date_stamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      judge_name: "Justice Anderson",
      prosecution_counsel: "Family Attorney Taylor",
      defense_counsel: "Family Attorney White",
      court: "High Court Harare",
      courtroom: "Courtroom 3",
      transcript: "", // No transcript - this will test the "without transcript" functionality
      duration: "03:15:20",
      size: "156MB",
      status: "completed",
      file_path: "/recordings/hc-2024-003.m4a",
      assigned_to: "Unassigned",
      transcript_status: "pending",
    },
    {
      id: 4,
      case_number: "MC-2024-004",
      title: "Traffic Violation - Speeding",
      notes: "Minor traffic offense",
      annotations: [],
      date_stamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      judge_name: "Magistrate Thompson",
      prosecution_counsel: "Traffic Prosecutor",
      defense_counsel: "Public Defender",
      court: "Magistrate Court Gweru",
      courtroom: "Courtroom 1",
      transcript:
        "The defendant is charged with exceeding the speed limit by 25 kilometers per hour. The prosecution presents evidence from the speed camera. The defendant admits to the offense but requests leniency due to emergency circumstances. The court considers the circumstances and the defendant's clean driving record.",
      duration: "00:30:15",
      size: "45MB",
      status: "completed",
      file_path: "/recordings/mc-2024-004.m4a",
      assigned_to: "Emily Rodriguez",
      transcript_status: "in_progress",
    },
    {
      id: 5,
      case_number: "HC-2024-005",
      title: "Commercial Dispute - Banking",
      notes: "Banking and finance case",
      annotations: [],
      date_stamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      judge_name: "Justice Roberts",
      prosecution_counsel: "Bank Attorney",
      defense_counsel: "Commercial Lawyer",
      court: "High Court Harare",
      courtroom: "Courtroom 2",
      transcript:
        "This commercial dispute involves allegations of fraudulent banking practices. The plaintiff, a commercial bank, seeks recovery of substantial funds. The defendant, a business entity, denies the allegations and claims the bank's actions were in breach of their fiduciary duties. The case involves complex financial transactions and requires expert testimony from banking and forensic accounting professionals.",
      duration: "04:20:10",
      size: "198MB",
      status: "completed",
      file_path: "/recordings/hc-2024-005.m4a",
      assigned_to: "David Kim",
      transcript_status: "completed",
    },
  ];
};

export const initializeSampleData = () => {
  if (typeof window !== "undefined") {
    const existingLogs = localStorage.getItem("audit_logs");
    if (!existingLogs || JSON.parse(existingLogs).length === 0) {
      const sampleLogs = generateSampleAuditLogs();
      localStorage.setItem("audit_logs", JSON.stringify(sampleLogs));
      console.log(
        "✅ Initialized sample audit data:",
        sampleLogs.length,
        "logs"
      );
    }
  }
};

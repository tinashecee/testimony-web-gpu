"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import DateRangePicker from "@/components/DateRangePicker";
import {
  Activity,
  Users,
  FileAudio,
  Shield,
  Download,
  Calendar,
  TrendingUp,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { ActivityReport } from "./ActivityReport";
import { UserActivityReport } from "./UserActivityReport";
import { RecordingReport } from "./RecordingReport";
import { SecurityReport } from "./SecurityReport";
import { SystemMetricsReport } from "./SystemMetricsReport";
import { auditService, AuditLog } from "@/services/auditService";
import { initializeSampleData } from "@/utils/sampleAuditData";
import { toast } from "sonner";

export function ReportsDashboard() {
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  const loadAuditData = async () => {
    setIsLoading(true);
    setApiError(null);

    // Initialize sample data if needed
    initializeSampleData();

    try {
      console.log("🔍 Loading audit data...");
      const logs = await auditService.getAuditLogs({
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        limit: 1000,
      });
      console.log("✅ Audit data loaded:", logs.length, "logs");
      setAuditLogs(logs);
    } catch (error) {
      console.error("Failed to load audit data:", error);
      setApiError("Failed to load audit data from server. Using local data.");
      toast.error("Failed to load audit data from server");

      // Try to get local data as fallback
      try {
        const localLogs = auditService.getLocalAuditLogs({
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
          limit: 1000,
        });
        if (localLogs.length > 0) {
          setAuditLogs(localLogs);
          toast.info(`Using ${localLogs.length} local audit logs`);
        } else {
          toast.warning("No audit data available");
        }
      } catch (localError) {
        console.error("Failed to load local audit data:", localError);
        toast.error("No audit data available");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuditData();
  }, [startDate, endDate]);

  const handleExportAll = async () => {
    try {
      const csvContent = await auditService.exportAuditLogs({
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `system-reports-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Reports exported successfully");
    } catch (error) {
      console.error("Failed to export reports:", error);
      toast.error("Failed to export reports");
    }
  };

  const handleResetLogs = async () => {
    try {
      // Clear local logs and re-seed sample data
      auditService.clearLocalLogs();
      initializeSampleData();
      await loadAuditData();
      toast.success("Audit logs reset. Showing all sample users' activity.");
    } catch (e) {
      toast.error("Failed to reset logs");
    }
  };

  const getReportStats = () => {
    const totalEvents = auditLogs.length;
    const criticalEvents = auditLogs.filter(
      (log) => log.severity === "critical"
    ).length;
    const highSeverityEvents = auditLogs.filter(
      (log) => log.severity === "high"
    ).length;
    const uniqueUsers = new Set(auditLogs.map((log) => log.user)).size;

    return {
      totalEvents,
      criticalEvents,
      highSeverityEvents,
      uniqueUsers,
    };
  };

  const stats = getReportStats();

  return (
    <div className="space-y-6">
      {/* API Error Banner */}
      {apiError && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-orange-900">
                  API Connection Issue
                </h4>
                <p className="text-sm text-orange-700 mt-1">
                  {apiError} The reports will show available local data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Range and Export Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                Date Range
              </label>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadAuditData}
                disabled={isLoading}
                variant="outline">
                {isLoading ? "Loading..." : "Refresh"}
              </Button>
              <Button
                onClick={handleResetLogs}
                variant="outline">
                Reset Logs
              </Button>
              <Button
                onClick={handleExportAll}
                className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.totalEvents}</p>
                <p className="text-sm text-muted-foreground">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.criticalEvents}</p>
                <p className="text-sm text-muted-foreground">Critical Events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{stats.highSeverityEvents}</p>
                <p className="text-sm text-muted-foreground">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="recordings" className="flex items-center gap-2">
            <FileAudio className="w-4 h-4" />
            Recordings
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-6">
          <ActivityReport
            auditLogs={auditLogs}
            dateRange={{ from: new Date(startDate), to: new Date(endDate) }}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserActivityReport
            auditLogs={auditLogs}
            dateRange={{ from: new Date(startDate), to: new Date(endDate) }}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="recordings" className="mt-6">
          <RecordingReport
            auditLogs={auditLogs}
            dateRange={{ from: new Date(startDate), to: new Date(endDate) }}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <SecurityReport
            auditLogs={auditLogs}
            dateRange={{ from: new Date(startDate), to: new Date(endDate) }}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="metrics" className="mt-6">
          <SystemMetricsReport
            auditLogs={auditLogs}
            dateRange={{ from: new Date(startDate), to: new Date(endDate) }}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

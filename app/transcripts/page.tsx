"use client";

import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DateRangePicker from "@/components/DateRangePicker";
import { Download, Calendar, AlertTriangle } from "lucide-react";
import { TranscriptReport } from "@/components/reports/TranscriptReport";
import { auditService, AuditLog } from "@/services/auditService";
import { initializeSampleData } from "@/utils/sampleAuditData";
import { toast } from "sonner";

export default function TranscriptsPage() {
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
      a.download = `transcript-reports-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Transcript reports exported successfully");
    } catch (error) {
      console.error("Failed to export transcript reports:", error);
      toast.error("Failed to export transcript reports");
    }
  };

  return (
    <Layout>
      <RoleGuard
        allowedRoles={[
          "super_admin",
          "admin",
          "judge",
          "senior_regional_magistrate",
          "provincial_magistrate",
          "regional_magistrate",
          "station_magistrate",
          "resident_magistrate",
        ]}>
        <div className="container mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Transcript Reports</h1>
            <p className="text-muted-foreground">
              Analyze transcript completion rates, content quality, and
              management activities.
            </p>
          </div>

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
                      onClick={handleExportAll}
                      className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Export All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transcript Report */}
            <TranscriptReport
              auditLogs={auditLogs}
              dateRange={{ from: new Date(startDate), to: new Date(endDate) }}
              isLoading={isLoading}
            />
          </div>
        </div>
      </RoleGuard>
    </Layout>
  );
}

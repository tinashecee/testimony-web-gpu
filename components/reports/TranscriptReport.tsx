"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Search,
  Download,
  User,
  Clock,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileCheck,
  FileX,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AuditLog } from "@/services/auditService";
import { recordingsApi, Recording } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { generateSampleRecordings } from "@/utils/sampleAuditData";
import { TranscriptPreviewModal } from "./TranscriptPreviewModal";
import { toast } from "sonner";

interface TranscriptReportProps {
  auditLogs: AuditLog[];
  dateRange: { from: Date | undefined; to: Date | undefined };
  isLoading: boolean;
}

interface TranscriptMetrics {
  totalRecordings: number;
  recordingsWithTranscripts: number;
  recordingsWithoutTranscripts: number;
  transcriptCompletionRate: number;
  averageTranscriptLength: number;
  totalTranscriptWords: number;
  averageWordsPerTranscript: number;
  transcriptProgressScore: number;
}

interface RecordingTranscriptData {
  id: number;
  caseNumber: string;
  assignedTo: string;
  title: string;
  date: string;
  court: string;
  transcript: string;
  transcriptLength: number;
  wordCount: number;
  hasTranscript: boolean;
  transcriptStatus: "completed" | "in_progress" | "pending" | "review" | "none";
  lastModified?: string;
}

export function TranscriptReport({
  auditLogs,
  dateRange,
  isLoading,
}: TranscriptReportProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [courtFilter, setCourtFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [qualityFilter, setQualityFilter] = useState<string>("all");
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [transcriptionAssignments, setTranscriptionAssignments] = useState<
    Map<number, any[]>
  >(new Map());
  const [sortBy, setSortBy] = useState<keyof RecordingTranscriptData>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedRecording, setSelectedRecording] =
    useState<RecordingTranscriptData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeScope, setActiveScope] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(50);
  const [offset, setOffset] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);

  // Load recordings data (role-based, server-paginated)
  useEffect(() => {
    const loadRecordings = async () => {
      setRecordingsLoading(true);
      try {
        const role = user?.role;
        const params: any = {
          limit: pageSize,
          offset,
          q: searchTerm || undefined,
          court: courtFilter !== "all" ? courtFilter : undefined,
          sort_by: "date_stamp",
          sort_dir: "desc",
        };
        if (
          ["station_magistrate", "resident_magistrate"].includes(role || "") &&
          (user as any)?.district
        ) {
          params.district = (user as any).district as string;
        } else if (
          role === "provincial_magistrate" &&
          (user as any)?.province
        ) {
          params.province = (user as any).province as string;
        } else if (role === "regional_magistrate" && (user as any)?.region) {
          params.region = (user as any).region as string;
        }

        const isAll = pageSize >= 100000;
        if (isAll) {
          const pageLimit = 100;
          // First request to determine total
          const firstPage = await recordingsApi.getRecordingsPaginated({
            ...params,
            limit: pageLimit,
            offset: 0,
          });
          const finalTotal = Number(firstPage.total) || firstPage.items.length;
          let accumulated: Recording[] = [...firstPage.items];

          // Safety cap to avoid runaway loops if API misreports totals
          const maxIterations = Math.ceil(finalTotal / pageLimit) + 2;
          let iterations = 0;

          for (
            let currentOffset = firstPage.items.length;
            currentOffset < finalTotal && iterations < maxIterations;
            currentOffset += pageLimit
          ) {
            const page = await recordingsApi.getRecordingsPaginated({
              ...params,
              limit: pageLimit,
              offset: currentOffset,
            });
            if (!page.items || page.items.length === 0) break;
            accumulated = accumulated.concat(page.items);
            iterations += 1;
          }

          setRecordings(accumulated);
          setTotal(finalTotal || accumulated.length);
        } else {
          const res = await recordingsApi.getRecordingsPaginated(params);
          setRecordings(res.items);
          setTotal(res.total);
        }
        let scope = "";
        if (params.district) scope = `District: ${params.district}`;
        else if (params.province) scope = `Province: ${params.province}`;
        else if (params.region) scope = `Region: ${params.region}`;
        else scope = "All Recordings";
        setActiveScope(scope);
      } catch (error) {
        // Use sample data as fallback
        const sampleRecordings = generateSampleRecordings();
        setRecordings(sampleRecordings);
      } finally {
        setRecordingsLoading(false);
      }
    };

    loadRecordings();
  }, [
    user?.role,
    (user as any)?.district,
    (user as any)?.province,
    (user as any)?.region,
    pageSize,
    offset,
    searchTerm,
    courtFilter,
  ]);

  // Load assignments for each recording individually
  useEffect(() => {
    const loadAssignmentsForRecordings = async () => {
      if (recordings.length === 0) return;
      
      const { transcriptionApi } = await import("@/services/api");
      const assignmentsMap = new Map<number, any[]>();
      
      // Fetch assignments for each recording
      const assignmentPromises = recordings.map(async (recording) => {
        try {
          const assignments = await transcriptionApi.getAssignmentsByCase(recording.id);
          if (assignments && assignments.length > 0) {
            assignmentsMap.set(recording.id, assignments);
          }
        } catch (error) {
          console.warn(`Failed to load assignments for recording ${recording.id}:`, error);
          // If 404, that's fine - just means no assignments
        }
      });
      
      await Promise.all(assignmentPromises);
      setTranscriptionAssignments(assignmentsMap);
    };
    
    loadAssignmentsForRecordings();
  }, [recordings]);

  // Process transcript data
  const transcriptData = useMemo(() => {
    return recordings.map((recording) => {
      const transcript = recording.transcript || "";
      const wordCount = transcript.trim()
        ? transcript.trim().split(/\s+/).length
        : 0;
      const transcriptLength = transcript.length;
      const hasTranscript = transcript.trim().length > 0;

      // Use transcript_status strictly; fallback to 'pending' if null/undefined
      let transcriptStatus:
        | "completed"
        | "in_progress"
        | "pending"
        | "review"
        | "none" = "pending";
      if (recording.transcript_status) {
        transcriptStatus = recording.transcript_status as
          | "completed"
          | "in_progress"
          | "pending"
          | "review"
          | "none";
      }

      // Get assigned user from transcription assignments map
      const assignments = transcriptionAssignments.get(recording.id);
      const assignment = assignments && assignments.length > 0 ? assignments[0] : null;
      const assignedTo = assignment ? assignment.user_name : "Unassigned";

      return {
        id: recording.id,
        caseNumber: recording.case_number,
        assignedTo,
        title: recording.title,
        date: recording.date_stamp,
        court: recording.court,
        transcript,
        transcriptLength,
        wordCount,
        hasTranscript,
        transcriptStatus,
        lastModified: recording.date_stamp,
      };
    });
  }, [recordings, transcriptionAssignments]);

  // Calculate metrics
  const metrics = useMemo((): TranscriptMetrics => {
    const totalRecordings = transcriptData.length;
    const recordingsWithTranscripts = transcriptData.filter(
      (r) => r.hasTranscript
    ).length;
    const recordingsWithoutTranscripts =
      totalRecordings - recordingsWithTranscripts;
    const transcriptCompletionRate =
      totalRecordings > 0
        ? (recordingsWithTranscripts / totalRecordings) * 100
        : 0;

    const transcriptsWithContent = transcriptData.filter(
      (r) => r.hasTranscript
    );
    const totalTranscriptWords = transcriptsWithContent.reduce(
      (sum, r) => sum + r.wordCount,
      0
    );
    const averageTranscriptLength =
      transcriptsWithContent.length > 0
        ? transcriptsWithContent.reduce(
            (sum, r) => sum + r.transcriptLength,
            0
          ) / transcriptsWithContent.length
        : 0;
    const averageWordsPerTranscript =
      transcriptsWithContent.length > 0
        ? totalTranscriptWords / transcriptsWithContent.length
        : 0;

    // Calculate progress score (weighted average)
    const progressWeights = {
      completed: 4,
      review: 3,
      in_progress: 2,
      pending: 1,
      none: 0,
    };
    const totalProgressScore = transcriptData.reduce(
      (sum, r) => sum + progressWeights[r.transcriptStatus],
      0
    );
    const transcriptProgressScore =
      totalRecordings > 0 ? (totalProgressScore / totalRecordings) * 25 : 0; // Scale to 0-100

    return {
      totalRecordings,
      recordingsWithTranscripts,
      recordingsWithoutTranscripts,
      transcriptCompletionRate,
      averageTranscriptLength,
      totalTranscriptWords,
      averageWordsPerTranscript,
      transcriptProgressScore,
    };
  }, [transcriptData]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    const normalize = (value: unknown) =>
      (typeof value === "string"
        ? value
        : value == null
        ? ""
        : String(value)
      ).toLowerCase();

    const query = normalize(searchTerm);

    let filtered = transcriptData.filter((recording) => {
      // Search filter - search in case number, title, and court (null-safe)
      const matchesSearch =
        query === "" ||
        normalize(recording.caseNumber).includes(query) ||
        normalize(recording.title).includes(query) ||
        normalize(recording.court).includes(query);

      // Court filter
      const matchesCourt =
        courtFilter === "all" || recording.court === courtFilter;

      // Status filter - with/without transcripts
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "with" && recording.hasTranscript) ||
        (statusFilter === "without" && !recording.hasTranscript);

      // Progress filter
      const matchesProgress =
        qualityFilter === "all" || recording.transcriptStatus === qualityFilter;

      return matchesSearch && matchesCourt && matchesStatus && matchesProgress;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (sortBy === "date") {
        const aDate = new Date(aValue as string);
        const bDate = new Date(bValue as string);
        return sortOrder === "asc"
          ? aDate.getTime() - bDate.getTime()
          : bDate.getTime() - aDate.getTime();
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }

      if (
        (typeof aValue === "string" || aValue == null) &&
        (typeof bValue === "string" || bValue == null)
      ) {
        const aStr = String(aValue ?? "");
        const bStr = String(bValue ?? "");
        return sortOrder === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      }

      return 0;
    });

    return filtered;
  }, [
    transcriptData,
    searchTerm,
    courtFilter,
    statusFilter,
    qualityFilter,
    sortBy,
    sortOrder,
  ]);

  const getProgressColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "review":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-orange-100 text-orange-800";
      case "none":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleExport = async () => {
    try {
      const csvContent = [
        [
          "Case Number",
          "Assigned To",
          "Title",
          "Date",
          "Court",
          "Has Transcript",
          "Word Count",
          "Transcript Progress",
          "Transcript Length",
        ],
        ...filteredAndSortedData.map((recording) => [
          recording.caseNumber,
          recording.assignedTo,
          `"${recording.title}"`,
          new Date(recording.date).toLocaleDateString(),
          recording.court,
          recording.hasTranscript ? "Yes" : "No",
          recording.wordCount.toString(),
          recording.transcriptStatus,
          recording.transcriptLength.toString(),
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transcript-report-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Transcript report exported successfully");
    } catch (error) {
      console.error("Failed to export transcript report:", error);
      toast.error("Failed to export transcript report");
    }
  };

  const courts = Array.from(
    new Set(
      transcriptData
        .map((r) => r.court)
        .filter((court) => court && court.trim() !== "")
    )
  );

  const handleRowClick = (recording: RecordingTranscriptData) => {
    setSelectedRecording(recording);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRecording(null);
  };

  const handleSaveTranscript = async () => {
    // Reload recordings data after transcript is saved
    try {
      const role = user?.role;
      const params: any = {
        limit: pageSize,
        offset,
        q: searchTerm || undefined,
        court: courtFilter !== "all" ? courtFilter : undefined,
        sort_by: "date_stamp",
        sort_dir: "desc",
      };
      if (
        ["station_magistrate", "resident_magistrate"].includes(role || "") &&
        (user as any)?.district
      ) {
        params.district = (user as any).district as string;
      } else if (role === "provincial_magistrate" && (user as any)?.province) {
        params.province = (user as any).province as string;
      } else if (role === "regional_magistrate" && (user as any)?.region) {
        params.region = (user as any).region as string;
      }

      const res = await recordingsApi.getRecordingsPaginated(params);
      setRecordings(res.items);
      setTotal(res.total);

      // Update the selected recording with the latest data
      if (selectedRecording) {
        const updatedRecording = res.items.find(
          (r: Recording) => r.id === selectedRecording.id
        );
        if (updatedRecording) {
          const transcript = updatedRecording.transcript || "";
          const wordCount = transcript.trim()
            ? transcript.trim().split(/\s+/).length
            : 0;
          const transcriptLength = transcript.length;
          const hasTranscript = transcript.trim().length > 0;

          let transcriptStatus:
            | "completed"
            | "in_progress"
            | "pending"
            | "review"
            | "none" = "pending";
          if (updatedRecording.transcript_status) {
            transcriptStatus = updatedRecording.transcript_status as
              | "completed"
              | "in_progress"
              | "pending"
              | "review"
              | "none";
          }

          const assignments = transcriptionAssignments.get(updatedRecording.id);
          const assignment = assignments && assignments.length > 0 ? assignments[0] : null;
          const assignedTo = assignment ? assignment.user_name : "Unassigned";

          setSelectedRecording({
            id: updatedRecording.id,
            caseNumber: updatedRecording.case_number,
            assignedTo,
            title: updatedRecording.title,
            date: updatedRecording.date_stamp,
            court: updatedRecording.court,
            transcript,
            transcriptLength,
            wordCount,
            hasTranscript,
            transcriptStatus,
            lastModified: updatedRecording.date_stamp,
          });
        }
      }
    } catch (error) {
      console.error("Failed to reload recordings:", error);
      // Use sample data as fallback
      const sampleRecordings = generateSampleRecordings();
      setRecordings(sampleRecordings);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Transcript Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by case number, title, or court..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <Select value={courtFilter} onValueChange={setCourtFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Court" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courts</SelectItem>
                  {courts.map((court) => (
                    <SelectItem key={court} value={court}>
                      {court}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Transcript Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Recordings</SelectItem>
                  <SelectItem value="with">With Transcripts</SelectItem>
                  <SelectItem value="without">Without Transcripts</SelectItem>
                </SelectContent>
              </Select>

              <Select value={qualityFilter} onValueChange={setQualityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Progress Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="review">Under Review</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="none">No Status</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleExport}
                className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>

            {/* Active Filters Display */}
            {(searchTerm ||
              courtFilter !== "all" ||
              statusFilter !== "all" ||
              qualityFilter !== "all") && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">
                  Active filters:
                </span>
                {searchTerm && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1">
                    Search: "{searchTerm}"
                    <button
                      onClick={() => setSearchTerm("")}
                      className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {courtFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1">
                    Court: {courtFilter}
                    <button
                      onClick={() => setCourtFilter("all")}
                      className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1">
                    Status:{" "}
                    {statusFilter === "with"
                      ? "With Transcripts"
                      : "Without Transcripts"}
                    <button
                      onClick={() => setStatusFilter("all")}
                      className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                {qualityFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1">
                    Progress:{" "}
                    {qualityFilter.charAt(0).toUpperCase() +
                      qualityFilter.slice(1).replace("_", " ")}
                    <button
                      onClick={() => setQualityFilter("all")}
                      className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setCourtFilter("all");
                    setStatusFilter("all");
                    setQualityFilter("all");
                  }}
                  className="text-xs">
                  Clear All
                </Button>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <div className="text-sm text-muted-foreground">
                {total > 0 ? (
                  <span>
                    Showing {offset + 1} to {Math.min(offset + pageSize, total)}{" "}
                    of {total}
                  </span>
                ) : (
                  <span>No results</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    if (value === "all") {
                      setPageSize(100000);
                      setOffset(0);
                    } else {
                      const n = parseInt(value, 10);
                      setPageSize(Number.isNaN(n) ? 50 : n);
                      setOffset(0);
                    }
                  }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Page size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="20">20 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setOffset((prev) => Math.max(0, prev - pageSize))
                    }
                    disabled={offset === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setOffset((prev) =>
                        prev + pageSize < total ? prev + pageSize : prev
                      )
                    }
                    disabled={offset + pageSize >= total}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {/* Page indicator */}
                  {total > 0 && pageSize < 100000 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      Page {Math.floor(offset / pageSize) + 1} of{" "}
                      {Math.max(1, Math.ceil(total / pageSize))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Summary */}
      {(searchTerm ||
        courtFilter !== "all" ||
        statusFilter !== "all" ||
        qualityFilter !== "all") && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="font-semibold text-blue-900">
                  Filtered Results
                </h4>
                <p className="text-sm text-blue-700">
                  Showing {filteredAndSortedData.length} of{" "}
                  {transcriptData.length} recordings
                  {searchTerm && ` matching "${searchTerm}"`}
                  {courtFilter !== "all" && ` in ${courtFilter}`}
                  {statusFilter !== "all" &&
                    ` with ${
                      statusFilter === "with" ? "transcripts" : "no transcripts"
                    }`}
                  {qualityFilter !== "all" &&
                    ` with ${qualityFilter.replace("_", " ")} progress`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcript Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalRecordings}</p>
                <p className="text-sm text-muted-foreground">
                  Total Recordings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {metrics.recordingsWithTranscripts}
                </p>
                <p className="text-sm text-muted-foreground">
                  With Transcripts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">
                  {metrics.recordingsWithoutTranscripts}
                </p>
                <p className="text-sm text-muted-foreground">
                  Without Transcripts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {metrics.transcriptCompletionRate.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {metrics.totalTranscriptWords.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Words</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">
                  {metrics.averageWordsPerTranscript.toFixed(0)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Avg Words/Transcript
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {metrics.transcriptProgressScore.toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground">Progress Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transcript Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Recording Transcript Details
            <Badge variant="outline" className="ml-2">
              {filteredAndSortedData.length} of {transcriptData.length}{" "}
              recordings
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Click on any row to view the full transcript
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSortBy("caseNumber");
                      setSortOrder(
                        sortBy === "caseNumber" && sortOrder === "desc"
                          ? "asc"
                          : "desc"
                      );
                    }}>
                    Case Number
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSortBy("assignedTo");
                      setSortOrder(
                        sortBy === "assignedTo" && sortOrder === "desc"
                          ? "asc"
                          : "desc"
                      );
                    }}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Assigned To
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSortBy("title");
                      setSortOrder(
                        sortBy === "title" && sortOrder === "desc"
                          ? "asc"
                          : "desc"
                      );
                    }}>
                    Title
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSortBy("date");
                      setSortOrder(
                        sortBy === "date" && sortOrder === "desc"
                          ? "asc"
                          : "desc"
                      );
                    }}>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Date
                    </div>
                  </TableHead>
                  <TableHead>Court</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSortBy("hasTranscript");
                      setSortOrder(
                        sortBy === "hasTranscript" && sortOrder === "desc"
                          ? "asc"
                          : "desc"
                      );
                    }}>
                    Transcript Status
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSortBy("wordCount");
                      setSortOrder(
                        sortBy === "wordCount" && sortOrder === "desc"
                          ? "asc"
                          : "desc"
                      );
                    }}>
                    Word Count
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSortBy("transcriptStatus");
                      setSortOrder(
                        sortBy === "transcriptStatus" && sortOrder === "desc"
                          ? "asc"
                          : "desc"
                      );
                    }}>
                    Transcript Progress
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordingsLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Loading transcript data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAndSortedData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground">
                      No recordings found for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedData.map((recording) => (
                    <TableRow
                      key={recording.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleRowClick(recording)}>
                      <TableCell className="font-mono text-sm font-medium">
                        {recording.caseNumber}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span
                            className={
                              recording.assignedTo === "Unassigned"
                                ? "text-muted-foreground italic"
                                : ""
                            }>
                            {recording.assignedTo}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={recording.title}>
                        {recording.title}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {new Date(recording.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{recording.court}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {recording.hasTranscript ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className="text-sm">
                            {recording.hasTranscript ? "Yes" : "No"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {recording.wordCount.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getProgressColor(
                            recording.transcriptStatus
                          )}>
                          {recording.transcriptStatus.charAt(0).toUpperCase() +
                            recording.transcriptStatus
                              .slice(1)
                              .replace("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Transcript Preview Modal */}
      <TranscriptPreviewModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        recording={selectedRecording}
        onSave={handleSaveTranscript}
      />
    </div>
  );
}

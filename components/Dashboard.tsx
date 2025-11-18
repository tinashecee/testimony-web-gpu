"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Users,
  Building2,
  HardDrive,
  Clock,
  AlertTriangle,
  BarChart3,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn, formatDuration, getCourtNameForRecording } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  recordingsApi,
  type Recording,
  type Court,
  type Courtroom,
  type User,
} from "@/services/api";
import dynamic from "next/dynamic";
const AddRecordingModal = dynamic(
  () =>
    import("./recording/AddRecordingModal").then((m) => m.AddRecordingModal),
  {
    ssr: false,
    loading: () => null,
  }
);
import { showUploadProgress } from "@/components/ui/upload-progress";

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<
    "cached" | "fresh" | "unknown"
  >("unknown");

  const [isAddRecordingOpen, setIsAddRecordingOpen] = useState(false);
  const [courts, setCourts] = useState<Court[]>([]);
  const [courtrooms, setCourtrooms] = useState<Courtroom[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState<string>("");

  // Get current month and year
  const getCurrentMonthYear = () => {
    const now = new Date();
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  };

  // Calculate dynamic stats based on real data
  const stats = useMemo(
    () => [
      {
        title: "Total Recordings",
        value: recordings.length.toLocaleString(),
        icon: FileText,
        description: "Audio recordings across all courts",
        change: `${recordings.length} recordings total`,
      },
      {
        title: "Active Users",
        value: users.length.toString(),
        icon: Users,
        description: "Currently registered users",
        change: `${users.length} users registered`,
      },
      {
        title: "Active Courts",
        value: courts.length.toString(),
        icon: Building2,
        description: "Connected courtrooms",
        change: `${courts.length} courts active`,
      },
    ],
    [recordings.length, users.length, courts.length]
  );

  // Fetch recordings (role-based) with error handling and cache awareness
  const fetchRecordings = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const role = user?.role;
      let list: Recording[] = [];
      if (
        ["station_magistrate", "resident_magistrate"].includes(role || "") &&
        (user as any)?.district
      ) {
        list = await recordingsApi.getRecordingsByDistrict(
          (user as any).district as string
        );
      } else if (role === "provincial_magistrate" && (user as any)?.province) {
        list = await recordingsApi.getRecordingsByProvince(
          (user as any).province as string
        );
      } else if (role === "regional_magistrate" && (user as any)?.region) {
        list = await recordingsApi.getRecordingsByRegion(
          (user as any).region as string
        );
      } else {
        const res = await recordingsApi.getRecordingsPaginated({
          limit: 20,
          offset: 0,
          sort_by: "date_stamp",
          sort_dir: "desc",
        });
        list = res.items;
      }

      setRecordings(list);
      setRetryAttempt(0); // Reset retry count on success
      setCacheStatus(forceRefresh ? "fresh" : "cached");
    } catch (error) {
      console.error("Error fetching recordings:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch recordings";
      setError(errorMessage);
      setRetryAttempt((prev) => prev + 1);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Force refresh recordings (bypass cache)
  const refreshRecordings = async () => {
    await fetchRecordings(true);
  };

  // Handle recording click with cache invalidation
  const handleRecordingClick = (recordingId: number) => {
    // Invalidate individual recording cache to ensure fresh data when returning
    recordingsApi.invalidateRecordingsCache();
    router.push(`/recordings/${recordingId}`);
  };

  useEffect(() => {
    fetchRecordings();
  }, [
    user?.role,
    (user as any)?.district,
    (user as any)?.province,
    (user as any)?.region,
  ]);

  // Fetch courts, courtrooms, and users (non-critical data)
  useEffect(() => {
    const scheduleIdleFetch = () => {
      const run = async () => {
        try {
          const results = await Promise.allSettled([
            recordingsApi.getCourts(),
            recordingsApi.getCourtrooms(),
            recordingsApi.getUsers(),
          ]);

          if (results[0].status === "fulfilled") setCourts(results[0].value);
          if (results[1].status === "fulfilled")
            setCourtrooms(results[1].value);
          if (results[2].status === "fulfilled") setUsers(results[2].value);
        } catch (error) {
          console.error("Idle fetch error:", error);
        }
      };

      // Prefer requestIdleCallback if available, else timeout
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        (window as any).requestIdleCallback(run, { timeout: 3000 });
      } else {
        setTimeout(run, 1500);
      }
    };

    scheduleIdleFetch();
  }, []);

  // Filter recordings based on search and sort by date
  const filteredRecordings = useMemo(() => {
    return recordings
      .filter(
        (recording) =>
          recording.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          recording.case_number
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          recording.judge_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        // Sort by date_stamp in descending order (most recent first)
        return (
          new Date(b.date_stamp).getTime() - new Date(a.date_stamp).getTime()
        );
      });
  }, [recordings, searchQuery]);

  // Paginate recordings
  const paginatedRecordings = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRecordings.slice(startIndex, startIndex + pageSize);
  }, [filteredRecordings, currentPage, pageSize]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredRecordings.length / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-[fadeInDown_0.5s_ease-out]">
        <h1 className="text-3xl font-bold transition-all duration-300 hover:text-[#1B4D3E]">
          Dashboard
        </h1>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setIsAddRecordingOpen(true)}
            className="gap-2 transition-all duration-200 hover:scale-105 hover:shadow-lg group">
            <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
            <span className="transition-all duration-200">Add Recording</span>
          </Button>
          <Button
            variant="outline"
            className="gap-2 transition-all duration-200 hover:scale-105 hover:shadow-md group">
            <Calendar className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
            <span className="transition-all duration-200">
              {getCurrentMonthYear()}
            </span>
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert
          variant="destructive"
          className="animate-[fadeInDown_0.3s_ease-out]">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {error}
              {retryAttempt > 0 && (
                <span className="text-xs block mt-1">
                  Retry attempt #{retryAttempt}
                </span>
              )}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRecordings}
              disabled={isLoading}
              className="ml-4 gap-2">
              <RefreshCw
                className={cn("h-4 w-4", isLoading && "animate-spin")}
              />
              {isLoading ? "Retrying..." : "Retry"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => (
          <Card
            key={stat.title}
            className="transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1 cursor-pointer group"
            style={{
              animationDelay: `${index * 150}ms`,
              animation: "fadeInUp 0.6s ease-out forwards",
            }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium transition-colors duration-200 group-hover:text-[#1B4D3E]">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:text-[#1B4D3E] group-hover:scale-110" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold transition-all duration-300 group-hover:text-[#1B4D3E]">
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1 transition-colors duration-200">
                {stat.description}
              </p>
              <p className="text-xs text-primary mt-2 transition-all duration-200 group-hover:font-medium">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        {/* Recent Recordings */}
        <Card className="col-span-full transition-all duration-300 hover:shadow-lg animate-[fadeInUp_0.7s_ease-out]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg transition-colors duration-200 hover:text-[#1B4D3E]">
                  Recent Recordings
                </CardTitle>
                {cacheStatus === "cached" && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Cached</span>
                  </div>
                )}
                {cacheStatus === "fresh" && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Fresh</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshRecordings}
                  disabled={isRefreshing}
                  className="transition-all duration-200 hover:bg-[#1B4D3E]/10 hover:border-[#1B4D3E] focus:ring-2 focus:ring-[#1B4D3E]/20">
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                  />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
                <div className="relative group">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground transition-colors duration-200 group-focus-within:text-[#1B4D3E]" />
                  <Input
                    placeholder="Search recordings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-[200px] transition-all duration-200 focus:ring-2 focus:ring-[#1B4D3E]/20 focus:border-[#1B4D3E]"
                  />
                </div>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}>
                  <SelectTrigger className="w-[100px] transition-all duration-200 hover:shadow-md focus:ring-2 focus:ring-[#1B4D3E]/20">
                    <SelectValue placeholder="Show" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="9999">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : paginatedRecordings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No recordings found
                </div>
              ) : (
                <>
                  {paginatedRecordings.map((recording, index) => (
                    <div
                      key={recording.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-all duration-200 hover:scale-[1.02] hover:shadow-md group"
                      onClick={() => handleRecordingClick(recording.id)}
                      style={{
                        animationDelay: `${index * 100}ms`,
                        animation: "slideInRight 0.4s ease-out forwards",
                      }}>
                      <div className="space-y-1">
                        <p className="text-sm font-medium transition-colors duration-200 group-hover:text-[#1B4D3E]">
                          {recording.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground transition-colors duration-200">
                          <span className="font-medium">
                            Case #{recording.case_number}
                          </span>
                          <span>•</span>
                          <span>
                            {getCourtNameForRecording(
                              recording,
                              courts,
                              courtrooms
                            )}{" "}
                            - {recording.courtroom}
                          </span>
                          <span>•</span>
                          <span>
                            Duration: {formatDuration(recording.duration)}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(
                              recording.date_stamp
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="transition-all duration-200 group-hover:scale-110 group-hover:bg-[#1B4D3E]/10">
                        <FileText className="h-4 w-4 transition-colors duration-200 group-hover:text-[#1B4D3E]" />
                      </Button>
                    </div>
                  ))}

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-4 animate-[fadeIn_0.5s_ease-out]">
                    <p className="text-sm text-muted-foreground transition-colors duration-200">
                      Showing {Math.min(pageSize, filteredRecordings.length)} of{" "}
                      {filteredRecordings.length} recordings
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
                        className="transition-all duration-200 hover:scale-105 hover:shadow-md disabled:hover:scale-100 disabled:hover:shadow-none group">
                        <ChevronLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1)
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="transition-all duration-200 hover:scale-105 hover:shadow-md disabled:hover:scale-100 disabled:hover:shadow-none group">
                        <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AddRecordingModal
        isOpen={isAddRecordingOpen}
        onClose={() => setIsAddRecordingOpen(false)}
        onSuccess={() => {
          const fetchRecordings = async () => {
            try {
              setIsLoading(true);
              const data = await recordingsApi.getAllRecordings();
              setRecordings(data);
            } catch (error) {
              console.error("Error fetching recordings:", error);
            } finally {
              setIsLoading(false);
            }
          };
          fetchRecordings();
        }}
        courts={courts}
        courtrooms={courtrooms}
        onUploadStart={(fileName) => {
          setCurrentFileName(fileName);
          setUploadProgress(0);
          showUploadProgress(fileName, 0);
        }}
        onUploadProgress={(progress) => {
          setUploadProgress(progress);
          showUploadProgress(currentFileName, progress);
        }}
        onUploadComplete={() => {
          showUploadProgress(currentFileName, 100);
          setTimeout(() => {
            setUploadProgress(0);
            setCurrentFileName("");
          }, 2000);
        }}
      />
    </div>
  );
}

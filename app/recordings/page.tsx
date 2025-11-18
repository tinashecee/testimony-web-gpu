"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { RecordingList } from "@/components/RecordingList";
import Layout from "@/components/Layout";
import {
  recordingsApi,
  type Recording,
  type Court,
  type Courtroom,
} from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

export default function RecordingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [selectedCourtroom, setSelectedCourtroom] = useState<string | null>(
    null
  );
  const [pageSize, setPageSize] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [courts, setCourts] = useState<Court[]>([]);
  const [courtrooms, setCourtrooms] = useState<Courtroom[]>([]);
  const [courtsPage, setCourtsPage] = useState(1);
  const [courtsPerPage] = useState(10);
  const [expandedCourts, setExpandedCourts] = useState<string[]>([]);
  const [alphabetFilter, setAlphabetFilter] = useState<string | null>(null);
  const [courtSearchQuery, setCourtSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  useEffect(() => {
    const fetchCourtsAndCourtrooms = async () => {
      try {
        const [courtsData, courtroomsData] = await Promise.all([
          recordingsApi.getCourts(),
          recordingsApi.getCourtrooms(),
        ]);
        setCourts(courtsData);
        setCourtrooms(courtroomsData);
      } catch (error) {
        console.error("Error fetching courts and courtrooms:", error);
        toast({
          title: "Error",
          description: "Failed to fetch courts and courtrooms.",
          variant: "destructive",
        });
      }
    };

    fetchCourtsAndCourtrooms();
  }, [toast]);

  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        setIsLoading(true);
        const role = user?.role;
        const params: any = {
          limit: pageSize,
          offset,
          q: searchQuery || undefined,
          court: selectedCourt || undefined,
          courtroom: selectedCourtroom || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          start_date: dateRange.from
            ? format(dateRange.from, "yyyy-MM-dd")
            : undefined,
          end_date: dateRange.to
            ? format(dateRange.to, "yyyy-MM-dd")
            : undefined,
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

        const res = await recordingsApi.getRecordingsPaginated(params);
        setRecordings(res.items);
        setTotal(res.total);
      } catch (error) {
        console.error("Error fetching recordings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecordings();
  }, [
    toast,
    user?.role,
    (user as any)?.district,
    (user as any)?.province,
    (user as any)?.region,
    pageSize,
    offset,
    searchQuery,
    selectedCourt,
    selectedCourtroom,
    statusFilter,
    dateRange,
  ]);

  // Reset to first page when filters/pageSize change
  useEffect(() => {
    setOffset(0);
  }, [
    pageSize,
    searchQuery,
    selectedCourt,
    selectedCourtroom,
    statusFilter,
    dateRange,
  ]);

  // Filter recordings based on search, court, and status
  const filteredRecordings = useMemo(() => {
    return (
      recordings
        .filter((recording) => {
          const recordingDate = new Date(recording.date_stamp);

          const matchesSearch =
            recording.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            recording.case_number
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            recording.judge_name
              .toLowerCase()
              .includes(searchQuery.toLowerCase());

          const matchesCourt =
            !selectedCourt || recording.court === selectedCourt;
          const matchesCourtroom =
            !selectedCourtroom || recording.courtroom === selectedCourtroom;
          const matchesStatus =
            statusFilter === "all" || recording.status === statusFilter;

          const matchesDateRange =
            (!dateRange.from || recordingDate >= dateRange.from) &&
            (!dateRange.to || recordingDate <= dateRange.to);

          return (
            matchesSearch &&
            matchesCourt &&
            matchesCourtroom &&
            matchesStatus &&
            matchesDateRange
          );
        })
        // Sort by date_stamp in descending order (most recent first)
        .sort((a, b) => {
          return (
            new Date(b.date_stamp).getTime() - new Date(a.date_stamp).getTime()
          );
        })
    );
  }, [
    recordings,
    searchQuery,
    selectedCourt,
    selectedCourtroom,
    statusFilter,
    dateRange,
  ]);

  const alphabetList = "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const toggleCourtExpansion = (courtId: string) => {
    setExpandedCourts((prev) =>
      prev.includes(courtId)
        ? prev.filter((id) => id !== courtId)
        : [...prev, courtId]
    );
  };

  const filteredAndSortedCourts = useMemo(() => {
    return courts
      .filter((court) => {
        const matchesSearch = court.court_name
          .toLowerCase()
          .includes(courtSearchQuery.toLowerCase());
        const matchesAlphabet =
          !alphabetFilter ||
          court.court_name.charAt(0).toUpperCase() === alphabetFilter;
        return matchesSearch && matchesAlphabet;
      })
      .sort((a, b) => a.court_name.localeCompare(b.court_name));
  }, [courts, courtSearchQuery, alphabetFilter]);

  const paginatedCourts = useMemo(() => {
    const startIndex = (courtsPage - 1) * courtsPerPage;
    return filteredAndSortedCourts.slice(
      startIndex,
      startIndex + courtsPerPage
    );
  }, [filteredAndSortedCourts, courtsPage, courtsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedCourts.length / courtsPerPage);

  // Compute recording counts for courts and courtrooms
  const courtRecordingCounts = useMemo(() => {
    const counts: Record<string, { total: number; filtered: number }> = {};
    courts.forEach((court) => {
      const total = recordings.filter(
        (rec) => rec.court === court.court_name
      ).length;
      const filtered = filteredRecordings.filter(
        (rec) => rec.court === court.court_name
      ).length;
      counts[court.court_name] = { total, filtered };
    });
    return counts;
  }, [courts, recordings, filteredRecordings]);

  const courtroomRecordingCounts = useMemo(() => {
    const counts: Record<string, { total: number; filtered: number }> = {};
    courtrooms.forEach((room) => {
      const total = recordings.filter(
        (rec) => rec.courtroom === room.courtroom_name
      ).length;
      const filtered = filteredRecordings.filter(
        (rec) => rec.courtroom === room.courtroom_name
      ).length;
      counts[room.courtroom_name] = { total, filtered };
    });
    return counts;
  }, [courtrooms, recordings, filteredRecordings]);

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery || statusFilter !== "all" || dateRange.from || dateRange.to;

  return (
    <Layout>
      <div className="flex h-full">
        {/* Left Side - Courts Navigation */}
        <div className="w-80 bg-white border-r sticky top-0 h-screen flex flex-col">
          <div className="p-4 space-y-4 flex-1 overflow-hidden">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courts..."
                value={courtSearchQuery}
                onChange={(e) => setCourtSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Alphabet Filter */}
            <ScrollArea className="h-12 w-full">
              <div className="flex gap-1 pb-2">
                {alphabetList.map((letter) => (
                  <Button
                    key={letter}
                    variant={alphabetFilter === letter ? "default" : "ghost"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() =>
                      setAlphabetFilter(
                        alphabetFilter === letter ? null : letter
                      )
                    }>
                    {letter}
                  </Button>
                ))}
              </div>
            </ScrollArea>

            {/* Courts List */}
            <ScrollArea className="flex-1">
              <div className="space-y-1">
                {/* Show All Option */}
                <button
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm rounded-md font-medium",
                    "hover:bg-gray-100 transition-colors",
                    !selectedCourt &&
                      !selectedCourtroom &&
                      "bg-blue-50 border-l-4 border-blue-500 text-blue-700"
                  )}
                  onClick={() => {
                    setSelectedCourt(null);
                    setSelectedCourtroom(null);
                  }}>
                  📋 Show All Recordings
                  <span className="text-xs text-muted-foreground ml-2">
                    (
                    {hasActiveFilters
                      ? `${filteredRecordings.length}/${recordings.length}`
                      : recordings.length}{" "}
                    total)
                  </span>
                </button>

                <div className="border-t my-2"></div>

                {paginatedCourts.map((court) => (
                  <Collapsible
                    key={court.court_id}
                    open={expandedCourts.includes(court.court_id.toString())}
                    onOpenChange={() =>
                      toggleCourtExpansion(court.court_id.toString())
                    }>
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md",
                          "hover:bg-gray-100 transition-colors",
                          selectedCourt === court.court_name &&
                            "bg-blue-50 border-l-4 border-blue-500"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCourt(court.court_name);
                          setSelectedCourtroom(null); // Clear courtroom selection when selecting court
                        }}>
                        <span className="flex items-center gap-2">
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 transition-transform",
                              expandedCourts.includes(
                                court.court_id.toString()
                              ) && "rotate-90"
                            )}
                          />
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {court.court_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {hasActiveFilters &&
                          courtRecordingCounts[court.court_name]?.filtered !==
                            courtRecordingCounts[court.court_name]?.total
                            ? `${
                                courtRecordingCounts[court.court_name]
                                  ?.filtered || 0
                              }/${
                                courtRecordingCounts[court.court_name]?.total ||
                                0
                              }`
                            : courtRecordingCounts[court.court_name]?.total ||
                              0}{" "}
                          recordings
                        </span>
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="ml-6 space-y-1">
                      {courtrooms
                        .filter((room) => room.court_id === court.court_id)
                        .map((room) => (
                          <button
                            key={room.courtroom_id}
                            onClick={() => {
                              setSelectedCourtroom(room.courtroom_name);
                              setSelectedCourt(court.court_name); // Set the parent court when selecting courtroom
                            }}
                            className={cn(
                              "w-full text-left px-4 py-1.5 text-sm rounded-md",
                              "hover:bg-gray-100 transition-colors",
                              selectedCourtroom === room.courtroom_name &&
                                "bg-blue-50 border-l-4 border-blue-500 text-blue-700"
                            )}>
                            <span className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {room.courtroom_name}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {hasActiveFilters &&
                              courtroomRecordingCounts[room.courtroom_name]
                                ?.filtered !==
                                courtroomRecordingCounts[room.courtroom_name]
                                  ?.total
                                ? `${
                                    courtroomRecordingCounts[
                                      room.courtroom_name
                                    ]?.filtered || 0
                                  }/${
                                    courtroomRecordingCounts[
                                      room.courtroom_name
                                    ]?.total || 0
                                  }`
                                : courtroomRecordingCounts[room.courtroom_name]
                                    ?.total || 0}{" "}
                              recordings
                            </span>
                          </button>
                        ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t bg-white">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCourtsPage((p) => Math.max(1, p - 1))}
                  disabled={courtsPage === 1}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {courtsPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCourtsPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={courtsPage === totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Recordings List */}
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold">
                {selectedCourtroom
                  ? `Recordings - ${selectedCourt} / ${selectedCourtroom}`
                  : selectedCourt
                  ? `Recordings - ${selectedCourt}`
                  : "All Recordings"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Showing {offset + 1} to {Math.min(offset + pageSize, total)} of{" "}
                {total} recordings
                {selectedCourt && !selectedCourtroom && (
                  <span> in {selectedCourt}</span>
                )}
                {selectedCourtroom && (
                  <span>
                    {" "}
                    in {selectedCourt} / {selectedCourtroom}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {(selectedCourt || selectedCourtroom) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCourt(null);
                    setSelectedCourtroom(null);
                  }}>
                  Clear Court Filter
                </Button>
              )}
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setOffset(0);
                }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Items per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
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
              </div>
            </div>
          </div>

          {/* Recordings Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <div className="flex items-center gap-4">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search recordings..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal w-[260px]",
                        !dateRange.from &&
                          !dateRange.to &&
                          "text-muted-foreground"
                      )}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={{
                        from: dateRange.from,
                        to: dateRange.to,
                      }}
                      onSelect={(range) => {
                        setDateRange({
                          from: range?.from,
                          to: range?.to,
                        });
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Recordings</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>

                {(dateRange.from ||
                  dateRange.to ||
                  statusFilter !== "all" ||
                  searchQuery) && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDateRange({ from: undefined, to: undefined });
                      setStatusFilter("all");
                      setSearchQuery("");
                    }}>
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
            <div className="p-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : recordings.length === 0 ? (
                <div className="flex justify-center py-8">
                  <p className="text-muted-foreground">No recordings found</p>
                </div>
              ) : (
                <RecordingList
                  recordings={filteredRecordings}
                  pageSize={pageSize}
                  courts={courts}
                  courtrooms={courtrooms}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

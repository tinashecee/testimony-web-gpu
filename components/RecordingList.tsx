"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn, formatDuration, formatFileSize, getCourtNameForRecording } from "@/lib/utils";
import { MoreVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addDays, startOfDay, endOfDay, subDays } from "date-fns";
import { type Recording, type Court, type Courtroom } from "@/services/api";
import { recordingsApi } from "@/services/api";

interface RecordingListProps {
  recordings: Recording[];
  pageSize: number;
  courts: Court[];
  courtrooms: Courtroom[];
}

type DateRangePreset = "today" | "7days" | "30days" | "90days" | "all";



export function RecordingList({ recordings, pageSize, courts, courtrooms }: RecordingListProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRangePreset, setDateRangePreset] =
    useState<DateRangePreset>("7days");

  const getDateRange = (preset: DateRangePreset) => {
    const today = new Date();
    switch (preset) {
      case "today":
        return {
          from: startOfDay(today),
          to: endOfDay(today),
        };
      case "7days":
        return {
          from: startOfDay(subDays(today, 7)),
          to: endOfDay(today),
        };
      case "30days":
        return {
          from: startOfDay(subDays(today, 30)),
          to: endOfDay(today),
        };
      case "90days":
        return {
          from: startOfDay(subDays(today, 90)),
          to: endOfDay(today),
        };
      case "all":
        return {
          from: undefined,
          to: undefined,
        };
    }
  };

  const filteredRecordings = useMemo(() => {
    return recordings
      .filter((recording) => {
        if (dateRangePreset === "all") return true;

        const recordingDate = new Date(recording.date_stamp);
        const range = getDateRange(dateRangePreset);
        return recordingDate >= range.from! && recordingDate <= range.to!;
      })
      // Sort by date_stamp in descending order (most recent first)
      .sort((a, b) => {
        return new Date(b.date_stamp).getTime() - new Date(a.date_stamp).getTime();
      });
  }, [recordings, dateRangePreset]);

  const paginatedRecordings = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRecordings.slice(startIndex, startIndex + pageSize);
  }, [filteredRecordings, currentPage, pageSize]);

  return (
    <div>
      {/* Date Range Filter */}
      <div className="mb-4 flex items-center justify-between">
        <Select
          value={dateRangePreset}
          onValueChange={(value: DateRangePreset) => setDateRangePreset(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>

        <div className="text-sm text-muted-foreground">
          {dateRangePreset !== "all" && (
            <>
              {getDateRange(dateRangePreset).from?.toLocaleDateString()} -{" "}
              {getDateRange(dateRangePreset).to?.toLocaleDateString()}
            </>
          )}
        </div>
      </div>

      <div className="h-full bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Recent Recordings</h2>
        </div>

        <div className="divide-y">
          {paginatedRecordings.map((recording) => (
            <motion.div
              key={recording.id}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer relative group"
              whileHover={{ scale: 1.005 }}
              layout
              onClick={() => router.push(`/recordings/${recording.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Title and Case Number */}
                  <div>
                    <h3 className="text-sm font-medium">{recording.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Case Number: {recording.case_number}
                    </p>
                  </div>

                  {/* Judge and Court Details */}
                  <div className="text-sm">
                    <p>Judge: {recording.judge_name}</p>
                    <p>Court: {getCourtNameForRecording(recording, courts, courtrooms)}</p>
                    <p>Courtroom: {recording.courtroom}</p>
                  </div>

                  {/* Notes */}
                  {recording.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {recording.notes}
                    </p>
                  )}

                  {/* Recording Details */}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>
                      {new Date(recording.date_stamp).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>Duration: {formatDuration(recording.duration)}</span>
                    <span>•</span>
                    <span>Size: {formatFileSize(recording.size)}</span>
                  </div>
                </div>

                {/* Optional: Add a visual indicator for clickable row */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between p-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredRecordings.length)} of{" "}
            {filteredRecordings.length} recordings
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) =>
                  Math.min(
                    Math.ceil(filteredRecordings.length / pageSize),
                    prev + 1
                  )
                )
              }
              disabled={
                currentPage === Math.ceil(filteredRecordings.length / pageSize)
              }>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

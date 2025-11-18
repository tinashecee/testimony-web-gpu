"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  FileAudio, 
  Search, 
  Download, 
  User,
  Clock,
  Activity,
  TrendingUp,
  AlertTriangle,
  Eye,
  Trash2
} from "lucide-react"
import { AuditLog } from "@/services/auditService"
import { toast } from "sonner"

interface RecordingReportProps {
  auditLogs: AuditLog[]
  dateRange: { from: Date | undefined; to: Date | undefined }
  isLoading: boolean
}

interface RecordingActivity {
  recordingId: string
  totalEvents: number
  lastActivity: string
  firstActivity: string
  actions: Record<string, number>
  users: Set<string>
  viewCount: number
  deleteCount: number
}

export function RecordingReport({ auditLogs, dateRange, isLoading }: RecordingReportProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<keyof RecordingActivity>("totalEvents")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const recordingActivityData = useMemo(() => {
    const recordingMap = new Map<string, RecordingActivity>()

    // Filter logs related to recordings
    const recordingLogs = auditLogs.filter(log => 
      log.category === 'recording_management' || 
      log.resource.includes('Recording ID:') ||
      log.action.includes('Recording')
    )

    recordingLogs.forEach(log => {
      // Extract recording ID from resource or details
      let recordingId = "Unknown"
      if (log.resource.includes('Recording ID:')) {
        recordingId = log.resource.split('Recording ID:')[1]?.trim() || "Unknown"
      } else if (log.details.includes('recording')) {
        // Try to extract ID from details
        const idMatch = log.details.match(/recording[:\s]+([a-zA-Z0-9-_]+)/i)
        if (idMatch) {
          recordingId = idMatch[1]
        }
      }

      if (!recordingMap.has(recordingId)) {
        recordingMap.set(recordingId, {
          recordingId,
          totalEvents: 0,
          lastActivity: log.timestamp,
          firstActivity: log.timestamp,
          actions: {},
          users: new Set(),
          viewCount: 0,
          deleteCount: 0
        })
      }

      const recordingData = recordingMap.get(recordingId)!
      recordingData.totalEvents++
      recordingData.users.add(log.user)
      
      // Update activity times
      if (new Date(log.timestamp) > new Date(recordingData.lastActivity)) {
        recordingData.lastActivity = log.timestamp
      }
      if (new Date(log.timestamp) < new Date(recordingData.firstActivity)) {
        recordingData.firstActivity = log.timestamp
      }

      // Count actions
      recordingData.actions[log.action] = (recordingData.actions[log.action] || 0) + 1
      
      // Count specific actions
      if (log.action.toLowerCase().includes('view')) {
        recordingData.viewCount++
      }
      if (log.action.toLowerCase().includes('delete')) {
        recordingData.deleteCount++
      }
    })

    // Convert Set to Array for serialization
    return Array.from(recordingMap.values()).map(recording => ({
      ...recording,
      users: Array.from(recording.users)
    }))
  }, [auditLogs])

  const filteredAndSortedRecordings = useMemo(() => {
    let filtered = recordingActivityData.filter(recording => 
      recording.recordingId.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Sort the filtered results
    filtered.sort((a, b) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]
      
      if (sortBy === "lastActivity" || sortBy === "firstActivity") {
        const aDate = new Date(aValue as string)
        const bDate = new Date(bValue as string)
        return sortOrder === "asc" ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime()
      }
      
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue
      }
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      return 0
    })

    return filtered
  }, [recordingActivityData, searchTerm, sortBy, sortOrder])

  const handleExport = async () => {
    try {
      const csvContent = [
        ["Recording ID", "Total Events", "First Activity", "Last Activity", "View Count", "Delete Count", "Unique Users", "Actions"],
        ...filteredAndSortedRecordings.map(recording => [
          recording.recordingId,
          recording.totalEvents.toString(),
          new Date(recording.firstActivity).toLocaleString(),
          new Date(recording.lastActivity).toLocaleString(),
          recording.viewCount.toString(),
          recording.deleteCount.toString(),
          recording.users.length.toString(),
          `"${Object.entries(recording.actions).map(([action, count]) => `${action}: ${count}`).join(', ')}"`
        ])
      ].map(row => row.join(",")).join("\n")

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recording-activity-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success("Recording activity report exported successfully")
    } catch (error) {
      console.error("Failed to export recording activity report:", error)
      toast.error("Failed to export recording activity report")
    }
  }

  const getTopAction = (actions: Record<string, number>) => {
    return Object.entries(actions).reduce((a, b) => actions[a[0]] > actions[b[0]] ? a : b, ["", 0])
  }

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileAudio className="w-5 h-5" />
            Recording Activity Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search recordings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleExport} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recording Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileAudio className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{filteredAndSortedRecordings.length}</p>
                <p className="text-sm text-muted-foreground">Active Recordings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {filteredAndSortedRecordings.reduce((sum, recording) => sum + recording.viewCount, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {filteredAndSortedRecordings.reduce((sum, recording) => sum + recording.totalEvents, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">
                  {filteredAndSortedRecordings.reduce((sum, recording) => sum + recording.deleteCount, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Deletions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recording Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileAudio className="w-5 h-5" />
            Recording Activity Details ({filteredAndSortedRecordings.length} recordings)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSortBy("recordingId")
                      setSortOrder(sortBy === "recordingId" && sortOrder === "desc" ? "asc" : "desc")
                    }}
                  >
                    Recording ID
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSortBy("totalEvents")
                      setSortOrder(sortBy === "totalEvents" && sortOrder === "desc" ? "asc" : "desc")
                    }}
                  >
                    Total Events
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSortBy("lastActivity")
                      setSortOrder(sortBy === "lastActivity" && sortOrder === "desc" ? "asc" : "desc")
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Last Activity
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSortBy("viewCount")
                      setSortOrder(sortBy === "viewCount" && sortOrder === "desc" ? "asc" : "desc")
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Views
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSortBy("deleteCount")
                      setSortOrder(sortBy === "deleteCount" && sortOrder === "desc" ? "asc" : "desc")
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      Deletions
                    </div>
                  </TableHead>
                  <TableHead>Unique Users</TableHead>
                  <TableHead>Top Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Loading recording activity data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAndSortedRecordings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No recording activity found for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedRecordings.map((recording) => {
                    const topAction = getTopAction(recording.actions)
                    
                    return (
                      <TableRow key={recording.recordingId}>
                        <TableCell className="font-mono text-sm font-medium">
                          {recording.recordingId}
                        </TableCell>
                        <TableCell>{recording.totalEvents}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {new Date(recording.lastActivity).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {recording.viewCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={recording.deleteCount > 0 ? "destructive" : "outline"}>
                            {recording.deleteCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {recording.users.length} users
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {topAction[0]} ({topAction[1]})
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

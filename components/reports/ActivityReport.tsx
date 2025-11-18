"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Activity, 
  Search, 
  Download, 
  Filter,
  Clock,
  User,
  Shield,
  FileText
} from "lucide-react"
import { AuditLog } from "@/services/auditService"
import { toast } from "sonner"

interface ActivityReportProps {
  auditLogs: AuditLog[]
  dateRange: { from: Date | undefined; to: Date | undefined }
  isLoading: boolean
}

export function ActivityReport({ auditLogs, dateRange, isLoading }: ActivityReportProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<keyof AuditLog>("timestamp")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(50)

  const filteredAndSortedLogs = useMemo(() => {
    let filtered = auditLogs.filter(log => {
      const matchesSearch = 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = categoryFilter === "all" || log.category === categoryFilter
      const matchesSeverity = severityFilter === "all" || log.severity === severityFilter
      
      return matchesSearch && matchesCategory && matchesSeverity
    })

    // Sort the filtered results
    filtered.sort((a, b) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]
      
      if (sortBy === "timestamp") {
        const aDate = new Date(aValue as string)
        const bDate = new Date(bValue as string)
        return sortOrder === "asc" ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime()
      }
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      return 0
    })

    return filtered
  }, [auditLogs, searchTerm, categoryFilter, severityFilter, sortBy, sortOrder])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredAndSortedLogs.length / pageSize)), [filteredAndSortedLogs.length, pageSize])
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredAndSortedLogs.slice(start, start + pageSize)
  }, [filteredAndSortedLogs, currentPage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, severityFilter, sortBy, sortOrder])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive"
      case "high": return "destructive"
      case "medium": return "secondary"
      case "low": return "outline"
      default: return "outline"
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "authentication": return <Shield className="w-4 h-4" />
      case "user_management": return <User className="w-4 h-4" />
      case "recording_management": return <FileText className="w-4 h-4" />
      case "system_config": return <Activity className="w-4 h-4" />
      case "license_management": return <Shield className="w-4 h-4" />
      case "data_access": return <FileText className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const handleExport = async () => {
    try {
      const csvContent = [
        ["Timestamp", "User", "Action", "Resource", "Details", "Severity", "Category", "IP Address"],
        ...filteredAndSortedLogs.map(log => [
          new Date(log.timestamp).toLocaleString(),
          log.user,
          log.action,
          log.resource,
          `"${log.details}"`,
          log.severity,
          log.category,
          log.ipAddress
        ])
      ].map(row => row.join(",")).join("\n")

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `activity-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success("Activity report exported successfully")
    } catch (error) {
      console.error("Failed to export activity report:", error)
      toast.error("Failed to export activity report")
    }
  }

  const categories = Array.from(new Set(auditLogs.map(log => log.category).filter(category => category && category.trim() !== "")))
  const severities = Array.from(new Set(auditLogs.map(log => log.severity).filter(severity => severity && severity.trim() !== "")))

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {severities.map(severity => (
                  <SelectItem key={severity} value={severity}>
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button onClick={handleExport} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{filteredAndSortedLogs.length}</p>
                <p className="text-sm text-muted-foreground">Filtered Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {new Set(filteredAndSortedLogs.map(log => log.user)).size}
                </p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {filteredAndSortedLogs.filter(log => log.severity === 'critical' || log.severity === 'high').length}
                </p>
                <p className="text-sm text-muted-foreground">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Log ({filteredAndSortedLogs.length} events)
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
                      setSortBy("timestamp")
                      setSortOrder(sortBy === "timestamp" && sortOrder === "desc" ? "asc" : "desc")
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Timestamp
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSortBy("user")
                      setSortOrder(sortBy === "user" && sortOrder === "desc" ? "asc" : "desc")
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      User
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSortBy("action")
                      setSortOrder(sortBy === "action" && sortOrder === "desc" ? "asc" : "desc")
                    }}
                  >
                    Action
                  </TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSortBy("severity")
                      setSortOrder(sortBy === "severity" && sortOrder === "desc" ? "asc" : "desc")
                    }}
                  >
                    Severity
                  </TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Loading activity data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAndSortedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No activity found for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">{log.user}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={log.resource}>
                        {log.resource}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate" title={log.details}>
                        {log.details}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(log.severity)}>
                          {log.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(log.category)}
                          <span className="text-sm">
                            {log.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + (paginatedLogs.length > 0 ? 1 : 0)}–{Math.min(currentPage * pageSize, filteredAndSortedLogs.length)} of {filteredAndSortedLogs.length} logs
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span>Rows per page</span>
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button className="border rounded px-2 py-1 text-sm disabled:opacity-50" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</button>
                <span className="text-sm">Page {currentPage} / {totalPages}</span>
                <button className="border rounded px-2 py-1 text-sm disabled:opacity-50" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next</button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

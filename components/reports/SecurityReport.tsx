"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Shield, 
  Search, 
  Download, 
  User,
  Clock,
  AlertTriangle,
  Lock,
  Key,
  Eye,
  Ban
} from "lucide-react"
import { AuditLog } from "@/services/auditService"
import { toast } from "sonner"

interface SecurityReportProps {
  auditLogs: AuditLog[]
  dateRange: { from: Date | undefined; to: Date | undefined }
  isLoading: boolean
}

export function SecurityReport({ auditLogs, dateRange, isLoading }: SecurityReportProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  const securityLogs = useMemo(() => {
    return auditLogs.filter(log => 
      log.category === 'authentication' || 
      log.severity === 'critical' || 
      log.severity === 'high' ||
      log.action.toLowerCase().includes('login') ||
      log.action.toLowerCase().includes('logout') ||
      log.action.toLowerCase().includes('failed') ||
      log.action.toLowerCase().includes('unauthorized') ||
      log.action.toLowerCase().includes('access') ||
      log.action.toLowerCase().includes('permission')
    )
  }, [auditLogs])

  const filteredSecurityLogs = useMemo(() => {
    return securityLogs.filter(log => {
      const matchesSearch = 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesSeverity = severityFilter === "all" || log.severity === severityFilter
      const matchesCategory = categoryFilter === "all" || log.category === categoryFilter
      
      return matchesSearch && matchesSeverity && matchesCategory
    })
  }, [securityLogs, searchTerm, severityFilter, categoryFilter])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive"
      case "high": return "destructive"
      case "medium": return "secondary"
      case "low": return "outline"
      default: return "outline"
    }
  }

  const getSecurityIcon = (action: string) => {
    const actionLower = action.toLowerCase()
    if (actionLower.includes('login')) return <Lock className="w-4 h-4" />
    if (actionLower.includes('logout')) return <Key className="w-4 h-4" />
    if (actionLower.includes('failed')) return <Ban className="w-4 h-4" />
    if (actionLower.includes('access')) return <Eye className="w-4 h-4" />
    return <Shield className="w-4 h-4" />
  }

  const handleExport = async () => {
    try {
      const csvContent = [
        ["Timestamp", "User", "Action", "Resource", "Details", "Severity", "Category", "IP Address", "User Agent"],
        ...filteredSecurityLogs.map(log => [
          new Date(log.timestamp).toLocaleString(),
          log.user,
          log.action,
          log.resource,
          `"${log.details}"`,
          log.severity,
          log.category,
          log.ipAddress,
          `"${log.userAgent}"`
        ])
      ].map(row => row.join(",")).join("\n")

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `security-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success("Security report exported successfully")
    } catch (error) {
      console.error("Failed to export security report:", error)
      toast.error("Failed to export security report")
    }
  }

  const getSecurityStats = () => {
    const totalSecurityEvents = filteredSecurityLogs.length
    const criticalEvents = filteredSecurityLogs.filter(log => log.severity === 'critical').length
    const highSeverityEvents = filteredSecurityLogs.filter(log => log.severity === 'high').length
    const failedLogins = filteredSecurityLogs.filter(log => 
      log.action.toLowerCase().includes('failed') || 
      log.action.toLowerCase().includes('unauthorized')
    ).length
    const uniqueUsers = new Set(filteredSecurityLogs.map(log => log.user)).size

    return {
      totalSecurityEvents,
      criticalEvents,
      highSeverityEvents,
      failedLogins,
      uniqueUsers
    }
  }

  const stats = getSecurityStats()
  const severities = Array.from(new Set(securityLogs.map(log => log.severity).filter(severity => severity && severity.trim() !== "")))
  const categories = Array.from(new Set(securityLogs.map(log => log.category).filter(category => category && category.trim() !== "")))

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search security events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
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
            
            <Button onClick={handleExport} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.totalSecurityEvents}</p>
                <p className="text-sm text-muted-foreground">Security Events</p>
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
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{stats.highSeverityEvents}</p>
                <p className="text-sm text-muted-foreground">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.failedLogins}</p>
                <p className="text-sm text-muted-foreground">Failed Logins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
                <p className="text-sm text-muted-foreground">Users Involved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Events ({filteredSecurityLogs.length} events)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Timestamp
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      User
                    </div>
                  </TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Loading security data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredSecurityLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No security events found for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSecurityLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">{log.user}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSecurityIcon(log.action)}
                          <span>{log.action}</span>
                        </div>
                      </TableCell>
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
                        <Badge variant="outline">
                          {log.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.ipAddress}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  Download, 
  Activity,
  Users,
  FileAudio,
  Shield,
  Clock,
  BarChart3,
  PieChart,
  AlertTriangle
} from "lucide-react"
import { AuditLog } from "@/services/auditService"
import { toast } from "sonner"

interface SystemMetricsReportProps {
  auditLogs: AuditLog[]
  dateRange: { from: Date | undefined; to: Date | undefined }
  isLoading: boolean
}

interface SystemMetrics {
  totalEvents: number
  uniqueUsers: number
  eventsByCategory: Record<string, number>
  eventsBySeverity: Record<string, number>
  eventsByHour: Record<number, number>
  eventsByDay: Record<string, number>
  averageEventsPerUser: number
  peakActivityHour: number
  mostActiveUser: string
  mostActiveCategory: string
}

export function SystemMetricsReport({ auditLogs, dateRange, isLoading }: SystemMetricsReportProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>("overview")

  const systemMetrics = useMemo(() => {
    const metrics: SystemMetrics = {
      totalEvents: auditLogs.length,
      uniqueUsers: 0,
      eventsByCategory: {},
      eventsBySeverity: {},
      eventsByHour: {},
      eventsByDay: {},
      averageEventsPerUser: 0,
      peakActivityHour: 0,
      mostActiveUser: "",
      mostActiveCategory: ""
    }

    if (auditLogs.length === 0) return metrics

    const userCounts: Record<string, number> = {}
    const categoryCounts: Record<string, number> = {}
    const severityCounts: Record<string, number> = {}
    const hourCounts: Record<number, number> = {}
    const dayCounts: Record<string, number> = {}

    auditLogs.forEach(log => {
      // Count users
      userCounts[log.user] = (userCounts[log.user] || 0) + 1
      
      // Count categories
      categoryCounts[log.category] = (categoryCounts[log.category] || 0) + 1
      
      // Count severities
      severityCounts[log.severity] = (severityCounts[log.severity] || 0) + 1
      
      // Count by hour
      const hour = new Date(log.timestamp).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
      
      // Count by day
      const day = new Date(log.timestamp).toDateString()
      dayCounts[day] = (dayCounts[day] || 0) + 1
    })

    metrics.uniqueUsers = Object.keys(userCounts).length
    metrics.eventsByCategory = categoryCounts
    metrics.eventsBySeverity = severityCounts
    metrics.eventsByHour = hourCounts
    metrics.eventsByDay = dayCounts
    metrics.averageEventsPerUser = metrics.totalEvents / metrics.uniqueUsers

    // Find peak activity hour
    metrics.peakActivityHour = Object.entries(hourCounts).reduce((a, b) => 
      hourCounts[a[0]] > hourCounts[b[0]] ? a : b, ["0", 0]
    )[0] as unknown as number

    // Find most active user
    metrics.mostActiveUser = Object.entries(userCounts).reduce((a, b) => 
      userCounts[a[0]] > userCounts[b[0]] ? a : b, ["", 0]
    )[0]

    // Find most active category
    metrics.mostActiveCategory = Object.entries(categoryCounts).reduce((a, b) => 
      categoryCounts[a[0]] > categoryCounts[b[0]] ? a : b, ["", 0]
    )[0]

    return metrics
  }, [auditLogs])

  const handleExport = async () => {
    try {
      const csvContent = [
        ["Metric", "Value"],
        ["Total Events", systemMetrics.totalEvents.toString()],
        ["Unique Users", systemMetrics.uniqueUsers.toString()],
        ["Average Events per User", systemMetrics.averageEventsPerUser.toFixed(2)],
        ["Peak Activity Hour", `${systemMetrics.peakActivityHour}:00`],
        ["Most Active User", systemMetrics.mostActiveUser],
        ["Most Active Category", systemMetrics.mostActiveCategory],
        ["", ""],
        ["Category Breakdown", ""],
        ...Object.entries(systemMetrics.eventsByCategory).map(([category, count]) => [
          category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          count.toString()
        ]),
        ["", ""],
        ["Severity Breakdown", ""],
        ...Object.entries(systemMetrics.eventsBySeverity).map(([severity, count]) => [
          severity.charAt(0).toUpperCase() + severity.slice(1),
          count.toString()
        ])
      ].map(row => row.join(",")).join("\n")

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `system-metrics-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success("System metrics report exported successfully")
    } catch (error) {
      console.error("Failed to export system metrics report:", error)
      toast.error("Failed to export system metrics report")
    }
  }

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
      case "user_management": return <Users className="w-4 h-4" />
      case "recording_management": return <FileAudio className="w-4 h-4" />
      case "system_config": return <Activity className="w-4 h-4" />
      case "license_management": return <Shield className="w-4 h-4" />
      case "data_access": return <FileAudio className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            System Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end">
            <Button onClick={handleExport} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Metrics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{systemMetrics.totalEvents}</p>
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
                <p className="text-2xl font-bold">{systemMetrics.uniqueUsers}</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{systemMetrics.averageEventsPerUser.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Avg Events/User</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{systemMetrics.peakActivityHour}:00</p>
                <p className="text-sm text-muted-foreground">Peak Hour</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Events by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(systemMetrics.eventsByCategory)
                .sort(([,a], [,b]) => b - a)
                .map(([category, count]) => {
                  const percentage = ((count / systemMetrics.totalEvents) * 100).toFixed(1)
                  return (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(category)}
                        <span className="text-sm font-medium">
                          {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {count} ({percentage}%)
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        {/* Events by Severity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Events by Severity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(systemMetrics.eventsBySeverity)
                .sort(([,a], [,b]) => b - a)
                .map(([severity, count]) => {
                  const percentage = ((count / systemMetrics.totalEvents) * 100).toFixed(1)
                  return (
                    <div key={severity} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(severity)}>
                          {severity.charAt(0).toUpperCase() + severity.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {count} ({percentage}%)
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Activity Pattern */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Hourly Activity Pattern
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-2">
            {Array.from({ length: 24 }, (_, hour) => {
              const count = systemMetrics.eventsByHour[hour] || 0
              const maxCount = Math.max(...Object.values(systemMetrics.eventsByHour))
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0
              
              return (
                <div key={hour} className="flex flex-col items-center gap-1">
                  <div className="text-xs text-muted-foreground">{hour}</div>
                  <div 
                    className="w-full bg-primary rounded-t-sm min-h-[4px]"
                    style={{ height: `${Math.max(height, 4)}px` }}
                    title={`${hour}:00 - ${count} events`}
                  />
                  <div className="text-xs text-muted-foreground">{count}</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Users and Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Most Active User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold">{systemMetrics.mostActiveUser}</div>
              <div className="text-sm text-muted-foreground">
                Most active user in the selected period
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Most Active Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold">
                {systemMetrics.mostActiveCategory.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
              <div className="text-sm text-muted-foreground">
                Most frequent activity type
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Users, 
  Search, 
  Download, 
  User,
  Clock,
  Activity,
  TrendingUp,
  AlertTriangle
} from "lucide-react"
import { AuditLog } from "@/services/auditService"
import { toast } from "sonner"

interface UserActivityReportProps {
  auditLogs: AuditLog[]
  dateRange: { from: Date | undefined; to: Date | undefined }
  isLoading: boolean
}

interface UserActivity {
  user: string
  totalEvents: number
  lastActivity: string
  firstActivity: string
  categories: Record<string, number>
  severities: Record<string, number>
  actions: string[]
}

export function UserActivityReport({ auditLogs, dateRange, isLoading }: UserActivityReportProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<keyof UserActivity>("totalEvents")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const userActivityData = useMemo(() => {
    const userMap = new Map<string, UserActivity>()

    auditLogs.forEach(log => {
      if (!userMap.has(log.user)) {
        userMap.set(log.user, {
          user: log.user,
          totalEvents: 0,
          lastActivity: log.timestamp,
          firstActivity: log.timestamp,
          categories: {},
          severities: {},
          actions: []
        })
      }

      const userData = userMap.get(log.user)!
      userData.totalEvents++
      
      // Update activity times
      if (new Date(log.timestamp) > new Date(userData.lastActivity)) {
        userData.lastActivity = log.timestamp
      }
      if (new Date(log.timestamp) < new Date(userData.firstActivity)) {
        userData.firstActivity = log.timestamp
      }

      // Count categories
      userData.categories[log.category] = (userData.categories[log.category] || 0) + 1
      
      // Count severities
      userData.severities[log.severity] = (userData.severities[log.severity] || 0) + 1
      
      // Track unique actions
      if (!userData.actions.includes(log.action)) {
        userData.actions.push(log.action)
      }
    })

    return Array.from(userMap.values())
  }, [auditLogs])

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = userActivityData.filter(user => 
      user.user.toLowerCase().includes(searchTerm.toLowerCase())
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
  }, [userActivityData, searchTerm, sortBy, sortOrder])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive"
      case "high": return "destructive"
      case "medium": return "secondary"
      case "low": return "outline"
      default: return "outline"
    }
  }

  const handleExport = async () => {
    try {
      const csvContent = [
        ["User", "Total Events", "First Activity", "Last Activity", "Categories", "Severities", "Unique Actions"],
        ...filteredAndSortedUsers.map(user => [
          user.user,
          user.totalEvents.toString(),
          new Date(user.firstActivity).toLocaleString(),
          new Date(user.lastActivity).toLocaleString(),
          `"${Object.entries(user.categories).map(([cat, count]) => `${cat}: ${count}`).join(', ')}"`,
          `"${Object.entries(user.severities).map(([sev, count]) => `${sev}: ${count}`).join(', ')}"`,
          `"${user.actions.join(', ')}"`
        ])
      ].map(row => row.join(",")).join("\n")

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `user-activity-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success("User activity report exported successfully")
    } catch (error) {
      console.error("Failed to export user activity report:", error)
      toast.error("Failed to export user activity report")
    }
  }

  const getTopCategory = (categories: Record<string, number>) => {
    return Object.entries(categories).reduce((a, b) => categories[a[0]] > categories[b[0]] ? a : b, ["", 0])
  }

  const getTopSeverity = (severities: Record<string, number>) => {
    return Object.entries(severities).reduce((a, b) => severities[a[0]] > severities[b[0]] ? a : b, ["", 0])
  }

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Activity Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
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

      {/* User Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{filteredAndSortedUsers.length}</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {filteredAndSortedUsers.reduce((sum, user) => sum + user.totalEvents, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {filteredAndSortedUsers.length > 0 
                    ? Math.round(filteredAndSortedUsers.reduce((sum, user) => sum + user.totalEvents, 0) / filteredAndSortedUsers.length)
                    : 0
                  }
                </p>
                <p className="text-sm text-muted-foreground">Avg Events/User</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">
                  {filteredAndSortedUsers.filter(user => 
                    user.severities.critical > 0 || user.severities.high > 0
                  ).length}
                </p>
                <p className="text-sm text-muted-foreground">High Risk Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Activity Details ({filteredAndSortedUsers.length} users)
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
                  <TableHead>Top Category</TableHead>
                  <TableHead>Top Severity</TableHead>
                  <TableHead>Unique Actions</TableHead>
                  <TableHead>Risk Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Loading user activity data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAndSortedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No user activity found for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedUsers.map((user) => {
                    const topCategory = getTopCategory(user.categories)
                    const topSeverity = getTopSeverity(user.severities)
                    const hasHighRisk = user.severities.critical > 0 || user.severities.high > 0
                    
                    return (
                      <TableRow key={user.user}>
                        <TableCell className="font-medium">{user.user}</TableCell>
                        <TableCell>{user.totalEvents}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {new Date(user.lastActivity).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {topCategory[0].replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} ({topCategory[1]})
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverityColor(topSeverity[0])}>
                            {topSeverity[0]} ({topSeverity[1]})
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {user.actions.length} actions
                        </TableCell>
                        <TableCell>
                          <Badge variant={hasHighRisk ? "destructive" : "outline"}>
                            {hasHighRisk ? "High Risk" : "Normal"}
                          </Badge>
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

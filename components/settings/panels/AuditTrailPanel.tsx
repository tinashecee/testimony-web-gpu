import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useState, useMemo, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Search, Filter, Calendar, User, Activity, Download, RefreshCw } from "lucide-react"
import { auditService, type AuditLog } from "@/services/auditService"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

// Initialize audit service when component mounts

export function AuditTrailPanel() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<AuditLog['category'] | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<AuditLog['severity'] | 'all'>('all')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    user: '',
    action: '',
    resource: '',
  })
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  // Initialize audit service and load logs
  useEffect(() => {
    const initializeAudit = async () => {
      try {
        await auditService.initialize()
        await loadAuditLogs()
      } catch (error) {
        console.error('Failed to initialize audit service:', error)
        toast.error('Failed to initialize audit service')
      } finally {
        setLoading(false)
      }
    }

    initializeAudit()
  }, [])

  // Reload logs when date range changes
  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      loadAuditLogs()
    }
  }, [dateRange])

  const loadAuditLogs = async () => {
    try {
      setLoading(true)
      const logs = await auditService.getAuditLogs({ 
        limit: 1000,
        startDate: dateRange.startDate ? new Date(dateRange.startDate).toISOString() : undefined,
        endDate: dateRange.endDate ? new Date(dateRange.endDate).toISOString() : undefined,
      })
      setAuditLogs(logs)
    } catch (error) {
      console.error('Failed to load audit logs:', error)
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  // Filter the audit logs based on search query and filters
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchesSearch = 
        log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter
      const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter

      const matchesFilters = 
        (!filters.user || log.user.toLowerCase().includes(filters.user.toLowerCase())) &&
        (!filters.action || log.action.toLowerCase().includes(filters.action.toLowerCase())) &&
        (!filters.resource || log.resource.toLowerCase().includes(filters.resource.toLowerCase()))

      return matchesSearch && matchesCategory && matchesSeverity && matchesFilters
    })
  }, [auditLogs, searchQuery, categoryFilter, severityFilter, filters])

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log)
    setIsDetailsDialogOpen(true)
  }

  const getSeverityBadge = (severity: AuditLog['severity']) => {
    const variants = {
      'low': 'secondary',
      'medium': 'default',
      'high': 'destructive',
      'critical': 'destructive'
    }
    return <Badge variant={variants[severity] as any}>{severity.toUpperCase()}</Badge>
  }

  const getCategoryBadge = (category: AuditLog['category']) => {
    const variants = {
      'authentication': 'outline',
      'data_access': 'secondary',
      'system_config': 'default',
      'license_management': 'destructive',
      'user_management': 'default',
      'recording_management': 'default'
    }
    return <Badge variant={variants[category] as any}>{category.replace('_', ' ').toUpperCase()}</Badge>
  }

  const TableHeadWithFilter = ({ 
    title, 
    filterKey 
  }: { 
    title: string
    filterKey: keyof typeof filters
  }) => (
    <TableHead className={title === 'Actions' ? 'text-right' : ''}>
      <div className="flex items-center gap-2">
        {title}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Filter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter {title}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Input
                placeholder={`Filter ${title}...`}
                value={filters[filterKey]}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  [filterKey]: e.target.value
                }))}
                className="h-8"
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TableHead>
  )

  const exportAuditLogs = async () => {
    try {
      const csvContent = await auditService.exportAuditLogs({
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        severity: severityFilter === 'all' ? undefined : severityFilter,
        user: filters.user || undefined,
        startDate: dateRange.startDate ? new Date(dateRange.startDate).toISOString() : undefined,
        endDate: dateRange.endDate ? new Date(dateRange.endDate).toISOString() : undefined,
      })

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('Audit logs exported successfully')
    } catch (error) {
      console.error('Failed to export audit logs:', error)
      toast.error('Failed to export audit logs')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Audit Trail</CardTitle>
            <div className="flex items-center gap-4">
              {/* Date Range Controls */}
              <div className="flex items-center gap-2">
                <Label htmlFor="start-date" className="text-sm font-medium">From:</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-[140px]"
                />
                <Label htmlFor="end-date" className="text-sm font-medium">To:</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-[140px]"
                />
              </div>

              {/* Refresh Button */}
              <Button 
                onClick={loadAuditLogs}
                variant="outline"
                className="gap-2"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              {/* Export Button */}
              <Button 
                onClick={exportAuditLogs}
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>

              {/* Category Filter */}
              <Select
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value as any)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="authentication">Authentication</SelectItem>
                  <SelectItem value="data_access">Data Access</SelectItem>
                  <SelectItem value="system_config">System Config</SelectItem>
                  <SelectItem value="license_management">License Management</SelectItem>
                  <SelectItem value="user_management">User Management</SelectItem>
                </SelectContent>
              </Select>

              {/* Severity Filter */}
              <Select
                value={severityFilter}
                onValueChange={(value) => setSeverityFilter(value as any)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search audit logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHeadWithFilter title="User" filterKey="user" />
                <TableHeadWithFilter title="Action" filterKey="action" />
                <TableHeadWithFilter title="Resource" filterKey="resource" />
                <TableHead>Severity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log, index) => (
                <TableRow key={log.id || `audit-log-${index}`}>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {log.user}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      {log.action}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {log.resource}
                  </TableCell>
                  <TableCell>
                    {getSeverityBadge(log.severity)}
                  </TableCell>
                  <TableCell>
                    {getCategoryBadge(log.category)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(log)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    Loading audit logs...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No audit logs found matching the filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Detailed information for audit log entry
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Timestamp</Label>
                  <p className="text-sm">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">User</Label>
                  <p className="text-sm">{selectedLog.user}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Action</Label>
                  <p className="text-sm">{selectedLog.action}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Resource</Label>
                  <p className="text-sm">{selectedLog.resource}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Severity</Label>
                  <div>{getSeverityBadge(selectedLog.severity)}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Category</Label>
                  <div>{getCategoryBadge(selectedLog.category)}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">IP Address</Label>
                  <p className="text-sm">{selectedLog.ipAddress}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">User Agent</Label>
                  <p className="text-sm text-xs bg-muted p-2 rounded">{selectedLog.userAgent}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Details</Label>
                <p className="text-sm bg-muted p-3 rounded">{selectedLog.details}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

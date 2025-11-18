"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  BarChart3, 
  Activity, 
  Users, 
  FileAudio, 
  FileText,
  Shield, 
  TrendingUp,
  ArrowRight
} from "lucide-react"
import { useRouter } from "next/navigation"

export function ReportsPanel() {
  const router = useRouter()

  const reportTypes = [
    {
      id: "activity",
      title: "Activity Report",
      description: "View detailed system activity logs and user actions",
      icon: Activity,
      color: "text-blue-600"
    },
    {
      id: "users",
      title: "User Activity Report",
      description: "Analyze user behavior and activity patterns",
      icon: Users,
      color: "text-green-600"
    },
    {
      id: "recordings",
      title: "Recording Report",
      description: "Track recording access, views, and management activities",
      icon: FileAudio,
      color: "text-purple-600"
    },
    {
      id: "transcripts",
      title: "Transcript Report",
      description: "Analyze transcript completion rates and content quality",
      icon: FileText,
      color: "text-indigo-600"
    },
    {
      id: "security",
      title: "Security Report",
      description: "Monitor security events, failed logins, and access violations",
      icon: Shield,
      color: "text-red-600"
    },
    {
      id: "metrics",
      title: "System Metrics",
      description: "View performance metrics and system usage statistics",
      icon: TrendingUp,
      color: "text-orange-600"
    }
  ]

  const handleViewReports = () => {
    router.push("/reports")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h2 className="text-2xl font-bold">System Reports</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Access comprehensive reports on system activity, user behavior, security events, 
          and performance metrics. All reports are available to administrators and super administrators.
        </p>
      </div>

      {/* Quick Access Button */}
      <div className="flex justify-center">
        <Button onClick={handleViewReports} size="lg" className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          View All Reports
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Report Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className={`p-2 rounded-lg bg-muted`}>
                  <report.icon className={`w-5 h-5 ${report.color}`} />
                </div>
                {report.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {report.description}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleViewReports}
                className="w-full"
              >
                View Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Report Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Data Analysis</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Real-time activity monitoring</li>
                <li>• User behavior analytics</li>
                <li>• Security event tracking</li>
                <li>• Performance metrics</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Export & Sharing</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• CSV export functionality</li>
                <li>• Date range filtering</li>
                <li>• Custom report generation</li>
                <li>• Scheduled report delivery</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access Information */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">Access Control</h4>
              <p className="text-sm text-blue-700 mt-1">
                Reports are restricted to administrators and super administrators only. 
                All report access is logged for security and compliance purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

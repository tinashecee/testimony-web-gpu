"use client"

import React from "react"
import Layout from "../../components/Layout"
import { RoleGuard } from "@/components/auth/RoleGuard"
import { ReportsDashboard } from "@/components/reports/ReportsDashboard"

export default function ReportsPage() {
  return (
    <Layout>
      <RoleGuard allowedRoles={['admin', 'super_admin']}>
        <div className="container mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">System Reports</h1>
            <p className="text-muted-foreground">
              View comprehensive reports on system activity, user behavior, and performance metrics.
            </p>
          </div>
          
          <ReportsDashboard />
        </div>
      </RoleGuard>
    </Layout>
  )
}

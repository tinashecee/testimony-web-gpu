import React from "react"
import { SettingsNav } from "../SettingsNav"
import { PageBreadcrumbs } from "../PageBreadcrumbs"

interface SettingsLayoutProps {
  children: React.ReactNode
  title: string
  description: string
}

export function SettingsLayout({
  children,
  title,
  description,
}: SettingsLayoutProps) {
  return (
    <div className="space-y-6 p-6 pb-16">
      <div className="mb-6">
        <PageBreadcrumbs />
      </div>
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="lg:w-1/5">
          <SettingsNav />
        </aside>
        <div className="flex-1 lg:max-w-2xl">{children}</div>
      </div>
    </div>
  )
} 
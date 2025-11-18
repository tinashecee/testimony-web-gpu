"use client"

import React from "react"
import { useState } from "react"
import Layout from "../../components/Layout"
import { 
  Users, 
  Key, 
  Building2, 
  ChevronRight,
  Activity,
  BarChart3
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SettingsPanel } from "@/components/settings/SettingsPanel"
import { RoleGuard } from "@/components/auth/RoleGuard"

interface SettingsSection {
  id: string
  name: string
  icon: React.ElementType
  description: string
}

const settingsSections: SettingsSection[] = [
  {
    id: "user-management",
    name: "User Management",
    icon: Users,
    description: "Manage user accounts, roles, and permissions"
  },
  {
    id: "license",
    name: "License Management",
    icon: Key,
    description: "View and manage system licenses"
  },
  {
    id: "audit-trail",
    name: "Audit Trail",
    icon: Activity,
    description: "View system activity and security logs"
  },
  {
    id: "reports",
    name: "System Reports",
    icon: BarChart3,
    description: "View comprehensive reports on system activity and performance"
  },
  {
    id: "courts",
    name: "Courts",
    icon: Building2,
    description: "Manage court locations and courtrooms"
  }
]

export default function SettingsPage() {
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const handleSectionClick = (sectionId: string) => {
    setSelectedSection(sectionId)
    setIsPanelOpen(true)
  }

  const handlePanelClose = () => {
    setIsPanelOpen(false)
    // Optionally delay clearing the selected section until after animation
    setTimeout(() => setSelectedSection(null), 300)
  }

  return (
    <Layout>
      <RoleGuard allowedRoles={['admin', 'super_admin']}>
        <div className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-8">Settings</h1>
          
          <div className="grid grid-cols-1 gap-4">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section.id)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors",
                  selectedSection === section.id && "ring-2 ring-ring"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-md bg-primary/10">
                    <section.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">{section.name}</h3>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>

          <SettingsPanel 
            section={selectedSection}
            isOpen={isPanelOpen}
            onClose={handlePanelClose}
          />
        </div>
      </RoleGuard>
    </Layout>
  )
}


import React from "react"
import { Users, Key, Database, Building2, HardDrive, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

const settingsNavItems = [
  {
    title: "User Management",
    href: "/settings/users",
    icon: Users,
  },
  {
    title: "License Management",
    href: "/settings/license",
    icon: Key,
  },
  {
    title: "Audit Trail",
    href: "/settings/audit-trail",
    icon: Activity,
  },
  {
    title: "Backup & Recovery",
    href: "/settings/backup",
    icon: Database,
  },
  {
    title: "Courts",
    href: "/settings/courts",
    icon: Building2,
  },
  {
    title: "Storage Analysis",
    href: "/settings/storage",
    icon: HardDrive,
  },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="grid gap-1">
      {settingsNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            pathname === item.href ? "bg-accent" : "transparent"
          )}
        >
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
        </Link>
      ))}
    </nav>
  )
} 
"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Home } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageBreadcrumbsProps {
  customBreadcrumbs?: BreadcrumbItem[]
  className?: string
}

export function PageBreadcrumbs({ customBreadcrumbs, className }: PageBreadcrumbsProps) {
  const pathname = usePathname()
  
  // Generate breadcrumbs based on pathname if no custom breadcrumbs provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (customBreadcrumbs) {
      return customBreadcrumbs
    }

    if (!pathname) {
      return [{ label: "Dashboard", href: "/" }]
    }

    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = [
      { label: "Dashboard", href: "/" }
    ]

    let currentPath = ""
    
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      
      // Handle specific routes
      switch (segment) {
        case "recordings":
          if (index === segments.length - 1) {
            breadcrumbs.push({ label: "Recordings" })
          } else {
            breadcrumbs.push({ label: "Recordings", href: "/recordings" })
          }
          break
        case "search":
          breadcrumbs.push({ label: "Search" })
          break
        case "settings":
          if (index === segments.length - 1) {
            breadcrumbs.push({ label: "Settings" })
          } else {
            breadcrumbs.push({ label: "Settings", href: "/settings" })
          }
          break
        case "users":
          if (segments[index - 1] === "settings") {
            breadcrumbs.push({ label: "User Management" })
          }
          break
        case "forgot-password":
          breadcrumbs.push({ label: "Forgot Password" })
          break
        default:
          // For dynamic routes like [id], show generic label
          if (segment.match(/^\d+$/)) {
            breadcrumbs.push({ label: "Recording Details" })
          } else {
            // Capitalize and format segment
            const label = segment.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')
            
            if (index === segments.length - 1) {
              breadcrumbs.push({ label })
            } else {
              breadcrumbs.push({ label, href: currentPath })
            }
          }
          break
      }
    })

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={index}>
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink asChild>
                  <Link href={item.href} className="flex items-center gap-1">
                    {index === 0 && <Home className="h-4 w-4" />}
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="flex items-center gap-1">
                  {index === 0 && <Home className="h-4 w-4" />}
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
} 
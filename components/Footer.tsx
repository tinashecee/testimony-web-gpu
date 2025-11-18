"use client"

import React, { useState, useEffect } from "react"

export function Footer() {
  const [currentYear, setCurrentYear] = useState<number | null>(null)

  useEffect(() => {
    setCurrentYear(new Date().getFullYear())
  }, [])

  return (
    <footer className="border-t py-4 px-6 bg-background">
      <div className="container mx-auto flex items-center justify-center text-sm text-muted-foreground">
        <p suppressHydrationWarning>
          Testimony Court Intelligence by Soxfort Solutions {currentYear || new Date().getFullYear()} &copy; registered to Judicial Service Commission | Zimbabwe
        </p>
      </div>
    </footer>
  )
} 
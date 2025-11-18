"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  FileText,
  Settings,
  LogOut,
  User,
  BarChart3,
} from "lucide-react";
import { Footer } from "./Footer";
import { toast } from "sonner";
import { recordingsApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { PageBreadcrumbs } from "./PageBreadcrumbs";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
const ProfileModal = dynamic(
  () => import("@/components/ProfileModal").then((m) => m.ProfileModal),
  {
    ssr: false,
    loading: () => null,
  }
);

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAdmin, loading, user, isSuperAdmin, refreshUser } = useAuth();

  // Add state for profile modal
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  // Debug logging (remove in production)
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🔍 Layout Debug Info:");
      console.log("- User:", user);
      console.log("- isAdmin:", isAdmin);
      console.log("- isSuperAdmin:", isSuperAdmin);
      console.log("- loading:", loading);
      console.log("- retryCount:", retryCount);
    }
  }, [user, isAdmin, isSuperAdmin, loading, retryCount]);

  // Handle cases where user is not identified but has a token
  React.useEffect(() => {
    if (!loading && !user && retryCount < 3) {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1];

      if (token) {
        console.log("🔍 User not identified but token exists, retrying...");
        setRetryCount((prev) => prev + 1);
        setTimeout(() => {
          refreshUser();
        }, 1000 * retryCount); // Exponential backoff
      }
    }
  }, [loading, user, retryCount, refreshUser]);

  // If after retries we still have no identified user, force logout to clear stale token
  React.useEffect(() => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    if (!loading && !user && token && retryCount >= 3) {
      console.log(
        "🔁 Max retries reached with token present but no user. Logging out..."
      );
      handleLogout();
    }
  }, [loading, user, retryCount]);

  // Define menu items based on user role
  const menuItems = useMemo(() => {
    const baseItems = [
      { name: "Dashboard", icon: Home, href: "/" },
      { name: "Recordings", icon: FileText, href: "/recordings" },
    ];

    // Show Reports/Transcripts to admin and magistrate roles; Settings only to admin/super_admin
    if (process.env.NODE_ENV === "development") {
      console.log(
        "🎯 Checking if should show admin menus. isAdmin:",
        isAdmin,
        "user role:",
        user?.role
      );
    }
    const magistrateRoles = new Set([
      "station_magistrate",
      "resident_magistrate",
      "provincial_magistrate",
      "regional_magistrate",
      "senior_regional_magistrate",
    ]);

    if (isAdmin) {
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Adding admin menus");
      }
      baseItems.push({ name: "Reports", icon: BarChart3, href: "/reports" });
      baseItems.push({
        name: "Transcripts",
        icon: FileText,
        href: "/transcripts",
      });
      baseItems.push({ name: "Settings", icon: Settings, href: "/settings" });
    } else if (
      user?.role &&
      (magistrateRoles.has(user.role) || user.role === "judge")
    ) {
      baseItems.push({ name: "Reports", icon: BarChart3, href: "/reports" });
      baseItems.push({
        name: "Transcripts",
        icon: FileText,
        href: "/transcripts",
      });
    } else if (process.env.NODE_ENV === "development") {
      console.log("❌ Not adding admin/magistrate menus");
    }

    return baseItems;
  }, [isAdmin, user?.role]);

  const handleLogout = async () => {
    try {
      await recordingsApi.logoutUser();
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Session ended", {
        description: "You have been logged out",
      });
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      super_admin: "Super Admin",
      admin: "Admin",
      court_recorder: "Court Recorder",
      registrar: "Registrar",
      judge: "Judge",
      station_magistrate: "Station Magistrate",
      resident_magistrate: "Resident Magistrate",
      provincial_magistrate: "Provincial Magistrate",
      regional_magistrate: "Regional Magistrate",
      senior_regional_magistrate: "Senior Regional Magistrate",
      clerk_of_court: "Clerk of Court",
      transcriber: "Transcriber",
      recording_supervisor: "Recording and Transcription Supervisor",
    };
    return roleMap[role] || role;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
      <div className="flex h-screen bg-gray-100">
        {/* Side Menu */}
        <aside className="w-64 bg-[#1B4D3E] flex flex-col relative shadow-xl transition-all duration-300">
          {/* Top Logo */}
          <div className="p-6 flex justify-center">
            <Image
              src="/logo.png"
              alt="JSC Logo"
              width={160}
              height={160}
              className="object-contain transition-transform duration-300 hover:scale-105"
              sizes="160px"
              unoptimized
            />
          </div>

          {/* Navigation */}
          <nav className="mt-8 flex-1">
            {loading ? (
              <div className="px-6 py-3 text-white/50">
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-6 bg-white/10 rounded transition-all duration-500"></div>
                  ))}
                </div>
              </div>
            ) : (
              menuItems.map((item, index) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-6 py-3 text-white hover:bg-white/10 transition-all duration-200 ease-in-out hover:translate-x-1 group ${
                    pathname === item.href
                      ? "bg-white/20 border-r-4 border-white"
                      : ""
                  }`}
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: loading
                      ? "none"
                      : "slideInLeft 0.3s ease-out forwards",
                  }}>
                  <item.icon className="w-5 h-5 mr-3 transition-transform duration-200 group-hover:scale-110" />
                  <span className="transition-all duration-200">
                    {item.name}
                  </span>
                </Link>
              ))
            )}
          </nav>

          {/* Bottom Section with Wave and Logo */}
          <div className="relative mt-auto">
            {/* Wave SVG */}
            <div className="absolute bottom-0 left-0 w-full">
              <svg
                viewBox="0 0 256 100"
                preserveAspectRatio="none"
                className="w-full h-32 transition-opacity duration-500 hover:opacity-80"
                style={{ transform: "scaleY(-1)" }}>
                <path
                  d="M0,0 C150,100 350,0 500,100 L500,00 L0,0 Z"
                  fill="rgba(66, 151, 111, 0.2)"></path>
              </svg>
            </div>

            {/* Testimony Logo */}
            <div className="relative p-6 flex flex-col items-center">
              <Image
                src="/testimony.png"
                alt="Testimony Logo"
                width={180}
                height={60}
                className="object-contain mb-4 transition-transform duration-300 hover:scale-105"
                style={{ height: "auto" }}
                unoptimized
              />
              {/* Removed Logout Button from Sidebar */}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Top Navigation Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-3 shadow-sm transition-all duration-300">
            <div className="flex justify-end items-center">
              {/* User Information */}
              <div className="flex items-center space-x-4">
                {loading ? (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <div className="animate-pulse flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-full animate-bounce"></div>
                      <div className="space-y-1">
                        <div className="w-20 h-3 bg-gray-200 rounded animate-pulse"></div>
                        <div
                          className="w-16 h-2 bg-gray-200 rounded animate-pulse"
                          style={{ animationDelay: "0.2s" }}></div>
                      </div>
                    </div>
                  </div>
                ) : user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center space-x-3 opacity-0 animate-[fadeInUp_0.5s_ease-out_forwards] focus:outline-none">
                        <div className="flex items-center justify-center w-8 h-8 bg-[#1B4D3E] text-white rounded-full transition-all duration-300 hover:scale-110 hover:shadow-lg cursor-pointer">
                          <User className="w-4 h-4 transition-transform duration-200" />
                        </div>
                        <div className="text-right transition-all duration-200">
                          <div className="text-sm font-medium text-gray-900 transition-colors duration-200 hover:text-[#1B4D3E]">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-500 transition-colors duration-200">
                            {getRoleDisplayName(user.role)} • {user.email}
                          </div>
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-gray-500">Not identified</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log("🔍 Manual refresh triggered");
                        refreshUser();
                      }}
                      className="text-xs">
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      className="text-xs">
                      Logout
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 p-8 animate-[fadeIn_0.4s_ease-out]">
            <div className="mb-6">
              <PageBreadcrumbs />
            </div>
            {children}
          </div>

          {/* Footer */}
          <Footer />
        </main>
      </div>
    </div>
  );
}

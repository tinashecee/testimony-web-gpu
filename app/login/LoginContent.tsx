"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { recordingsApi } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { auditLogger } from "@/services/auditService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader } from "lucide-react";

export default function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const router = useRouter();
  const { refreshUser } = useAuth();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const loginResponse = await recordingsApi.loginWebUser(email, password);
      console.log("🔍 Login successful, token received");
      auditLogger.login(email, true, "Successful login from login page");
      await new Promise((resolve) => setTimeout(resolve, 200));
      console.log("🔍 About to refresh user data...");
      await refreshUser();
      console.log("🔍 User details refreshed");
      await new Promise((resolve) => setTimeout(resolve, 100));
      toast.success("Login successful", {
        description: "Redirecting to dashboard...",
      });
      setTimeout(() => {
        router.replace("/");
        router.refresh();
      }, 600);
    } catch (error) {
      console.error("Login error:", error);
      auditLogger.login(
        email,
        false,
        error instanceof Error ? error.message : "Invalid credentials"
      );
      toast.error("Login failed", {
        description:
          error instanceof Error ? error.message : "Invalid credentials",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-[#1B4D3E] via-[#2A735D] to-[#1B4D3E] animate-[gradientShift_10s_ease-in-out_infinite]">
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex justify-center animate-[fadeInDown_0.8s_ease-out]">
            <Image
              src="/logo.png"
              alt="JSC Logo"
              width={160}
              height={160}
              className="drop-shadow-lg transition-transform duration-300 hover:scale-105"
              unoptimized
            />
          </div>

          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm animate-[fadeInUp_0.8s_ease-out] hover:shadow-3xl transition-all duration-300">
            <CardHeader className="space-y-4">
              <div className="flex justify-center -mt-2 animate-[pulse_2s_ease-in-out_infinite]">
                <Image
                  src="/testimony.png"
                  alt="Testimony Logo"
                  width={240}
                  height={80}
                  className="h-16 w-auto transition-transform duration-300 hover:scale-105"
                  unoptimized
                />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center transition-colors duration-300 hover:text-[#1B4D3E]">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-center transition-colors duration-200">
                  Sign in to access the Court Recording Management System
                </CardDescription>
              </div>
            </CardHeader>
            <form onSubmit={handleSubmit} autoComplete="off">
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="transition-colors duration-200 hover:text-[#1B4D3E]">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full transition-all duration-200 focus:ring-2 focus:ring-[#1B4D3E]/20 focus:border-[#1B4D3E] hover:shadow-md"
                    autoComplete="username"
                    data-lpignore="true"
                    data-1p-ignore
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="transition-colors duration-200 hover:text-[#1B4D3E]">
                    Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full transition-all duration-200 focus:ring-2 focus:ring-[#1B4D3E]/20 focus:border-[#1B4D3E] hover:shadow-md"
                    autoComplete="current-password"
                    data-lpignore="true"
                    data-1p-ignore
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button
                  type="submit"
                  className="w-full bg-[#1B4D3E] hover:bg-[#2A735D] transition-all duration-200 hover:scale-105 hover:shadow-lg group"
                  disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      <span className="animate-pulse">Signing in...</span>
                    </>
                  ) : (
                    <span className="transition-all duration-200 group-hover:font-medium">
                      Sign In
                    </span>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-muted-foreground transition-all duration-200 hover:text-[#1B4D3E] hover:scale-105"
                  onClick={() => router.push("/forgot-password")}
                  disabled={isLoading}>
                  Forgot your password?
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>

      <footer className="py-6 text-center text-white/80 bg-black/20 backdrop-blur-sm animate-[fadeInUp_1s_ease-out]">
        <p className="text-sm transition-all duration-200 hover:text-white">
          Testimony Court Intelligence | Powered by Soxfort Solutions
        </p>
        <p className="text-xs mt-1 transition-all duration-200 hover:text-white/90">
          Intuitive Innovation {currentYear || new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

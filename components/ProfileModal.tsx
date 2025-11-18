"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import React from "react"; // Added missing import for React.useEffect

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, refreshUser } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.contact_info || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Simulate API update (replace with real API calls)
  const updateProfile = async (updates: { email?: string; contact_info?: string }) => {
    setLoading(true);
    try {
      // TODO: Replace with real API call
      await new Promise((res) => setTimeout(res, 800));
      toast.success("Profile updated successfully");
      await refreshUser();
    } catch (e) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async () => {
    setLoading(true);
    try {
      if (newPassword !== confirmPassword) {
        toast.error("New passwords do not match");
        setLoading(false);
        return;
      }
      // TODO: Replace with real API call
      await new Promise((res) => setTimeout(res, 800));
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      toast.error("Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  // Keep form in sync with user changes
  // (e.g. after update, or if modal is opened/closed)
  // This ensures the modal always shows the latest info
  // and resets fields when closed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    setEmail(user?.email || "");
    setPhone(user?.contact_info || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, [user, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-8">
          <Card className="bg-background border-none shadow-none">
            <CardContent className="p-0">
              <div className="mb-4">
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="font-medium text-lg">{user?.name}</div>
              </div>
              <div className="mb-4">
                <div className="text-sm text-muted-foreground">Role</div>
                <div className="font-medium">{user?.role}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background border-none shadow-none">
            <CardHeader className="p-0 mb-2">
              <CardTitle className="text-base">Update Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await updateProfile({ email, contact_info: phone });
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-1">
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-background border-none shadow-none">
            <CardHeader className="p-0 mb-2">
              <CardTitle className="text-base">Change Password</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await updatePassword();
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium mb-1">
                    Current Password
                  </label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium mb-1">
                    New Password
                  </label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                    Confirm New Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Saving..." : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function ProfilePage() {
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

  if (!user) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="max-w-xl mx-auto py-10 animate-[fadeInUp_0.5s_ease-out]">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="text-sm text-muted-foreground">Name</div>
            <div className="font-medium text-lg">{user.name}</div>
          </div>
          <div className="mb-4">
            <div className="text-sm text-muted-foreground">Role</div>
            <div className="font-medium">{user.role}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Update Contact Info</CardTitle>
        </CardHeader>
        <CardContent>
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

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
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
  );
} 
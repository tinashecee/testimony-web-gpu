"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Users,
  UserPlus,
  UserMinus,
  Calendar,
  Mail,
  Edit,
  Trash2,
  Loader2,
  Check,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import {
  transcriptionApi,
  usersApi,
  TranscriptionAssignment,
  User as UserType,
} from "@/services/api";
import { toast } from "sonner";

interface TranscriptionAssignmentsProps {
  caseId: number;
  caseNumber: string;
  currentUser: UserType;
}

export function TranscriptionAssignments({
  caseId,
  caseNumber,
  currentUser,
}: TranscriptionAssignmentsProps) {
  const [assignments, setAssignments] = useState<TranscriptionAssignment[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUserComboboxOpen, setIsUserComboboxOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Get selected user details
  const selectedUser = users.find(
    (user) => user.id?.toString() === selectedUserId
  );

  // Filter available users (not already assigned)
  const availableUsers = users.filter(
    (user) =>
      user.id &&
      !assignments.some((assignment) => assignment.user_id === user.id)
  );

  // Filter users based on search query
  const filteredUsers = availableUsers.filter(
    (user) =>
      user.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.role?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  // Load assignments and users
  useEffect(() => {
    loadData();
  }, [caseId]);

  // Handle user selection
  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setIsUserComboboxOpen(false);
    setUserSearchQuery("");
  };

  // Reset form when dialog closes
  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setSelectedUserId("");
    setUserSearchQuery("");
    setIsUserComboboxOpen(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Prefer typed API that includes auth headers and retries
      try {
        const byCase = await transcriptionApi.getAssignmentsByCase(caseId);
        setAssignments(byCase);
      } catch (e) {
        // Fallback: load all and filter
        const all = await transcriptionApi.getAssignments();
        setAssignments(all.filter((a) => a.case_id === caseId));
      }

      // Fetch available users for assignment
      try {
        const usersData = await usersApi.getUsers();
        setUsers(usersData);
      } catch (userError) {
        console.error("Failed to load users:", userError);
        // Set empty users array if API fails
        setUsers([]);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to load assignments: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    console.log("Adding assignment for case:", caseId, "user:", selectedUserId);
    setIsSubmitting(true);
    try {
      const response = await transcriptionApi.addAssignment(
        caseId,
        parseInt(selectedUserId)
      );
      console.log("Assignment API response data:", response);
      toast.success("User assigned successfully");
      handleDialogClose();
      loadData();
    } catch (error) {
      console.error("Failed to add assignment:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to assign user: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: number) => {
    console.log("Removing assignment with ID:", assignmentId);
    try {
      const response = await transcriptionApi.deleteAssignment(assignmentId);
      console.log("Delete API response data:", response);
      toast.success("Assignment removed successfully");
      loadData();
    } catch (error) {
      console.error("Failed to remove assignment:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to remove assignment: ${errorMessage}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "transcriber":
        return "bg-blue-100 text-blue-800";
      case "super_admin":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Transcription Assignments
          <Badge variant="outline" className="ml-2">
            {assignments.length} assigned
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading assignments...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Debug info */}
            <div className="text-xs text-muted-foreground">
              Debug: {users.length} users loaded, {assignments.length}{" "}
              assignments
            </div>
            {/* Add Assignment Button */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign User to Case {caseNumber}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="user-select">Select User</Label>
                    <Popover
                      open={isUserComboboxOpen}
                      onOpenChange={setIsUserComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isUserComboboxOpen}
                          className="w-full justify-between">
                          {selectedUser ? (
                            <div className="flex items-center gap-2">
                              <span>{selectedUser.name}</span>
                              <Badge
                                variant="outline"
                                className={getRoleColor(selectedUser.role)}>
                                {selectedUser.role}
                              </Badge>
                            </div>
                          ) : (
                            "Search and select a user..."
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search users by name, email, or role..."
                            value={userSearchQuery}
                            onValueChange={setUserSearchQuery}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {availableUsers.length === 0 ? (
                                <div className="py-6 text-center text-sm">
                                  <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                                  <p className="text-muted-foreground">
                                    {users.length === 0
                                      ? "No users available"
                                      : "All users are already assigned to this case"}
                                  </p>
                                </div>
                              ) : (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  <Search className="mx-auto h-8 w-8 mb-2" />
                                  <p>
                                    No users found matching "{userSearchQuery}"
                                  </p>
                                  <p className="text-xs mt-1">
                                    Try searching by name, email, or role
                                  </p>
                                </div>
                              )}
                            </CommandEmpty>
                            <CommandGroup>
                              {filteredUsers.map((user) => (
                                <CommandItem
                                  key={user.id!}
                                  value={`${user.name} ${user.email} ${user.role}`}
                                  onSelect={() =>
                                    handleUserSelect(user.id!.toString())
                                  }>
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      selectedUserId === user.id?.toString()
                                        ? "opacity-100"
                                        : "opacity-0"
                                    }`}
                                  />
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {user.name}
                                      </span>
                                      <span className="text-sm text-muted-foreground">
                                        {user.email}
                                      </span>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className={`ml-auto ${getRoleColor(
                                        user.role
                                      )}`}>
                                      {user.role}
                                    </Badge>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddAssignment}
                      disabled={isSubmitting || !selectedUserId}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        "Assign User"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Assignments List */}
            {assignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No users assigned to this case</p>
                <p className="text-sm">Click "Assign User" to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{assignment.user_name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {assignment.user_email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          Assigned {formatDate(assignment.date_assigned)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        Assignment #{assignment.id}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove Assignment
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove{" "}
                              {assignment.user_name} from this case? This action
                              cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleRemoveAssignment(assignment.id)
                              }
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader } from "@/components/ui/loader";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
} from "@/components/ui/toast";
import { recordingsApi, User, Court } from "@/services/api";
import {
  getProvinces,
  getDistricts,
  getRegion,
  needsRegionChoice,
  getRegionOptions,
} from "@/utils/zwLocations";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { auditLogger } from "@/services/auditService";

export function UserManagementPanel() {
  const { isSuperAdmin, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "court_recorder" as User["role"],
    court: "",
    contact_info: "",
    province: "",
    district: "",
    region: "",
  });
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [courtSearchOpen, setCourtSearchOpen] = useState(false);
  const [courtSearchValue, setCourtSearchValue] = useState("");

  // Define available roles based on current user's permissions
  const availableRoles = useMemo(() => {
    const allRoles = [
      { value: "admin", label: "Admin" },
      { value: "court_recorder", label: "Court Recorder" },
      { value: "registrar", label: "Registrar" },
      { value: "judge", label: "Judge" },
      { value: "station_magistrate", label: "Station Magistrate" },
      { value: "resident_magistrate", label: "Resident Magistrate" },
      { value: "provincial_magistrate", label: "Provincial Magistrate" },
      { value: "regional_magistrate", label: "Regional Magistrate" },
      {
        value: "senior_regional_magistrate",
        label: "Senior Regional Magistrate",
      },
      { value: "clerk_of_court", label: "Clerk of Court" },
      { value: "transcriber", label: "Transcriber" },
      {
        value: "recording_supervisor",
        label: "Recording and Transcription Supervisor",
      },
    ];

    // Only super admins can create other super admins
    if (isSuperAdmin) {
      allRoles.unshift({ value: "super_admin", label: "Super Admin" });
    }

    return allRoles;
  }, [isSuperAdmin]);

  // Fetch users from the API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const fetchedUsers = await recordingsApi.getUsers();
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, [showToast]);

  // Fetch courts from the API
  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const fetchedCourts = await recordingsApi.getCourts();
        setCourts(fetchedCourts);
      } catch (error) {
        console.error("Error fetching courts:", error);
      }
    };

    fetchCourts();
  }, [showToast]);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  // Sort and filter courts alphabetically
  const sortedAndFilteredCourts = useMemo(() => {
    return courts
      .filter((court) =>
        court.court_name.toLowerCase().includes(courtSearchValue.toLowerCase())
      )
      .sort((a, b) => a.court_name.localeCompare(b.court_name));
  }, [courts, courtSearchValue]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, currentPage, pageSize]);

  const handleAddUser = async () => {
    try {
      setIsLoading(true);
      await recordingsApi.addUser({
        ...newUser,
        province: newUser.province || undefined,
        district: newUser.district || undefined,
        region: newUser.region || undefined,
      });

      // Log user creation event
      auditLogger.createUser(
        user?.email || "unknown@court.gov.zw",
        newUser.email
      );

      showToast("User added successfully", "success");
      setIsAddUserOpen(false);
      setNewUser({
        name: "",
        email: "",
        role: "court_recorder",
        court: "",
        contact_info: "",
        province: "",
        district: "",
        region: "",
      });

      const fetchedUsers = await recordingsApi.getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to add user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setNewUser(user); // Pre-fill the form with the selected user's data
    setCourtSearchValue(""); // Reset court search
    setIsAddUserOpen(true); // Reuse the same dialog for adding and editing
  };

  // Preserve and preselect existing select values when editing
  useEffect(() => {
    if (!selectedUser) return;

    const province = selectedUser.province || "";
    const district = selectedUser.district || "";
    let region = selectedUser.region || "";

    // Only auto-fill region from province if none is saved and province doesn't require choice
    if (
      selectedUser.role !== "regional_magistrate" &&
      province &&
      !needsRegionChoice(province) &&
      !region
    ) {
      region = getRegion(province) || "";
    }

    setNewUser((prev) => ({
      ...prev,
      name: selectedUser.name || "",
      email: selectedUser.email || "",
      role: (selectedUser.role as User["role"]) || prev.role,
      court: selectedUser.court || "",
      contact_info: selectedUser.contact_info || "",
      province,
      district,
      region,
    }));
  }, [selectedUser]);

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      setIsLoading(true);
      await recordingsApi.editUser({
        id: selectedUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        court: newUser.court,
        contact_info: newUser.contact_info,
        province: newUser.province || undefined,
        district: newUser.district || undefined,
        region: newUser.region || undefined,
      });

      // Log user update event
      const changes = [
        selectedUser.name !== newUser.name
          ? `name: ${selectedUser.name} → ${newUser.name}`
          : null,
        selectedUser.email !== newUser.email
          ? `email: ${selectedUser.email} → ${newUser.email}`
          : null,
        selectedUser.role !== newUser.role
          ? `role: ${selectedUser.role} → ${newUser.role}`
          : null,
        selectedUser.court !== newUser.court
          ? `court: ${selectedUser.court} → ${newUser.court}`
          : null,
        selectedUser.contact_info !== newUser.contact_info
          ? `contact_info: updated`
          : null,
      ]
        .filter(Boolean)
        .join(", ");

      auditLogger.updateUser(
        user?.email || "unknown@court.gov.zw",
        selectedUser.email,
        changes || "No changes detected"
      );

      showToast("User updated successfully", "success");
      setIsAddUserOpen(false);
      setSelectedUser(null); // Clear the selected user
      const fetchedUsers = await recordingsApi.getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to update user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      // Get user details before deletion for audit logging
      const userToDelete = users.find((user) => user.id === userId);

      await recordingsApi.deleteUser(userId);

      // Log user deletion event
      if (userToDelete) {
        auditLogger.deleteUser(
          user?.email || "unknown@court.gov.zw",
          userToDelete.email
        );
      }

      showToast("User deleted successfully", "success");
      const fetchedUsers = await recordingsApi.getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("Failed to delete user");
    }
  };

  const getRoleBadgeVariant = (role: User["role"]) => {
    switch (role) {
      case "super_admin":
        return "destructive";
      case "admin":
        return "destructive";
      case "judge":
        return "warning";
      case "station_magistrate":
        return "warning";
      case "resident_magistrate":
        return "warning";
      case "provincial_magistrate":
        return "warning";
      case "regional_magistrate":
        return "warning";
      case "senior_regional_magistrate":
        return "warning";
      case "registrar":
        return "success";
      case "clerk_of_court":
        return "success";
      case "court_recorder":
        return "secondary";
      case "transcriber":
        return "secondary";
      case "recording_supervisor":
        return "outline";
    }
  };

  const getRoleLabel = (role: User["role"]) => {
    return role
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <>
      {isLoading && <ProgressBar />}

      <div className="space-y-4">
        {/* Header Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="pl-8 w-[300px]"
              />
            </div>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1); // Reset to first page when changing page size
              }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select page size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="40">40 per page</SelectItem>
                <SelectItem value="60">60 per page</SelectItem>
                <SelectItem value={users.length.toString()}>
                  Show all
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setIsAddUserOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Users Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Court</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Province</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.court}</TableCell>
                  <TableCell>{user.contact_info}</TableCell>
                  <TableCell>{user.province || ""}</TableCell>
                  <TableCell>{user.district || ""}</TableCell>
                  <TableCell>{user.region || ""}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditUser(user)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUserToDelete(user);
                        setIsDeleteDialogOpen(true);
                      }}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            {Math.min(pageSize * (currentPage - 1) + 1, filteredUsers.length)}{" "}
            to {Math.min(pageSize * currentPage, filteredUsers.length)} of{" "}
            {filteredUsers.length} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                const distance = Math.abs(page - currentPage);
                return (
                  distance === 0 ||
                  distance === 1 ||
                  page === 1 ||
                  page === totalPages
                );
              })
              .map((page, i, arr) => (
                <React.Fragment key={page}>
                  {i > 0 && arr[i - 1] !== page - 1 && (
                    <span className="text-muted-foreground">...</span>
                  )}
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}>
                    {page}
                  </Button>
                </React.Fragment>
              ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Add User Dialog */}
        <Dialog
          open={isAddUserOpen}
          onOpenChange={(open) => {
            setIsAddUserOpen(open);
            if (!open) {
              // Reset form and search when dialog closes
              setNewUser({
                name: "",
                email: "",
                role: "court_recorder",
                court: "",
                contact_info: "",
                province: "",
                district: "",
                region: "",
              });
              setSelectedUser(null);
              setCourtSearchValue("");
              setCourtSearchOpen(false);
            }
          }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedUser ? "Edit User" : "Add New User"}
              </DialogTitle>
              <DialogDescription>
                {selectedUser
                  ? "Update the user details."
                  : "Enter the details for the new user."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="Enter user name"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: User["role"]) =>
                    setNewUser((prev) => ({ ...prev, role: value }))
                  }>
                  <SelectTrigger
                    disabled={newUser.role === "super_admin" && !isSuperAdmin}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Include current role if it's not present in available options (legacy/locked) */}
                    {newUser.role &&
                      !availableRoles.some((r) => r.value === newUser.role) && (
                        <SelectItem value={newUser.role}>
                          {getRoleLabel(newUser.role as User["role"]) +
                            " (legacy)"}
                        </SelectItem>
                      )}
                    {availableRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Court</Label>
                <Popover
                  open={courtSearchOpen}
                  onOpenChange={setCourtSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={courtSearchOpen}
                      className="w-full justify-between">
                      {newUser.court ? newUser.court : "Select court..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search courts..."
                        value={courtSearchValue}
                        onValueChange={setCourtSearchValue}
                      />
                      <CommandList>
                        <CommandEmpty>No court found.</CommandEmpty>
                        <CommandGroup
                          heading={`${sortedAndFilteredCourts.length} court${
                            sortedAndFilteredCourts.length !== 1 ? "s" : ""
                          } available`}>
                          {sortedAndFilteredCourts.map((court) => (
                            <CommandItem
                              key={court.court_id}
                              value={court.court_name}
                              onSelect={(currentValue) => {
                                setNewUser((prev) => ({
                                  ...prev,
                                  court:
                                    currentValue === newUser.court
                                      ? ""
                                      : currentValue,
                                }));
                                setCourtSearchOpen(false);
                                setCourtSearchValue("");
                              }}>
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  newUser.court === court.court_name
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {court.court_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Contact Info</Label>
                <Input
                  placeholder="Enter contact information"
                  value={newUser.contact_info}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      contact_info: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Location Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Province</Label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={newUser.province}
                    onChange={(e) => {
                      const province = e.target.value;
                      const autoRegion = getRegion(province);
                      const role = newUser.role;
                      const requiresIndependentRegion =
                        role === "regional_magistrate";
                      const region = requiresIndependentRegion
                        ? ""
                        : needsRegionChoice(province)
                        ? ""
                        : autoRegion || "";
                      setNewUser((prev) => ({
                        ...prev,
                        province,
                        district: "",
                        region,
                      }));
                    }}>
                    <option value="">Select province</option>
                    {newUser.province &&
                      !getProvinces().includes(newUser.province) && (
                        <option value={newUser.province}>
                          {newUser.province} (legacy)
                        </option>
                      )}
                    {getProvinces().map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>District</Label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={newUser.district}
                    onChange={(e) =>
                      setNewUser((prev) => ({
                        ...prev,
                        district: e.target.value,
                      }))
                    }
                    disabled={!newUser.province}>
                    <option value="">Select district</option>
                    {newUser.district &&
                      !getDistricts(newUser.province).includes(
                        newUser.district
                      ) && (
                        <option value={newUser.district}>
                          {newUser.district} (legacy)
                        </option>
                      )}
                    {getDistricts(newUser.province).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Region</Label>
                  {newUser.role === "regional_magistrate" ? (
                    <select
                      className="w-full border rounded-md p-2"
                      value={newUser.region}
                      onChange={(e) =>
                        setNewUser((prev) => ({
                          ...prev,
                          region: e.target.value,
                        }))
                      }>
                      <option value="">Select region</option>
                      {newUser.region &&
                        ![
                          "Northern Division",
                          "Western Division",
                          "Central Division",
                          "Eastern Division",
                        ].includes(newUser.region) && (
                          <option value={newUser.region}>
                            {newUser.region} (legacy)
                          </option>
                        )}
                      {[
                        "Northern Division",
                        "Western Division",
                        "Central Division",
                        "Eastern Division",
                      ].map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : needsRegionChoice(newUser.province) ? (
                    <select
                      className="w-full border rounded-md p-2"
                      value={newUser.region}
                      onChange={(e) =>
                        setNewUser((prev) => ({
                          ...prev,
                          region: e.target.value,
                        }))
                      }>
                      <option value="">Select region</option>
                      {newUser.region &&
                        !getRegionOptions(newUser.province).includes(
                          newUser.region
                        ) && (
                          <option value={newUser.region}>
                            {newUser.region} (legacy)
                          </option>
                        )}
                      {getRegionOptions(newUser.province).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      placeholder="Region"
                      value={getRegion(newUser.province) || ""}
                      readOnly
                    />
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={selectedUser ? handleUpdateUser : handleAddUser}
                disabled={
                  !newUser.name ||
                  !newUser.email ||
                  !newUser.role ||
                  !newUser.court ||
                  !newUser.contact_info ||
                  // Role-based requiredness for location
                  ([
                    "admin",
                    "court_recorder",
                    "registrar",
                    "clerk_of_court",
                    "station_magistrate",
                    "resident_magistrate",
                    "transcriber",
                    "recording_supervisor",
                  ].includes(newUser.role) &&
                    (!newUser.province ||
                      !newUser.district ||
                      (!newUser.region &&
                        (needsRegionChoice(newUser.province) || true)))) ||
                  (newUser.role === "provincial_magistrate" &&
                    (!newUser.province ||
                      (!newUser.region &&
                        (needsRegionChoice(newUser.province) || true)))) ||
                  (newUser.role === "regional_magistrate" && !newUser.region) ||
                  isLoading
                }>
                {isLoading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4" />
                    {selectedUser ? "Updating User..." : "Adding User..."}
                  </>
                ) : selectedUser ? (
                  "Update User"
                ) : (
                  "Add User"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the user "{userToDelete?.name}"?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (userToDelete && userToDelete.id) {
                    await handleDeleteUser(userToDelete.id);
                    setIsDeleteDialogOpen(false);
                    setUserToDelete(null);
                  }
                }}>
                Delete User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

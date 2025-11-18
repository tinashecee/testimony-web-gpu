"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Building2,
  Edit,
  Trash2,
  Search,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { recordingsApi, Court, Courtroom } from "@/services/api";
import {
  getProvinces,
  getDistricts,
  needsRegionChoice,
  getRegion,
  getRegionOptions,
} from "@/utils/zwLocations";
import { useToast } from "@/components/ui/use-toast";

interface NewCourtroom {
  courtroom_name: string;
  court_id: number;
}

export function CourtsPanel() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [courtrooms, setCourtrooms] = useState<Courtroom[]>([]);
  const [isAddCourtOpen, setIsAddCourtOpen] = useState(false);
  const [isAddCourtroomOpen, setIsAddCourtroomOpen] = useState(false);
  const [isDeleteCourtroomOpen, setIsDeleteCourtroomOpen] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedCourtroom, setSelectedCourtroom] = useState<Courtroom | null>(
    null
  );
  const [expandedCourts, setExpandedCourts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newCourt, setNewCourt] = useState({
    court_name: "",
    address: "",
    contact_info: "",
    province: "",
    district: "",
    region: "",
  });
  const [newCourtrooms, setNewCourtrooms] = useState<NewCourtroom[]>([
    {
      courtroom_name: "",
      court_id: 0,
    },
  ]);
  const { toast } = useToast();
  const [isDeleteCourtOpen, setIsDeleteCourtOpen] = useState(false);
  const [courtToDelete, setCourtToDelete] = useState<Court | null>(null);

  const filteredCourts = useMemo(() => {
    return courts.filter((court) =>
      court.court_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [courts, searchQuery]);

  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const data = await recordingsApi.getCourts();
        const transformedCourts = data.map((court: any) => ({
          court_id: court.court_id,
          court_name: court.court_name,
          address: court.address,
          contact_info: court.contact_info,
          province: court.province,
          district: court.district,
          region: court.region,
          created_at: court.created_at,
          courtrooms: court.courtrooms || [],
        }));
        setCourts(transformedCourts);
      } catch (error) {
        console.error("Error fetching courts:", error);
        toast({
          title: "Error",
          description: "Failed to fetch courts.",
          variant: "destructive",
        });
      }
    };

    const fetchCourtrooms = async () => {
      try {
        const data = await recordingsApi.getCourtrooms();
        setCourtrooms(data);
      } catch (error) {
        console.error("Error fetching courtrooms:", error);
        toast({
          title: "Error",
          description: "Failed to fetch courtrooms.",
          variant: "destructive",
        });
      }
    };

    fetchCourts();
    fetchCourtrooms();
  }, [toast]);

  const handleAddCourt = async () => {
    // Basic validation: province and district required; region required only if province requires choice
    if (!newCourt.court_name.trim()) {
      toast({
        title: "Validation",
        description: "Court name is required",
        variant: "destructive",
      });
      return;
    }
    if (!newCourt.province) {
      toast({
        title: "Validation",
        description: "Province is required",
        variant: "destructive",
      });
      return;
    }
    if (!newCourt.district) {
      toast({
        title: "Validation",
        description: "District is required",
        variant: "destructive",
      });
      return;
    }
    if (needsRegionChoice(newCourt.province) && !newCourt.region) {
      toast({
        title: "Validation",
        description: "Please select a region for Mashonaland East",
        variant: "destructive",
      });
      return;
    }

    const court: Court = {
      court_id: Date.now(),
      court_name: newCourt.court_name,
      address: newCourt.address,
      contact_info: newCourt.contact_info,
      province: newCourt.province || undefined,
      district: newCourt.district || undefined,
      region:
        (needsRegionChoice(newCourt.province)
          ? newCourt.region
          : getRegion(newCourt.province) || undefined) || undefined,
      created_at: new Date().toISOString(),
    };

    try {
      await recordingsApi.addCourt(court);
      setCourts((prev) => [...prev, court]);
      setNewCourt({
        court_name: "",
        address: "",
        contact_info: "",
        province: "",
        district: "",
        region: "",
      });
      setIsAddCourtOpen(false);
    } catch (error) {
      console.error("Error adding court:", error);
      toast({
        title: "Error",
        description: "Failed to add court.",
        variant: "destructive",
      });
    }
  };

  const addCourtroomField = () => {
    setNewCourtrooms((prev) => [
      ...prev,
      {
        courtroom_name: "",
        court_id: selectedCourt ? selectedCourt.court_id : 0,
      },
    ]);
  };

  const removeCourtroomField = (index: number) => {
    setNewCourtrooms((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCourtroomName = (index: number, name: string) => {
    setNewCourtrooms((prev) =>
      prev.map((room, i) =>
        i === index ? { ...room, courtroom_name: name } : room
      )
    );
  };

  const handleSaveCourtrooms = () => {
    if (!selectedCourt) return;

    // Filter out empty courtroom names
    const validCourtrooms = newCourtrooms.filter(
      (room) => room.courtroom_name.trim() !== ""
    );

    setCourts((prev) =>
      prev.map((court) => {
        console.log("Current Court ID:", court.court_id);
        console.log("Selected Court ID:", selectedCourt?.court_id);

        return court.court_id === selectedCourt?.court_id
          ? {
              ...court,
              courtrooms: [
                ...validCourtrooms.map((room) => room.courtroom_name),
              ],
            }
          : court;
      })
    );

    setNewCourtrooms([
      {
        courtroom_name: "",
        court_id: 0,
      },
    ]);
    setIsAddCourtroomOpen(false);
  };

  const toggleCourtExpansion = (courtId: string) => {
    setExpandedCourts((prev) =>
      prev.includes(courtId)
        ? prev.filter((id) => id !== courtId)
        : [...prev, courtId]
    );
  };

  const handleAddCourtroom = async () => {
    if (!selectedCourt) return;

    const validCourtrooms = newCourtrooms.filter(
      (room) => room.courtroom_name.trim() !== ""
    );

    try {
      for (const room of validCourtrooms) {
        await recordingsApi.addCourtroom({
          courtroom_name: room.courtroom_name,
          court_id: selectedCourt.court_id,
        });
      }
      // Fetch updated courtrooms after adding
      const updatedCourtrooms = await recordingsApi.getCourtrooms();
      setCourtrooms(updatedCourtrooms);
      toast({ title: "Courtrooms added successfully" });
      setNewCourtrooms([{ courtroom_name: "", court_id: 0 }]);
      setIsAddCourtroomOpen(false);
    } catch (error) {
      console.error("Error adding courtrooms:", error);
      toast({
        title: "Error",
        description: "Failed to add courtrooms.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCourtroom = async (courtroomId: number) => {
    try {
      await recordingsApi.deleteCourtroom(courtroomId);
      // Fetch updated courtrooms after deletion
      const updatedCourtrooms = await recordingsApi.getCourtrooms();
      setCourtrooms(updatedCourtrooms);
      toast({ title: "Courtroom deleted successfully" });
    } catch (error) {
      console.error("Error deleting courtroom:", error);
      toast({
        title: "Error",
        description: "Failed to delete courtroom.",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteCourtroom = (courtroom: Courtroom) => {
    setSelectedCourtroom(courtroom);
    setIsDeleteCourtroomOpen(true);
  };

  const handleDeleteCourt = async (court_id: number) => {
    try {
      await recordingsApi.deleteCourt(court_id);
      setCourts((prev) => prev.filter((court) => court.court_id !== court_id));
      toast({ title: "Court deleted successfully" });
    } catch (error) {
      console.error("Error deleting court:", error);
      toast({
        title: "Error",
        description: "Failed to delete court.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Courts</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-[200px]"
              />
            </div>
            <Button onClick={() => setIsAddCourtOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Court
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCourts.map((court) => (
              <Collapsible
                key={court.court_id}
                open={expandedCourts.includes(court.court_id.toString())}
                onOpenChange={() =>
                  toggleCourtExpansion(court.court_id.toString())
                }
                className="border rounded-lg">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50">
                    <div className="flex items-center gap-4">
                      <Building2 className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{court.court_name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedCourts.includes(court.court_id.toString()) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                    <div
                      className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCourtToDelete(court);
                        setIsDeleteCourtOpen(true);
                      }}>
                      <Trash2 className="h-4 w-4" />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 border-t bg-accent/50">
                    <h4 className="font-medium">Courtrooms</h4>
                    <div className="space-y-2">
                      {courtrooms
                        .filter((room) => room.court_id === court.court_id)
                        .map((room) => (
                          <div
                            key={room.courtroom_id}
                            className="flex items-center">
                            <p className="font-medium">{room.courtroom_name}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDeleteCourtroom(room)}
                              className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedCourt(court);
                        setIsAddCourtroomOpen(true);
                      }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Courtroom
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Court Dialog */}
      <Dialog open={isAddCourtOpen} onOpenChange={setIsAddCourtOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Court</DialogTitle>
            <DialogDescription>
              Enter the details for the new court.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Court Name</Label>
              <Input
                placeholder="Enter court name"
                value={newCourt.court_name}
                onChange={(e) =>
                  setNewCourt((prev) => ({
                    ...prev,
                    court_name: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                placeholder="Enter address"
                value={newCourt.address}
                onChange={(e) =>
                  setNewCourt((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Info</Label>
              <Input
                placeholder="Enter contact info"
                value={newCourt.contact_info}
                onChange={(e) =>
                  setNewCourt((prev) => ({
                    ...prev,
                    contact_info: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Province</Label>
                <select
                  className="w-full border rounded-md p-2"
                  value={newCourt.province}
                  onChange={(e) => {
                    const province = e.target.value;
                    const autoRegion = getRegion(province);
                    const region = needsRegionChoice(province)
                      ? ""
                      : autoRegion || "";
                    setNewCourt((prev) => ({
                      ...prev,
                      province,
                      district: "",
                      region,
                    }));
                  }}>
                  <option value="">Select province</option>
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
                  value={newCourt.district}
                  onChange={(e) =>
                    setNewCourt((prev) => ({
                      ...prev,
                      district: e.target.value,
                    }))
                  }
                  disabled={!newCourt.province}>
                  <option value="">Select district</option>
                  {getDistricts(newCourt.province).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                {needsRegionChoice(newCourt.province) ? (
                  <select
                    className="w-full border rounded-md p-2"
                    value={newCourt.region}
                    onChange={(e) =>
                      setNewCourt((prev) => ({
                        ...prev,
                        region: e.target.value,
                      }))
                    }>
                    <option value="">Select region</option>
                    {getRegionOptions(newCourt.province).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    placeholder="Region"
                    value={getRegion(newCourt.province) || ""}
                    readOnly
                  />
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCourtOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCourt}>Add Court</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Deleting Courtroom */}
      <Dialog
        open={isDeleteCourtroomOpen}
        onOpenChange={setIsDeleteCourtroomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the courtroom "
              {selectedCourtroom?.courtroom_name}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteCourtroomOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedCourtroom) {
                  handleDeleteCourtroom(selectedCourtroom.courtroom_id);
                  setIsDeleteCourtroomOpen(false);
                }
              }}>
              Delete Courtroom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update the Add Courtroom Dialog */}
      <Dialog
        open={isAddCourtroomOpen}
        onOpenChange={(open) => {
          setIsAddCourtroomOpen(open);
          if (!open) {
            setNewCourtrooms([
              {
                courtroom_name: "",
                court_id: selectedCourt ? selectedCourt.court_id : 0,
              },
            ]);
          }
        }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Courtrooms</DialogTitle>
            <DialogDescription>
              Add one or more courtrooms to {selectedCourt?.court_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {newCourtrooms.map((room, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      {(index + 1).toString().padStart(2, "0")}
                    </span>
                    <Input
                      placeholder="Enter courtroom name"
                      value={room.courtroom_name}
                      onChange={(e) =>
                        updateCourtroomName(index, e.target.value)
                      }
                    />
                  </div>
                </div>
                {newCourtrooms.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCourtroomField(index)}
                    className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={addCourtroomField}>
              <Plus className="h-4 w-4 mr-2" />
              Add Another Courtroom
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddCourtroomOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCourtroom}
              disabled={
                !newCourtrooms.some((room) => room.courtroom_name.trim() !== "")
              }>
              Save Courtrooms
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Deleting Court */}
      <Dialog open={isDeleteCourtOpen} onOpenChange={setIsDeleteCourtOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the court "
              {courtToDelete?.court_name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteCourtOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (courtToDelete) {
                  handleDeleteCourt(courtToDelete.court_id);
                  setIsDeleteCourtOpen(false);
                }
              }}>
              Delete Court
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

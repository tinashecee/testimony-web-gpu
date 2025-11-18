import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recordingsApi } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import type { Court, Courtroom } from "@/services/api";
import { UploadProgress } from "@/components/ui/upload-progress";
import { auditLogger } from "@/services/auditService";
import { useAuth } from "@/contexts/AuthContext";

interface AddRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courts: Court[];
  courtrooms: Courtroom[];
  onUploadStart: (fileName: string) => void;
  onUploadProgress: (progress: number) => void;
  onUploadComplete: () => void;
}

export function AddRecordingModal({
  isOpen,
  onClose,
  onSuccess,
  courts,
  courtrooms,
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
}: AddRecordingModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<string>("");
  const [formData, setFormData] = useState({
    caseNumber: "",
    title: "",
    date: "",
    court: "",
    courtroom: "",
    judge: "",
    audioFile: null as File | null,
  });

  const filteredCourtrooms = courtrooms.filter(
    (room) => room.court_id === parseInt(selectedCourt)
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[Upload] handleFileChange triggered", {
      filesLength: e.target.files?.length ?? 0,
    });
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log("[Upload] File selected", {
        name: file.name,
        type: file.type,
        sizeBytes: file.size,
      });

      // Validate file type
      const allowedTypes = [
        "audio/wav",
        "audio/mpeg",
        "audio/mp3",
        "audio/mp4",
        "audio/x-m4a",
        "audio/aac",
        "audio/x-aac",
        "audio/m4a",
      ];

      const allowedExtensions = [".wav", ".mp3", ".m4a"];
      const fileExtension = file.name
        .toLowerCase()
        .substring(file.name.lastIndexOf("."));
      console.log("[Upload] Type/extension check", {
        fileType: file.type,
        fileExtension,
        allowedTypes,
        allowedExtensions,
      });

      if (
        !allowedTypes.includes(file.type) &&
        !allowedExtensions.includes(fileExtension)
      ) {
        console.warn(
          "[Upload] Rejected file due to unsupported type/extension",
          {
            fileType: file.type,
            fileExtension,
          }
        );
        toast({
          title: "Invalid file type",
          description: "Please select a valid audio file (WAV, MP3, or M4A)",
          variant: "destructive",
        });
        e.target.value = ""; // Clear the input
        return;
      }

      // No client-side size limit

      console.log("[Upload] File accepted, updating form state", {
        name: file.name,
      });
      setFormData((prev) => ({ ...prev, audioFile: file }));
      try {
        // Surface a visible confirmation for debugging
        toast({
          title: "File selected",
          description: `${file.name} (${Math.round(file.size / 1024)} KB)`,
          variant: "success",
        });
      } catch {}
    } else {
      console.warn("[Upload] No file present in change event");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.audioFile) {
      toast({
        title: "Error",
        description: "Please select an audio file",
        variant: "destructive",
      });
      return;
    }

    try {
      onClose(); // Close modal immediately
      onUploadStart(formData.audioFile.name);
      onUploadProgress(10);
      try {
        toast({
          title: "Uploading file...",
          description: formData.audioFile.name,
        });
      } catch {}

      // 1) Upload the binary file first to direct /upload, using sanitized WAV filename
      const sanitized =
        formData.caseNumber
          .replace(/[\/\\:\*\?"<>\|\s\t\r\n#%&+=]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_+|_+$/g, "") || `case_${Date.now()}`;
      const targetFilename = `${sanitized}_${Date.now()}.wav`;
      console.log("[Upload] Starting file upload to direct /upload", {
        targetFilename,
      });
      const { filename } = await recordingsApi.uploadFile(
        formData.audioFile,
        targetFilename
      );
      console.log("[Upload] File uploaded successfully", { filename });
      onUploadProgress(60);
      try {
        toast({
          title: "File uploaded",
          description: filename,
          variant: "success",
        });
      } catch {}

      // 2) Send metadata to direct /upload_recording, including file_path
      try {
        toast({
          title: "Saving metadata...",
          description: `${formData.caseNumber} • ${formData.title}`,
        });
      } catch {}
      console.log("[Upload] Posting metadata to direct /upload_recording");
      const date = new Date(formData.date || Date.now());
      const pad = (n: number) => String(n).padStart(2, "0");
      const dateStampUtc = `${date.getUTCFullYear()}-${pad(
        date.getUTCMonth() + 1
      )}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(
        date.getUTCMinutes()
      )}:${pad(date.getUTCSeconds())}`;

      await recordingsApi.uploadRecording({
        case_number: formData.caseNumber,
        title: formData.title,
        notes: "",
        date_stamp: dateStampUtc,
        judge_name: formData.judge,
        prosecution_counsel: "",
        defense_counsel: "",
        courtroom: formData.courtroom || "",
        court: formData.court || "",
        transcript: "",
        duration: "0",
        size: String(formData.audioFile.size || 0),
        status: "backed up",
        annotations: "[]",
        file_path: filename,
      });
      console.log("[Upload] Metadata saved successfully");

      // Log recording upload event
      if (user?.email) {
        const fileExtension = formData.audioFile.name
          .toLowerCase()
          .substring(formData.audioFile.name.lastIndexOf("."));
        auditLogger.custom({
          user: user.email,
          action: "Upload Recording",
          resource: "Recording Management",
          details: `Uploaded recording: ${formData.title} (${
            formData.caseNumber
          }) - File: ${
            formData.audioFile.name
          } (${fileExtension.toUpperCase()})`,
          severity: "medium",
          category: "recording_management",
        });
      }

      onUploadProgress(100);
      onUploadComplete();

      toast({
        title: "Success",
        description: "Recording added successfully",
      });

      onSuccess();
      setFormData({
        caseNumber: "",
        title: "",
        date: "",
        court: "",
        courtroom: "",
        judge: "",
        audioFile: null,
      });
    } catch (error) {
      console.error("[Upload] Error adding recording:", error);
      try {
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      } catch {}
      toast({
        title: "Error",
        description: "Failed to add recording",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Recording</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="caseNumber">Case Number</Label>
            <Input
              id="caseNumber"
              value={formData.caseNumber}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, caseNumber: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Case Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="datetime-local"
              value={formData.date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, date: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="court">Court</Label>
            <Select
              value={selectedCourt}
              onValueChange={(value) => {
                setSelectedCourt(value);
                setFormData((prev) => ({
                  ...prev,
                  court: value,
                  courtroom: "", // Reset courtroom when court changes
                }));
              }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a court" />
              </SelectTrigger>
              <SelectContent>
                {courts.map((court) => (
                  <SelectItem
                    key={court.court_id}
                    value={court.court_id.toString()}>
                    {court.court_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="courtroom">Courtroom</Label>
            <Select
              value={formData.courtroom}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, courtroom: value }))
              }
              disabled={!selectedCourt}>
              <SelectTrigger>
                <SelectValue placeholder="Select a courtroom" />
              </SelectTrigger>
              <SelectContent>
                {filteredCourtrooms.map((room) => (
                  <SelectItem
                    key={room.courtroom_id}
                    value={room.courtroom_name}>
                    {room.courtroom_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="judge">Judge/Presiding Officer</Label>
            <Input
              id="judge"
              value={formData.judge}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, judge: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audioFile">Audio File</Label>
            <Input
              id="audioFile"
              type="file"
              accept=".wav,.mp3,.m4a,audio/wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/x-aac,audio/m4a"
              onClick={(e) => {
                // Ensure selecting the same file twice still triggers onChange
                console.log(
                  "[Upload] File input clicked, clearing current value to allow reselection of same file"
                );
                (e.target as HTMLInputElement).value = "";
              }}
              onChange={handleFileChange}
              required
            />
            <p className="text-xs text-muted-foreground">
              Supported formats: WAV, MP3, M4A
            </p>
            {formData.audioFile && (
              <p className="text-xs text-muted-foreground">
                Selected: {formData.audioFile.name}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Recording"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

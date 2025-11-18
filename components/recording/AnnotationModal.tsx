import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { formatTimestamp } from "@/lib/utils";

interface AnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { party: string; text: string; timestamp: string }) => void;
  initialData?: {
    party: string;
    text: string;
    timestamp: string;
  };
  mode: "add" | "edit";
}

export function AnnotationModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
}: AnnotationModalProps) {
  const [party, setParty] = useState("");
  const [text, setText] = useState("");
  const [timestamp, setTimestamp] = useState("");

  // Helper function to format timestamp input
  const formatTimestampInput = (value: string): string => {
    // Remove all non-numeric characters
    const numbers = value.replace(/[^\d]/g, '');
    
    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}:${numbers.slice(2)}`;
    if (numbers.length <= 6) return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}:${numbers.slice(4)}`;
    
    // Limit to 6 digits (HH:MM:SS)
    return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}:${numbers.slice(4, 6)}`;
  };

  const handleTimestampChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTimestampInput(e.target.value);
    setTimestamp(formatted);
  };

  useEffect(() => {
    if (initialData) {
      setParty(initialData.party);
      setText(initialData.text);
      setTimestamp(initialData.timestamp);
    } else {
      setParty("");
      setText("");
      setTimestamp("");
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate timestamp format
    const timestampRegex = /^\d{1,2}:\d{2}:\d{2}$/;
    if (!timestampRegex.test(timestamp)) {
      alert("Please enter a valid timestamp in HH:MM:SS format (e.g., 01:30:45)");
      return;
    }
    
    // Validate required fields
    if (!party.trim() || !text.trim()) {
      alert("Please fill in all required fields");
      return;
    }
    
    onSubmit({ party, text, timestamp });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add Annotation" : "Edit Annotation"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="party">Party</Label>
            <Input
              id="party"
              value={party}
              onChange={(e) => setParty(e.target.value)}
              placeholder="Enter party name"
            />
          </div>
          <div>
            <Label htmlFor="timestamp">Timestamp</Label>
            <Input
              id="timestamp"
              value={timestamp}
              onChange={handleTimestampChange}
              placeholder="00:00:00"
              maxLength={8}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Format: HH:MM:SS (e.g., 01:30:45)
            </p>
          </div>
          <div>
            <Label htmlFor="text">Annotation</Label>
            <Textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter annotation text"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === "add" ? "Add" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

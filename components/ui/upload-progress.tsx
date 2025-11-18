import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { X } from "lucide-react"

interface UploadProgressProps {
  fileName: string
  progress: number
  onDismiss: () => void
}

export function UploadProgress({ fileName, progress, onDismiss }: UploadProgressProps) {
  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-4">
      <div className="grid gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Uploading {fileName}</span>
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  )
}

// Helper function to show upload progress toast
export function showUploadProgress(fileName: string, progress: number) {
  toast.custom((t) => (
    <div className="w-full bg-white rounded-lg shadow-lg p-4">
      <div className="grid gap-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Uploading {fileName}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  ), {
    duration: progress === 100 ? 2000 : Infinity,
  });
} 
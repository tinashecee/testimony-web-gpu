import { useState } from "react";
import { Edit, Trash, Play } from "lucide-react";
import { AnnotationModal } from "./AnnotationModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
//import { useToast } from "@/components/ui/toast";
import { recordingsApi } from "@/services/api";
import { formatTimestamp } from "@/lib/utils";

interface Annotation {
  id: string;
  party: string;
  text: string;
  timestamp: string;
}

interface AnnotationsListProps {
  annotations: Annotation[];
  recordingId: number;
  onAnnotationsUpdate: (annotations: Annotation[]) => void;
  onSeekToTime?: (timestamp: string) => void;
}

export default function AnnotationsList({
  annotations,
  recordingId,
  onAnnotationsUpdate,
  onSeekToTime,
}: AnnotationsListProps) {
  //const { toasts, showToast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<{
    annotation: Annotation;
    index: number;
  } | null>(null);

  const handleAddAnnotation = async (data: Omit<Annotation, "id">) => {
    try {
      const newAnnotation = {
        ...data,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      const updatedAnnotations = [...annotations, newAnnotation];

      await recordingsApi.updateRecording(recordingId, {
        annotations: updatedAnnotations,
      });

      onAnnotationsUpdate(updatedAnnotations);
      // showToast("Annotation added successfully");
      setIsAddModalOpen(false);
    } catch (error) {
      /* toast({
        title: "Error",
        description: "Failed to add annotation",
        variant: "destructive",
      });*/
    }
  };

  const handleEditAnnotation = async (data: Omit<Annotation, "id">) => {
    if (!selectedAnnotation) return;

    try {
      const updatedAnnotations = [...annotations];
      updatedAnnotations[selectedAnnotation.index] = {
        ...data,
        id: selectedAnnotation.annotation.id,
      };

      await recordingsApi.updateRecording(recordingId, {
        annotations: updatedAnnotations,
      });

      onAnnotationsUpdate(updatedAnnotations);
      // showToast("Annotation updated successfully");
      setIsEditModalOpen(false);
      setSelectedAnnotation(null);
    } catch (error) {
      // showToast("Error", "Failed to update annotation", "destructive");
    }
  };

  const handleDeleteAnnotation = async () => {
    if (!selectedAnnotation) return;

    try {
      const updatedAnnotations = annotations.filter(
        (_, index) => index !== selectedAnnotation.index
      );

      await recordingsApi.updateRecording(recordingId, {
        annotations: updatedAnnotations,
      });

      onAnnotationsUpdate(updatedAnnotations);
      //showToast("Annotation deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedAnnotation(null);
    } catch (error) {
      /*toast({
        title: "Error",
        description: "Failed to delete annotation",
        variant: "destructive",
      });*/
    }
  };

  return (
    <>
      <div className="space-y-4">
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full bg-green-600 text-white hover:bg-green-700">
          Add Annotation
        </Button>

        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Timestamp</th>
                <th className="px-4 py-2 text-left font-medium">Party</th>
                <th className="px-4 py-2 text-left font-medium">Annotation</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {annotations.map((annotation, index) => (
                <tr key={annotation.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-gray-600">
                    <button
                      onClick={() => {
                        console.log('Annotation timestamp:', annotation.timestamp, 'type:', typeof annotation.timestamp);
                        onSeekToTime?.(annotation.timestamp);
                      }}
                      className="hover:text-blue-600 hover:underline cursor-pointer transition-colors flex items-center gap-1"
                      title={`Jump to ${formatTimestamp(annotation.timestamp)}`}
                    >
                      <Play className="w-3 h-3" />
                      {formatTimestamp(annotation.timestamp)}
                    </button>
                  </td>
                  <td className="px-4 py-2 font-medium">{annotation.party}</td>
                  <td className="px-4 py-2">{annotation.text}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedAnnotation({ annotation, index });
                          setIsEditModalOpen(true);
                        }}
                        className="p-1 hover:bg-gray-100 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAnnotation({ annotation, index });
                          setIsDeleteDialogOpen(true);
                        }}
                        className="p-1 hover:bg-gray-100 rounded">
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnnotationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddAnnotation}
        mode="add"
      />

      <AnnotationModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedAnnotation(null);
        }}
        onSubmit={handleEditAnnotation}
        initialData={selectedAnnotation?.annotation}
        mode="edit"
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Annotation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this annotation? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedAnnotation(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDeleteAnnotation();
                setIsDeleteDialogOpen(false);
                setSelectedAnnotation(null);
              }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
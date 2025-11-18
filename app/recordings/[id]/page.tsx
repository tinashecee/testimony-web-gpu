"use client";

import React from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, FileText } from "lucide-react";
import AudioPlayer, { AudioPlayerRef } from "../../../components/recording/AudioPlayer";
import CaseDetails from "../../../components/recording/CaseDetails";
import AnnotationsList from "../../../components/recording/AnnotationsList";
import { recordingsApi, type Recording } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { PageBreadcrumbs } from "../../../components/PageBreadcrumbs";
import { auditLogger } from "@/services/auditService";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function RecordingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const audioPlayerRef = useRef<AudioPlayerRef>(null);
  
  const resolvedParams = React.use(params);

  useEffect(() => {
    const fetchRecording = async () => {
      try {
        setIsLoading(true);
        const data = await recordingsApi.getRecording(Number(resolvedParams.id));

        // Transform the API data to match our expected format
        const formattedRecording = {
          ...data,
          date: new Date(data.date_stamp).toISOString().split("T")[0],
          time: new Date(data.date_stamp).toLocaleTimeString(),
          judge: data.judge_name,
          caseNumber: data.case_number,
          annotations: Array.isArray(data.annotations)
            ? data.annotations
            : JSON.parse(data.annotations || "[]"),
          transcript: data.transcript || "",
        };

        setRecording(formattedRecording);
        
        // Log recording view event
        if (user?.email) {
          auditLogger.viewRecording(user.email, resolvedParams.id);
        }
      } catch (error) {
        console.error("Error fetching recording:", error);
        /* toast({
          title: "Error",
          description: "Failed to fetch recording details",
          variant: "destructive",
        });*/
      } finally {
        setIsLoading(false);
      }
    };

    if (resolvedParams.id) {
      fetchRecording();
    }
  }, [resolvedParams.id, toast]);

  const handleClose = () => {
    router.back();
  };

  const handleSeekToTime = (timestamp: string) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.seekToTimestamp(timestamp);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-800"></div>
      </div>
    );
  }

  if (!recording) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Recording not found</p>
      </div>
    );
  }

  // Custom breadcrumbs for recording detail page
  const breadcrumbs = [
    { label: "Dashboard", href: "/" },
    { label: "Recordings", href: "/recordings" },
    { label: recording.title }
  ];

  // Rest of your existing JSX remains exactly the same
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Breadcrumbs */}
      <div className="bg-white px-6 py-3 border-b">
        <PageBreadcrumbs customBreadcrumbs={breadcrumbs} />
      </div>
      
      {/* Header */}
      <header className="bg-green-800 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Case Title: {recording.title}</h1>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-green-700 rounded">
          <X className="w-6 h-6" />
        </button>
      </header>

      {/* Main Content */}
      <div className="container mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Audio Player</h2>
            <AudioPlayer
              ref={audioPlayerRef}
              duration={recording.duration}
              file_path={recording.file_path}
            />
          </div>
          <div className="bg-white rounded-lg shadow">
            <CaseDetails recording={recording} />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Transcript Display */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Transcript
              </h2>
            </div>
            {recording.transcript ? (
              <div className="h-96 overflow-hidden">
                <ScrollArea className="h-full w-full">
                  <div className="p-4">
                    <div className="prose prose-sm max-w-none">
                      <div
                        className="whitespace-pre-wrap text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: recording.transcript,
                        }}
                      />
                    </div>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  No Transcript Available
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  This recording does not have a transcript. Upload a transcript using the form below.
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Transcript Upload</h2>
            </div>
            {/* File upload for Word/PDF */}
            <form className="space-y-4">
              <div>
                <label htmlFor="transcriptFile" className="block text-sm font-medium mb-1">Upload Transcript (Word or PDF)</label>
                <input
                  id="transcriptFile"
                  type="file"
                  accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  // onChange={handleFileUpload}
                />
                <p className="text-xs text-muted-foreground mt-2">Accepted formats: .doc, .docx, .pdf</p>
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                // onClick={handleUpload}
              >
                Upload
              </button>
            </form>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Annotations</h2>
              <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                Add Annotation
              </button>
            </div>
            <AnnotationsList
              annotations={recording.annotations}
              recordingId={recording.id}
              onAnnotationsUpdate={(newAnnotations) => {
                setRecording({
                  ...recording,
                  annotations: newAnnotations,
                });
              }}
              onSeekToTime={handleSeekToTime}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

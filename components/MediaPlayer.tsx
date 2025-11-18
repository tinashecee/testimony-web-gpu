"use client"

import type React from "react"

interface Recording {
  id: string
  title: string
  date: string
  court: string
  caseNumber: string
}

interface MediaPlayerProps {
  recording: Recording | null
}

const MediaPlayer: React.FC<MediaPlayerProps> = ({ recording }) => {
  if (!recording) {
    return (
      <div className="bg-white p-4 rounded-md shadow">
        <p className="text-gray-600">Select a recording to play</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-4 rounded-md shadow">
      <h2 className="text-xl font-semibold mb-4">{recording.title}</h2>
      <div className="aspect-w-16 aspect-h-9 bg-gray-200 mb-4">
        {/* Replace this with an actual video player component */}
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-600">Video player placeholder</p>
        </div>
      </div>
      <div className="space-y-2">
        <p>
          <strong>Date:</strong> {recording.date}
        </p>
        <p>
          <strong>Court:</strong> {recording.court}
        </p>
        <p>
          <strong>Case Number:</strong> {recording.caseNumber}
        </p>
      </div>
    </div>
  )
}

export default MediaPlayer


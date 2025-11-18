import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { type Court, type Courtroom } from "@/services/api"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert duration string to HH:MM:SS format
export function formatDuration(duration: string | number): string {
  // Handle various duration formats
  if (!duration && duration !== 0) return "00:00:00"
  
  // Convert to string if it's a number
  const durationStr = duration.toString()
  
  // If already in HH:MM:SS format, return as is
  if (durationStr.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
    return durationStr.padStart(8, '0')
  }
  
  // If in MM:SS format, add hours
  if (durationStr.match(/^\d{1,2}:\d{2}$/)) {
    return `00:${durationStr.padStart(5, '0')}`
  }
  
  // If duration is in seconds (number)
  const seconds = parseInt(durationStr.replace(/[^\d]/g, ''))
  if (!isNaN(seconds)) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  // If contains time indicators (e.g., "1h 30m 45s" or "90m 45s")
  const hourMatch = durationStr.match(/(\d+)h/)
  const minuteMatch = durationStr.match(/(\d+)m/)
  const secondMatch = durationStr.match(/(\d+)s/)
  
  if (hourMatch || minuteMatch || secondMatch) {
    const hours = hourMatch ? parseInt(hourMatch[1]) : 0
    const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0
    const secs = secondMatch ? parseInt(secondMatch[1]) : 0
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  // Fallback - return original if can't parse
  return durationStr
}

// Format file size in human-readable format
export function formatFileSize(bytes: string | number): string {
  if (!bytes || bytes === 0) return "0 B"
  
  const size = typeof bytes === 'string' ? parseInt(bytes.replace(/[^\d]/g, '')) : bytes
  if (isNaN(size)) return "Unknown"
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let unitIndex = 0
  let fileSize = size
  
  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024
    unitIndex++
  }
  
  return `${fileSize.toFixed(1)} ${units[unitIndex]}`
}

// Format timestamp for annotations in HH:MM:SS format
export function formatTimestamp(timestamp: string | number): string {
  if (!timestamp && timestamp !== 0) return "00:00:00"
  
  const timeStr = timestamp.toString()
  console.log('formatTimestamp input:', timestamp, 'type:', typeof timestamp, 'timeStr:', timeStr)
  
  // If already in HH:MM:SS format, return as is
  if (timeStr.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
    console.log('Already in HH:MM:SS format, returning:', timeStr)
    return timeStr
  }
  
  // If in MM:SS format, add hours
  if (timeStr.match(/^\d{1,2}:\d{2}$/)) {
    const result = `00:${timeStr.padStart(5, '0')}`
    console.log('Converting MM:SS to HH:MM:SS:', timeStr, '->', result)
    return result
  }
  
  // If timestamp is in milliseconds or seconds (number)
  const numberValue = parseInt(timeStr.replace(/[^\d]/g, ''))
  if (!isNaN(numberValue)) {
    // If the number is very large (> 3600), it's likely in milliseconds
    const seconds = numberValue > 3600 ? Math.floor(numberValue / 1000) : numberValue
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    const result = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    console.log('Converting', numberValue > 3600 ? 'milliseconds' : 'seconds', 'to HH:MM:SS:', numberValue, '->', result)
    return result
  }
  
  // Fallback - return original if can't parse
  console.log('Could not parse timestamp, returning original:', timeStr)
  return timeStr
}

// Get court name for a recording based on courtroom
export function getCourtNameForRecording(
  recording: { court: string; courtroom: string },
  courts: Court[],
  courtrooms: Courtroom[]
): string {
  // The API already provides the court name, so we can use it directly
  // But we'll still validate it against our courts list for consistency
  if (recording.court) {
    // Check if the court name exists in our courts list
    const courtExists = courts.some(c => c.court_name === recording.court);
    if (courtExists) {
      return recording.court;
    }
  }
  
  // Fallback: try to find court through courtroom mapping
  const courtroom = courtrooms.find(cr => cr.courtroom_name === recording.courtroom);
  if (courtroom) {
    const court = courts.find(c => c.court_id === courtroom.court_id);
    if (court) {
      return court.court_name;
    }
  }
  
  // If all else fails, return the court name from the recording or "Unknown Court"
  return recording.court || "Unknown Court";
}

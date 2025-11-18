"use client";

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Download,
  Loader2,
  VolumeX,
  Settings,
  Waves,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn, formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AudioPlayerProps {
  duration: string;
  file_path: string;
  onSeekToTime?: (timestamp: string) => void;
}

export interface AudioPlayerRef {
  seekToTimestamp: (timestamp: string | number) => void;
}

const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(
  ({ duration: durationProp, file_path, onSeekToTime }, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buffered, setBuffered] = useState(0);
  
  // Noise reduction settings
  const [noiseReductionEnabled, setNoiseReductionEnabled] = useState(false);
  const [noiseGateThreshold, setNoiseGateThreshold] = useState(-30);
  const [lowPassFilter, setLowPassFilter] = useState(8000);
  const [highPassFilter, setHighPassFilter] = useState(80);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [webAudioAvailable, setWebAudioAvailable] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const webAudioRef = useRef<HTMLAudioElement | null>(null); // Separate audio element for Web Audio API
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const noiseGateNodeRef = useRef<GainNode | null>(null);
  const lowPassFilterNodeRef = useRef<BiquadFilterNode | null>(null);
  const highPassFilterNodeRef = useRef<BiquadFilterNode | null>(null);
  const bypassNodeRef = useRef<GainNode | null>(null); // Bypass path for when noise reduction is disabled
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Early return if no file path provided
  if (!file_path || file_path.trim() === "") {
    return (
      <div className="p-4 space-y-4">
        <div className="w-full rounded-lg bg-yellow-50 p-4 text-center">
          <p className="text-yellow-600 text-sm">
            No audio file available for this recording.
          </p>
        </div>
      </div>
    );
  }

  // Only use the filename, not the full path
  const fileName = file_path.split("/").pop() || file_path;
  const encodedPath = encodeURIComponent(fileName);
  const audioUrl = `http://41.220.20.218:5000/recordings/${encodedPath}`;

  // Initialize Web Audio API nodes
  const initializeAudioNodes = useCallback(() => {
    if (!audioRef.current) return;

    // Check if we've already tried to initialize Web Audio API for this audio element
    if (sourceNodeRef.current) {
      setWebAudioAvailable(true);
      return;
    }

    try {
      // Create AudioContext if it doesn't exist
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      
      // Create a separate audio element for Web Audio API processing
      if (!webAudioRef.current) {
        webAudioRef.current = new Audio();
        webAudioRef.current.crossOrigin = "anonymous";
        webAudioRef.current.preload = "metadata";
        webAudioRef.current.src = audioRef.current.src;
        
        // Sync the Web Audio element with the main audio element
        webAudioRef.current.currentTime = audioRef.current.currentTime;
        webAudioRef.current.volume = audioRef.current.volume;
        webAudioRef.current.muted = audioRef.current.muted;
        
        // Sync playback state
        if (!audioRef.current.paused) {
          webAudioRef.current.play();
        }
      }
      
      // Check if the audio element is already connected to a MediaElementSourceNode
      let sourceNode: MediaElementAudioSourceNode;
      
      try {
        // Try to create a new source node using the separate audio element
        sourceNode = audioContext.createMediaElementSource(webAudioRef.current);
        sourceNodeRef.current = sourceNode;
        setWebAudioAvailable(true);
        setDebugInfo("Web Audio API initialized successfully with separate audio element");
      } catch (err) {
        // If it fails, the audio element is already connected
        console.warn("Audio element already connected to MediaElementSourceNode, skipping Web Audio API setup");
        setWebAudioAvailable(false);
        setDebugInfo(`Web Audio API failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        return;
      }
      
      // Create or recreate other nodes
      gainNodeRef.current = audioContext.createGain();
      noiseGateNodeRef.current = audioContext.createGain();
      bypassNodeRef.current = audioContext.createGain();
      
      // Create filters
      lowPassFilterNodeRef.current = audioContext.createBiquadFilter();
      lowPassFilterNodeRef.current.type = 'lowpass';
      lowPassFilterNodeRef.current.frequency.value = lowPassFilter;
      
      highPassFilterNodeRef.current = audioContext.createBiquadFilter();
      highPassFilterNodeRef.current.type = 'highpass';
      highPassFilterNodeRef.current.frequency.value = highPassFilter;
      
      // Disconnect any existing connections
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      gainNodeRef.current.disconnect();
      noiseGateNodeRef.current.disconnect();
      bypassNodeRef.current.disconnect();
      highPassFilterNodeRef.current.disconnect();
      lowPassFilterNodeRef.current.disconnect();
      
      // Create a parallel processing chain with bypass
      // Main chain: source -> gain -> noiseGate -> highPass -> lowPass -> destination
      // Bypass chain: source -> gain -> bypass -> destination
      sourceNodeRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(noiseGateNodeRef.current);
      gainNodeRef.current.connect(bypassNodeRef.current);
      noiseGateNodeRef.current.connect(highPassFilterNodeRef.current);
      highPassFilterNodeRef.current.connect(lowPassFilterNodeRef.current);
      lowPassFilterNodeRef.current.connect(audioContext.destination);
      bypassNodeRef.current.connect(audioContext.destination);
      
      // Set initial volume
      gainNodeRef.current.gain.value = volume;
      
      console.log("Web Audio API initialized successfully");
      setDebugInfo("Web Audio API initialized successfully");
      
    } catch (err) {
      console.error("Error initializing audio nodes:", err);
      setWebAudioAvailable(false);
    }
  }, [lowPassFilter, highPassFilter]);

  // Update noise reduction settings
  const updateNoiseReduction = useCallback(() => {
    // Only proceed if Web Audio API is available and we have all the necessary nodes
    if (!webAudioAvailable || !sourceNodeRef.current || !gainNodeRef.current || !audioContextRef.current) {
      console.log("Web Audio API not available for noise reduction");
      return;
    }

    try {
      // Update filter frequencies without disconnecting
      if (lowPassFilterNodeRef.current) {
        lowPassFilterNodeRef.current.frequency.value = lowPassFilter;
      }
      if (highPassFilterNodeRef.current) {
        highPassFilterNodeRef.current.frequency.value = highPassFilter;
      }
      
      // Control noise reduction through bypass system
      if (noiseGateNodeRef.current && bypassNodeRef.current) {
        if (noiseReductionEnabled) {
          // Enable noise reduction: turn on filtered path, turn off bypass
          noiseGateNodeRef.current.gain.value = 1.0;
          bypassNodeRef.current.gain.value = 0.0;
        } else {
          // Disable noise reduction: turn off filtered path, turn on bypass
          noiseGateNodeRef.current.gain.value = 0.0;
          bypassNodeRef.current.gain.value = 1.0;
        }
      }
    } catch (err) {
      console.error("Error updating noise reduction:", err);
    }
  }, [noiseReductionEnabled, lowPassFilter, highPassFilter, webAudioAvailable]);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.crossOrigin = "anonymous";
      audioRef.current.preload = "metadata"; // Only load metadata initially
    }

    const audio = audioRef.current;
    
    // Reset Web Audio API state when audio source changes
    if (audio.src !== audioUrl) {
      // Clean up existing Web Audio nodes
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch (err) {
          console.error("Error disconnecting source node:", err);
        }
        sourceNodeRef.current = null;
      }
      if (gainNodeRef.current) {
        try {
          gainNodeRef.current.disconnect();
        } catch (err) {
          console.error("Error disconnecting gain node:", err);
        }
        gainNodeRef.current = null;
      }
      if (noiseGateNodeRef.current) {
        try {
          noiseGateNodeRef.current.disconnect();
        } catch (err) {
          console.error("Error disconnecting noise gate node:", err);
        }
        noiseGateNodeRef.current = null;
      }
      if (highPassFilterNodeRef.current) {
        try {
          highPassFilterNodeRef.current.disconnect();
        } catch (err) {
          console.error("Error disconnecting high pass filter node:", err);
        }
        highPassFilterNodeRef.current = null;
      }
      if (lowPassFilterNodeRef.current) {
        try {
          lowPassFilterNodeRef.current.disconnect();
        } catch (err) {
          console.error("Error disconnecting low pass filter node:", err);
        }
        lowPassFilterNodeRef.current = null;
      }
      
      // Reset Web Audio availability
      setWebAudioAvailable(false);
    }
    
    audio.src = audioUrl;

    // Initialize Web Audio nodes after audio is loaded
    audio.addEventListener('canplay', () => {
      initializeAudioNodes();
    });

    // Event listeners
    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setAudioDuration(audio.duration);
    };

    const handleCanPlayThrough = () => {
      setIsLoading(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      // Resume AudioContext if it was suspended
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      console.error("Audio error:", e);
      setError("Error loading audio file. Please check if the file exists.");
      setIsLoading(false);
    };

    const handleProgress = () => {
      if (audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const bufferedPercent = (bufferedEnd / audio.duration) * 100;
        setBuffered(bufferedPercent);
      }
    };

    // Add event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('progress', handleProgress);

    // Start progress tracking
    const updateProgress = () => {
      if (audio && !audio.paused) {
        setCurrentTime(audio.currentTime);
      }
    };

    progressIntervalRef.current = setInterval(updateProgress, 100);

    return () => {
      // Remove event listeners
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('progress', handleProgress);

      // Clear interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      // Pause and reset audio
      if (audio) {
        audio.pause();
        audio.src = '';
      }

      // Clean up audio nodes
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch (err) {
          console.error("Error disconnecting source node:", err);
        }
      }
      if (gainNodeRef.current) {
        try {
          gainNodeRef.current.disconnect();
        } catch (err) {
          console.error("Error disconnecting gain node:", err);
        }
      }
      if (noiseGateNodeRef.current) {
        try {
          noiseGateNodeRef.current.disconnect();
        } catch (err) {
          console.error("Error disconnecting noise gate node:", err);
        }
      }
      if (highPassFilterNodeRef.current) {
        try {
          highPassFilterNodeRef.current.disconnect();
        } catch (err) {
          console.error("Error disconnecting high pass filter node:", err);
        }
      }
      if (lowPassFilterNodeRef.current) {
        try {
          lowPassFilterNodeRef.current.disconnect();
        } catch (err) {
          console.error("Error disconnecting low pass filter node:", err);
        }
      }
      if (bypassNodeRef.current) {
        try {
          bypassNodeRef.current.disconnect();
        } catch (err) {
          console.error("Error disconnecting bypass node:", err);
        }
      }
      
      // Clean up Web Audio element
      if (webAudioRef.current) {
        try {
          webAudioRef.current.pause();
          webAudioRef.current.src = '';
        } catch (err) {
          console.error("Error cleaning up Web Audio element:", err);
        }
        webAudioRef.current = null;
      }
    };
  }, [audioUrl, initializeAudioNodes]);

  // Update noise reduction when settings change
  useEffect(() => {
    updateNoiseReduction();
  }, [updateNoiseReduction]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        // Sync with Web Audio element if available
        if (webAudioRef.current) {
          webAudioRef.current.pause();
        }
      } else {
        audioRef.current.play();
        // Sync with Web Audio element if available
        if (webAudioRef.current) {
          webAudioRef.current.play();
        }
      }
    } catch (err) {
      console.error("Error toggling play/pause:", err);
      setError("Error controlling playback");
    }
  }, [isPlaying]);

  const handleSkipForward = useCallback(() => {
    if (!audioRef.current) return;

    try {
      const newTime = Math.min(audioRef.current.currentTime + 5, audioRef.current.duration);
      audioRef.current.currentTime = newTime;
      // Sync with Web Audio element if available
      if (webAudioRef.current) {
        webAudioRef.current.currentTime = newTime;
      }
    } catch (err) {
      console.error("Error skipping forward:", err);
    }
  }, []);

  const handleSkipBackward = useCallback(() => {
    if (!audioRef.current) return;

    try {
      const newTime = Math.max(audioRef.current.currentTime - 5, 0);
      audioRef.current.currentTime = newTime;
      // Sync with Web Audio element if available
      if (webAudioRef.current) {
        webAudioRef.current.currentTime = newTime;
      }
    } catch (err) {
      console.error("Error skipping backward:", err);
    }
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0] / 100; // Convert from 0-100 range to 0-1 range
    
    // Try Web Audio API first
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    } else if (audioRef.current) {
      // Fallback to direct audio element volume control
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    // Try Web Audio API first
    if (gainNodeRef.current) {
      if (isMuted) {
        gainNodeRef.current.gain.value = volume;
        setIsMuted(false);
      } else {
        gainNodeRef.current.gain.value = 0;
        setIsMuted(true);
      }
    } else if (audioRef.current) {
      // Fallback to direct audio element volume control
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  const handleSeek = useCallback((value: number[]) => {
    if (!audioRef.current) return;

    const seekTime = (value[0] / 100) * audioRef.current.duration;
    audioRef.current.currentTime = seekTime;
    // Sync with Web Audio element if available
    if (webAudioRef.current) {
      webAudioRef.current.currentTime = seekTime;
    }
  }, []);

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [audioUrl, fileName]);

  const formatTime = useCallback((time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Convert timestamp string (HH:MM:SS) to seconds
  const timestampToSeconds = useCallback((timestamp: string | number): number => {
    console.log('timestampToSeconds called with:', timestamp, 'type:', typeof timestamp);
    
    // Handle different input types
    if (typeof timestamp === 'number') {
      console.log('Number timestamp, returning as seconds:', timestamp);
      return timestamp;
    }
    
    if (typeof timestamp !== 'string') {
      console.warn('Invalid timestamp format:', timestamp, 'type:', typeof timestamp);
      return 0;
    }
    
    // Handle empty or invalid strings
    if (!timestamp || timestamp.trim() === '') {
      console.log('Empty timestamp, returning 0');
      return 0;
    }
    
    try {
      const parts = timestamp.split(':').map(Number);
      console.log('Parsed timestamp parts:', parts);
      
      if (parts.length === 3) {
        // HH:MM:SS format
        const seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        console.log('HH:MM:SS format, calculated seconds:', seconds);
        return seconds;
      } else if (parts.length === 2) {
        // MM:SS format
        const seconds = parts[0] * 60 + parts[1];
        console.log('MM:SS format, calculated seconds:', seconds);
        return seconds;
      } else if (parts.length === 1) {
        // SS format (just seconds)
        console.log('SS format, returning seconds:', parts[0]);
        return parts[0];
      }
      console.log('No valid format found, returning 0');
      return 0;
    } catch (error) {
      console.error('Error parsing timestamp:', timestamp, error);
      return 0;
    }
  }, []);

  // Seek to a specific timestamp
  const seekToTimestamp = useCallback((timestamp: string | number) => {
    if (!audioRef.current) return;

    try {
      const seconds = timestampToSeconds(timestamp);
      
      // Validate the calculated seconds
      if (isNaN(seconds) || seconds < 0) {
        console.warn('Invalid timestamp value:', timestamp, 'calculated seconds:', seconds);
        return;
      }
      
      const clampedSeconds = Math.max(0, Math.min(seconds, audioRef.current.duration));
      
      audioRef.current.currentTime = clampedSeconds;
      // Sync with Web Audio element if available
      if (webAudioRef.current) {
        webAudioRef.current.currentTime = clampedSeconds;
      }
      
      // Call the callback if provided
      if (onSeekToTime) {
        onSeekToTime(typeof timestamp === 'string' ? timestamp : timestamp.toString());
      }
      
      console.log(`Seeking to timestamp: ${timestamp} (${clampedSeconds} seconds)`);
    } catch (err) {
      console.error("Error seeking to timestamp:", err);
    }
  }, [timestampToSeconds, onSeekToTime]);

  const progressPercent = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  // Expose the seekToTimestamp function via ref
  useImperativeHandle(ref, () => ({
    seekToTimestamp,
  }), [seekToTimestamp]);

  return (
    <div className="p-4 space-y-4">
      {error && (
        <div className="w-full rounded-lg bg-red-50 p-4 text-center">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="relative">
          {/* Buffered progress */}
          <div className="absolute inset-0 bg-gray-200 rounded-full">
            <div 
              className="bg-gray-300 h-full rounded-full transition-all duration-300"
              style={{ width: `${buffered}%` }}
            />
          </div>
          {/* Playback progress */}
          <Slider
            value={[progressPercent]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="relative z-10"
          />
        </div>
                 <div className="flex justify-between text-xs text-muted-foreground">
           <span>{formatTime(currentTime)}</span>
           <span>{formatTime(audioDuration)}</span>
         </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkipBackward}
            disabled={isLoading}
            className="p-2"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            onClick={togglePlayPause}
            disabled={isLoading}
            className="p-3"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSkipForward}
            disabled={isLoading}
            className="p-2"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMute}
            className="p-2"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>

          <div className="w-20">
            <Slider
              value={[isMuted ? 0 : Math.round(volume * 100)]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAudioSettings(!showAudioSettings)}
            className="p-2"
          >
            <Waves className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="p-2"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Audio Settings Panel */}
      {showAudioSettings && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-medium">Audio Enhancement</h3>
          
          {!webAudioAvailable && (
            <div className="w-full rounded-lg bg-yellow-50 p-3 text-center space-y-2">
              <p className="text-yellow-600 text-xs">
                Web Audio API not available. Audio enhancement features are disabled.
              </p>
              {debugInfo && (
                <p className="text-gray-500 text-xs">
                  Debug: {debugInfo}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Reset Web Audio state and try again
                  setWebAudioAvailable(false);
                  setNoiseReductionEnabled(false);
                  setDebugInfo("");
                  sourceNodeRef.current = null;
                  gainNodeRef.current = null;
                  noiseGateNodeRef.current = null;
                  highPassFilterNodeRef.current = null;
                  lowPassFilterNodeRef.current = null;
                  bypassNodeRef.current = null;
                  
                  // Clean up Web Audio element
                  if (webAudioRef.current) {
                    try {
                      webAudioRef.current.pause();
                      webAudioRef.current.src = '';
                    } catch (err) {
                      console.error("Error cleaning up Web Audio element:", err);
                    }
                    webAudioRef.current = null;
                  }
                  
                  // Small delay to ensure cleanup is complete
                  setTimeout(() => {
                    initializeAudioNodes();
                  }, 100);
                }}
                className="text-xs"
              >
                Retry Web Audio Setup
              </Button>
            </div>
          )}
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="noise-reduction" className="text-sm">
                Noise Reduction
              </Label>
              <Switch
                id="noise-reduction"
                checked={noiseReductionEnabled && webAudioAvailable}
                onCheckedChange={(enabled) => {
                  if (webAudioAvailable) {
                    setNoiseReductionEnabled(enabled);
                  } else {
                    console.log("Cannot enable noise reduction: Web Audio API not available");
                  }
                }}
                disabled={!webAudioAvailable}
              />
            </div>

            {noiseReductionEnabled && webAudioAvailable && (
              <div className="space-y-3 pl-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    High Pass Filter: {highPassFilter}Hz
                  </Label>
                  <Slider
                    value={[highPassFilter]}
                    onValueChange={(value) => setHighPassFilter(value[0])}
                    min={20}
                    max={500}
                    step={10}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Low Pass Filter: {lowPassFilter}Hz
                  </Label>
                  <Slider
                    value={[lowPassFilter]}
                    onValueChange={(value) => setLowPassFilter(value[0])}
                    min={1000}
                    max={20000}
                    step={100}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="text-center text-sm text-muted-foreground">
          Loading audio file...
        </div>
      )}
    </div>
  );
});

export default AudioPlayer;

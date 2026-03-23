import React, { useEffect, useRef, useState, useCallback } from "react";
import { Mic, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * VOICE COMMAND CAPTURE — Web Speech API Integration
 * Captures voice commands and converts to text
 * Auto-stops after silence, shows live transcript preview
 */
export function VoiceCommandCapture({ onTranscript, disabled = false }) {
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const silenceTimeoutRef = useRef(null);
  const SILENCE_THRESHOLD = 2000; // 2 seconds of silence

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech Recognition not supported in this browser");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    // Configuration
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.language = "en-US";

    // On result: accumulate transcript and detect silence
    recognition.onresult = (event) => {
      let interim = "";
      let isFinal = false;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          isFinal = true;
        } else {
          interim += transcript;
        }
      }

      if (isFinal) {
        setTranscript((prev) => prev + " " + interim);
      } else {
        setTranscript((prev) => (prev ? prev.split(" ").slice(0, -1).join(" ") : "") + " " + interim);
      }

      // Reset silence timeout on each result
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      silenceTimeoutRef.current = setTimeout(() => {
        stopListening();
      }, SILENCE_THRESHOLD);
    };

    // On error
    recognition.onerror = (event) => {
      if (event.error !== "no-speech") {
        setError(`Error: ${event.error}`);
      }
    };

    // On end
    recognition.onend = () => {
      setIsListening(false);
    };

    return () => {
      if (recognition) {
        recognition.stop();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || disabled) return;
    setTranscript("");
    setError(null);
    setIsListening(true);
    recognitionRef.current.start();

    // Auto-stop after 30 seconds max
    setTimeout(() => {
      if (isListening) {
        stopListening();
      }
    }, 30000);
  }, [disabled, isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);

    // Emit final transcript
    if (transcript.trim()) {
      onTranscript(transcript.trim());
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
  }, [transcript, onTranscript]);

  const handleCancel = useCallback(() => {
    setTranscript("");
    setError(null);
    stopListening();
  }, [stopListening]);

  return (
    <div className="space-y-2">
      {isListening ? (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-violet-500/30 bg-violet-500/5">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-violet-300">Listening…</span>
            </div>
            {transcript && (
              <p className="text-xs text-foreground italic">{transcript}</p>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button
          onClick={startListening}
          disabled={disabled || !recognitionRef.current}
          variant="outline"
          size="sm"
          className="w-full gap-2"
        >
          <Mic className="w-4 h-4" />
          Start Voice Command
        </Button>
      )}
      {error && (
        <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
          {error}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "../../components/ui/button";
// Tooltip component seems missing in the UI library, falling back to native title
import { toast } from "../../hooks/use-toast";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  isListening?: boolean;
  onListeningChange?: (isListening: boolean) => void;
  disabled?: boolean;
  language?: string;
}

export default function VoiceInput({
  onTranscript,
  isListening: externalIsListening,
  onListeningChange,
  disabled = false,
  language = "en-US", // Default to English, but should be dynamic based on user pref
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Sync internal state with external prop if provided
  useEffect(() => {
    if (externalIsListening !== undefined) {
      setIsListening(externalIsListening);
    }
  }, [externalIsListening]);

  useEffect(() => {
    // Check browser support
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      setIsSupported(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = language;

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === "not-allowed") {
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access to use voice input.",
          variant: "destructive",
        });
      }
      stopListening();
    };

    recognitionRef.current.onend = () => {
      if (isListening) {
        // If it stopped but we think we're still listening, restart it (unless explicitly stopped)
        // However, for simple implementation, let's just stop.
        stopListening();
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
      onListeningChange?.(true);
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
    onListeningChange?.(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return null; // Or render a disabled button with tooltip explaining support
  }

  return (
    <Button
      type="button"
      variant={isListening ? "destructive" : "outline"}
      size="icon"
      onClick={toggleListening}
      disabled={disabled}
      title={isListening ? "Stop listening" : "Dictate note (Voice to Text)"}
      className={`transition-all duration-300 ${
        isListening ? "animate-pulse ring-2 ring-red-400 ring-offset-2" : ""
      }`}
    >
      {isListening ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
      <span className="sr-only">
        {isListening ? "Stop recording" : "Start recording"}
      </span>
    </Button>
  );
}

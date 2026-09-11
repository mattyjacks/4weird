"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Camera, Monitor, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScreenTrackerProps {
  isRunning: boolean;
  entryId: string | null;
  onActivityLogged?: (score: number) => void;
}

export function ScreenTracker({ isRunning, entryId }: ScreenTrackerProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [blurSensitive, setBlurSensitive] = useState(true);
  const [lastCaptureUrl, setLastCaptureUrl] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [activityScore, setActivityScore] = useState(100);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const userActionsRef = useRef(0);

  // Monitor user input activity on page while running
  useEffect(() => {
    if (!isRunning) return;

    const handleUserAction = () => {
      userActionsRef.current += 1;
    };

    window.addEventListener("keydown", handleUserAction);
    window.addEventListener("mousemove", handleUserAction);
    window.addEventListener("click", handleUserAction);

    // Calculate 10-second activity score
    const actInterval = setInterval(() => {
      const actions = userActionsRef.current;
      // Normal human work: ~5-30 actions per 10s
      const calculated = Math.min(Math.round((actions / 15) * 100), 100);
      setActivityScore(Math.max(calculated, 10)); // minimum baseline 10%
      userActionsRef.current = 0;
    }, 10000);

    return () => {
      window.removeEventListener("keydown", handleUserAction);
      window.removeEventListener("mousemove", handleUserAction);
      window.removeEventListener("click", handleUserAction);
      clearInterval(actInterval);
    };
  }, [isRunning]);

  // Request display media for work diary
  const startScreenCapture = async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        alert("Screen capture is not supported by your browser.");
        return;
      }

      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: false,
      });

      setStream(mediaStream);
      setIsCapturing(true);

      // Take initial snapshot
      takeSnapshot(mediaStream);

      // Take periodic snapshot every 10 minutes (or manual)
      intervalRef.current = setInterval(() => {
        takeSnapshot(mediaStream);
      }, 10 * 60 * 1000);

      mediaStream.getVideoTracks()[0].onended = () => {
        stopScreenCapture();
      };
    } catch (err) {
      console.warn("Screen capture permission was cancelled or failed", err);
      setIsCapturing(false);
    }
  };

  const stopScreenCapture = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsCapturing(false);
  }, [stream]);

  const takeSnapshot = async (activeStream = stream) => {
    if (!activeStream || !entryId) return;

    try {
      const track = activeStream.getVideoTracks()[0];
      if (!track || track.readyState !== "live") return;

      const video = document.createElement("video");
      video.srcObject = activeStream;
      await video.play();

      const canvas = document.createElement("canvas");
      // thumbnail scale for privacy & performance
      canvas.width = 480;
      canvas.height = 270;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (blurSensitive) {
        ctx.filter = "blur(4px)";
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

      setLastCaptureUrl(dataUrl);
      setCaptureCount((prev) => prev + 1);

      // Upload capture proof
      await fetch("/api/time/screenshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId,
          imageUrl: dataUrl,
          isBlurred: blurSensitive,
          activityLevel: activityScore,
          memo: `Work diary proof #${captureCount + 1}`,
        }),
      });
    } catch (e) {
      console.error("Failed to take screen snapshot", e);
    }
  };

  useEffect(() => {
    if (!isRunning && isCapturing) {
      stopScreenCapture();
    }
  }, [isRunning, isCapturing, stopScreenCapture]);

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-cyan-400" />
          <span className="font-semibold text-sm text-white">Work-Diary Screen Proofs</span>
          {isCapturing && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Recording Proofs
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBlurSensitive(!blurSensitive)}
            className={`text-xs gap-1 border-white/10 ${blurSensitive ? "bg-cyan-950/40 text-cyan-300" : "text-zinc-400"}`}
          >
            <EyeOff className="h-3.5 w-3.5" />
            {blurSensitive ? "Privacy Blur: ON" : "Privacy Blur: OFF"}
          </Button>

          {!isCapturing ? (
            <Button
              size="sm"
              disabled={!isRunning}
              onClick={startScreenCapture}
              className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              <Camera className="h-3.5 w-3.5 mr-1" />
              Enable Screen Diary
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={stopScreenCapture}
              className="text-xs"
            >
              Stop Screen Diary
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-400 border-t border-white/5 pt-2">
        <div className="flex items-center gap-4">
          <span>Activity Score: <strong className="text-white font-mono">{activityScore}%</strong></span>
          <span>Proof Snapshots Taken: <strong className="text-white font-mono">{captureCount}</strong></span>
        </div>
        {isCapturing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => takeSnapshot()}
            className="h-6 text-xs text-cyan-400 hover:text-cyan-300"
          >
            Take Snapshot Now
          </Button>
        )}
      </div>

      {lastCaptureUrl && (
        <div className="pt-2 border-t border-white/5 flex items-center gap-3">
          <Image
            src={lastCaptureUrl}
            alt="Latest screen capture preview"
            width={96}
            height={56}
            unoptimized
            className="w-24 h-14 rounded border border-white/20 object-cover"
          />
          <div className="text-xs text-zinc-400">
            <p className="text-white font-medium">Latest Screen Proof Preview</p>
            <p className="text-zinc-500">Captured at {new Date().toLocaleTimeString()} • {blurSensitive ? "Blurred for privacy" : "Clear capture"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

def get_section_2():
    return '''---

# 3. FEATURE IMPLEMENTATION GUIDES: CRYPTARTISTSTUDIO SUITE

---

## 3.1 Feature 01: Media Mogul (MMo) — Web Video Timeline & Multi-Track Studio

### Architectural Blueprint
Media Mogul in 4weird provides an in-browser video editor specifically built for game creators, clan leaders, and 3D animators. It runs on HTML5 Canvas + WebCodecs and allows combining gameplay clips, 3D Blender renders, fal.ai video generations, and ElevenLabs voiceovers into a polished video file.

```
+-----------------------------------------------------------------------------------+
| Media Mogul Architecture (app/studio/video)                                       |
+-----------------------------------------------------------------------------------+
|  [ Media Library ]  |                    [ Video Preview Viewport ]               |
|  - Uploads          |                    HTML5 Canvas 60 FPS                      |
|  - fal.ai Generations|                                                            |
|  - Blender Renders  |-------------------------------------------------------------|
|  - Audio Tracks     |  [ Timeline Controls: Play, Split, Ripple, Snap, Zoom ]     |
|                     |-------------------------------------------------------------|
|                     | Video Track 1: [ Clip A ]---------[ Clip B ]--------        |
|                     | Video Track 2: ------[ Overlay Sprite / Watermark ]         |
|                     | Audio Track 1: [ Background Music (GiveGigs / fal) ]------  |
|                     | Audio Track 2: ---------[ ElevenLabs Voiceover ]----------  |
+-----------------------------------------------------------------------------------+
```

### TypeScript Data Structures (`types/studio-video.ts`)

```typescript
export interface VideoClip {
  id: string;
  name: string;
  sourceUrl: string;
  trackIndex: number;
  startOffsetSeconds: number; // Position on timeline
  durationSeconds: number;
  trimInSeconds: number;      // Trim inside source
  trimOutSeconds: number;
  volume: number;             // 0.0 to 1.0
  playbackRate: number;
  opacity: number;
  zIndex: number;
  effects: VideoEffect[];
}

export interface VideoEffect {
  type: "color_grade" | "blur" | "chroma_key" | "speed" | "fade";
  params: Record<string, number | string | boolean>;
}

export interface TimelineState {
  currentTimeSeconds: number;
  totalDurationSeconds: number;
  isPlaying: boolean;
  zoomLevel: number;          // Pixels per second
  snapToGrid: boolean;
  selectedClipId: string | null;
  clips: VideoClip[];
}
```

### Core Timeline Engine Implementation (`components/studio/video-timeline.tsx`)

```tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { VideoClip, TimelineState } from "@/types/studio-video";

interface TimelineProps {
  timeline: TimelineState;
  onTimelineChange: (next: TimelineState) => void;
  onSeek: (timeSeconds: number) => void;
}

export function VideoTimeline({ timeline, onTimelineChange, onSeek }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  const handlePointerDownPlayhead = (e: React.PointerEvent) => {
    setIsDraggingPlayhead(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDraggingPlayhead || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left);
    const newTime = x / timeline.zoomLevel;
    onSeek(Math.min(newTime, timeline.totalDurationSeconds));
  }, [isDraggingPlayhead, timeline.zoomLevel, timeline.totalDurationSeconds, onSeek]);

  const handlePointerUp = useCallback(() => {
    setIsDraggingPlayhead(false);
  }, []);

  useEffect(() => {
    if (isDraggingPlayhead) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };
    }
  }, [isDraggingPlayhead, handlePointerMove, handlePointerUp]);

  const splitClipAtPlayhead = () => {
    if (!timeline.selectedClipId) return;
    const clip = timeline.clips.find(c => c.id === timeline.selectedClipId);
    if (!clip) return;

    const playhead = timeline.currentTimeSeconds;
    if (playhead <= clip.startOffsetSeconds || playhead >= clip.startOffsetSeconds + clip.durationSeconds) {
      return; // Playhead not within selected clip
    }

    const firstDuration = playhead - clip.startOffsetSeconds;
    const secondDuration = clip.durationSeconds - firstDuration;

    const clip1: VideoClip = {
      ...clip,
      durationSeconds: firstDuration,
      trimOutSeconds: clip.trimInSeconds + firstDuration,
    };

    const clip2: VideoClip = {
      ...clip,
      id: crypto.randomUUID(),
      startOffsetSeconds: playhead,
      durationSeconds: secondDuration,
      trimInSeconds: clip.trimInSeconds + firstDuration,
    };

    const nextClips = timeline.clips.filter(c => c.id !== clip.id).concat([clip1, clip2]);
    onTimelineChange({
      ...timeline,
      clips: nextClips,
      selectedClipId: clip2.id
    });
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden select-none">
      {/* Action Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSeek(0)}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded font-bold text-slate-300"
          >
            |&lt; Start
          </button>
          <button
            onClick={splitClipAtPlayhead}
            disabled={!timeline.selectedClipId}
            className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-xs rounded font-bold text-white"
          >
            ✂️ Split Clip (Razor)
          </button>
        </div>
        <div className="text-xs font-mono text-cyan-300">
          {timeline.currentTimeSeconds.toFixed(2)}s / {timeline.totalDurationSeconds.toFixed(2)}s
        </div>
      </div>

      {/* Tracks Container */}
      <div
        ref={containerRef}
        className="relative h-48 overflow-x-auto overflow-y-hidden bg-slate-950 p-2 cursor-crosshair"
      >
        {/* Playhead Marker */}
        <div
          style={{ left: `${timeline.currentTimeSeconds * timeline.zoomLevel}px` }}
          onPointerDown={handlePointerDownPlayhead}
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-auto cursor-ew-resize"
        >
          <div className="w-3 h-3 -ml-1.5 bg-red-500 rounded-full" />
        </div>

        {/* Tracks */}
        {[0, 1].map((trackIdx) => (
          <div key={trackIdx} className="h-16 relative border-b border-slate-800/80 mb-2 rounded bg-slate-900/50">
            <span className="absolute left-2 top-1 text-[10px] uppercase font-bold text-slate-600 pointer-events-none">
              Track {trackIdx + 1}
            </span>
            {timeline.clips
              .filter((c) => c.trackIndex === trackIdx)
              .map((clip) => (
                <div
                  key={clip.id}
                  onClick={() => onTimelineChange({ ...timeline, selectedClipId: clip.id })}
                  style={{
                    left: `${clip.startOffsetSeconds * timeline.zoomLevel}px`,
                    width: `${clip.durationSeconds * timeline.zoomLevel}px`,
                  }}
                  className={`absolute top-3 bottom-1 rounded px-2 text-xs font-semibold flex items-center justify-between border cursor-pointer ${
                    timeline.selectedClipId === clip.id
                      ? "bg-cyan-600/60 border-cyan-400 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                  }`}
                >
                  <span className="truncate">{clip.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">{clip.durationSeconds.toFixed(1)}s</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Tips for How to Code Media Mogul
1. **Never Decode Entire Videos in Memory:**
   Use HTML5 `<video>` elements tied to canvas draw frames via `requestVideoFrameCallback()` instead of reading raw Uint8Array buffers directly. This prevents memory leaks and browser tab crashes during 4K clip editing.
2. **Audio Syncing Standard:**
   Always drive clock timing from the primary AudioContext (`audioCtx.currentTime`), rather than `requestAnimationFrame`. Audio clocks do not drift under heavy GPU or DOM load.
3. **RunPod Cloud Rendering Export:**
   For final high-resolution MP4 delivery, do not attempt to render heavy 1080p60 exports in client JavaScript. Package the timeline state as JSON and POST it to `/api/compute/render-video` to dispatch a headless FFmpeg instance on an RTX 4090 RunPod node.

---

## 3.2 Feature 02: DictatePic (D(pi)c) — GIMP-Style Layered Canvas & Sprite Editor

### Architectural Blueprint
DictatePic brings a full raster painting and pixel-art sprite editing studio to 4weird (`app/studio/image`). It is designed to support 4weird game modders and artists working on GraveGain 2D/3D textures and NewGamePlus assets.

```
+-----------------------------------------------------------------------------------+
| DictatePic Canvas Architecture                                                    |
+-----------------------------------------------------------------------------------+
|  [ Tool Palette (28 Tools) ] |         [ Multi-Layer Viewport Canvas ]            |
|  - Marquee / Lasso Select     |         Checkerboard Transparency Background      |
|  - Brush, Pencil, Eraser      |         Rulers: Horizontal & Vertical             |
|  - Fill Bucket, Gradient      |         Zoom: 10% - 800%                          |
|  - Clone Stamp, Smudge, Blur  |---------------------------------------------------|
|  - AI Inpainting Brush        |  [ Layers Stack ]        | [ Properties / History]|
|  - AI Background Remover      |  Layer 3: Hair [Normal]  | Brush Size: 16px       |
|  - AI Upscaler (x4)           |  Layer 2: Skin [Multiply]| Opacity: 100%          |
|  - Slice Spritesheet          |  Layer 1: Base [Normal]  | Undo History: 40 steps |
+-----------------------------------------------------------------------------------+
```

### TypeScript Data Structures (`types/dictate-pic.ts`)

```typescript
export type BlendMode =
  | "source-over"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn";

export interface CanvasLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0.0 to 1.0
  blendMode: BlendMode;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export type ActiveTool =
  | "brush"
  | "pencil"
  | "eraser"
  | "bucket"
  | "eyedropper"
  | "marquee"
  | "lasso"
  | "clone_stamp"
  | "ai_inpaint"
  | "ai_remove_bg"
  | "slice";
```

### Core Canvas Multi-Layer Engine (`components/studio/dictate-canvas.tsx`)

```tsx
"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { CanvasLayer, ActiveTool } from "@/types/dictate-pic";

export function DictateCanvas() {
  const [layers, setLayers] = useState<CanvasLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string>("");
  const [activeTool, setActiveTool] = useState<ActiveTool>("brush");
  const [brushColor, setBrushColor] = useState<string>("#22d3ee");
  const [brushSize, setBrushSize] = useState<number>(4);
  const [isDrawing, setIsDrawing] = useState(false);

  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const width = 512;
  const height = 512;

  useEffect(() => {
    const baseCanvas = document.createElement("canvas");
    baseCanvas.width = width;
    baseCanvas.height = height;
    const baseCtx = baseCanvas.getContext("2d", { willReadFrequently: true })!;

    const initialLayer: CanvasLayer = {
      id: crypto.randomUUID(),
      name: "Background",
      visible: true,
      locked: false,
      opacity: 1.0,
      blendMode: "source-over",
      canvas: baseCanvas,
      ctx: baseCtx
    };

    setLayers([initialLayer]);
    setActiveLayerId(initialLayer.id);
  }, []);

  const compositeLayers = useCallback(() => {
    const displayCanvas = displayCanvasRef.current;
    if (!displayCanvas) return;
    const ctx = displayCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);

    const squareSize = 16;
    for (let x = 0; x < width; x += squareSize) {
      for (let y = 0; y < height; y += squareSize) {
        ctx.fillStyle = (x / squareSize + y / squareSize) % 2 === 0 ? "#1e293b" : "#0f172a";
        ctx.fillRect(x, y, squareSize, squareSize);
      }
    }

    for (const layer of layers) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }
  }, [layers]);

  useEffect(() => {
    compositeLayers();
  }, [layers, compositeLayers]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const active = layers.find((l) => l.id === activeLayerId);
    if (!active || active.locked) return;

    setIsDrawing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    active.ctx.beginPath();
    active.ctx.moveTo(x, y);
    active.ctx.strokeStyle = activeTool === "eraser" ? "rgba(0,0,0,1)" : brushColor;
    active.ctx.lineWidth = brushSize;
    active.ctx.lineCap = "round";
    active.ctx.lineJoin = "round";

    if (activeTool === "eraser") {
      active.ctx.globalCompositeOperation = "destination-out";
    } else {
      active.ctx.globalCompositeOperation = "source-over";
    }

    active.ctx.lineTo(x, y);
    active.ctx.stroke();
    compositeLayers();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const active = layers.find((l) => l.id === activeLayerId);
    if (!active || active.locked) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    active.ctx.lineTo(x, y);
    active.ctx.stroke();
    compositeLayers();
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  return (
    <div className="flex gap-4 p-4 bg-slate-950 text-white rounded-2xl border border-slate-800">
      <div className="flex flex-col gap-2 p-2 bg-slate-900 border border-slate-800 rounded-xl">
        <button
          onClick={() => setActiveTool("brush")}
          className={`p-2 rounded font-bold text-xs ${activeTool === "brush" ? "bg-cyan-500 text-black" : "bg-slate-800"}`}
        >
          🖌️ Brush
        </button>
        <button
          onClick={() => setActiveTool("eraser")}
          className={`p-2 rounded font-bold text-xs ${activeTool === "eraser" ? "bg-cyan-500 text-black" : "bg-slate-800"}`}
        >
          🧹 Eraser
        </button>
        <input
          type="color"
          value={brushColor}
          onChange={(e) => setBrushColor(e.target.value)}
          className="w-full h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
        />
        <label className="text-[10px] text-slate-400">Size: {brushSize}px</label>
        <input
          type="range"
          min="1"
          max="64"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-20"
        />
      </div>

      <div className="flex flex-col items-center justify-center p-4 bg-slate-900/60 rounded-xl border border-slate-800">
        <canvas
          ref={displayCanvasRef}
          width={width}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="border border-slate-700 shadow-2xl rounded cursor-crosshair"
        />
      </div>
    </div>
  );
}
```

### Tips for How to Code DictatePic
1. **Pixel-Crisp Canvas Settings:**
   When editing sprites at high zoom levels (e.g. 800%), round coordinates to exact integer pixels (`Math.floor(x)`). Set `ctx.imageSmoothingEnabled = false` across all offscreen layers and display canvases to prevent blurred pixel borders.
2. **Sub-Pixel Inpainting Masking:**
   When running the AI Inpaint brush, render the user\'s stroke into an offscreen binary mask canvas (white on black). Convert this canvas to a PNG DataURL and send it to `fal.ai/bria/inpainting` alongside the base image.
3. **Memory Management for Layer Stacks:**
   Keep layer canvas dimensions identical to the document dimensions. Never allocate unbounded canvas instances. Limit undo history to 30 snapshots, storing compressed PNG data URLs or differential bounding boxes rather than full canvas DOM clones.

---

## 3.3 Feature 03: DebugPlay (DP) — Headless Game Tester & Visual AI Bug Analyzer

### Architectural Blueprint
DebugPlay hooks directly into VibeCodeWorker (`lib/vcw-autoplay.ts` and `lib/vcw-frame-analysis.ts`). Instead of purely text-based automation, DebugPlay grabs visual video frames from the running game, submits them to GPT-4o-mini or Claude 3.5 Sonnet, determines if the game is soft-locked or visually broken, and returns targeted code fixes.

```
+-----------------------------------------------------------------------------------+
| DebugPlay Framework Flow                                                          |
+-----------------------------------------------------------------------------------+
| 1. Headless Game Runner (Playwright or iframe canvas)                             |
|    |                                                                              |
|    v                                                                              |
| 2. Frame Grabber (`canvas.toDataURL("image/png")`) -> 1 frame per 2.0s            |
|    |                                                                              |
|    v                                                                              |
| 3. Visual AI Inspector (Multi-modal LLM)                                          |
|    Prompt: "Analyze this game frame. Is player stuck? Are textures missing?       |
|    Are collisions failing? Return JSON bug list."                                 |
|    |                                                                              |
|    v                                                                              |
| 4. Decision Engine                                                                |
|    - If Bug Detected: Emit `vcw:code-fix-suggested` with code diff                |
|    - If Playable: Dispatch next key/mouse input (e.g. "jump", "right")            |
|    |                                                                              |
|    v                                                                              |
| 5. Live UI Scrubber (Timeline of analyzed frames with bug flags)                  |
+-----------------------------------------------------------------------------------+
```

### Core Implementation (`lib/debug-play-analyzer.ts`)

```typescript
export interface BugReport {
  id: string;
  timestampSeconds: number;
  severity: "critical" | "warning" | "cosmetic";
  title: string;
  description: string;
  suggestedFixDiff?: string;
  screenshotBase64: string;
}

export async function analyzeGameFrameWithAI(
  frameBase64: string,
  gameSlug: string,
  currentCodeSnippet?: string
): Promise<{ bugs: BugReport[]; nextInput: string }> {
  const systemPrompt = `You are DebugPlay, an AI automated game QA engineer inspecting gameplay frames for the game "${gameSlug}".
Analyze the provided screenshot. Detect visual bugs (black screen, missing textures, player clipping out of bounds, broken UI).
Suggest whether the game is running normally and output the next recommended controller action (e.g., "arrow_right", "space", "idle").
Format output strictly as JSON.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: `Analyze this game frame. Source snippet: ${currentCodeSnippet ?? "N/A"}` },
            { type: "image_url", image_url: { url: frameBase64 } }
          ]
        }
      ],
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");

  return {
    bugs: parsed.bugs ?? [],
    nextInput: parsed.nextInput ?? "idle"
  };
}
```

### Tips for How to Code DebugPlay
1. **Frame Downsampling:**
   Downscale captured frames to 640x360 before sending them to the LLM API. 640x360 preserves all visual bug signals while reducing token usage and API latency by over 70%.
2. **Preventing AI Loop Hallucination:**
   Cache the last 5 decisions. If the AI suggests the same action (e.g., "arrow_right") 5 times consecutively and the canvas frame hash has not changed, conclude that the player entity is stuck against an invisible collision wall.
3. **Seamless IDE Diff Injection:**
   When a bug includes a `suggestedFixDiff`, emit an event to the Monaco editor instance via `interopBus.emit("code:fix-available", diff)`. Render an in-editor banner giving the developer a one-click "Accept AI Fix" button.

---

## 3.4 Feature 04: DonatePersonalSeconds (DPS) — P2P Compute & WebGPU Sharing

### Architectural Blueprint
DPS allows users to donate idle computing power to run background tasks (like VibeCodeWorker game QA runs, procedural terrain generation, or sprite compression) in exchange for earning **Vibe Coins** (100 🪙 = $1.00).

```
+-----------------------------------------------------------------------------------+
| DPS P2P Compute Architecture                                                      |
+-----------------------------------------------------------------------------------+
|  [ Donor Browser ]                                                                |
|  - WebGPU Compute Shader or WebAssembly Worker                                    |
|  - Hardware Detection (Cores, RAM, GPU, Battery/AC)                               |
|  - Sliders: CPU 80%, RAM 50%, GPU 90%                                             |
|        ^                                                                          |
|        | WebRTC DataChannel (P2P Mesh)                                            |
|        v                                                                          |
|  [ P2P Signaling Server (/api/dps/signal) ]                                        |
|  - Matches job requesters with available donor nodes                              |
|  - Enforces cryptographic proof-of-work validation                                |
|  - Credits Vibe Coins to donor wallet in Supabase                                 |
+-----------------------------------------------------------------------------------+
```

### Core Hardware Detector & Worker (`lib/dps-hardware.ts`)

```typescript
export interface HardwareCapabilities {
  cpuCores: number;
  memoryGb: number;
  gpuRenderer: string;
  hasWebGPU: boolean;
  networkDownlinkMbps: number;
}

export async function detectHardwareCapabilities(): Promise<HardwareCapabilities> {
  const cpuCores = navigator.hardwareConcurrency || 4;
  const memoryGb = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;

  let networkDownlinkMbps = 10;
  if ("connection" in navigator) {
    const conn = (navigator as unknown as { connection?: { downlink?: number } }).connection;
    networkDownlinkMbps = conn?.downlink || 10;
  }

  let hasWebGPU = false;
  let gpuRenderer = "Unknown WebGL";

  if ("gpu" in navigator && (navigator as unknown as { gpu?: unknown }).gpu) {
    hasWebGPU = true;
  }

  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (gl) {
    const debugInfo = (gl as WebGLRenderingContext).getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      gpuRenderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || gpuRenderer;
    }
  }

  return {
    cpuCores,
    memoryGb,
    gpuRenderer,
    hasWebGPU,
    networkDownlinkMbps
  };
}
```

### Tips for How to Code DonatePersonalSeconds
1. **Untrusted Payload Sandboxing:**
   Never execute raw JavaScript strings received over WebRTC. Tasks must be executed strictly inside a sandboxed Web Worker with no access to `localStorage`, `cookies`, or the DOM, communicating purely through typed structured cloning (`postMessage`).
2. **Thermal & Battery Protection:**
   Use the Battery Status API (`navigator.getBattery()`). Automatically pause all compute operations if the device is running on battery power below 30% or if battery charging is disconnected.
3. **Proof-of-Computation Verification:**
   To prevent spoofed compute claims, include a deterministic hash checkpoint in every task chunk (e.g. SHA-256 seed check). Validate results against a lightweight redundant node before releasing coin payouts.

---

## 3.5 Feature 05: DemoRecorder (DRe) — Screen Recorder & AI Action Dataset Logger

### Architectural Blueprint
DemoRecorder allows players to record high-resolution game clips and speedruns. Crucially, when "AI Training Mode" is toggled, it logs every keyboard press, mouse click, and cursor trajectory into a structured JSON dataset tied to exact video timestamps.

### Input Logging Hook (`lib/use-action-logger.ts`)

```typescript
import { useRef, useCallback } from "react";

export interface LoggedAction {
  timestampMs: number;
  eventType: "keydown" | "keyup" | "mousedown" | "mouseup" | "mousemove";
  key?: string;
  normalizedX?: number; // 0.0 to 1.0 (independent of window resolution)
  normalizedY?: number;
}

export function useActionLogger() {
  const actionsRef = useRef<LoggedAction[]>([]);
  const startTimeRef = useRef<number>(0);
  const isLoggingRef = useRef<boolean>(false);

  const startLogging = useCallback(() => {
    actionsRef.current = [];
    startTimeRef.current = performance.now();
    isLoggingRef.current = true;
  }, []);

  const recordEvent = useCallback((e: MouseEvent | KeyboardEvent, canvasElement?: HTMLElement) => {
    if (!isLoggingRef.current) return;
    const now = performance.now() - startTimeRef.current;

    if (e.type.startsWith("key")) {
      const ke = e as KeyboardEvent;
      actionsRef.current.push({
        timestampMs: now,
        eventType: ke.type as "keydown" | "keyup",
        key: ke.code
      });
    } else if (e.type.startsWith("mouse") && canvasElement) {
      const me = e as MouseEvent;
      const rect = canvasElement.getBoundingClientRect();
      const normalizedX = (me.clientX - rect.left) / rect.width;
      const normalizedY = (me.clientY - rect.top) / rect.height;

      actionsRef.current.push({
        timestampMs: now,
        eventType: me.type as "mousedown" | "mouseup" | "mousemove",
        normalizedX,
        normalizedY
      });
    }
  }, []);

  const stopLogging = useCallback((): LoggedAction[] => {
    isLoggingRef.current = false;
    return actionsRef.current;
  }, []);

  return { startLogging, recordEvent, stopLogging };
}
```

### Tips for How to Code DemoRecorder
1. **Resolution Normalization:**
   Always record mouse events as normalized percentages (`0.0` to `1.0`) relative to the game canvas rather than raw screen pixels. This ensures trained models work regardless of device DPI or browser zoom.
2. **Keystroke Privacy:**
   Never log input events when the active focused element is an `<input>`, `<textarea>`, or password field.
3. **Synchronized Video Export:**
   Package the WebM video Blob and the `actions.json` file together into a single downloadable ZIP archive using `jszip`.

---

## 3.6 Feature 06: Interactive 3D Pet Room & AliveSpeech Voice Companion

### Architectural Blueprint
Combines 4weird's existing ElevenLabs voice engine (`lib/buddy-voice.ts`) with a Three.js 3D room, giving players an interactive companion or Clan Mascot that reacts to voice, offers game tips, and levels up.

```
+-----------------------------------------------------------------------------------+
| 3D Pet & AliveSpeech Architecture                                                 |
+-----------------------------------------------------------------------------------+
|  [ Microphone Web Audio ]                                                         |
|  - AnalyserNode RMS Audio Meter (Silence Detection)                               |
|  - Auto-sends speech chunks to Whisper API when user stops talking                |
|        |                                                                          |
|        v                                                                          |
|  [ OpenRouter / GPT-5 Mini Brain ]                                                 |
|  - Determines response + triggers 3D animation (happy, dance, sleep, alert)        |
|        |                                                                          |
|        +-----------------------------------+                                      |
|        v                                   v                                      |
|  [ ElevenLabs Streaming Audio ]   [ Three.js 3D Viewport ]                        |
|  - Plays voice with lip-sync      - Renders Pet Mesh, Room, Furniture             |
+-----------------------------------------------------------------------------------+
```

### Tips for How to Code AliveSpeech
1. **Silence Threshold Optimization:**
   Calculate Root-Mean-Square (RMS) volume every 50ms. If RMS drops below `0.02` for more than `1,200ms`, trigger the speech cutoff and dispatch the audio buffer.
2. **Web Audio Unlock on Mobile:**
   Mobile browsers block audio playback until user interaction. Attach an empty audio play trigger to the initial "Start Voice Chat" button click.

---

## 3.7 Feature 07: CryptArt Commander (CAC) — Power-User Terminal & Scripting Engine

### Architectural Blueprint
Provides a quake-style dropdown CLI (`Ctrl+\``) for power users, developers, and clan tech officers to inspect system diagnostics, run batch jobs, query Vibe Coin balances, and trigger game test runs.

### Command Execution Engine (`lib/commander-registry.ts`)

```typescript
export interface CommandContext {
  args: string[];
  print: (line: string) => void;
  printError: (line: string) => void;
}

export type CommandHandler = (ctx: CommandContext) => Promise<void> | void;

export class CommandRegistry {
  private commands = new Map<string, CommandHandler>();

  register(name: string, handler: CommandHandler) {
    this.commands.set(name.toLowerCase(), handler);
  }

  async execute(input: string, print: (l: string) => void, printError: (l: string) => void) {
    const trimmed = input.trim();
    if (!trimmed) return;
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    const handler = this.commands.get(cmd);
    if (!handler) {
      printError(`Command not found: "${cmd}". Type "help" for available commands.`);
      return;
    }

    try {
      await handler({ args, print, printError });
    } catch (err) {
      printError(`Execution failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
```

### Tips for How to Code Commander
1. **Command Line Sanitization:**
   Never pass terminal input to `eval()` or unquoted shell processes. All commands must map strictly to TypeScript handler functions.
2. **Terminal Scrollback Memory Limit:**
   Cap the terminal output history to 500 lines. Slice array buffers periodically to keep DOM memory negligible.

---

## 3.8 Feature 08: Luck Factory (LCK) — Intention Meditation & Cryptographic Luck Engine

### Architectural Blueprint
Converts player mantras, wishes, or clan rallying cries into a deterministic cryptographic luck seed using SHA-256 hashing. The seed outputs presets (69, 420, 777) and injects directly into GraveGain loot tables, NewGamePlus procedural dungeons, and daily coin rewards.

```typescript
export function computeLuckSeed(intention: string): { seed: number; preset: 69 | 420 | 777 } {
  let hash = 0;
  for (let i = 0; i < intention.length; i++) {
    hash = (hash << 5) - hash + intention.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  const score = positive % 1000;

  let preset: 69 | 420 | 777 = 69;
  if (score >= 900) preset = 777;
  else if (score >= 500) preset = 420;

  return { seed: positive, preset };
}
```

---

## 3.9 Feature 09: Cross-Tool Interoperability Suite (Bus, Clipboard, Pipelines)

### Architectural Blueprint
Implements a unified pub/sub event bus (`BroadcastChannel`), a typed cross-tool clipboard, and multi-step pipeline coordinator enabling assets, code, and testing to flow across all 4weird tools.

### Global Interop Implementation (`lib/interop.ts`)

```typescript
export type InteropEventPayload = {
  "media:exported": { path: string; type: "video" | "image" | "audio" };
  "code:fix-available": { patchDiff: string; targetFile: string };
  "game:asset-imported": { assetUrl: string; assetType: string };
  "bounty:claimed": { bountyId: string; workerId: string };
  "system:notification": { title: string; message: string; category: string };
};

export class InteropBus {
  private channel: BroadcastChannel;
  private listeners = new Map<string, Set<(data: unknown) => void>>();

  constructor() {
    this.channel = new BroadcastChannel("4weird_interop_bus");
    this.channel.onmessage = (event) => {
      const { type, data } = event.data;
      this.notify(type, data);
    };
  }

  emit<K extends keyof InteropEventPayload>(type: K, data: InteropEventPayload[K]) {
    this.notify(type, data);
    this.channel.postMessage({ type, data });
  }

  on<K extends keyof InteropEventPayload>(type: K, callback: (data: InteropEventPayload[K]) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback as (data: unknown) => void);
    return () => {
      this.listeners.get(type)?.delete(callback as (data: unknown) => void);
    };
  }

  private notify(type: string, data: unknown) {
    const set = this.listeners.get(type);
    if (set) {
      set.forEach((cb) => cb(data));
    }
  }
}

export const interopBus = typeof window !== "undefined" ? new InteropBus() : null;
```

---

## 3.10 Feature 10: Universal `.4weird` Project Container Format

### Architectural Blueprint
A standardized JSON envelope allowing players and developers to download, backup, and share complete game projects, NewGamePlus drafts, or VCW test suites.

```typescript
export interface FourWeirdProjectContainer {
  $4weird: 1; // Magic version tag (Always 1)
  module: "game_project" | "video_nle" | "sprite_atlas" | "vcw_suite";
  metadata: {
    id: string;
    title: string;
    author: string;
    createdAt: string;
    appVersion: string;
    tags: string[];
  };
  payload: Record<string, unknown>;
  assets: Array<{
    filename: string;
    mimeType: string;
    dataBase64: string;
  }>;
}
```

---

## 3.11 Feature 11: Monaco IDE Diagnostic Panels (Testing, Web Audit, Problems)

### Architectural Blueprint
Equips 4weird\'s `/code` environment and VibeCodeWorker with three dedicated bottom-panel diagnostic tabs:
1. **Testing Panel:** Runs auto-tests on file save checking null assertions, boundary conditions, and type safety.
2. **Web Audit Panel:** Lighthouse-style audit checking mobile viewport, meta tags, image alt tags, ARIA attributes, and HTTPS assets.
3. **Problems Scanner:** Continuous linter highlighting `console.log`, `TODO`, debugger statements, and empty catch blocks.

---

## 3.12 Feature 12: Community Mod, Plugin, and Custom Theme System

### Architectural Blueprint
Permits community creators to upload mod packages and custom CSS token themes. Mods are sandboxed in an iframe with strict origin policies, preventing access to 4weird session tokens.

---

## 3.13 Feature 13: ValleyNet Autonomous Computer-Use Agent & Skills System

### Architectural Blueprint
Upgrades `valleynet.ts` from a simple regex automod filter into a true autonomous agent runner. Connects to the skills framework (`content/skills/`) to perform multi-step web scraping, Discord webhook announcements, and asset conversions autonomously.
'''

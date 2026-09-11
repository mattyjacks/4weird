"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Square,
  MoreVertical,
  Loader2,
  Coins,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TimerEntry, TimerProject, formatDuration, formatGhostCash, calcGhostCash } from "@/types/time";
import { ScreenTracker } from "./ScreenTracker";

interface TimerWidgetProps {
  projects: TimerProject[];
  runningTimer: TimerEntry | null;
  onTimerStart: (data: {
    projectId?: string;
    debtorId?: string;
    description?: string;
    isBillable?: boolean;
    upworkSyncMode?: boolean;
    upworkContractId?: string;
    upworkMemo?: string;
  }) => Promise<void>;
  onTimerStop: (data?: { projectId?: string; description?: string; isBillable?: boolean }) => Promise<void>;
  onTimerDiscard: () => Promise<void>;
  onRefresh: () => void;
}

export function TimerWidget({
  projects,
  runningTimer,
  onTimerStart,
  onTimerStop,
  onTimerDiscard,
}: TimerWidgetProps) {
  const [description, setDescription] = useState(runningTimer?.description || "");
  const [projectId, setProjectId] = useState(runningTimer?.projectId || "");
  const [isBillable, setIsBillable] = useState(runningTimer?.isBillable ?? true);
  const [upworkSyncMode, setUpworkSyncMode] = useState(runningTimer?.upworkSyncMode ?? false);
  const [upworkContractId, setUpworkContractId] = useState(runningTimer?.upworkContractId || "");
  const [upworkMemo, setUpworkMemo] = useState(runningTimer?.upworkMemo || "");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state
  useEffect(() => {
    if (runningTimer) {
      setDescription(runningTimer.description || "");
      setProjectId(runningTimer.projectId || "");
      setIsBillable(runningTimer.isBillable);
      setUpworkSyncMode(!!runningTimer.upworkSyncMode);
      setUpworkContractId(runningTimer.upworkContractId || "");
      setUpworkMemo(runningTimer.upworkMemo || "");
    }
  }, [runningTimer]);

  // Calculate elapsed time & Ghost Cash
  useEffect(() => {
    if (runningTimer?.isRunning && runningTimer.startTime) {
      const updateElapsed = () => {
        const start = new Date(runningTimer.startTime).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)));
      };

      updateElapsed();
      intervalRef.current = setInterval(updateElapsed, 1000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setElapsedSeconds(0);
    }
  }, [runningTimer]);

  const selectedProject = projects.find((p) => p.id === projectId);
  const currentRate = selectedProject?.ghostRate || runningTimer?.ghostRate || 0;
  const currentGhostCashOwed = calcGhostCash(elapsedSeconds, currentRate);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await onTimerStart({
        projectId: projectId || undefined,
        description: description || undefined,
        isBillable,
        upworkSyncMode,
        upworkContractId: upworkSyncMode && upworkContractId ? upworkContractId : undefined,
        upworkMemo: upworkSyncMode && upworkMemo ? upworkMemo : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      await onTimerStop({
        projectId: projectId || undefined,
        description: description || undefined,
        isBillable,
      });
      setDescription("");
      setProjectId("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscard = async () => {
    setIsLoading(true);
    try {
      await onTimerDiscard();
      setDescription("");
      setProjectId("");
    } finally {
      setIsLoading(false);
    }
  };

  const isRunning = !!runningTimer?.isRunning;

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-5 space-y-4 shadow-xl backdrop-blur">
      {/* Disclaimer reminder pill */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-400">
        <ShieldAlert className="h-4 w-4 text-cyan-400 shrink-0" />
        <span>
          <strong>Ghost Cash (👻)</strong> is an internal debt measurement tool with no cash value and no legal tender status.
        </span>
      </div>

      {/* Main Display: Duration & Ghost Cash Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div
            className={cn(
              "text-5xl font-mono font-bold tracking-tight tabular-nums",
              isRunning ? "text-cyan-400 animate-pulse" : "text-white"
            )}
          >
            {formatDuration(elapsedSeconds)}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Coins className="h-4 w-4 text-emerald-400" />
            <span className="text-zinc-400">Ghost Cash Accrued:</span>
            <span className="font-mono font-bold text-emerald-400 text-base">
              {formatGhostCash(currentGhostCashOwed)}
            </span>
            {currentRate > 0 && (
              <span className="text-xs text-zinc-500 font-mono">
                (@ {formatGhostCash(currentRate)}/hr)
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <>
              <Button
                size="lg"
                variant="destructive"
                onClick={handleStop}
                disabled={isLoading}
                className="w-28 font-semibold bg-rose-600 hover:bg-rose-500 text-white"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Square className="h-4 w-4 mr-2 fill-current" />
                )}
                Stop
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="border-white/10 text-zinc-300">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white">
                  <DropdownMenuItem onClick={handleDiscard} className="text-rose-400 focus:text-rose-300 cursor-pointer">
                    Discard timer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              size="lg"
              onClick={handleStart}
              disabled={isLoading}
              className="w-28 font-semibold bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2 fill-current" />
              )}
              Start
            </Button>
          )}
        </div>
      </div>

      {/* Description input */}
      <Input
        placeholder="What are you working on? (e.g. Social media marketing campaign, bug fixing)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="bg-black/50 border-white/10 text-white placeholder:text-zinc-500"
      />

      {/* Controls row: Project Selector, Billable toggle */}
      <div className="flex flex-wrap items-center gap-4 pt-1">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="h-9 px-3 rounded-md bg-zinc-900 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
        >
          <option value="">No Project (General Work)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.ghostRate > 0 ? `(${formatGhostCash(p.ghostRate)}/hr)` : ""}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <Checkbox
            id="billable"
            checked={isBillable}
            onCheckedChange={(checked) => setIsBillable(checked === true)}
          />
          <Label
            htmlFor="billable"
            className={cn(
              "text-xs font-medium cursor-pointer",
              isBillable ? "text-emerald-400" : "text-zinc-500"
            )}
          >
            Billable in Ghost Cash (👻)
          </Label>
        </div>

        {/* Upwork Dual-Timer Companion Mode Toggle */}
        <div className="flex items-center gap-2 border-l border-white/10 pl-4">
          <Checkbox
            id="upwork-sync"
            checked={upworkSyncMode}
            onCheckedChange={(checked) => setUpworkSyncMode(checked === true)}
          />
          <Label
            htmlFor="upwork-sync"
            className={cn(
              "text-xs font-medium cursor-pointer flex items-center gap-1.5",
              upworkSyncMode ? "text-cyan-400" : "text-zinc-400"
            )}
          >
            <span className="font-semibold text-emerald-400">Upwork</span> Dual-Timer Mode
          </Label>
        </div>
      </div>

      {upworkSyncMode && (
        <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <Label className="text-zinc-400">Upwork Contract / Job ID (Optional)</Label>
            <Input
              placeholder="e.g. ~01abc123456789 or Contract Title"
              value={upworkContractId}
              onChange={(e) => setUpworkContractId(e.target.value)}
              className="h-8 bg-black/50 border-emerald-500/30 text-white placeholder:text-zinc-600 font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-zinc-400">Upwork Work Diary Memo Sync</Label>
            <Input
              placeholder="Memo matching Upwork Desktop app memo"
              value={upworkMemo}
              onChange={(e) => setUpworkMemo(e.target.value)}
              className="h-8 bg-black/50 border-emerald-500/30 text-white placeholder:text-zinc-600 text-xs"
            />
          </div>
        </div>
      )}

      {/* Upwork Screen Tracking proof drawer */}
      <ScreenTracker isRunning={isRunning} entryId={runningTimer?.id || null} />
    </div>
  );
}

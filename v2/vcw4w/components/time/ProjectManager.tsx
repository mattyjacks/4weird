"use client";

import { useState } from "react";
import { TimerProject, formatGhostCash, TIMER_PROJECT_COLORS } from "@/types/time";
import { Plus, Folder, Trash2, Edit2, Loader2, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProjectManagerProps {
  projects: TimerProject[];
  onRefresh: () => void;
}

export function ProjectManager({ projects, onRefresh }: ProjectManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(TIMER_PROJECT_COLORS[0]);
  const [ghostRate, setGhostRate] = useState("50");
  const [budgetHours, setBudgetHours] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/time/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color,
          ghostRate: parseFloat(ghostRate) || 0,
          budgetHours: budgetHours ? parseFloat(budgetHours) : undefined,
        }),
      });

      if (res.ok) {
        setName("");
        setGhostRate("50");
        setBudgetHours("");
        setIsOpen(false);
        onRefresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    const res = await fetch(`/api/time/projects/${id}`, { method: "DELETE" });
    if (res.ok) onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Timer Projects & Ghost Rates</h2>
          <p className="text-sm text-zinc-400">
            Set hourly rates in Ghost Cash (👻💵) for client work, contractors, or marketing roles.
          </p>
        </div>

        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs gap-1.5"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {isOpen && (
        <form onSubmit={handleCreate} className="p-5 rounded-xl border border-white/10 bg-zinc-950/80 space-y-4">
          <h3 className="font-semibold text-white text-sm">Create New Project</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Project Name</label>
              <Input
                placeholder="e.g. Social Media Marketing"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-black/50 border-white/10 text-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Ghost Cash Hourly Rate (👻💵/hr)</label>
              <Input
                type="number"
                step="0.5"
                placeholder="e.g. 50"
                value={ghostRate}
                onChange={(e) => setGhostRate(e.target.value)}
                className="bg-black/50 border-white/10 text-white font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Budget Hours (Optional)</label>
              <Input
                type="number"
                placeholder="e.g. 40"
                value={budgetHours}
                onChange={(e) => setBudgetHours(e.target.value)}
                className="bg-black/50 border-white/10 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Color Badge</label>
              <div className="flex items-center gap-2 pt-1">
                {TIMER_PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-6 w-6 rounded-full border-2 transition-transform ${color === c ? "border-white scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs"
            >
              {isSubmitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Save Project
            </Button>
          </div>
        </form>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <div
            key={p.id}
            className="p-4 rounded-xl border border-white/10 bg-zinc-950/60 flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className="px-2.5 py-0.5 rounded text-xs font-semibold text-white"
                  style={{ backgroundColor: p.color || "#3b82f6" }}
                >
                  {p.name}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(p.id)}
                  className="h-7 w-7 text-zinc-500 hover:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400 font-mono">
                <Coins className="h-4 w-4" />
                {formatGhostCash(p.ghostRate)} / hr
              </div>

              {p.budgetHours && (
                <p className="text-xs text-zinc-400">
                  Budget: <span className="text-zinc-200">{p.budgetHours} hours</span>
                </p>
              )}
            </div>

            <div className="text-xs text-zinc-500 border-t border-white/5 pt-2">
              Created {new Date(p.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

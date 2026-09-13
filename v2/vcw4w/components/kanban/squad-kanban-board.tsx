"use client";

/**
 * SquadKanbanBoard — drag-and-drop Kanban with sprint roll-up (Wave-1, R1 web lane).
 *
 * - Native HTML5 drag-and-drop (no new runtime deps).
 * - All browser APIs (localStorage) touched inside useEffect behind a mounted
 *   guard → zero Next.js SSR/hydration mismatch (axiom §1.2.4).
 * - Fail-open: malformed stored state is discarded, demo/props seed renders.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  boardProgress,
  doneColumnIds,
  type KanbanBoardData,
  type KanbanCardData,
  type KanbanColumnData,
  type KanbanPriority,
} from "@/components/kanban/kanban-types";
import { SprintHeader } from "@/components/kanban/sprint-header";

interface SquadKanbanBoardProps {
  board: KanbanBoardData;
}

const PRIORITY_STYLES: Record<KanbanPriority, string> = {
  low: "bg-slate-800 text-slate-400",
  medium: "bg-cyan-500/20 text-cyan-300",
  high: "bg-amber-500/20 text-amber-300",
  urgent: "bg-rose-500/20 text-rose-400",
};

function storageKey(boardId: string): string {
  return `4weird:kanban:${boardId}`;
}

function sortCards(cards: KanbanCardData[]): KanbanCardData[] {
  return [...cards].sort((a, b) => a.position - b.position);
}

export function SquadKanbanBoard({ board }: SquadKanbanBoardProps) {
  const [mounted, setMounted] = useState(false);
  const [columns] = useState<KanbanColumnData[]>(board.columns);
  const [cards, setCards] = useState<KanbanCardData[]>(board.cards);
  const [dragId, setDragId] = useState<string | null>(null);
  const [newTitles, setNewTitles] = useState<Record<string, string>>({});

  // Hydrate persisted order/moves (browser-only, post-mount).
  useEffect(() => {
    setMounted(true);
    try {
      const raw = window.localStorage.getItem(storageKey(board.id));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { cards?: KanbanCardData[] };
      if (Array.isArray(parsed.cards) && parsed.cards.length > 0) {
        const knownCols = new Set(board.columns.map((c) => c.id));
        const sane = parsed.cards.filter(
          (c) => c && typeof c.id === "string" && knownCols.has(c.columnId),
        );
        if (sane.length > 0) setCards(sane);
      }
    } catch {
      // Fail-open: ignore corrupt storage, keep seed.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id]);

  // Persist moves (browser-only).
  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(storageKey(board.id), JSON.stringify({ cards }));
    } catch {
      // Fail-open: quota/private-mode errors never brick the board.
    }
  }, [cards, mounted, board.id]);

  const doneIds = useMemo(() => doneColumnIds(columns), [columns]);
  const progress = useMemo(() => boardProgress(cards, doneIds), [cards, doneIds]);
  const doneCount = useMemo(
    () => cards.filter((c) => doneIds.includes(c.columnId)).length,
    [cards, doneIds],
  );

  const moveCard = (cardId: string, targetColumnId: string, targetIndex?: number) => {
    setCards((prev) => {
      const moving = prev.find((c) => c.id === cardId);
      if (!moving) return prev;
      const without = prev.filter((c) => c.id !== cardId);
      const siblings = sortCards(without.filter((c) => c.columnId === targetColumnId));
      const idx =
        targetIndex === undefined
          ? siblings.length
          : Math.max(0, Math.min(targetIndex, siblings.length));
      const placed: KanbanCardData = { ...moving, columnId: targetColumnId, position: idx };
      // Rebuild: all other cards keep order, target column gets new order.
      const others = without.filter((c) => c.columnId !== targetColumnId);
      const target = [...siblings];
      target.splice(idx, 0, placed);
      const renumbered = target.map((c, i) => ({ ...c, position: i }));
      const byCol = new Map<string, KanbanCardData[]>();
      for (const c of [...others, ...renumbered]) {
        const list = byCol.get(c.columnId) ?? [];
        list.push(c);
        byCol.set(c.columnId, list);
      }
      const out: KanbanCardData[] = [];
      for (const col of columns) out.push(...sortCards(byCol.get(col.id) ?? []));
      // Keep any cards whose column vanished (shouldn't happen) at the end.
      for (const [colId, list] of byCol) {
        if (!columns.some((c) => c.id === colId)) out.push(...list);
      }
      return out;
    });
  };

  const handleDropOnColumn = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/kanban-card") || dragId;
    if (id) moveCard(id, columnId);
    setDragId(null);
  };

  const handleDropOnCard = (e: React.DragEvent, target: KanbanCardData) => {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData("text/kanban-card") || dragId;
    if (!id || id === target.id) {
      setDragId(null);
      return;
    }
    const siblings = sortCards(cards.filter((c) => c.columnId === target.columnId));
    const targetIndex = siblings.findIndex((c) => c.id === target.id);
    moveCard(id, target.columnId, targetIndex);
    setDragId(null);
  };

  const addCard = (columnId: string) => {
    const title = (newTitles[columnId] ?? "").trim();
    if (!title) return;
    const siblings = cards.filter((c) => c.columnId === columnId);
    const card: KanbanCardData = {
      id: `card-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      columnId,
      boardId: board.id,
      cycleId: board.activeCycle?.id ?? null,
      title,
      description: null,
      priority: "medium",
      estimateHours: 1,
      dueDate: null,
      labels: [],
      position: siblings.length,
    };
    setCards((prev) => [...prev, card]);
    setNewTitles((prev) => ({ ...prev, [columnId]: "" }));
  };

  // Pre-mount: render a static skeleton so SSR HTML matches first client paint.
  if (!mounted) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3" aria-busy="true">
        {columns.map((col) => (
          <div
            key={col.id}
            className="min-h-[280px] rounded-2xl border border-white/10 bg-slate-950/60 p-4"
          >
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">
              {col.title}
            </h3>
            <p className="text-sm text-slate-500">Loading board…</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {board.activeCycle ? (
        <SprintHeader
          cycle={{ ...board.activeCycle, progressPercentage: progress }}
          progress={progress}
          totalCards={cards.length}
          doneCards={doneCount}
        />
      ) : null}

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
        {columns.map((col) => {
          const colCards = sortCards(cards.filter((c) => c.columnId === col.id));
          const estTotal = colCards.reduce((sum, c) => sum + (c.estimateHours || 0), 0);
          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropOnColumn(e, col.id)}
              className="min-h-[350px] rounded-2xl border border-white/10 bg-slate-950/60 p-4"
              aria-label={`${col.title} column`}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  {col.title}{" "}
                  <span className="ml-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                    {colCards.length}
                  </span>
                </h3>
                <span className="font-mono text-xs text-slate-500">⏱️ {estTotal}h</span>
              </div>

              <div className="flex flex-col gap-3">
                {colCards.map((card) => (
                  <article
                    key={card.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/kanban-card", card.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(card.id);
                    }}
                    onDragEnd={() => setDragId(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnCard(e, card)}
                    className={`cursor-grab rounded-xl border bg-slate-900 p-4 shadow-sm transition active:cursor-grabbing ${
                      dragId === card.id
                        ? "border-amber-400/70 opacity-60"
                        : "border-white/10 hover:border-amber-400/40"
                    }`}
                    aria-label={`Card: ${card.title}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">{card.title}</span>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${PRIORITY_STYLES[card.priority]}`}
                      >
                        {card.priority}
                      </span>
                    </div>
                    {card.description ? (
                      <p className="mt-1.5 text-xs text-slate-400">{card.description}</p>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between">
                      <p className="font-mono text-xs text-slate-500">
                        ⏱️ {card.estimateHours}h est.
                      </p>
                      {card.labels.length > 0 ? (
                        <p className="text-[11px] text-slate-500">
                          {card.labels.map((l) => `#${l}`).join(" ")}
                        </p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>

              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addCard(col.id);
                }}
              >
                <input
                  value={newTitles[col.id] ?? ""}
                  onChange={(e) =>
                    setNewTitles((prev) => ({ ...prev, [col.id]: e.target.value }))
                  }
                  placeholder={`+ Add card to ${col.title}`}
                  aria-label={`Add card to ${col.title}`}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-cyan-500"
                >
                  Add
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}

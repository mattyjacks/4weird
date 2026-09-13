/**
 * Shared Kanban + sprint types for Squad boards (Wave-1, R1 web lane).
 *
 * Mirrors the remastery README §2 SQL shapes:
 *   public.kanban_boards / kanban_cycles / kanban_columns / kanban_cards
 * Pure types only — safe to import from server or client components.
 */

/** Vibe Coin parity axiom: 100 coins = exactly $1.00 USD. */
export const VIBE_COINS_PER_USD = 100;

export function coinsToUsd(coins: number): number {
  return coins / VIBE_COINS_PER_USD;
}

export function usdToCoins(usd: number): number {
  return Math.round(usd * VIBE_COINS_PER_USD);
}

export type KanbanPriority = "low" | "medium" | "high" | "urgent";

export interface KanbanColumnData {
  id: string;
  boardId: string;
  title: string;
  position: number;
}

export interface KanbanCardData {
  id: string;
  columnId: string;
  boardId: string;
  cycleId: string | null;
  title: string;
  description: string | null;
  priority: KanbanPriority;
  estimateHours: number;
  dueDate: string | null;
  labels: string[];
  position: number;
}

export interface KanbanCycleData {
  id: string;
  boardId: string;
  title: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  progressPercentage: number;
  isActive: boolean;
}

export interface KanbanBoardData {
  id: string;
  squadId: string;
  title: string;
  description: string | null;
  columns: KanbanColumnData[];
  cards: KanbanCardData[];
  activeCycle: KanbanCycleData | null;
}

/** Demo seed used until the Supabase kanban tables are wired (fail-open: UI renders without a backend). */
export function demoBoard(squadId: string, boardId = "demo-board"): KanbanBoardData {
  const columns: KanbanColumnData[] = [
    { id: "col-todo", boardId, title: "To Do", position: 0 },
    { id: "col-doing", boardId, title: "In Progress", position: 1 },
    { id: "col-done", boardId, title: "Done", position: 2 },
  ];
  const cards: KanbanCardData[] = [
    {
      id: "card-1",
      columnId: "col-todo",
      boardId,
      cycleId: "cycle-4",
      title: "Optimize GraveGain 3D instanced mesh",
      description: "Batch static props into a single InstancedMesh draw call.",
      priority: "high",
      estimateHours: 4,
      dueDate: null,
      labels: ["perf", "gravegain3d"],
      position: 0,
    },
    {
      id: "card-2",
      columnId: "col-doing",
      boardId,
      cycleId: "cycle-4",
      title: "Add Web Worker to timer engine",
      description: "Move tick loop off the main thread so minimized tabs never drift.",
      priority: "urgent",
      estimateHours: 2.5,
      dueDate: null,
      labels: ["timer"],
      position: 0,
    },
    {
      id: "card-3",
      columnId: "col-done",
      boardId,
      cycleId: "cycle-4",
      title: "Verify remastery Wave-1 routes",
      description: "Squad workspace, kanban, and timer pro pages render with green gates.",
      priority: "medium",
      estimateHours: 1,
      dueDate: null,
      labels: ["qa"],
      position: 0,
    },
  ];
  return {
    id: boardId,
    squadId,
    title: "Sprint #4 — Neon Drift",
    description: "Squad sprint board. Drag cards between columns; progress rolls up to the workspace.",
    columns,
    cards,
    activeCycle: {
      id: "cycle-4",
      boardId,
      title: "Sprint #4",
      startDate: new Date(Date.now() - 11 * 86400000).toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      progressPercentage: 0,
      isActive: true,
    },
  };
}

/** Roll up % of cards sitting in a "done" column. Pure — unit-testable. */
export function boardProgress(cards: KanbanCardData[], doneColumnIds: string[]): number {
  if (cards.length === 0) return 0;
  const done = cards.filter((c) => doneColumnIds.includes(c.columnId)).length;
  return Math.round((done / cards.length) * 100);
}

/** Column ids whose title looks like a done-state (case-insensitive). Pure. */
export function doneColumnIds(columns: KanbanColumnData[]): string[] {
  return columns
    .filter((c) => /done|complete|shipped/i.test(c.title))
    .map((c) => c.id);
}

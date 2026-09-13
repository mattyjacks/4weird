// 4weird remastery canonical data shapes — TYPES ONLY (Edge-safe).
// Covers README sections 3.1–3.4 + section-2 SQL migration.
// No runtime code in this module except the numeric axioms below.
// No imports, no window, no secrets. All interfaces exported.

// --- Economic / lifecycle axioms (ONLY value exports allowed) ---
export const VIBE_COINS_PER_USD = 100;
export const CREATOR_SHARE_BPS = 7500;
export const PLATFORM_SHARE_BPS = 2500;
export const INVOICE_TRASH_RETENTION_DAYS = 30;

// --- 3.1 Studio video: Media Mogul timeline ---
export interface VideoEffect {
  type: "color_grade" | "blur" | "chroma_key" | "speed" | "fade";
  params: Record<string, number | string | boolean>;
}

export interface VideoClip {
  id: string;
  name: string;
  sourceUrl: string;
  trackIndex: number;
  startOffsetSeconds: number;
  durationSeconds: number;
  trimInSeconds: number;
  trimOutSeconds: number;
  volume: number;
  playbackRate: number;
  opacity: number;
  zIndex: number;
  effects: VideoEffect[];
}

export interface TimelineState {
  currentTimeSeconds: number;
  totalDurationSeconds: number;
  isPlaying: boolean;
  zoomLevel: number;
  snapToGrid: boolean;
  selectedClipId: string | null;
  clips: VideoClip[];
}

// --- 3.2 Canvas: DictatePic layered editor (serializable meta only, no DOM refs) ---
export type BlendMode =
  | "source-over"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn";

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

export interface CanvasLayerMeta {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
}

// --- 3.3 DebugPlay: visual bug report ---
export interface BugReport {
  id: string;
  timestampSeconds: number;
  severity: "critical" | "warning" | "cosmetic";
  title: string;
  description: string;
  suggestedFixDiff?: string;
  screenshotBase64: string;
}

// --- 3.4 DPS: donor hardware + task shapes ---
export interface HardwareCapabilities {
  cpuCores: number;
  memoryGb: number;
  gpuRenderer: string;
  hasWebGPU: boolean;
  networkDownlinkMbps: number;
}

export type DpsTaskType =
  | "blender_render"
  | "video_transcode"
  | "ai_embedding"
  | "game_bundle";

export type DpsTaskStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

// --- Section-2 SQL mirror: DB row types ---
export interface SquadProject {
  id: string;
  squadId: string;
  name: string;
  description: string | null;
  repositoryUrl: string | null;
  targetGameSlug: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanBoard {
  id: string;
  squadId: string | null;
  projectId: string | null;
  ownerUserId: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanCycle {
  id: string;
  boardId: string;
  title: string;
  startDate: string;
  endDate: string;
  progressPercentage: number;
  isActive: boolean;
  createdAt: string;
}

export interface KanbanColumn {
  id: string;
  boardId: string;
  title: string;
  position: number;
  createdAt: string;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  boardId: string;
  cycleId: string | null;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  estimateHours: number;
  dueDate: string | null;
  labels: string[];
  assignedUserId: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimeProject {
  id: string;
  userId: string;
  squadId: string | null;
  name: string;
  colorHex: string;
  hourlyRate: number;
  budgetHours: number | null;
  isBillable: boolean;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string | null;
  cardId: string | null;
  description: string | null;
  startTime: string;
  endTime: string | null;
  durationSeconds: number;
  isBillable: boolean;
  isInvoiced: boolean;
  createdAt: string;
}

export interface InvoiceClient {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  address: string | null;
  phone: string | null;
  vatNumber: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  userId: string;
  clientId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  notes: string | null;
  senderCompanyName: string | null;
  senderCompanyAddress: string | null;
  senderLogoUrl: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitRate: number;
  total: number;
  position: number;
}

export interface ChatThread {
  id: string;
  createdBy: string;
  title: string | null;
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderUserId: string;
  content: string;
  attachments: Record<string, unknown>[];
  createdAt: string;
}

export interface CommunityMod {
  id: string;
  creatorUserId: string;
  name: string;
  slug: string;
  description: string | null;
  version: string;
  targetGame: string;
  manifestJson: Record<string, unknown>;
  scriptUrl: string;
  isVerified: boolean;
  downloadsCount: number;
  createdAt: string;
}

export interface CommunityTheme {
  id: string;
  creatorUserId: string;
  name: string;
  slug: string;
  cssTokens: Record<string, unknown>;
  isPublic: boolean;
  likesCount: number;
  createdAt: string;
}

export type NotificationCategory =
  | "squad"
  | "game"
  | "chat"
  | "compute"
  | "system";

export interface NotificationRow {
  id: string;
  userId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

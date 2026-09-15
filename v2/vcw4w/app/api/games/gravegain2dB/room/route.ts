import { NextRequest, NextResponse } from "next/server";
import {
  GG2DB_MAX_PLAYERS,
  GG2DB_RECOVERABLE_MS,
  gg2dbSanitizeInput,
  gg2dbValidateClientMessage,
} from "@/lib/gravegain2dB-net";

/**
 * POST /api/games/gravegain2dB/room — authoritative co-op room skeleton.
 *
 * NEW file for DS-GG2DB-06. In-memory create/join/input only; the real 60Hz
 * simulator lives outside this skeleton. Fail-open by design: unexpected
 * failures answer HTTP 200 with { ok:false, offline:true } so the game keeps
 * running solo instead of hard-blocking. Only malformed client requests get
 * 4xx. No auth, no cookies, no env, no secrets of any kind.
 *
 * Actions:
 *   create { playerId? }            -> { roomId, seed, serverTick }
 *   join   { roomId, playerId }      -> { seed, serverTick, snapshot, nextEventSeq }
 *   input  { roomId, playerId, frame } -> { serverTick, acknowledgedSequence }
 *
 * Input frames pass gg2dbValidateClientMessage: malformed frames and any
 * client outcome claims (damage/terrain/reward) are rejected with 400. The
 * server never applies client-sent outcomes — see lib/gravegain2dB-net.ts.
 */

interface RoomEntry {
  id: string;
  seed: string;
  serverTick: number;
  players: string[];
  createdAt: number;
  nextEventSeq: number;
  ack: Record<string, number>;
}

const rooms = new Map<string, RoomEntry>();

function roomId(): string {
  try {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return `room-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  }
}

function seed(): string {
  try {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return `seed-${Date.now().toString(36)}`;
  }
}

function cleanId(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  const s = v.replace(/[\0-\x1F\x7F]/g, "").trim().slice(0, max);
  return /^[A-Za-z0-9_-]+$/.test(s) ? s : "";
}

function offline(reason: string): NextResponse {
  return NextResponse.json({ ok: false, offline: true, reason }, { status: 200 });
}

function bad(reason: string): NextResponse {
  return NextResponse.json({ ok: false, reason }, { status: 400 });
}

function getRoom(id: string): RoomEntry | null {
  const r = rooms.get(id) ?? null;
  if (!r) return null;
  if (Date.now() - r.createdAt > GG2DB_RECOVERABLE_MS * 120) {
    rooms.delete(id);
    return null;
  }
  return r;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const id = cleanId(req.nextUrl.searchParams.get("roomId"), 64);
    if (!id) return bad("roomId is required.");
    const r = getRoom(id);
    if (!r) return NextResponse.json({ ok: false, reason: "unknown room" }, { status: 404 });
    return NextResponse.json({
      ok: true,
      roomId: r.id,
      seed: r.seed,
      serverTick: r.serverTick,
      players: r.players.length,
      maxPlayers: GG2DB_MAX_PLAYERS,
    });
  } catch {
    return offline("room lookup unavailable; playing solo.");
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body.");
  }
  try {
    const input = (body ?? {}) as Record<string, unknown>;
    const action = String(input.action ?? "create");

    if (action === "create") {
      const playerId = cleanId(input.playerId ?? input.player, 64) || "you";
      const id = roomId();
      rooms.set(id, {
        id,
        seed: seed(),
        serverTick: 0,
        players: [playerId],
        createdAt: Date.now(),
        nextEventSeq: 1,
        ack: {},
      });
      const r = rooms.get(id);
      if (!r) return offline("room store unavailable; playing solo.");
      return NextResponse.json({ ok: true, roomId: r.id, seed: r.seed, serverTick: r.serverTick });
    }

    if (action === "join") {
      const id = cleanId(input.roomId ?? input.room, 64);
      const playerId = cleanId(input.playerId ?? input.player, 64);
      if (!id) return bad("roomId is required.");
      if (!playerId) return bad("playerId is required.");
      const r = getRoom(id);
      if (!r) return NextResponse.json({ ok: false, reason: "unknown room" }, { status: 404 });
      if (!r.players.includes(playerId)) {
        if (r.players.length >= GG2DB_MAX_PLAYERS) {
          return NextResponse.json({ ok: false, reason: "room is full" }, { status: 409 });
        }
        r.players.push(playerId);
      }
      return NextResponse.json({
        ok: true,
        roomId: r.id,
        seed: r.seed,
        serverTick: r.serverTick,
        nextEventSeq: r.nextEventSeq,
        extraction: "",
        snapshot: {
          roomId: r.id,
          seed: r.seed,
          serverTick: r.serverTick,
          acknowledgedInput: r.ack,
          players: [],
          entities: [],
          chunks: [],
          objectives: [],
          events: [],
          extraction: "",
        },
      });
    }

    if (action === "input") {
      const id = cleanId(input.roomId ?? input.room, 64);
      const playerId = cleanId(input.playerId ?? input.player, 64);
      if (!id) return bad("roomId is required.");
      if (!playerId) return bad("playerId is required.");
      const r = getRoom(id);
      if (!r) return NextResponse.json({ ok: false, reason: "unknown room" }, { status: 404 });
      const gate = gg2dbValidateClientMessage(input.frame);
      if (!gate.ok) return bad(gate.reason);
      const frame = gg2dbSanitizeInput(input.frame);
      if (!frame) return bad("malformed input frame");
      const prev = r.ack[playerId] ?? 0;
      if (frame.sequence > prev) r.ack[playerId] = frame.sequence;
      r.serverTick += 1;
      return NextResponse.json({
        ok: true,
        serverTick: r.serverTick,
        acknowledgedSequence: r.ack[playerId] ?? 0,
      });
    }

    return bad("Action must be create, join, or input.");
  } catch {
    return offline("room service unavailable; playing solo.");
  }
}

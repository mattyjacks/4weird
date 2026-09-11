/**
 * Clan usage metering helpers (SERVER-ONLY).
 *
 * Best-effort wrappers around the log_clan_ai_usage / log_clan_transfer
 * RPCs. They never throw: metering must not fail a clan write or read.
 * The per-minute biller (accrue_clan_minute_upkeep) converts these rows
 * into wallet debits every minute at :00.
 */

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

/** Log one Luna AI moderation check (GPT 5.6 Luna) against a clan. */
export async function meterLunaCheck(
  db: RpcClient,
  clanId: string,
  qty = 1,
): Promise<void> {
  try {
    await db.rpc("log_clan_ai_usage", {
      p_clan_id: clanId,
      p_kind: "luna-check",
      p_qty: qty,
    });
  } catch (err) {
    console.error("[clan-meter] luna log failed:", err);
  }
}

/** Log measured bytes served for a clan (bandwidth accounting). */
export async function meterTransfer(
  db: RpcClient,
  clanId: string,
  bytesOut: number,
  kind: "page-view" | "image" | "api" = "page-view",
): Promise<void> {
  try {
    const bytes = Math.max(0, Math.min(104857600, Math.floor(bytesOut)));
    if (bytes <= 0) return;
    await db.rpc("log_clan_transfer", {
      p_clan_id: clanId,
      p_bytes: bytes,
      p_kind: kind,
    });
  } catch (err) {
    console.error("[clan-meter] transfer log failed:", err);
  }
}

/**
 * Server-cost fee charging for clan writes made WITHOUT a user session
 * context (bot-key routes run on the service role, where auth.uid() is null
 * and meter_clan_posting_fee() cannot see the caller).
 *
 * SERVER-ONLY. Calls meter_clan_posting_fee_for(); the explicit-user twin
 * of meter_clan_posting_fee() (same formula, granted to service_role only).
 * Throws FeeError so routes map honestly: delinquent/balance -> 402.
 */

export class FeeError extends Error {
  code: "delinquent" | "balance" | "clan-not-found";
  constructor(code: FeeError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

type RpcClient = {
  // Thenable (not Promise): the Supabase client returns a query builder that
  // resolves to { data, error } on await. Typed wide on purpose.
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

function mapError(message: string): FeeError {
  const m = message.toLowerCase();
  if (m.includes("delinquent")) {
    return new FeeError(
      "delinquent",
      "This clan's upkeep is delinquent; posting is paused until it is funded.",
    );
  }
  if (m.includes("insufficient balance")) {
    return new FeeError("balance", "Insufficient Vibe Coins for the server-cost fee.");
  }
  if (m.includes("clan not found")) return new FeeError("clan-not-found", "Clan not found.");
  return new FeeError("balance", "Unable to charge the server-cost fee.");
}

export async function chargeClanFeeAs(
  db: RpcClient,
  input: {
    userId: string;
    clanId: string;
    kind: "post" | "comment";
    bytes: number;
    hasImage: boolean;
  },
): Promise<{ fee: number; cut: number; wallet: number }> {
  // Caller-asserted bytes are clamped AND capped: under-reporting is bounded
  // by the 0.01 min fee, over-reporting only overcharges the caller. Callers
  // must measure from title+body UTF-8 bytes server-side (never trust client
  // byte counts); the DB RPC is authoritative for the final fee.
  const bytes = Math.max(0, Math.min(16000, Math.floor(input.bytes)));
  const { data, error } = await db.rpc("meter_clan_posting_fee_for", {
    p_user_id: input.userId,
    p_clan_id: input.clanId,
    p_kind: input.kind,
    p_bytes: bytes,
    p_has_image: input.hasImage,
  });
  if (error) throw mapError(String(error.message ?? ""));
  const r = (data ?? {}) as { fee_coins?: unknown; cut_coins?: unknown; wallet_coins?: unknown };
  return {
    fee: Number(r.fee_coins) || 0,
    cut: Number(r.cut_coins) || 0,
    wallet: Number(r.wallet_coins) || 0,
  };
}

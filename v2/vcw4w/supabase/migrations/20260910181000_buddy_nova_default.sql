-- ============================================================================
-- Gaming Buddy: Nova default voice.
-- Fully rerunnable: ALTER ... SET DEFAULT is idempotent; the DO block only
-- touches rows that still carry the old implicit default.
--
-- Context: the app default moved from Alloy to Nova (BUDDY_DEFAULT_VOICE in
-- lib/game-ai.ts). Existing sessions keep their stored voice; this only
-- changes the column default for rows created without an explicit voice.
--
-- Metering note (no ledger change): buddy turns meter at TRUE upstream cost
-- (chat tokens + TTS chars + optional screen-snapshot image tokens +
-- Supabase DB writes), converted provider-USD -> gross Vibe Coins with the
-- same 25% cut INCLUDED, at centicentcoin (0.01 coin) resolution. The
-- meter_game_ai_usage kind rates are unchanged; the API derives the qty
-- (gross / rate) so the ledger lands on the true-cost gross. See
-- lib/game-ai.ts quoteBuddyChatLeg / quoteBuddyTtsLeg.
-- ============================================================================

alter table public.buddy_sessions
  alter column voice set default 'nova';

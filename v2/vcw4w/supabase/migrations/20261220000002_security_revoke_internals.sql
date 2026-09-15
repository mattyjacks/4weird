-- DS-SECWARN-03: revoke client roles on internal / trigger-helper functions.
-- These are never legitimately RPC-called by clients; server uses service_role,
-- which bypasses grants, so revoking public/anon/authenticated is safe.
-- Idempotent / rerunnable; no transaction wrapper needed.
revoke all on function public.enforce_cheat_save_marker() from public, anon, authenticated;
revoke all on function public.enforce_clan_comment_parent_same_post() from public, anon, authenticated;
revoke all on function public.enforce_clan_member_cap() from public, anon, authenticated;
revoke all on function public.enforce_org_budget() from public, anon, authenticated;
revoke all on function public.enforce_org_count() from public, anon, authenticated;
revoke all on function public.enforce_org_member_cap() from public, anon, authenticated;
revoke all on function public.enforce_personal_budget() from public, anon, authenticated;
revoke all on function public.maintain_clan_comment_count() from public, anon, authenticated;
revoke all on function public.guard_profile_verification() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
revoke all on function public.strip_slot_zero_cheat_marker() from public, anon, authenticated;
revoke all on function public.trg_init_org_on_use() from public, anon, authenticated;
revoke all on function public.trg_init_team_org_on_use() from public, anon, authenticated;
revoke all on function public.backfill_clan_forum_counters() from public, anon, authenticated;
revoke all on function public.bump_clan_member_count() from public, anon, authenticated;
revoke all on function public.bump_org_member_count() from public, anon, authenticated;

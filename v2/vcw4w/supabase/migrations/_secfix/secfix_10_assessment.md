# SECFIX-10 assessment — pgcrypto / leaked-password / slice coverage
(envelope DS-SECLINT-10 · assessment only · NO database changes · NO SQL applied)

- Date: 2026-09-15. Assessor: opencode (DS-SECLINT-10 assessment claim).
- Scope honored: this markdown is the ONLY file written. No migration, no app edit,
  no QUEUE.md append (envelope goals 1–3 deferred per task instruction).
- Concurrency note: sibling agents are writing concurrently. During this assessment
  `migrations/_secfix/` appeared on disk (absent at first check) and a new sibling
  file `20261219000000_security_search_path.sql` landed. All reads below are from
  disk state at assessment time; re-read before acting.

## (1) pgcrypto `extension_in_public` — verdict: NOT zero-risk. LEAVE IN PUBLIC.

### Findings (all verified by grep/read on 2026-09-15)

1. Install site (single): `20260910090000_bot_platform.sql:28`
   `create extension if not exists pgcrypto;` — unqualified, so it lands in
   `public` on this project. No other `CREATE EXTENSION` for pgcrypto exists.
2. Prior live outage, same hazard class: `20261102000000_bot_runtime_repairs.sql:13-19`
   documents a production 42883 `function gen_random_bytes(integer) does not exist`
   caused by extensions living in the `extensions` schema while callers were pinned
   to `set search_path = public`. That migration deliberately moves pgcrypto
   *INTO* `public` (conditional `alter extension pgcrypto set schema public`).
   Moving it back to `extensions` re-introduces the exact outage class already
   fixed once.
3. SMOKING GUN — unqualified pgcrypto call inside a function pinned to
   `SET search_path = public`:
   `20260910130000_teams_enterprise_bundle.sql:996-1013`,
   `public.push_file(...) ... security definer set search_path = public`,
   body line 1008 calls unqualified `digest(coalesce(p_content,'') || now()::text, 'sha1')`.
   Under an `extensions`-schema pgcrypto, `digest()` stops resolving here and every
   project file push fails with 42883. This alone makes the move NOT zero-risk.
4. More unqualified `gen_random_bytes(...)` calls inside function bodies that rely
   on `public` resolution (no SET pin, i.e. caller-session search_path dependent):
   `20260910030000` lobbies `:25` (create_lobby), `20260910090000` bot_platform
   `:168/:209/:254` (ensure_bot_identity / issue flows), `20260910070000` daily `:63`,
   `20260910120000` reconcile `:90/:112/:140`, `20260910180100` provisioning `:94/:147`,
   `20261103000000` ambiguity fix `:48`.
5. `gen_random_bytes` / `gen_random_uuid` in COLUMN DEFAULTS (resolved at row-write
   time under the writer's search_path, incl. PostgREST): teams bundle `:87/:118`
   (invite-token defaults), `20261013000000_zip_vault_meshy.sql:95`, plus
   `gen_random_uuid()` defaults in 30+ table definitions across all migrations.
6. No repo code references `extensions.gen_random_*` qualified (confirmed by the
   bot_runtime_repairs comment and grep: zero `extensions.` hits in migrations),
   so nothing is pre-qualified for an `extensions`-schema world.

### Recommendation
- DO NOT move pgcrypto to the `extensions` schema. No SQL recommended (none is safe
  as a single-step change).
- Document this as accepted risk: `extension_in_public` WARN retained; mitigations
  already in place are (a) pgcrypto-in-public is intentional and outage-tested,
  (b) new SECURITY DEFINER functions pin `SET search_path = public` (repo convention),
  (c) extension functions are not attacker-replaceable here (no untrusted schema
  in any search_path).
- Safe path IF ever revisited (prose only, not a migration): schema-qualify every
  call site first (`public.gen_random_uuid()`, `public.gen_random_bytes()`,
  `public.digest()`), add `extensions` to function search_paths, verify on a
  staging project whose extensions live in `extensions`, and only then move the
  extension. That is a multi-migration project, not a sweep item.

## (2) `auth_leaked_password_protection` — dashboard-only, no code path. CONFIRMED.

- Repo-wide grep for `GOTRUE_|pwned|password_protection|password check` (case-insensitive
  where relevant) returns NO auth-server config, NO SQL setting, NO env wiring:
  only (a) QUEUE.md ops notes stating it is dashboard-only, (b) task envelopes
  DS-SECLINT-10 / DS-SQLINT-10 / DS-SECWARN-09 describing the manual step,
  (c) `app/docs/getting-started/page.tsx:122` user-facing doc already stating it is
  "a dashboard-only setting no SQL migration can enable", (d) unrelated
  `password check` prose in privacy-safety docs and a `pwned` test string.
- There is no `supabase/config.toml` in the repo (glob: no `*.toml` under
  `supabase/`), so there is not even a local config file to flip.
- Conclusion: no migration, RLS policy, RPC, or app code can enable the
  HaveIBeenPwned leaked-password check. Human manual step only: Supabase Dashboard
  → Authentication → Password protection → enable leaked-password protection.
  Already documented in-app; nothing for a sweep migration to do beyond a comment
  header (deferred with the envelope's migration per no-DB-change instruction).

## (3) Consistency check — `_secfix/` slices vs linter function names

### Slice files present at assessment time: 0 of 9
- `_secfix/` did not exist at first check (glob + dir read both empty/missing);
  the directory appeared mid-assessment (concurrent sibling writer) but still
  contains **zero slice files**. All 9 expected slices are missing — there is
  nothing to cross-check against yet, so **every linter function below is covered
  by ZERO slices**.
- Top-level sibling seclint migrations present (not slices, but real coverage):
  `20261219000000_linter_search_path.sql` (ALTER … SET `''` on 3 trigger fns),
  `20261219000000_security_search_path.sql` (sibling, landed mid-assessment;
  CREATE OR REPLACE + `SET search_path = public` on the same 3 — OVERLAPS 00/01,
  integrator must dedupe: three writers pinning the same 3 functions three ways),
  `20261219000001_seclint_search_path.sql` (ALTER … SET `public, pg_temp`, same 3),
  `20261219000002_security_revoke_internals.sql` (REVOKEs, 17 targets — see below).

### Already covered by top-level 00/01/02 (i.e. NOT residual work)
- search_path pins: `handle_updated_at`, `touch_game_save_updated_at`,
  `vcw_runs_touch_updated_at` (covered 3× over — dedupe needed, not more coverage).
- REVOKEs in `...02_security_revoke_internals.sql` (17): `enforce_cheat_save_marker`,
  `enforce_clan_comment_parent_same_post`, `enforce_clan_member_cap`,
  `enforce_org_budget`, `enforce_org_count`, `enforce_org_member_cap`,
  `enforce_personal_budget`, `maintain_clan_comment_count`,
  `guard_profile_verification`, `handle_new_user`, `strip_slot_zero_cheat_marker`,
  `trg_init_org_on_use`, `trg_init_team_org_on_use`, `backfill_clan_forum_counters`,
  `bump_clan_member_count`, `bump_org_member_count`, plus `rls_auto_enable` (see flag).

### Flags for sibling/integrator attention
- F1 (orphan REVOKE): `...02` revokes `public.rls_auto_enable()` but NO
  `CREATE FUNCTION public.rls_auto_enable` exists anywhere in migrations
  (full inventory of ~280 `public.*` functions confirms absence). Revoke of a
  nonexistent function fails the migration unless wrapped — verify before merge.
- F2 (triple-pin collision): three files pin the same 3 trigger helpers to three
  different search_paths (`''` vs `public` vs `public, pg_temp`). Last-applied wins;
  integrator must pick ONE (recommend `public, pg_temp` per CVE-2018-1058 practice).

### Uncovered-function list (ZERO slices cover them; also uncovered by 00/01/02)
COIN/LEDGER: `apply_coin_lot_to_ledger`, `convert_crown_to_coins`, `refund_coin_lot`,
  `claim_alpha_tester_bonus`, `claim_daily_bonus`.
AGENT RENTALS: `book_listing`, `create_listing`, `end_booking`.
MMO: `charge_mmo_minutes`, `create_mmo_server`, `join_mmo_server`, `leave_mmo_server`,
  `heartbeat_mmo_presence`, `set_mmo_server_status`, `update_match_state`,
  `quick_match`, `gravegain_quick_match`, `post_mp_event`, `read_mp_events`.
CLAN READS/CAPS: `clan_leaderboard`, `clan_member_cap`, `clan_minute_rate`,
  `clan_roster_page`, `clan_scale_status`, `clan_supporter_status`,
  `clan_tribute_status`, `create_clan`, `join_clan`, `create_post`, `create_comment`,
  `set_member_roles`.
COMMUNITY/STATS: `community_stat_averages`, `game_chart_summary`, `leaderboard_top`,
  `launch_campaign_progress`, `love_post_totals`, `love_profile_stats`,
  `give_love_letter`, `award_love_letter`, `tip_creator`, `vote_clan_post`,
  `vote_clan_comment`.
PERMS/ORG/TEAM/PROJECT: `effective_perms`, `has_org_perm`, `has_project_perm`,
  `has_team_perm`, `is_org_member`, `org_member_cap`, `org_roles_of`,
  `org_watch_visible`, `project_team`, `team_org`, `create_org`, `create_team`,
  `create_project`, `create_room`, `ensure_default_org`.
KIDS/FAMILY: `start_kid_session`, `end_kid_session`, `heartbeat_kid_session`,
  `kid_in_window`, `kid_seconds_today`, `kid_session_owner`, `kid_wallet_balance`.
MISC RPC: `file_report`, `process_easydnc_batch_payment`, `set_cheat_setting`,
  `heartbeat_usage`, `request_friend_by_handle`, `respond_friend_request`,
  `my_friends`, `meter_*` family (`meter_clan_posting_fee[_for]`, `meter_game_ai_usage`,
  `meter_fal_usage`, `meter_meshy_usage[_for]`, `meter_vault_storage[_for]`,
  `meter_vcw_usage[_for]`, `meter_openrouter_usage`, `meter_outscraper_usage`,
  `meter_newgameplus_build[_for]`, `meter_submission_charge[_for]`, `meter_usage`),
  `my_meshy_spend`, `my_submission_spend`, `my_vault_spend`,
  `party_*` family (~15: `party_can_act`, `party_can_admin`, `party_challenge_create`,
  `party_challenge_decide`, `party_entity_exists`, `party_feed`, `party_follow`,
  `party_invite_create`, `party_invite_decide`, `party_kind_valid`, `party_label`,
  `party_my_invites`, `party_post_create`, `party_resolve`, `party_search`,
  `party_unfollow`), `ghost_*` family (7: `ghost_beat`, `ghost_clock_in`,
  `ghost_clock_out`, `ghost_create_contract`, `ghost_invoice_timer`,
  `ghost_mark_debt`, `ghost_org_summary`, `ghost_settle_debt`),
  `start_timer`, `stop_timer`, `fund_clan_wallet`, `fund_kid_wallet`,
  `fund_org_wallet`.

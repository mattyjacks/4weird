-- ============================================================================
-- fal.ai media compute — 30-op expansion (15 → 30), same 25% cut rule.
-- Fully rerunnable: drops the 15-op CHECK + recreates it with all 30 ops,
-- then CREATE OR REPLACE the meter/model map. Mirrors lib/fal.ts FAL_OPS.
--
-- New ops: sprite-sheet | backdrop-wide | character-turn | level-inpaint |
-- depth-map | voxel-prop | text-to-3d | cutscene-veo | motion-loop |
-- monster-voice | ambient-bed | chiptune-loop | quest-dialogue |
-- code-review | capsule-art. Sources unchanged: fal-studio | vcw | api |
-- manual. Never faked, never negative. Wallets move only here.
-- ============================================================================

alter table if exists public.fal_usage drop constraint if exists fal_usage_op_check;
alter table if exists public.fal_usage
  add constraint fal_usage_op_check check (op in ('concept-art','sprite-edit','icon-logo','texture-tile','upscale-hd','remove-bg','render-3d','trailer-clip','animate-sprite','npc-voice','sfx-burst','theme-music','lipsync-take','playtest-notes','app-promo','sprite-sheet','backdrop-wide','character-turn','level-inpaint','depth-map','voxel-prop','text-to-3d','cutscene-veo','motion-loop','monster-voice','ambient-bed','chiptune-loop','quest-dialogue','code-review','capsule-art'));

-- meter_fal_usage: debit personal coins (gross), split 25/75, record.
create or replace function public.meter_fal_usage(
  p_game text,
  p_op text,
  p_qty numeric,
  p_source text default 'fal-studio'
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_game text; v_gross integer; v_cut integer; v_provider integer; v_bal integer;
  v_fee record; v_model text := '';
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  v_game := lower(trim(coalesce(p_game, 'lobby')));
  if v_game !~ '^[a-z0-9-]{1,64}$' then raise exception 'invalid game'; end if;
  if p_op not in ('concept-art','sprite-edit','icon-logo','texture-tile','upscale-hd','remove-bg','render-3d','trailer-clip','animate-sprite','npc-voice','sfx-burst','theme-music','lipsync-take','playtest-notes','app-promo','sprite-sheet','backdrop-wide','character-turn','level-inpaint','depth-map','voxel-prop','text-to-3d','cutscene-veo','motion-loop','monster-voice','ambient-bed','chiptune-loop','quest-dialogue','code-review','capsule-art') then
    raise exception 'invalid op';
  end if;
  if p_qty is null or p_qty <= 0 or p_qty > 100000000 then raise exception 'invalid qty'; end if;
  if p_source not in ('fal-studio','vcw','api','manual') then raise exception 'invalid source'; end if;

  -- Gross price by op (coins, cut INCLUDED — mirrors lib/fal.ts FAL_OPS).
  v_gross := case p_op
    when 'concept-art' then greatest(1, ceil(8 * p_qty)::integer)
    when 'sprite-edit' then greatest(1, ceil(8 * p_qty)::integer)
    when 'icon-logo' then greatest(1, ceil(10 * p_qty)::integer)
    when 'texture-tile' then greatest(1, ceil(8 * p_qty)::integer)
    when 'upscale-hd' then greatest(1, ceil(6 * p_qty)::integer)
    when 'remove-bg' then greatest(1, ceil(3 * p_qty)::integer)
    when 'render-3d' then greatest(1, ceil(15 * p_qty)::integer)
    when 'trailer-clip' then greatest(1, ceil(25 * p_qty)::integer)
    when 'animate-sprite' then greatest(1, ceil(20 * p_qty)::integer)
    when 'npc-voice' then greatest(1, ceil(4 * p_qty)::integer)
    when 'sfx-burst' then greatest(1, ceil(6 * p_qty)::integer)
    when 'theme-music' then greatest(1, ceil(10 * p_qty)::integer)
    when 'lipsync-take' then greatest(1, ceil(18 * p_qty)::integer)
    when 'playtest-notes' then greatest(1, ceil(3 * p_qty)::integer)
    when 'app-promo' then greatest(1, ceil(8 * p_qty)::integer)
    when 'sprite-sheet' then greatest(1, ceil(9 * p_qty)::integer)
    when 'backdrop-wide' then greatest(1, ceil(9 * p_qty)::integer)
    when 'character-turn' then greatest(1, ceil(9 * p_qty)::integer)
    when 'level-inpaint' then greatest(1, ceil(8 * p_qty)::integer)
    when 'depth-map' then greatest(1, ceil(6 * p_qty)::integer)
    when 'voxel-prop' then greatest(1, ceil(15 * p_qty)::integer)
    when 'text-to-3d' then greatest(1, ceil(16 * p_qty)::integer)
    when 'cutscene-veo' then greatest(1, ceil(22 * p_qty)::integer)
    when 'motion-loop' then greatest(1, ceil(20 * p_qty)::integer)
    when 'monster-voice' then greatest(1, ceil(4 * p_qty)::integer)
    when 'ambient-bed' then greatest(1, ceil(7 * p_qty)::integer)
    when 'chiptune-loop' then greatest(1, ceil(8 * p_qty)::integer)
    when 'quest-dialogue' then greatest(1, ceil(3 * p_qty)::integer)
    when 'code-review' then greatest(1, ceil(3 * p_qty)::integer)
    when 'capsule-art' then greatest(1, ceil(9 * p_qty)::integer)
    else 1 end;
  -- FAL_COMPUTE_CUT_PCT = 25 (lib/economy.ts + lib/fal.ts).
  v_cut := round(v_gross * 25 / 100.0)::integer;
  v_provider := v_gross - v_cut;

  select coalesce(sum(delta), 0)::integer into v_bal
  from public.coin_ledger where user_id = auth.uid();
  if v_bal < v_gross then
    raise exception 'insufficient balance: need % coins, have %', v_gross, v_bal;
  end if;

  select * into v_fee from public.fal_compute_split(v_gross);
  v_cut := v_fee.cut; v_provider := v_fee.provider;

  v_model := case p_op
    when 'concept-art' then 'fal-ai/flux/schnell'
    when 'sprite-edit' then 'fal-ai/nano-banana-2/edit'
    when 'icon-logo' then 'fal-ai/ideogram/v3'
    when 'texture-tile' then 'fal-ai/recraft-v3'
    when 'upscale-hd' then 'fal-ai/topaz/upscale/image'
    when 'remove-bg' then 'fal-ai/birefnet'
    when 'render-3d' then 'fal-ai/trellis/image-to-3d'
    when 'trailer-clip' then 'fal-ai/kling-video/v3/pro/text-to-video'
    when 'animate-sprite' then 'fal-ai/minimax/h3/image-to-video'
    when 'npc-voice' then 'fal-ai/minimax/speech-02-hd'
    when 'sfx-burst' then 'fal-ai/stable-audio-v2'
    when 'theme-music' then 'fal-ai/musicgen/medium'
    when 'lipsync-take' then 'fal-ai/sync-lipsync'
    when 'playtest-notes' then 'fal-ai/whisper-v3'
    when 'app-promo' then 'fal-ai/flux/dev'
    when 'sprite-sheet' then 'fal-ai/flux-pro/v1.1'
    when 'backdrop-wide' then 'fal-ai/imagen4/preview'
    when 'character-turn' then 'fal-ai/hidream-i1-full'
    when 'level-inpaint' then 'fal-ai/flux-pro/fill'
    when 'depth-map' then 'fal-ai/depth-anything-v2'
    when 'voxel-prop' then 'fal-ai/hunyuan3d-v21/image-to-3d'
    when 'text-to-3d' then 'fal-ai/trellis/text-to-3d'
    when 'cutscene-veo' then 'fal-ai/veo3/fast/text-to-video'
    when 'motion-loop' then 'fal-ai/kling-video/v2.5-turbo/image-to-video'
    when 'monster-voice' then 'fal-ai/dia-tts'
    when 'ambient-bed' then 'fal-ai/mmaudio-v2/text-to-audio'
    when 'chiptune-loop' then 'fal-ai/yue/text-to-music'
    when 'quest-dialogue' then 'fal-ai/openai/gpt-oss-120b'
    when 'code-review' then 'fal-ai/moonshotai/kimi-k2-instruct'
    when 'capsule-art' then 'fal-ai/fast-sdxl'
    else '' end;

  insert into public.coin_ledger (user_id, delta, reason)
  values (auth.uid(), -v_gross, substr('fal.ai (' || v_game || '/' || p_op || ')', 1, 120));
  insert into public.fal_usage
    (user_id, game_slug, op, qty, gross_coins, cut_coins, provider_coins, source, model)
  values
    (auth.uid(), v_game, p_op, p_qty, v_gross, v_cut, v_provider, p_source, v_model);
  return jsonb_build_object(
    'gross_coins', v_gross, 'cut_coins', v_cut, 'provider_coins', v_provider,
    'op', p_op, 'model', v_model
  );
end; $$;
revoke all on function public.meter_fal_usage(text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.meter_fal_usage(text, text, numeric, text) to authenticated;

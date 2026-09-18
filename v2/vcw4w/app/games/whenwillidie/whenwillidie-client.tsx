"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PredictResult = {
  disclaimer: string;
  baselineYears: number;
  adjustments: { label: string; years: number }[];
  totalDelta: number;
  predictedDeathAge: number;
  yearsLeft: number;
  daysLeft: number;
  deathDateISO: string;
  band: { pessimistic: number; median: number; optimistic: number };
  topRisks: { label: string; years: number }[];
  topBoosts: { label: string; years: number }[];
  headline: string;
  epitaph: string;
  tips: string[];
  reaperRating: string;
  ai: string;
  sources: string[];
};

const COUNTRIES = ["United States", "United Kingdom", "Canada", "Australia", "Japan", "Germany", "France", "Italy", "Spain", "Netherlands", "Sweden", "Norway", "Switzerland", "Singapore", "Russia", "Ukraine", "Nigeria", "Afghanistan", "Haiti", "Other"];
const CONDITIONS = [["none", "None"], ["diabetes", "Diabetes"], ["heart", "Heart disease"], ["cancer", "Cancer history"], ["stroke", "Stroke"], ["lung", "Lung disease"], ["hypertension", "High blood pressure"], ["depression", "Depression"]] as const;

const inputCls = "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-300/60";
const labelCls = "block text-xs font-bold uppercase tracking-wider text-slate-300";

function useCountdown(targetISO: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!targetISO) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [targetISO]);
  if (!targetISO) return null;
  let ms = new Date(targetISO + "T00:00:00Z").getTime() - now;
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  return {
    years: Math.floor(s / (365.25 * 86400)),
    days: Math.floor((s % (365.25 * 86400)) / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
  };
}

export default function WhenWillIDieClient() {
  const [form, setForm] = useState({ age: "30", sex: "male", country: "United States", smoking: "never", alcohol: "none", bmi: "24", exercise: "some", sleepHours: "7.5", diet: "average", familyLongevity: "average", stress: "medium", note: "" });
  const [conds, setConds] = useState<string[]>(["none"]);
  const [ack, setAck] = useState(false);
  const [age13, setAge13] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // ---- On-device skeletonizer: the photo never leaves the browser. ----
  // Refs live in the component (repo canvas pattern); .current is read only
  // inside callbacks/effects, never during render.
  const srcCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const outCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [bonePct, setBonePct] = useState(80);
  const [glowPct, setGlowPct] = useState(55);
  const [photoDims, setPhotoDims] = useState({ w: 0, h: 0 });

  const renderSkeleton = useCallback(() => {
    const src = srcCanvasRef.current;
    const out = outCanvasRef.current;
    if (!src || !out || !src.width) return;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    const W = src.width;
    const H = src.height;
    out.width = W;
    out.height = H;

    // 1. Background = the original photo, dimmed (same background preserved).
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(src, 0, 0);
    ctx.fillStyle = "rgba(5,8,20,0.55)";
    ctx.fillRect(0, 0, W, H);

    // 2. Analyze a tiny copy: brightness grid -> centroid + spread.
    // The photo's light masses steer the skeleton (pose tilt, rib width).
    const probe = document.createElement("canvas");
    const PW = 48;
    const PH = Math.max(8, Math.round((48 * H) / W));
    probe.width = PW;
    probe.height = PH;
    const pctx = probe.getContext("2d", { willReadFrequently: true });
    if (!pctx) return;
    pctx.drawImage(src, 0, 0, PW, PH);
    const data = pctx.getImageData(0, 0, PW, PH).data;
    let mass = 0, sx = 0, sy = 0, topMass = 0, topN = 0;
    const lum = new Float32Array(PW * PH);
    for (let y = 0; y < PH; y++) {
      for (let x = 0; x < PW; x++) {
        const i = (y * PW + x) * 4;
        const l = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
        lum[y * PW + x] = l;
        mass += l;
        sx += x * l;
        sy += y * l;
        if (y < PH * 0.4) { topMass += l; topN += 1; }
      }
    }
    const cx = mass > 0 ? sx / mass / PW : 0.5; // 0..1 photo-influenced center
    const cy = mass > 0 ? sy / mass / PH : 0.5;
    const tilt = Math.max(-0.22, Math.min(0.22, (cx - 0.5) * 0.9)); // lean toward the light
    const spread = Math.min(1, Math.max(0.35, topMass / Math.max(1, topN * 0.55)));
    const skullR = Math.min(W, H) * (0.09 + spread * 0.05);

    // 3. X-ray edge layer from the luminance grid (bone texture follows photo edges).
    const edge = document.createElement("canvas");
    edge.width = W;
    edge.height = H;
    const ectx = edge.getContext("2d");
    if (ectx) {
      const img = ectx.createImageData(W, H);
      const cellW = W / PW;
      const cellH = H / PH;
      for (let py = 0; py < H; py++) {
        const gy = Math.min(PH - 1, Math.floor(py / cellH));
        for (let px = 0; px < W; px++) {
          const gx = Math.min(PW - 1, Math.floor(px / cellW));
          const c = lum[gy * PW + gx];
          const rx = lum[gy * PW + Math.min(PW - 1, gx + 1)] - c;
          const by = lum[Math.min(PH - 1, gy + 1) * PW + gx] - c;
          const e = Math.min(1, Math.hypot(rx, by) * 4 + Math.pow(c, 3) * 0.55);
          const o = (py * W + px) * 4;
          img.data[o] = 214 * e + 12;
          img.data[o + 1] = 228 * e + 16;
          img.data[o + 2] = 235 * e + 24;
          img.data[o + 3] = 255;
        }
      }
      ectx.putImageData(img, 0, 0);
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.25 + (bonePct / 100) * 0.55;
      ctx.drawImage(edge, 0, 0);
    }

    // 4. Procedural skeleton, posed by the photo analysis.
    const bone = `rgba(232,238,244,${0.55 + (bonePct / 100) * 0.45})`;
    const joint = `rgba(160,200,220,${0.5 + (bonePct / 100) * 0.5})`;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = bonePct / 100;
    ctx.strokeStyle = bone;
    ctx.fillStyle = bone;
    ctx.lineCap = "round";
    const headX = W * (0.32 + cx * 0.36);
    const headY = H * (0.1 + cy * 0.14);
    const unit = Math.min(W, H) / 100;
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(tilt);
    ctx.translate(-headX, -headY);

    const seg = (x1: number, y1: number, x2: number, y2: number, w: number) => {
      ctx.lineWidth = Math.max(1.5, w);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      for (const [jx, jy] of [[x1, y1], [x2, y2]] as const) {
        ctx.fillStyle = joint;
        ctx.beginPath();
        ctx.arc(jx, jy, Math.max(2, w * 0.85), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bone;
      }
    };

    // Skull + jaw + eyes (hollow).
    ctx.lineWidth = Math.max(2, unit * 0.9);
    ctx.beginPath();
    ctx.ellipse(headX, headY, skullR, skullR * 1.18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(headX, headY + skullR * 1.25, skullR * 0.55, skullR * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(5,8,20,0.9)";
    for (const dx of [-0.38, 0.38]) {
      ctx.beginPath();
      ctx.ellipse(headX + dx * skullR, headY - skullR * 0.08, skullR * 0.26, skullR * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(headX - skullR * 0.12, headY + skullR * 0.32);
    ctx.lineTo(headX + skullR * 0.12, headY + skullR * 0.32);
    ctx.lineTo(headX, headY + skullR * 0.5);
    ctx.closePath();
    ctx.fill();
    // Teeth ticks (count varies with photo brightness spread).
    const teeth = 4 + Math.round(spread * 4);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < teeth; i++) {
      const tx = headX - skullR * 0.4 + ((i + 0.5) / teeth) * skullR * 0.8;
      ctx.beginPath();
      ctx.moveTo(tx, headY + skullR * 1.12);
      ctx.lineTo(tx, headY + skullR * 1.34);
      ctx.stroke();
    }

    // Spine, ribs, pelvis.
    const neckY = headY + skullR * 1.7;
    const hipY = Math.min(H * 0.94, neckY + H * 0.42);
    seg(headX, neckY, headX + tilt * 60, hipY, unit * 1.6);
    const ribs = 5 + Math.round(spread * 2);
    for (let i = 0; i < ribs; i++) {
      const t = i / Math.max(1, ribs - 1);
      const ry = neckY + (hipY - neckY) * (0.08 + t * 0.62);
      const rw = skullR * (1.5 - t * 0.55) * (0.8 + spread * 0.5);
      ctx.lineWidth = Math.max(1.5, unit * (0.7 - t * 0.25));
      ctx.beginPath();
      ctx.ellipse(headX + tilt * 40 * t, ry, rw, rw * 0.34, tilt * 0.5, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(headX + tilt * 40 * t, ry, rw, rw * 0.34, tilt * 0.5, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(2, unit * 1.1);
    ctx.beginPath();
    ctx.ellipse(headX + tilt * 60, hipY + unit * 2, skullR * 0.72, skullR * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Arms + legs as tapered bone chains, angled by photo tilt.
    const shY = neckY + (hipY - neckY) * 0.12;
    const armL = H * 0.3;
    const legL = H - hipY - unit * 4;
    for (const side of [-1, 1]) {
      const shX = headX + side * skullR * 1.35;
      const elX = shX + side * armL * 0.28 + tilt * 50;
      const elY = shY + armL * 0.52;
      const haX = shX + side * armL * 0.12 + tilt * 80;
      const haY = shY + armL;
      seg(shX, shY, elX, elY, unit * 1.1);
      seg(elX, elY, haX, haY, unit * 0.9);
      for (let f = 0; f < 3; f++) {
        seg(haX, haY, haX + side * (unit * (2.2 - f * 0.4)), haY + unit * 1.6, unit * 0.5);
      }
      const hipX = headX + tilt * 60 + side * skullR * 0.5;
      const knX = hipX + side * unit * 1.2 - tilt * 30;
      const knY = hipY + legL * 0.52;
      const ftX = hipX + side * unit * 0.6 - tilt * 40;
      const ftY = hipY + legL;
      seg(hipX, hipY, knX, knY, unit * 1.4);
      seg(knX, knY, ftX, ftY, unit * 1.1);
      seg(ftX, ftY, ftX + side * unit * 3, ftY, unit * 0.7);
    }
    ctx.restore();

    // 5. Spooky glow + vignette.
    if (glowPct > 0) {
      const g = ctx.createRadialGradient(headX, headY, skullR * 0.4, headX, headY, Math.max(W, H) * 0.7);
      g.addColorStop(0, `rgba(120,220,255,${(glowPct / 100) * 0.16})`);
      g.addColorStop(1, "rgba(120,220,255,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }, [bonePct, glowPct]);

  useEffect(() => { if (photoLoaded) renderSkeleton(); }, [photoLoaded, renderSkeleton]);

  const loadFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")?.drawImage(img, 0, 0, w, h);
      srcCanvasRef.current = c;
      setPhotoDims({ w, h });
      setPhotoLoaded(true);
    };
    img.src = url;
  }, []);

  const download = useCallback(() => {
    const out = outCanvasRef.current;
    if (!out || !out.width) return;
    const a = document.createElement("a");
    a.download = "whenwillidie-skeleton.png";
    a.href = out.toDataURL("image/png");
    a.click();
  }, []);

  const cd = useCountdown(result?.deathDateISO ?? null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const toggleCond = (c: string) => {
    setConds((prev) => {
      if (c === "none") return ["none"];
      const next = prev.includes(c) ? prev.filter((x) => x !== c) : [...prev.filter((x) => x !== "none"), c];
      return next.length ? next : ["none"];
    });
  };

  const predict = async () => {
    setError(null);
    if (!ack || !age13) { setError("Tick both consent boxes first (13+ and entertainment-only)."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/games/whenwillidie/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: Number(form.age),
          sex: form.sex,
          country: form.country,
          smoking: form.smoking,
          alcohol: form.alcohol,
          bmi: Number(form.bmi),
          exercise: form.exercise,
          sleepHours: Number(form.sleepHours),
          diet: form.diet,
          conditions: conds,
          familyLongevity: form.familyLongevity,
          stress: form.stress,
          note: form.note,
        }),
      });
      const body = (await res.json()) as { success: boolean; error?: string } & Partial<PredictResult>;
      if (!res.ok || !body.success) throw new Error(body.error ?? "The Reaper dropped the call. Try again.");
      setResult(body as PredictResult);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something spooky happened. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* LEFT: mortality form */}
      <section aria-label="Death predictor" className="rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
        <h2 className="text-xl font-black">☠️ Step 1 — feed the Reaper (data)</h2>
        <p className="mt-1 text-sm text-slate-400">Numbers only. No names, emails, phones, or addresses — ever.</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div><label className={labelCls} htmlFor="wwid-age">Age</label><input id="wwid-age" className={inputCls} inputMode="numeric" value={form.age} onChange={(e) => set("age", e.target.value)} /></div>
          <div><label className={labelCls} htmlFor="wwid-sex">Sex at birth</label><select id="wwid-sex" className={inputCls} value={form.sex} onChange={(e) => set("sex", e.target.value)}><option value="male">Male</option><option value="female">Female</option><option value="other">Other / prefer not to say</option></select></div>
          <div><label className={labelCls} htmlFor="wwid-country">Country</label><select id="wwid-country" className={inputCls} value={form.country} onChange={(e) => set("country", e.target.value)}>{COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className={labelCls} htmlFor="wwid-bmi">BMI</label><input id="wwid-bmi" className={inputCls} inputMode="decimal" value={form.bmi} onChange={(e) => set("bmi", e.target.value)} /></div>
          <div><label className={labelCls} htmlFor="wwid-smoke">Smoking</label><select id="wwid-smoke" className={inputCls} value={form.smoking} onChange={(e) => set("smoking", e.target.value)}><option value="never">Never</option><option value="occasional">Occasionally</option><option value="daily">Daily</option><option value="former">Former</option><option value="vaping">Vaping daily</option></select></div>
          <div><label className={labelCls} htmlFor="wwid-alc">Alcohol</label><select id="wwid-alc" className={inputCls} value={form.alcohol} onChange={(e) => set("alcohol", e.target.value)}><option value="none">None</option><option value="moderate">Moderate</option><option value="heavy">Heavy</option></select></div>
          <div><label className={labelCls} htmlFor="wwid-ex">Exercise</label><select id="wwid-ex" className={inputCls} value={form.exercise} onChange={(e) => set("exercise", e.target.value)}><option value="athlete">150+ min/week</option><option value="some">Some</option><option value="none">None</option></select></div>
          <div><label className={labelCls} htmlFor="wwid-sleep">Sleep (hrs)</label><input id="wwid-sleep" className={inputCls} inputMode="decimal" value={form.sleepHours} onChange={(e) => set("sleepHours", e.target.value)} /></div>
          <div><label className={labelCls} htmlFor="wwid-diet">Diet</label><select id="wwid-diet" className={inputCls} value={form.diet} onChange={(e) => set("diet", e.target.value)}><option value="healthy">Healthy</option><option value="average">Average</option><option value="poor">Poor</option></select></div>
          <div><label className={labelCls} htmlFor="wwid-fam">Family longevity</label><select id="wwid-fam" className={inputCls} value={form.familyLongevity} onChange={(e) => set("familyLongevity", e.target.value)}><option value="long">Long-lived</option><option value="average">Average</option><option value="short">Short-lived</option></select></div>
          <div className="col-span-2"><label className={labelCls} htmlFor="wwid-stress">Stress</label><select id="wwid-stress" className={inputCls} value={form.stress} onChange={(e) => set("stress", e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
        </div>
        <fieldset className="mt-3">
          <legend className={labelCls}>Conditions (general categories only)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {CONDITIONS.map(([v, l]) => (
              <button key={v} type="button" onClick={() => toggleCond(v)} aria-pressed={conds.includes(v)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${conds.includes(v) ? "border-purple-300 bg-purple-400/20 text-purple-100" : "border-white/15 text-slate-300 hover:bg-white/10"}`}>{l}</button>
            ))}
          </div>
        </fieldset>
        <div className="mt-3">
          <label className={labelCls} htmlFor="wwid-note">Anything else? (optional, self-censor PII)</label>
          <textarea id="wwid-note" className={`${inputCls} mt-1 min-h-16`} maxLength={280} placeholder="e.g. night-shift goblin, marathon runner, professional napper…" value={form.note} onChange={(e) => set("note", e.target.value)} />
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <label className="flex items-start gap-2 text-slate-300"><input type="checkbox" className="mt-1" checked={age13} onChange={(e) => setAge13(e.target.checked)} /> I confirm I am 13 or older.</label>
          <label className="flex items-start gap-2 text-slate-300"><input type="checkbox" className="mt-1" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I understand this is <b className="text-white">FOR ENTERTAINMENT ONLY</b> — not medical advice, not a real prediction.</label>
        </div>
        {error && <p role="alert" className="mt-3 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
        <button type="button" onClick={predict} disabled={loading} className="mt-4 w-full rounded-full bg-purple-400 px-6 py-3 font-black text-slate-950 transition hover:bg-purple-300 disabled:opacity-60">
          {loading ? "Consulting the Reaper…" : "💀 Reveal my death date"}
        </button>

        {result && (
          <div ref={resultRef} className="mt-5 rounded-2xl border border-purple-300/30 bg-gradient-to-b from-purple-500/15 to-transparent p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-purple-200">{result.reaperRating} · {result.ai === "openai" ? "narrated by AI" : "narrated by local actuarial goblin"}</p>
            <p className="mt-1 text-lg font-black">{result.headline}</p>
            <p className="mt-3 text-center font-mono text-sm text-slate-300">ESTIMATED TIME LEFT</p>
            {cd && <p className="text-center font-mono text-2xl font-black text-purple-100 tabular-nums">{cd.years}y : {cd.days}d : {String(cd.hours).padStart(2, "0")}h : {String(cd.mins).padStart(2, "0")}m : {String(cd.secs).padStart(2, "0")}s</p>}
            <p className="mt-2 text-center text-sm text-slate-300">Predicted checkout: <b className="text-white">age {result.predictedDeathAge}</b> (~{result.deathDateISO}, {result.yearsLeft} years / {result.daysLeft.toLocaleString()} days left)</p>
            <p className="mt-1 text-center text-xs text-slate-400">Range for drama: {result.band.pessimistic} – {result.band.optimistic} · Baseline {result.baselineYears}y {result.totalDelta >= 0 ? "+" : ""}{result.totalDelta}y lifestyle</p>
            <blockquote className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-center font-serif italic text-slate-200">🪦 “{result.epitaph}”</blockquote>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-200">{result.tips.map((t, i) => <li key={i} className="rounded-lg bg-white/5 px-3 py-2">💡 {t}</li>)}</ul>
            <details className="mt-3 text-xs text-slate-400"><summary className="cursor-pointer font-bold text-slate-300">Show the full math (every year gained/lost)</summary>
              <ul className="mt-2 space-y-1">{result.adjustments.map((a, i) => <li key={i} className="flex justify-between gap-2 font-mono"><span>{a.label}</span><span className={a.years < 0 ? "text-red-300" : "text-emerald-300"}>{a.years > 0 ? "+" : ""}{a.years}y</span></li>)}</ul>
              <p className="mt-2">Sources: {result.sources.join(" · ")}</p>
            </details>
          </div>
        )}
      </section>

      {/* RIGHT: skeletonizer */}
      <section aria-label="Skeleton photo filter" className="rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
        <h2 className="text-xl font-black">💀 Step 2 — become the skeleton</h2>
        <p className="mt-1 text-sm text-slate-400">Drop a photo. It is skeletonized <b className="text-emerald-300">100% on your device</b> — never uploaded, never stored. The photo&apos;s light and edges steer the bones, on your original background.</p>
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/20 bg-black/30 px-4 py-8 text-center transition hover:border-purple-300/60">
          <span className="text-3xl">📸</span>
          <span className="mt-2 text-sm font-bold text-slate-200">{photoLoaded ? "Swap photo" : "Choose a photo (or drag & drop here)"}</span>
          <span className="mt-1 text-xs text-slate-400">JPG/PNG · stays in this tab · nothing leaves your browser</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
        </label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith("image/")) loadFile(f); }}
          className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black"
        >
          {photoLoaded ? (
            <canvas ref={outCanvasRef} className="mx-auto block max-h-[560px] w-auto max-w-full" />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-500">
              <span className="text-5xl">💀</span>
              <p className="text-sm">Your future skeleton appears here</p>
            </div>
          )}
        </div>
        {photoLoaded && (
          <div className="mt-4 space-y-3">
            <div><label className={labelCls} htmlFor="wwid-bones">Flesh ↔ Bones ({bonePct}%)</label><input id="wwid-bones" type="range" min={0} max={100} value={bonePct} onChange={(e) => setBonePct(Number(e.target.value))} className="w-full" /></div>
            <div><label className={labelCls} htmlFor="wwid-glow">Spooky glow ({glowPct}%)</label><input id="wwid-glow" type="range" min={0} max={100} value={glowPct} onChange={(e) => setGlowPct(Number(e.target.value))} className="w-full" /></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={renderSkeleton} className="rounded-full border border-white/20 px-5 py-2 text-sm font-bold hover:bg-white/10">Re-pose bones</button>
              <button type="button" onClick={download} className="rounded-full bg-emerald-300 px-5 py-2 text-sm font-black text-slate-950 hover:bg-emerald-200">Download skeleton PNG</button>
            </div>
            <p className="text-xs text-slate-500">{photoDims.w}×{photoDims.h}px · “Re-pose” re-reads your photo&apos;s light masses for a fresh bone fit.</p>
          </div>
        )}
        <div className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4 text-xs leading-relaxed text-amber-100">
          <p className="font-black">⚠️ FOR ENTERTAINMENT ONLY — not medical advice, not a real mortality prediction.</p>
          <p className="mt-1 text-amber-100/90">Actuarial party trick built on public life-table math. Self-censor your PII: never type your name, email, phone, or address. Skeleton photos are processed locally in your browser and never sent anywhere. If health worries are real, talk to a real clinician — the Reaper is just here for the costume party.</p>
        </div>
      </section>
    </div>
  );
}

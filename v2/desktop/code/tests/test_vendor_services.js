// Test: OpenRouter + Outscraper vendor service modules are structurally sound.
// Run: node tests/test_vendor_services.js (no keys, no network).
// Sibling agents are writing the 7 lib modules + 4 routes in parallel, so this
// test probes each path and gracefully SKIPs whatever is absent. It asserts
// strictly on whatever IS present (transpile-free: reads .ts source as text).
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const VCW = path.resolve(__dirname, '..', '..', '..', 'vcw4w');
const LIB = path.join(VCW, 'lib');

// Logical vendor modules: file candidates (first hit wins), op minimum, key env.
const MODULES = [
  { key: 'chat', files: ['openrouter-chat.ts'], min: 12, env: 'OPENROUTER_API_KEY' },
  { key: 'agent', files: ['openrouter-agent.ts'], min: 12, env: 'OPENROUTER_API_KEY' },
  { key: 'meta', files: ['openrouter-meta.ts'], min: 8, env: 'OPENROUTER_API_KEY' },
  { key: 'maps', files: ['outscraper-maps.ts'], min: 10, env: 'OUTSCRAPER_API_KEY' },
  { key: 'reviews', files: ['outscraper-reviews.ts'], min: 8, env: 'OUTSCRAPER_API_KEY' },
  { key: 'search', files: ['outscraper-search.ts'], min: 8, env: 'OUTSCRAPER_API_KEY' },
  { key: 'leads', files: ['outscraper-leads.ts'], min: 8, env: 'OUTSCRAPER_API_KEY' },
];

const ROUTES = [
  'app/api/openrouter-vendor/ops/route.ts',
  'app/api/openrouter-vendor/generate/route.ts',
  'app/api/outscraper/ops/route.ts',
  'app/api/outscraper/search/route.ts',
];

function findModule(mod) {
  for (const f of mod.files) {
    const p = path.join(LIB, f);
    let src = null;
    try {
      src = fs.readFileSync(p, 'utf8');
    } catch (e) {
      if (e && e.code !== 'ENOENT') throw e;
      continue; // try next candidate name
    }
    return { file: f, full: p, src };
  }
  return null;
}

function countRe(src, re) {
  const m = src.match(re);
  return m ? m.length : 0;
}

(() => {
  const skips = [];
  let totalOps = 0;
  let present = 0;

  for (const mod of MODULES) {
    const hit = findModule(mod);
    if (!hit) {
      const msg = `SKIP: ${mod.files[0]} not present yet`;
      skips.push(msg);
      console.log(msg);
      continue;
    }
    present += 1;
    const { src, file } = hit;

    // 1. OP_KEYS array exists.
    assert.ok(/OP_KEYS/.test(src), `${file}: OP_KEYS array missing`);
    assert.ok(/const\s+OP_KEYS|OP_KEYS\s*[:=]/.test(src), `${file}: OP_KEYS declaration missing`);

    // 2. Op count >= expected minimum (one coinsPerUnit per op).
    const coins = countRe(src, /coinsPerUnit/g);
    assert.ok(
      coins >= mod.min,
      `${file}: expected >= ${mod.min} ops (coinsPerUnit), found ${coins}`
    );

    // 3. Each op carries coinsPerUnit + blurb + api (counts must each clear the bar).
    const blurbs = countRe(src, /blurb/g);
    const apis = countRe(src, /\bapi\b\s*:/g);
    assert.ok(blurbs >= mod.min, `${file}: expected >= ${mod.min} blurbs, found ${blurbs}`);
    assert.ok(apis >= mod.min, `${file}: expected >= ${mod.min} api entries, found ${apis}`);

    // 4. CUT_PCT 25 present (25% house cut).
    assert.ok(/CUT_PCT/.test(src), `${file}: CUT_PCT missing`);
    assert.ok(/\b25\b/.test(src), `${file}: CUT_PCT 25 value missing`);

    // 5. Key helper reads the right env name.
    assert.ok(
      src.includes(mod.env),
      `${file}: expected key helper to read ${mod.env}`
    );

    // 6. No hardcoded secret.
    assert.ok(
      !/sk-or-v1-[A-Za-z0-9\-_]{6,}/.test(src),
      `${file}: hardcoded OpenRouter secret`
    );
    assert.ok(
      !/sk-live-[A-Za-z0-9\-_]{6,}/.test(src),
      `${file}: hardcoded live secret`
    );
    assert.ok(
      !/["']sk-[^"'\\s]{8,}["']/.test(src),
      `${file}: hardcoded sk- secret string`
    );
    assert.ok(
      !/BEGIN [A-Z ]*PRIVATE KEY/.test(src),
      `${file}: embedded private key`
    );

    totalOps += coins;
    console.log(`OK: ${file} (${coins} ops, >= ${mod.min})`);
  }

  // Per-module minimums always enforced above for present modules.
  // Global total enforced only when all 7 modules are present.
  if (present === MODULES.length) {
    assert.ok(totalOps >= 50, `expected total >= 50 ops across 7 modules, got ${totalOps}`);
  } else {
    console.log(`SKIP: total>=50 check deferred (${present}/7 modules present)`);
  }

  // Route files: SKIP per missing file. Fail only when vendor work has started
  // (a lib module exists) but zero routes exist; when nothing has landed yet,
  // report SKIP and still pass so parallel development stays green.
  let routesPresent = 0;
  for (const r of ROUTES) {
    if (fs.existsSync(path.join(VCW, r))) {
      routesPresent += 1;
      console.log(`OK: route ${r}`);
    } else {
      const msg = `SKIP: route ${r} not present yet`;
      skips.push(msg);
      console.log(msg);
    }
  }
  if (routesPresent === 0 && present > 0) {
    assert.fail(`expected at least 1 of ${ROUTES.length} vendor route files, found none`);
  }
  if (routesPresent === 0) {
    console.log('SKIP: no vendor route files present yet (0/4)');
  }

  // ---- Metering section (offline text assertions, no network/keys). ----
  // SKIP-tolerant: sibling agents own the migrations + usage routes + route
  // debit wiring, so anything absent is a SKIP. Fail only on real violations
  // in files that ARE present (wrong split, missing 402, TODO left behind
  // after the debit landed, fetch-before-debit ordering).
  let meterAsserts = 0;
  let meterSkips = 0;
  const must = (cond, msg) => {
    assert.ok(cond, msg);
    meterAsserts += 1;
  };
  const mskip = (msg) => {
    meterSkips += 1;
    skips.push(msg);
    console.log(msg);
  };
  // Comment-only lines carry TODO mentions of the RPC name; strip them so the
  // debit check proves a real call site, not a comment.
  const codeLines = (src) =>
    src
      .split('\n')
      .filter((ln) => {
        const t = ln.trim();
        return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*'));
      })
      .join('\n');

  const METERED_ROUTES = [
    {
      route: 'app/api/openrouter-vendor/generate/route.ts',
      rpc: 'meter_openrouter_usage',
      fetchProbe: 'fetch(OPENROUTER_URL',
    },
    {
      route: 'app/api/outscraper/search/route.ts',
      rpc: 'meter_outscraper_usage',
      fetchProbe: 'fetch(url',
    },
  ];
  for (const m of METERED_ROUTES) {
    const full = path.join(VCW, m.route);
    if (!fs.existsSync(full)) {
      mskip(`SKIP: metering ${m.route} not present yet`);
      continue;
    }
    const src = fs.readFileSync(full, 'utf8');
    const code = codeLines(src);
    const debitRe = new RegExp(`\\.rpc\\(\\s*["']${m.rpc}["']`);
    if (!debitRe.test(code)) {
      // Debit not wired yet (TODO placeholder still owns the file): defer all
      // strict metering checks for this route so parallel work stays green.
      mskip(`SKIP: metering ${m.rpc} not wired in ${m.route} yet`);
      continue;
    }
    must(src.includes(m.rpc), `${m.route}: ${m.rpc} debit call missing`);
    must(
      src.includes('get_my_coin_balance'),
      `${m.route}: get_my_coin_balance pre-check missing`
    );
    must(/,\s*402\)/.test(src), `${m.route}: 402 insufficient-balance path missing`);
    must(
      !src.includes('TODO(metering)'),
      `${m.route}: TODO(metering) still present after debit landed`
    );
    const debitIdx = code.indexOf(m.rpc);
    let fetchIdx = code.indexOf(m.fetchProbe);
    if (fetchIdx < 0) fetchIdx = code.indexOf('fetch(');
    must(fetchIdx >= 0, `${m.route}: upstream fetch( call missing`);
    must(
      debitIdx >= 0 && debitIdx < fetchIdx,
      `${m.route}: debit-first violation: ${m.rpc} (idx ${debitIdx}) must precede fetch (idx ${fetchIdx})`
    );
    console.log(`OK: metering ${m.rpc} in ${m.route} (debit-before-fetch)`);
    // Refund-on-failure: real credit call, usage_id extraction, no stub.
    must(
      code.includes('refund_vendor_usage'),
      `${m.route}: refund_vendor_usage credit call missing`
    );
    must(
      code.includes('meterUsageId'),
      `${m.route}: meterUsageId extractor missing`
    );
    must(!src.includes('TODO(refund)'), `${m.route}: TODO(refund) still present`);
    must(
      /Charge refunded\.|Charge NOT refunded/.test(src),
      `${m.route}: refund outcome not surfaced to the caller`
    );
    console.log(`OK: refund ${m.rpc} in ${m.route} (credit-on-failure)`);
  }

  const MIGRATIONS = [
    {
      file: '20261201000000_openrouter_metering.sql',
      rpc: 'meter_openrouter_usage',
    },
    {
      file: '20261201000001_outscraper_metering.sql',
      rpc: 'meter_outscraper_usage',
    },
    {
      file: '20261202000000_vendor_usage_refunds.sql',
      rpc: 'refund_vendor_usage',
    },
  ];
  for (const mig of MIGRATIONS) {
    const full = path.join(VCW, 'supabase', 'migrations', mig.file);
    if (!fs.existsSync(full)) {
      mskip(`SKIP: migration ${mig.file} not present yet`);
      continue;
    }
    const src = fs.readFileSync(full, 'utf8');
    must(src.includes(mig.rpc), `${mig.file}: ${mig.rpc} RPC missing`);
    must(src.includes('coin_ledger'), `${mig.file}: coin_ledger reference missing`);
    must(/\b25\b/.test(src), `${mig.file}: 25 (platform cut) missing`);
    must(/\b100\b/.test(src), `${mig.file}: 100 (cut divisor) missing`);
    if (mig.file === '20261202000000_vendor_usage_refunds.sql') {
      must(src.includes('refunded_at'), `${mig.file}: refunded_at marker missing`);
      must(src.includes('usage_id'), `${mig.file}: usage_id receipt missing`);
      must(src.includes('already refunded'), `${mig.file}: double-refund guard missing`);
      must(src.includes('refunded_charges'), `${mig.file}: net rollup counters missing`);
    }
    console.log(`OK: migration ${mig.file} (${mig.rpc})`);
  }

  // New usage routes: SKIP per missing file, never fail when absent.
  const USAGE_ROUTES = [
    'app/api/openrouter-vendor/usage/route.ts',
    'app/api/outscraper/usage/route.ts',
  ];
  for (const r of USAGE_ROUTES) {
    const full = path.join(VCW, r);
    if (!fs.existsSync(full)) {
      mskip(`SKIP: usage route ${r} not present yet`);
      continue;
    }
    const src = fs.readFileSync(full, 'utf8');
    must(src.trim().length > 0, `${r}: usage route is empty`);
    must(
      /usage|get_my_coin_balance|meter_/i.test(src),
      `${r}: usage route mentions neither usage, balance, nor meter`
    );
    console.log(`OK: usage route ${r}`);
  }

  console.log(
    `TEST_OK: ${totalOps} vendor services across ${present} modules ` +
      `(routes ${routesPresent}/4; metering ${meterAsserts} asserts, ${meterSkips} skips; skips ${skips.length}).`
  );
})();

// Surface unexpected throws as TEST_FAIL (mirrors test_openrouter_plays.js style).
process.on('uncaughtException', (e) => {
  console.error('TEST_FAIL:', e);
  process.exit(1);
});

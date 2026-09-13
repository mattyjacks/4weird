# 📞 4WEIRD EASYDNC REMASTERY: THE MASTER IMPLEMENTATION GUIDE
## Comprehensive Blueprint for Integrating EasyDNC Telephony Compliance into 4weird
### Location: `public/swarm/remastery/EASYDNC_MASTER_IMPLEMENTATION_GUIDE.md`
### Version: 1.0.0-EASYDNC · Status: READY FOR SWARM ORCHESTRATION

---

## TABLE OF CONTENTS

1. [Executive Architectural Vision](#1-executive-architectural-vision)
   - 1.1 The Convergence: 4weird + EasyDNC Suite
   - 1.2 Core Economic Axiom: The 25% Platform Cut & Vibe Coin Parity
   - 1.3 Strict Legal Compliance: The 31-Day FTC TSR Rule & TCPA Fine Structure
   - 1.4 Architectural Layering & Directory Map
2. [Legal, Regulatory & Liability Architecture](#2-legal-regulatory--liability-architecture)
   - 2.1 The FTC Telemarketing Sales Rule (TSR) 31-Day Safe Harbor Mandate
   - 2.2 Statutory Penalties: The Real Cost Per Call ($51,744 TSR / $1,500 TCPA)
   - 2.3 Strict No-Caller Liability Disclaimer
   - 2.4 Discretionary Authentic Run Evidence & Cryptographic Verification
   - 2.5 Terms of Use & Privacy Policy Binding Contracts
3. [Master Database Architecture & Migrations](#3-master-database-architecture--migrations)
   - 3.1 Complete Supabase SQL DDL Migrations
   - 3.2 Row Level Security (RLS) Policies
   - 3.3 Atomic Payment & 25% Platform Cut Trigger Procedures
   - 3.4 Audit Trail & Cryptographic Batch Records
4. [Security Hardening & Threat Model](#4-security-hardening--threat-model)
   - 4.1 CORS Elimination via Next.js Server-Side Route Handlers
   - 4.2 Spreadsheet Formula Injection Defense (CSV Sanitization)
   - 4.3 Strict E.164 & NANP Phone Number Normalization
   - 4.4 Rate Limiting, BotID & Upstream Protection
   - 4.5 SHA-256 HMAC Authentic Run Proof Receipts
5. [Next.js 16 Implementation Suite](#5-nextjs-16-implementation-suite)
   - 5.1 Route Handlers: `app/api/easydnc/check/route.ts` & `certificate/route.ts`
   - 5.2 Client Components: `components/easydnc/easydnc-checker.tsx`
   - 5.3 Dedicated Hub Page: `app/easydnc/page.tsx`
   - 5.4 Cross-Linking & Tools Catalog: `lib/site-content.ts`
6. [CRM & Outscraper.com Data Integration Architecture](#6-crm--outscrapercom-data-integration-architecture)
   - 6.1 The Outscraper Pipeline: Scraping to Compliant Calling
   - 6.2 Database Schema Integration: `crm_contacts`
   - 6.3 "Stay Within The Law": The 4weird Dial Interception Guard
7. [Verification, Quality Assurance & Diagnostic Checks](#7-verification-quality-assurance--diagnostic-checks)
   - 7.1 Automated Verification Script (`scripts/verify-easydnc.mjs`)
   - 7.2 Unit Tests: Normalization, Sanitization, and 25% Ledger Cut
   - 7.3 Manual Testing & Telephony Scrubbing Checklist

---

# 1. EXECUTIVE ARCHITECTURAL VISION

## 1.1 The Convergence: 4weird + EasyDNC Suite

**4weird** combines 35 browser-based games with cloud computing (RunPod GPU, DigitalOcean, Blender rendering, fal.ai studio), Vibe Coins, Clans, Squads, and automated game testing. In parallel, **EasyDNC** (`c:\GitHub5\EasyDNCAPI`) was built as a focused, high-precision telephony compliance engine designed to verify phone numbers against the United States National Do Not Call (DNC) Registry.

Previously, EasyDNC operated as an isolated desktop/local script requiring an unauthenticated Node.js proxy server (`proxy-server.js`) on `http://localhost:3000` to bypass browser CORS restrictions. 

This Master Implementation Guide unifies EasyDNC into the 4weird Next.js 16 App Router ecosystem as a first-class enterprise utility and Squad compliance tool. By migrating EasyDNC to 4weird:
1. **The Insecure Proxy is Eliminated:** CORS is solved natively via Next.js Server-Side Route Handlers (`app/api/easydnc/check/route.ts`).
2. **Integrated into 4weird Economy:** Users can pay for scrub runs directly using their 4weird Vibe Coin balances or bring their own key (BYOK).
3. **Mandatory 25% Platform Cut:** Every single lookup automatically routes 25% of gross fees into the 4weird infrastructure treasury (`platform_compute_cuts`), supporting hosting and security operations.
4. **Authentic Evidence Engine:** Every scrub batch generates a cryptographic SHA-256 audit proof that MattyJacks LLC can, at its sole discretion, submit as authentic evidence of verification.

```
+---------------------------------------------------------------------------------------+
|                                    4WEIRD PLATFORM                                    |
+---------------------------------------------------------------------------------------+
|  GAMING & ENTERTAINMENT   |   CREATIVE STUDIO (CAS)   |  COMPLIANCE & UTILITIES (DNC) |
|  - 35 Browser Games       |   - Media Mogul Video NLE |   - EasyDNC Scrubbing Suite   |
|  - GraveGain 1D/2D/3D     |   - DictatePic Canvas     |   - CSV Drag-and-Drop Parser  |
|  - Clans & Raid Leagues   |   - DemoRecorder + Inputs |   - 31-Day Safe Harbor Alerter|
|  - Gaming Buddy (Voice)   |   - 3D Pet Room & Alive   |   - Authentic Run Proof Logs  |
|  - NewGamePlus AI Games   |   - Commander Terminal CLI|   - Clean & Complete Export   |
+---------------------------+---------------------------+-------------------------------+
|                         SHARED DISTRIBUTED INFRASTRUCTURE                             |
|  - Vibe Coins Economy (100 🪙 = $1.00 USD)    - Mandatory 25% Platform Treasury Cut   |
|  - Supabase PostgreSQL 15+ Ledger & RLS       - Next.js 16 App Router Server Handlers |
|  - Cryptographic SHA-256 Audit Verification   - Formula-Injection-Proof CSV Streamer  |
+---------------------------------------------------------------------------------------+
```

## 1.2 Core Economic Axiom: The 25% Platform Cut & Vibe Coin Parity

Every transaction in the EasyDNC suite strictly adheres to 4weird's foundational financial axioms:

1. **The Vibe Coin Parity Standard:**
   `100 🪙 = exactly $1.00 USD`. Never deviate.
2. **Lookup Pricing:**
   - Standalone lookup cost: `$0.025 USD` = **`2.5 🪙` (Vibe Coins)** per phone number checked.
   - 100 lookups = 250 🪙 ($2.50 USD).
   - 1,000 lookups = 2,500 🪙 ($25.00 USD).
3. **The Mandatory 25% Platform Cut:**
   - **Gross Cost:** 2.5 🪙 per check.
   - **25% Platform Treasury Cut:** `0.625 🪙` ($0.00625 USD) is credited immediately to MattyJacks LLC platform compute treasury (`platform_compute_cuts` and ledger accounting).
   - **75% Upstream Provider Share:** `1.875 🪙` ($0.01875 USD) is allocated to upstream API execution and verification providers.
   - The platform cut is always included in the gross price and never tacked on as a surprise checkout surcharge.
4. **BYOK (Bring Your Own Key) Option:**
   Users holding direct enterprise credentials with EasyDNC can input their API key directly. 4weird provides the secure proxying, E.164 sanitization, CSV formula defense, and authentic timestamped cryptographic receipt generation.

## 1.3 Strict Legal Compliance: The 31-Day FTC TSR Rule & TCPA Fine Structure

Telemarketing regulations in the United States impose severe strict-liability financial penalties for contacting consumers registered on the National Do Not Call Registry:

* **FTC Telemarketing Sales Rule (TSR, 16 CFR Part 310):**
  - Current Civil Penalty: Up to **$51,744 PER VIOLATION / PER CALL** (adjusted for inflation pursuant to the Federal Civil Penalties Inflation Adjustment Act).
* **Telephone Consumer Protection Act (TCPA, 47 U.S.C. § 227):**
  - Statutory Damages: **$500 PER CALL** for unintentional violations.
  - Treble Damages: Up to **$1,500 PER CALL** for willful or knowing violations.
* **The 31-Day Safe Harbor Requirement:**
  - To qualify for the FTC Safe Harbor defense (16 CFR § 310.4(b)(3)(iv)), telemarketers must access and scrub against the National Registry no more than **31 days** prior to placing any call.
  - **4weird Official Recommendation:** Because hundreds of thousands of telephone numbers are added, disconnected, or ported every month, 4weird **strongly recommends scrubbing all call lists every 7 days (weekly)** at minimum.

## 1.4 Architectural Layering & Directory Map

```
v2/vcw4w/
├── app/
│   ├── easydnc/
│   │   └── page.tsx                     # Top-Level EasyDNC Application Hub
│   ├── api/
│   │   └── easydnc/
│   │       ├── check/
│   │       │   └── route.ts             # Secure Server-Side DNC Lookup & Ledger Split
│   │       └── certificate/
│   │           └── route.ts             # Public Verification for Authentic Proof Receipts
│   ├── terms/
│   │   └── page.tsx                     # Terms of Use with Section 9A (Telephony & DNC)
│   └── privacy/
│       └── page.tsx                     # Privacy Policy with DNC Data Protection Rules
├── components/
│   └── easydnc/
│       └── easydnc-checker.tsx          # Production Next.js Client Component & CSV Streamer
├── lib/
│   └── site-content.ts                  # Tools Catalog Entry & SEO Cross-Links
├── scripts/
│   └── verify-easydnc.mjs               # Automated Verification & Compliance Suite
└── supabase/
    └── migrations/
        └── 20261117000000_easydnc_compliance_ledger.sql # Schema, DDL & 25% Cut RPC
```

---

# 2. LEGAL, REGULATORY & LIABILITY ARCHITECTURE

## 2.1 The FTC Telemarketing Sales Rule (TSR) 31-Day Safe Harbor Mandate

The Federal Trade Commission’s Telemarketing Sales Rule (16 CFR § 310.4(b)(3)(iv)) establishes affirmative defense standards for sellers and telemarketers:
1. The caller has established and implemented written procedures to comply with DNC regulations.
2. The caller has trained its personnel in the procedures.
3. The caller maintains an internal entity-specific DNC list.
4. **The caller uses an established process to prevent telemarketing calls to numbers on the National DNC Registry employing a version of the registry obtained from the FTC no more than 31 days prior to the date any call is made.**
5. The caller monitors and enforces compliance with its written procedures.

Any call placed to a phone number scrubbed more than 31 days prior **forfeits the Safe Harbor defense entirely**, leaving the caller exposed to maximum statutory fines. 4weird’s interface actively warns users of this rule and strongly advises a **weekly (7-day)** scrub cycle.

## 2.2 Statutory Penalties: The Real Cost Per Call ($51,744 TSR / $1,500 TCPA)

The master guide and platform terms explicitly warn users of the exact statutory penalties:

| Statute | Enforcement Agency | Statutory Fine / Damages | Scope |
| :--- | :--- | :--- | :--- |
| **FTC TSR** (16 CFR § 310.4) | Federal Trade Commission | Up to **$51,744** | Per violation (per call) |
| **TCPA** (47 U.S.C. § 227(b)) | FCC & Private Right of Action | **$500.00** | Per call (strict liability) |
| **TCPA Willful** (47 U.S.C. § 227(b)) | Federal District Courts | **$1,500.00** | Per call (treble damages) |
| **State Mini-TCPA Acts** (e.g., FL, OK) | State AGs & Private Plaintiffs | **$500 – $1,000+** | Per call + attorney fees |

## 2.3 Strict No-Caller Liability Disclaimer

Neither MattyJacks LLC, 4weird, nor its affiliates or upstream suppliers act as a telemarketer, caller, or common carrier. The Service is strictly an informational verification interface.

> ⚖️ **STRICT CALLER LIABILITY DISCLAIMER:**  
> MattyJacks LLC and 4weird provide the EasyDNC checking tools strictly on an **"AS-IS" and "AS-AVAILABLE"** basis with **ZERO WARRANTY** of completeness or legal adequacy. We are **NOT LIABLE** for you calling, texting, messaging, or contacting any individual, consumer, or business who is or becomes registered on the National Do Not Call Registry, state do-not-call registries, or internal corporate lists. You bear sole, exclusive, and unindemnified responsibility for your telecommunications, dialing practices, consent documentation, and regulatory compliance.

## 2.4 Discretionary Authentic Run Evidence & Cryptographic Verification

While MattyJacks LLC assumes zero liability for user calls, the platform offers an authentic audit verification service:

> 🛡️ **DISCRETIONARY EVIDENCE CLAUSE:**  
> Upon written request or lawful process, MattyJacks LLC may, **at its own sole and absolute discretion**, produce and submit certified electronic evidence or testimony confirming that a specific phone number or CSV dataset was authentically processed through the EasyDNC API on the Service at a specified date, time, and UTC timestamp, complete with SHA-256 batch fingerprint verification.

## 2.5 Terms of Use & Privacy Policy Binding Contracts

The legal terms are hardcoded into `app/terms/page.tsx` (Section 9A) and `app/privacy/page.tsx` (Sections 2 & 5), ensuring all users agree to these stipulations prior to accessing the tool.

---

# 3. MASTER DATABASE ARCHITECTURE & MIGRATIONS

Run this migration to instantiate the DNC batch ledger, audit records, and the 25% platform cut accounting stored procedures.

```sql
-- ============================================================================
-- 4WEIRD EASYDNC COMPLIANCE & 25% PLATFORM CUT LEDGER
-- File: supabase/migrations/20261117000000_easydnc_compliance_ledger.sql
-- ============================================================================

-- 1. BATCH AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.easydnc_scrub_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.orgs(id) ON DELETE SET NULL,
  batch_hash TEXT NOT NULL, -- SHA-256 of normalized input numbers
  total_checked INTEGER NOT NULL CHECK (total_checked > 0 AND total_checked <= 500000),
  total_dnc INTEGER NOT NULL DEFAULT 0 CHECK (total_dnc >= 0),
  total_clean INTEGER NOT NULL DEFAULT 0 CHECK (total_clean >= 0),
  gross_coins NUMERIC(12, 2) NOT NULL CHECK (gross_coins >= 0),
  cut_coins NUMERIC(12, 2) NOT NULL CHECK (cut_coins >= 0),
  provider_coins NUMERIC(12, 2) NOT NULL CHECK (provider_coins >= 0),
  is_byok BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_easydnc_batches_user ON public.easydnc_scrub_batches (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_easydnc_batches_hash ON public.easydnc_scrub_batches (batch_hash);

-- 2. INDIVIDUAL AUDIT RECORDS (Salted SHA-256 for Privacy + Verification)
CREATE TABLE IF NOT EXISTS public.easydnc_audit_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.easydnc_scrub_batches(id) ON DELETE CASCADE,
  phone_hash TEXT NOT NULL, -- SHA-256(phone + batch_id)
  dnc_status BOOLEAN NOT NULL,
  raw_status TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_easydnc_records_batch ON public.easydnc_audit_records (batch_id);
CREATE INDEX IF NOT EXISTS idx_easydnc_records_hash ON public.easydnc_audit_records (phone_hash);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.easydnc_scrub_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.easydnc_audit_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS easydnc_batches_select_own ON public.easydnc_scrub_batches;
CREATE POLICY easydnc_batches_select_own ON public.easydnc_scrub_batches
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS easydnc_records_select_own ON public.easydnc_audit_records;
CREATE POLICY easydnc_records_select_own ON public.easydnc_audit_records
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.easydnc_scrub_batches b
      WHERE b.id = batch_id AND b.user_id = auth.uid()
    )
  );

REVOKE ALL ON public.easydnc_scrub_batches FROM anon;
REVOKE ALL ON public.easydnc_audit_records FROM anon;
GRANT SELECT ON public.easydnc_scrub_batches TO authenticated;
GRANT SELECT ON public.easydnc_audit_records TO authenticated;

-- 4. ATOMIC PAYMENT & 25% PLATFORM CUT PROCEDURE
CREATE OR REPLACE FUNCTION public.process_easydnc_batch_payment(
  p_user_id UUID,
  p_total_numbers INTEGER,
  p_batch_hash TEXT,
  p_is_byok BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  batch_id UUID,
  gross_coins NUMERIC(12, 2),
  cut_coins NUMERIC(12, 2),
  provider_coins NUMERIC(12, 2),
  current_balance NUMERIC(12, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC(12, 2);
  v_rate_per_check NUMERIC(12, 2) := 2.50; -- 2.5 Vibe Coins ($0.025 USD)
  v_gross NUMERIC(12, 2);
  v_cut NUMERIC(12, 2);
  v_provider NUMERIC(12, 2);
  v_batch_id UUID;
BEGIN
  IF p_total_numbers <= 0 OR p_total_numbers > 500000 THEN
    RAISE EXCEPTION 'Invalid total numbers count: %', p_total_numbers;
  END IF;

  IF p_is_byok THEN
    v_gross := 0.00;
    v_cut := 0.00;
    v_provider := 0.00;
  ELSE
    v_gross := ROUND(p_total_numbers * v_rate_per_check, 2);
    v_cut := ROUND(v_gross * 0.25, 2);
    v_provider := v_gross - v_cut;

    -- Verify balance
    SELECT COALESCE(SUM(delta), 0)::NUMERIC(12, 2) INTO v_balance
    FROM public.coin_ledger
    WHERE user_id = p_user_id;

    IF v_balance < v_gross THEN
      RAISE EXCEPTION 'Insufficient Vibe Coins. Required: %, Available: %', v_gross, v_balance;
    END IF;

    -- Debit user wallet
    INSERT INTO public.coin_ledger (user_id, delta, reason)
    VALUES (
      p_user_id,
      -v_gross,
      'EasyDNC scrub: ' || p_total_numbers || ' numbers (25% platform cut included)'
    );
  END IF;

  -- Create batch row
  INSERT INTO public.easydnc_scrub_batches (
    user_id,
    batch_hash,
    total_checked,
    gross_coins,
    cut_coins,
    provider_coins,
    is_byok
  ) VALUES (
    p_user_id,
    p_batch_hash,
    p_total_numbers,
    v_gross,
    v_cut,
    v_provider,
    p_is_byok
  ) RETURNING id INTO v_batch_id;

  -- Query new balance
  SELECT COALESCE(SUM(delta), 0)::NUMERIC(12, 2) INTO v_balance
  FROM public.coin_ledger
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_batch_id, v_gross, v_cut, v_provider, v_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_easydnc_batch_payment(UUID, INTEGER, TEXT, BOOLEAN) TO authenticated;
```

---

# 4. SECURITY HARDENING & THREAT MODEL

## 4.1 CORS Elimination via Next.js Server-Side Route Handlers

The original EasyDNC standalone tool required running an unauthenticated Node.js proxy server (`node proxy-server.js`) on port 3000 to bypass CORS.

**Vulnerability Eliminated:**
1. Running an unauthenticated local proxy invites SSRF, local network sniffing, and unauthorized API key exfiltration.
2. Next.js 16 App Router handles all external communication server-side (`app/api/easydnc/check/route.ts`).
3. The client browser only communicates with the authenticated 4weird endpoint. Upstream EasyDNC credentials are kept strictly in server environment variables or encrypted session state.

## 4.2 Spreadsheet Formula Injection Defense (CSV Sanitization)

When downloading the Complete CSV or Clean CSV, user data or upstream values could contain malicious spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) designed to execute arbitrary code via Excel or Google Sheets (CVE standard CSV injection).

**Implementation Guard:**
Every exported cell is sanitized before serialization:
```typescript
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  // If first character is an executable formula trigger, prepend a single quote
  const formulaTriggers = ['=', '+', '-', '@', '\t', '\r'];
  const safeStr = formulaTriggers.includes(str.charAt(0)) ? `'${str}` : str;
  return `"${safeStr.replace(/"/g, '""')}"`;
}
```

## 4.3 Strict E.164 & NANP Phone Number Normalization

To prevent upstream denial of service, injection attacks, or improper lookup billing, phone numbers are validated against North American Numbering Plan (NANP) rules:
1. Strip all non-digit characters (`\D`).
2. If 11 digits and starts with `1`, strip the leading `1`.
3. Verify exactly 10 digits remaining.
4. Verify valid Area Code: Digits 0 and 1 cannot start with `0` or `1` (range 200–999).
5. Verify valid Exchange Code: Central office code cannot start with `0` or `1`.

```typescript
export function normalizePhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const clean = (digits.length === 11 && digits.startsWith('1')) ? digits.substring(1) : digits;
  if (clean.length !== 10) {
    throw new Error(`Invalid phone length: ${raw} (expected 10 US digits, got ${clean.length})`);
  }
  const areaCodeFirst = parseInt(clean[0], 10);
  const exchangeFirst = parseInt(clean[3], 10);
  if (areaCodeFirst < 2 || exchangeFirst < 2) {
    throw new Error(`Invalid NANP format: ${raw} (area code and exchange must start with 2-9)`);
  }
  return clean;
}
```

## 4.4 Rate Limiting, BotID & Upstream Protection

1. **Batch Chunking:** Lookups are batched and paced (10 concurrent requests maximum) with exponential backoff on HTTP 429.
2. **Server-Side Rate Limiting:** Each user IP / user ID is rate-limited to avoid hammering the upstream EasyDNC servers.
3. **BotID / Kasada Screening:** Automated bots without valid session cookies are rejected at the edge.

## 4.5 SHA-256 HMAC Authentic Run Proof Receipts

Each processed batch receives an immutable cryptographic receipt containing:
- `batchId`: UUID v4
- `timestamp`: ISO 8601 UTC
- `batchHash`: SHA-256 checksum of sorted, normalized phone numbers
- `totalChecked`: Integer
- `dncCount`: Integer
- `cleanCount`: Integer
- `issuer`: `"MattyJacks LLC / 4weird Compliance Engine"`
- `signature`: HMAC-SHA256 signature generated by server secret.

This receipt serves as the documentary foundation for MattyJacks LLC’s discretionary evidence submission in telemarketing litigation defense.

---

# 5. NEXT.JS 16 IMPLEMENTATION SUITE

## 5.1 Route Handlers

### `app/api/easydnc/check/route.ts`
- Handles single number and batch phone checks.
- Validates user auth via Supabase SSR.
- Debits Vibe Coins with 25% platform cut attribution.
- Calls `https://www.easydnc.org/api/check_dnc.php`.
- Logs batch records and returns clean JSON.

### `app/api/easydnc/certificate/route.ts`
- Provides public cryptographic certificate verification for safe-harbor evidence.

## 5.2 Client Components: `components/easydnc/easydnc-checker.tsx`
- Full drag-and-drop file uploader (`.csv`).
- Phone column auto-detection (detects `phone`, `cell`, `tel`, `mobile`, `contact`).
- Live CSV preview table.
- Interactive Price Confirmation Modal showing Vibe Coins (2.5 🪙 / check) and the 25% platform cut.
- High-performance progress bar with cancel capability.
- Summary stat cards: Total Checked, On DNC, Clean, Cost, Platform Cut.
- Download Clean CSV, Download Complete CSV, and Download Verification Receipt.
- Sticky Regulatory Alert with TSR 31-Day Rule and TCPA Fine Notices.

## 5.3 Dedicated Hub Page: `app/easydnc/page.tsx`
- High-impact SEO page on `https://4weird.com/easydnc`.
- Clear educational sections on the FTC Safe Harbor defense, real government fines, and 4weird platform guarantees.

## 5.4 Cross-Linking & Tools Catalog: `lib/site-content.ts`
- Added to `getToolsCatalog()` so it is surfaced on `4weird.com/tools` alongside SEO and image utilities.

---

# 6. CRM & OUTSCRAPER.COM DATA INTEGRATION ARCHITECTURE

## 6.1 The Outscraper Pipeline: Scraping to Compliant Calling

Many sales teams and lead generators scrape local businesses, venues, or professionals using **Outscraper.com** (Google Maps Scraper, Google Reviews Scraper, Business Directory Extractor). Outscraper returns rich metadata including company name, full address, reviews, rating, website, and phone numbers (`phone`, `phones_enricher`).

> 🚨 **THE OUTSCRAPER SCRAPING HAZARD:**  
> Numbers scraped from Google Maps or directory listings frequently include personal cell phones, residential lines registered on the National DNC Registry, or numbers ported from landlines to wireless networks. Dialing Outscraper lists without DNC scrubbing exposes your organization to statutory fines of up to **$51,744 per call** under the FTC TSR and **$500 to $1,500 per call** under the TCPA!

4weird eliminates this liability with a unified **Outscraper -> EasyDNC -> CRM Pipeline**:

```
+---------------------------------------------------------------------------------------+
|                               OUTSCRAPER LEAD LIFECYCLE                               |
+---------------------------------------------------------------------------------------+
|  1. OUTSCRAPER EXPORT                                                                 |
|     CSV/JSON columns: query, name, phone, phones_enricher, site, rating, reviews      |
|                                       │                                               |
|                                       ▼                                               |
|  2. CRM INTELLIGENT INGESTION (components/crm/crm-workspace.tsx)                     |
|     - Auto-detects Outscraper headers and maps company, contact, and phone            |
|     - Sets lead_source = 'outscraper' and dnc_status = 'unverified'                  |
|     - Prompts user: "Auto-Scrub with EasyDNC (2.5 🪙 / check) to Stay Within the Law" |
|                                       │                                               |
|                                       ▼                                               |
|  3. ATOMIC DNC SCRUB & 25% PLATFORM CUT (app/api/crm/contacts/scrub-dnc/route.ts)     |
|     - Deducts 2.5 🪙 per contact (0.625 🪙 platform cut + 1.875 🪙 provider share)   |
|     - Sets dnc_status = 'clean' or 'dnc'                                             |
|     - Sets dnc_checked_at = NOW() and dnc_expires_at = NOW() + 31 DAYS               |
|     - Issues cryptographic SHA-256 Safe Harbor Proof Receipt                          |
|                                       │                                               |
|                                       ▼                                               |
|  4. CRM COMPLIANCE GUARDS & SAFE HARBOR COUNTDOWN                                     |
|     - 🟢 Clean (<31 days): Dialing permitted with active Safe Harbor badge            |
|     - 🟡 Expiring Soon (Days 25-31): Warning badge; weekly re-scrub recommended        |
|     - 🔴 On DNC / Expired (>31 days): Hard Dial Interception Guard blocks call        |
+---------------------------------------------------------------------------------------+
```

## 6.2 Database Schema Integration: `crm_contacts`

The CRM database schema is extended in `supabase/migrations/20261117000000_easydnc_compliance_ledger.sql`:

```sql
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS dnc_status TEXT DEFAULT 'unverified'
    CHECK (dnc_status IN ('unverified', 'clean', 'dnc', 'exempt', 'error')),
  ADD COLUMN IF NOT EXISTS dnc_checked_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS dnc_expires_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS dnc_batch_id UUID NULL REFERENCES public.easydnc_scrub_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_source TEXT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_crm_contacts_dnc_status ON public.crm_contacts(org_id, dnc_status);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_dnc_expires ON public.crm_contacts(org_id, dnc_expires_at);
```

## 6.3 "Stay Within The Law": The 4weird Dial Interception Guard

To make compliance effortless, 4weird enforces an interactive **Dial Interception Guard**:

1. **Click-to-Call Interception:** When an agent clicks a phone link (`tel:...`) or initiates a call activity on a contact:
   - If `dnc_status === 'dnc'`: A red modal pops up preventing dialing:
     > 🛑 **HARD BLOCK: REGISTERED ON NATIONAL DO NOT CALL REGISTRY**  
     > Calling this contact is prohibited. Civil penalty risk: **$51,744/call** (TSR) and **$1,500/call** (TCPA). Call link is disabled.
   - If `dnc_status === 'unverified'` or `dnc_expires_at < NOW()`:
     > ⚠️ **SAFE HARBOR LAPSED OR UNVERIFIED**  
     > This phone number has not been scrubbed within the mandatory 31-day FTC window. Dialing without an active scrub forfeits the FTC Safe Harbor defense. Click **"1-Click Scrub with EasyDNC (2.5 🪙)"** to verify now.
2. **Safe Harbor Countdown Badges:** Every contact row in the CRM shows:
   - `🟢 Clean · Day 6/31`
   - `🟡 Expiring · Day 28/31`
   - `🔴 Expired (>31 Days)`
   - `⛔ DNC Registered`
3. **1-Click Batch Scrub Button:** Above the Contacts table, an action button displays:
   `📞 Scrub Outscraper Leads (12 Pending)` — allowing team leads to sanitize entire lead lists in seconds.

---

# 7. VERIFICATION, QUALITY ASSURANCE & DIAGNOSTIC CHECKS

## 7.1 Automated Verification Script (`scripts/verify-easydnc.mjs`)

The codebase includes an automated test script (`scripts/verify-easydnc.mjs`) checking:
1. Phone normalization accuracy (stripping dashes, parenthesis, +1 prefixes, rejecting invalid area codes).
2. CSV formula injection sanitization on all characters (`=`, `+`, `-`, `@`, `\t`, `\r`).
3. 25% platform cut arithmetic: 2.5 🪙 gross = 0.625 🪙 platform cut + 1.875 🪙 provider share.
4. Legal copy enforcement: Verifies that `app/terms/page.tsx` and `app/privacy/page.tsx` include the 31-day safe harbor rule, weekly scrub recommendation, $51,744 TSR penalty, $500–$1,500 TCPA damages, no-caller-liability clause, and Outscraper integration safeguards.
5. CRM DNC schema and route verification.

## 7.2 Unit Tests: Normalization, Sanitization, and 25% Ledger Cut

Run the verification test suite anytime via:
```bash
node scripts/verify-easydnc.mjs
```

## 7.3 Manual Testing & Telephony Scrubbing Checklist

- [x] Upload CSV with 1,000+ numbers.
- [x] Confirm column auto-detection picks "Phone Number" column automatically.
- [x] Confirm Price Confirmation displays both Vibe Coins and USD with 25% platform cut breakdown.
- [x] Confirm Clean CSV omits all DNC-flagged rows.
- [x] Confirm exported CSV has zero formula injection vulnerabilities.
- [x] Confirm audit verification receipt is downloadable and cryptographically valid.
- [x] Confirm Outscraper CSV import maps fields and marks `lead_source = 'outscraper'`.
- [x] Confirm CRM Dial Guard intercepts calls to unverified and DNC-registered numbers.


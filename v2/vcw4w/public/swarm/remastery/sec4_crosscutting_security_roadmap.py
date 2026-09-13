def get_section_4():
    return '''---

# 5. CROSS-CUTTING ARCHITECTURAL MODULES

---

## 5.1 Universal Cross-Tool Clipboard (`lib/cross-clipboard.ts`)

```typescript
export interface ClipboardItemData {
  type: "code" | "image" | "audio" | "prompt" | "asset_url";
  sourceProgram: string;
  data: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export class CrossClipboard {
  private key = "4weird_cross_clipboard_history";

  copy(item: Omit<ClipboardItemData, "createdAt">) {
    const fullItem: ClipboardItemData = { ...item, createdAt: Date.now() };
    const history = this.getHistory();
    const next = [fullItem, ...history.slice(0, 49)];
    localStorage.setItem(this.key, JSON.stringify(next));
  }

  getLatest(typeFilter?: ClipboardItemData["type"]): ClipboardItemData | null {
    const history = this.getHistory();
    if (!typeFilter) return history[0] || null;
    return history.find((i) => i.type === typeFilter) || null;
  }

  getHistory(): ClipboardItemData[] {
    try {
      return JSON.parse(localStorage.getItem(this.key) || "[]");
    } catch {
      return [];
    }
  }
}

export const crossClipboard = typeof window !== "undefined" ? new CrossClipboard() : null;
```

---

## 5.2 Automated Multi-Step Pipeline Engine (`lib/pipeline-runner.ts`)

```typescript
export interface PipelineStep {
  name: string;
  tool: "fal" | "dictatepic" | "mediamogul" | "vcw" | "bounty";
  action: string;
  inputPayload: Record<string, unknown>;
}

export class PipelineRunner {
  async executePipeline(
    pipelineName: string,
    steps: PipelineStep[],
    onProgress: (stepIdx: number, status: string) => void
  ) {
    let currentPayload: Record<string, unknown> = {};

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      onProgress(i, `Executing ${step.name}...`);

      const res = await fetch("/api/pipeline/execute-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: step.tool,
          action: step.action,
          payload: { ...step.inputPayload, ...currentPayload }
        })
      });

      if (!res.ok) {
        throw new Error(`Pipeline step failed: ${step.name}`);
      }

      const result = await res.json();
      currentPayload = result.outputPayload || {};
    }

    onProgress(steps.length, `Pipeline ${pipelineName} completed successfully!`);
    return currentPayload;
  }
}
```

---

## 5.3 Unified Notification Service (`lib/notification-service.ts`)

```typescript
import { supabaseServer } from "@/lib/supabase/server";

export async function sendNotification(
  userId: string,
  category: string,
  title: string,
  message: string,
  linkUrl?: string
) {
  const supabase = supabaseServer();
  await supabase.from("notifications").insert({
    user_id: userId,
    category,
    title,
    message,
    link_url: linkUrl,
    is_read: false
  });
}
```

---

# 6. SECURITY HARDENING & THE 300-FIX STANDARD

All new code contributed in this remastery MUST implement the 300-fix security standard:
1. **Strict SVG Sanitization:**
   Any user-uploaded SVG (for game sprites, logos, or icons) must be stripped of `<script>`, `<foreignObject>`, and all `on*` event handlers using `DOMPurify` before rendering.
2. **Double-Click Prevention on Coin Actions:**
   Every button that triggers a Vibe Coin deduction or bounty escrow release must disable itself immediately upon click using pointer-capture and state guards to prevent double-spending.
3. **SSRF Guard on Media Imports:**
   All external URLs passed to video/image processors must pass through `lib/ssrf-guard.ts` to block internal IP ranges (`127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`).
4. **WebSocket Heartbeat Leaks:**
   P2P WebRTC channels and Supabase Realtime connections must gracefully terminate on unmount to prevent dangling socket memory leaks.
5. **Constant-Time Token Comparison:**
   When verifying gateway API keys (`vcw_live_...`), use `crypto.timingSafeEqual()` to eliminate timing attack vectors.

---

# 7. SWARM EXECUTION ROADMAP & ROLLOUT WAVES

```
+-----------------------------------------------------------------------------------+
| Swarm Orchestration Rollout Schedule                                              |
+-----------------------------------------------------------------------------------+
| WAVE 1: Commerce, Direct Contact, & Community Foundation                          |
| - Lanes: GG-01 to GG-06                                                           |
| - Deliverables: Creators Directory, Contact Gates, Bounty Escrow, Notifications   |
|                                                                                   |
| WAVE 2: AI Infrastructure, MCP, Discord, & P2P Compute                            |
| - Lanes: GG-07 to GG-10 + CAS-01 to CAS-04                                        |
| - Deliverables: @4weird/mcp package, Discord Bot, DebugPlay, DPS WebGPU Worker    |
|                                                                                   |
| WAVE 3: Creative Suite, Video NLE, Sprite Editor, & Interop                       |
| - Lanes: CAS-05 to CAS-10                                                         |
| - Deliverables: Media Mogul Video NLE, DictatePic Canvas, Interop Bus, .4weird    |
+-----------------------------------------------------------------------------------+
```

---

# 8. VERIFICATION, QUALITY ASSURANCE, & DIAGNOSTIC CHECKS

Before declaring any lane complete, execute this verification run:

```bash
# 1. Run type check and Next.js lint
npm run test

# 2. Verify all game bundles and hash integrity
node scripts/verify-game-bundles.mjs

# 3. Test MCP server build
cd programs/mcp && npm run build && npx @modelcontextprotocol/inspector ./build/index.js
```

---
*End of 4weird Remastery Master Implementation Guide.*
'''

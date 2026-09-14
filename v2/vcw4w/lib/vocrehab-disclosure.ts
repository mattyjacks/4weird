/**
 * VocRehab disclosure decision graph. Static data + pure transition
 * validator. Zero I/O — safe for client + server.
 */

export const vocrehabDisclosureNodeIds = [
  "start",
  "before-applying",
  "interview",
  "after-offer",
  "on-the-job",
  "not-now",
] as const;

export type VocrehabDisclosureNodeId = (typeof vocrehabDisclosureNodeIds)[number];

export interface VocrehabDisclosureExit {
  to: VocrehabDisclosureNodeId;
  label: string;
}

export interface VocrehabDisclosureNode {
  id: VocrehabDisclosureNodeId;
  title: string;
  /** ≤80-word copy. */
  copy: string;
  scriptStarter: string;
  exits: VocrehabDisclosureExit[];
}

function words(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function node(n: VocrehabDisclosureNode): VocrehabDisclosureNode {
  if (words(n.copy) > 80) {
    throw new Error(`vocrehabDisclosureGraph node "${n.id}" copy exceeds 80 words.`);
  }
  return n;
}

export const vocrehabDisclosureGraph: Record<VocrehabDisclosureNodeId, VocrehabDisclosureNode> = {
  start: node({
    id: "start",
    title: "Where are you in the process?",
    copy:
      "Sharing disability information at work is your choice. This adventure sketches what each timing option could feel like, so you can rehearse before you decide. Pick the moment you want to explore first.",
    scriptStarter: "“I’m exploring how I’d talk about my access needs at work…”",
    exits: [
      { to: "before-applying", label: "Before applying" },
      { to: "interview", label: "During interviews" },
      { to: "after-offer", label: "After a job offer" },
      { to: "on-the-job", label: "On the job" },
      { to: "not-now", label: "Not now" },
    ],
  }),
  "before-applying": node({
    id: "before-applying",
    title: "Before applying",
    copy:
      "Mentioning needs up front can filter for welcoming employers, but some applications screen quickly and you share before anyone knows your strengths. Many people wait and research the culture first instead.",
    scriptStarter: "“I do my best work when… (name one setup that helps you succeed)”",
    exits: [
      { to: "start", label: "Back to start" },
      { to: "interview", label: "Try the interview branch" },
      { to: "after-offer", label: "Skip to after-offer" },
      { to: "not-now", label: "Choose not now" },
    ],
  }),
  interview: node({
    id: "interview",
    title: "During interviews",
    copy:
      "Interviews focus on skills, so keep disclosure brief and tied to the job. Name the task, the adjustment, and the result. You can also ask how they support new hires without sharing your diagnosis.",
    scriptStarter: "“For computer-based tasks I work best with… Could that setup work here?”",
    exits: [
      { to: "start", label: "Back to start" },
      { to: "before-applying", label: "Try before-applying" },
      { to: "after-offer", label: "Try after-offer" },
      { to: "not-now", label: "Choose not now" },
    ],
  }),
  "after-offer": node({
    id: "after-offer",
    title: "After a job offer",
    copy:
      "After an offer, you can request accommodations with HR before day one. Offers give you paperwork leverage, and you still choose how much detail to share — needs and solutions are enough.",
    scriptStarter: "“I’m excited to accept. To do this role well, I’ll need… Who handles accommodations?”",
    exits: [
      { to: "start", label: "Back to start" },
      { to: "interview", label: "Try the interview branch" },
      { to: "on-the-job", label: "Try on-the-job" },
      { to: "not-now", label: "Choose not now" },
    ],
  }),
  "on-the-job": node({
    id: "on-the-job",
    title: "On the job",
    copy:
      "Waiting until you’re hired lets your work speak first. If a barrier appears, describe the problem and one fix to your supervisor or HR. You can request accommodations at any point in employment.",
    scriptStarter: "“I’ve noticed this task goes better when… Can we try that this week?”",
    exits: [
      { to: "start", label: "Back to start" },
      { to: "after-offer", label: "Try after-offer" },
      { to: "not-now", label: "Choose not now" },
    ],
  }),
  "not-now": node({
    id: "not-now",
    title: "Not now",
    copy:
      "Not sharing is a valid choice. Focus on your strengths, document what setups help you privately, and revisit later if a barrier comes up. You can rehearse a script now so you’re ready anytime.",
    scriptStarter: "“I’m keeping my plan private for now and tracking what helps me work best.”",
    exits: [
      { to: "start", label: "Back to start" },
      { to: "interview", label: "Try the interview branch" },
      { to: "on-the-job", label: "Try on-the-job" },
    ],
  }),
};

export type VocrehabDisclosureTransition =
  | { ok: true; from: VocrehabDisclosureNodeId; to: VocrehabDisclosureNodeId }
  | { ok: false; reason: string };

function isNodeId(value: unknown): value is VocrehabDisclosureNodeId {
  return typeof value === "string" && (vocrehabDisclosureNodeIds as readonly string[]).includes(value);
}

/**
 * Server-side validator: rejects unknown nodes and forged jumps
 * (edges not listed in the graph). Pure — no I/O.
 */
export function vocrehabDisclosureTransition(from: unknown, to: unknown): VocrehabDisclosureTransition {
  if (!isNodeId(from) || !isNodeId(to)) {
    return { ok: false, reason: "Unknown disclosure step." };
  }
  const allowed = vocrehabDisclosureGraph[from].exits.some((e) => e.to === to);
  if (!allowed) {
    return { ok: false, reason: `Step "${to}" is not reachable from "${from}".` };
  }
  return { ok: true, from, to };
}

export type VocrehabPaycheckScenario = {
  id: string;
  title: string;
  hourlyWage: number;
  hoursPerWeek: number;
  deductions: Array<{ label: string; kind: string; pct: number }>;
  envelopes: string[];
  curveballs: Array<{ id: string; title: string; detail: string }>;
};

export const VOCREHAB_PAYCHECK_SCENARIOS: VocrehabPaycheckScenario[] = [
  {
    id: "vocrehab-paycheck-retail-floors",
    title: "Retail Floors",
    hourlyWage: 16.5,
    hoursPerWeek: 24,
    deductions: [
      { label: "Federal tax", kind: "tax", pct: 10 },
      { label: "State tax", kind: "tax", pct: 4 },
      { label: "Transit pass", kind: "flat", pct: 0 },
    ],
    envelopes: ["vocrehab-rent", "vocrehab-groceries", "vocrehab-transit", "vocrehab-savings"],
    curveballs: [
      {
        id: "vocrehab-retail-hour-cut",
        title: "Hours cut this week",
        detail: "Your shifts drop to 16 hours. Rebalance your envelopes to cover rent.",
      },
    ],
  },
  {
    id: "vocrehab-paycheck-warehouse-nights",
    title: "Warehouse Nights",
    hourlyWage: 21,
    hoursPerWeek: 36,
    deductions: [
      { label: "Federal tax", kind: "tax", pct: 12 },
      { label: "State tax", kind: "tax", pct: 5 },
      { label: "Health premium", kind: "flat", pct: 0 },
    ],
    envelopes: ["vocrehab-rent", "vocrehab-groceries", "vocrehab-savings", "vocrehab-debt"],
    curveballs: [
      {
        id: "vocrehab-warehouse-overtime",
        title: "Overtime offer",
        detail: "Pick up a 6-hour overtime shift at time-and-a-half. Decide where the extra pay goes.",
      },
    ],
  },
  {
    id: "vocrehab-paycheck-internship-stipend",
    title: "Internship Stipend",
    hourlyWage: 18,
    hoursPerWeek: 20,
    deductions: [
      { label: "Federal tax", kind: "tax", pct: 10 },
      { label: "Transit pass", kind: "flat", pct: 0 },
    ],
    envelopes: ["vocrehab-rent", "vocrehab-groceries", "vocrehab-transit", "vocrehab-savings"],
    curveballs: [
      {
        id: "vocrehab-internship-surprise-expense",
        title: "Surprise expense",
        detail: "Your laptop charger dies the week a project is due. Cover the replacement without missing rent.",
      },
    ],
  },
];

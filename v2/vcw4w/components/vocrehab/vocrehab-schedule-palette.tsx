/**
 * Vocrehab schedule palette + burden cards (SJ picker UI).
 *
 * Usage:
 *   import VocrehabSchedulePalette from "@/components/vocrehab/vocrehab-schedule-palette";
 *   <VocrehabSchedulePalette
 *     activities={[{ id: "shift", label: "Work shift", blurb: "Steady hours that build momentum." }]}
 *     selectedId="shift"
 *     onSelect={(id) => ...}
 *     burdens={[{ id: "b1", title: "Late bus", why: "The 9:40 runs late on Fridays — leaving 10 minutes early keeps you steady." }]}
 *     onRepeatSleep={() => ...}
 *   />
 *
 * Activity palette buttons carry aria-pressed, burden cards use a calm amber
 * info style (never error-red), and the repeat-sleep helper keeps rest steady.
 * Strengths-first vocrehab tone throughout.
 */

"use client";

export type VocrehabSchedulePaletteActivity = {
  id: string;
  label: string;
  blurb: string;
};

export type VocrehabSchedulePaletteBurden = {
  id: string;
  title: string;
  why: string;
};

export type VocrehabSchedulePaletteProps = {
  activities: VocrehabSchedulePaletteActivity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  burdens: VocrehabSchedulePaletteBurden[];
  onRepeatSleep: () => void;
};

export default function VocrehabSchedulePalette({
  activities,
  selectedId,
  onSelect,
  burdens,
  onRepeatSleep,
}: VocrehabSchedulePaletteProps) {
  return (
    <section
      className="vocrehab-schedule-palette space-y-4"
      aria-label="Schedule activity palette"
    >
      <div>
        <h3 className="text-sm font-semibold text-stone-900">
          Pick your next win
        </h3>
        <p className="mt-1 text-sm text-stone-600" role="status">
          {activities.length === 0
            ? "No activities yet — your coach will add strong first options soon."
            : "Choose what fits today. Every pick moves the plan forward."}
        </p>
        {activities.length === 0 ? null : (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {activities.map((activity) => {
              const pressed = activity.id === selectedId;
              return (
                <li key={activity.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(activity.id)}
                    aria-pressed={pressed}
                    aria-label={`Select activity ${activity.label}`}
                    className={`w-full rounded-xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-amber-500 ${
                      pressed
                        ? "border-amber-400 bg-amber-50"
                        : "border-stone-200 bg-white hover:border-amber-300 hover:bg-amber-50"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-stone-900">
                      {activity.label}
                      {pressed ? " ✓" : ""}
                    </span>
                    <span className="mt-1 block text-xs text-stone-600">
                      {activity.blurb}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <h3 className="text-sm font-semibold text-stone-900">
          Things that make days heavier ({burdens.length})
        </h3>
        <p className="mt-1 text-xs text-stone-600">
          Naming a burden is a strength — it shows you know your day well.
        </p>
        {burdens.length === 0 ? (
          <p className="mt-2 text-sm text-stone-600">
            Nothing weighing on the plan right now. That&apos;s solid ground to
            build on.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {burdens.map((burden) => (
              <li
                key={burden.id}
                className="rounded-lg border border-amber-200 bg-white p-2"
              >
                <p className="text-sm font-semibold text-stone-900">
                  {burden.title}
                </p>
                <p className="mt-1 text-xs text-stone-600">{burden.why}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-3">
        <h3 className="text-sm font-semibold text-stone-900">
          Keep rest steady
        </h3>
        <p className="mt-1 text-xs text-stone-600">
          Repeating a steady sleep block protects energy for everything else.
          One tap carries last night&apos;s win into tonight.
        </p>
        <button
          type="button"
          onClick={onRepeatSleep}
          aria-label="Repeat last sleep block tonight"
          className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-stone-900 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-amber-500"
        >
          Repeat last sleep
        </button>
      </div>
    </section>
  );
}

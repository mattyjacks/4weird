"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * Small client ErrorBoundary isolating one page section so a TypeError in
 * chat/leaderboard/support never takes down the whole /clans/[slug] page.
 * Must stay class-based (function components cannot catch render errors).
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // Intentionally silent: section-level failure stays local; the segment
    // error.tsx / global-error.tsx remain the last resort for page crashes.
  }

  private retry = () => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
          <p className="text-sm text-slate-600 dark:text-slate-300">This section failed to load.</p>
          <button
            type="button"
            onClick={this.retry}
            className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

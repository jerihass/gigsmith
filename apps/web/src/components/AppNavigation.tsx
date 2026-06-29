import type { KeyboardEvent } from "react";
import { appViews, type AppView } from "../appViews";

const labels: Record<AppView, string> = {
  deck: "Deck",
  analysis: "Analysis",
  journal: "Journal",
  gigs: "Gigs",
  transfer: "Transfer"
};

export function AppNavigation({ activeView, onChange }: { activeView: AppView; onChange: (view: AppView) => void }) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, view: AppView) {
    const currentIndex = appViews.indexOf(view);
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % appViews.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + appViews.length) % appViews.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = appViews.length - 1;
    if (nextIndex === undefined) return;

    event.preventDefault();
    const nextView = appViews[nextIndex];
    onChange(nextView);
    window.requestAnimationFrame(() => document.getElementById(`app-tab-${nextView}`)?.focus());
  }

  return (
    <nav className="app-navigation" aria-label="Gigsmith tools">
      <div role="tablist" aria-label="Tool views">
        {appViews.map((view) => (
          <button
            id={`app-tab-${view}`}
            key={view}
            role="tab"
            aria-controls={`app-panel-${view}`}
            aria-selected={activeView === view}
            tabIndex={activeView === view ? 0 : -1}
            onClick={() => onChange(view)}
            onKeyDown={(event) => handleKeyDown(event, view)}
          >{labels[view]}</button>
        ))}
      </div>
    </nav>
  );
}

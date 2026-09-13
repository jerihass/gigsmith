import { useEffect, useRef, type KeyboardEvent } from "react";
import { Layers, Search, ChartNoAxesCombined, NotebookPen, Crosshair, Printer, ArrowLeftRight } from "lucide-react";
import { appViews, type AppView } from "../appViews";

const labels: Record<AppView, string> = {
  deck: "Deck",
  cards: "Cards",
  analysis: "Analysis",
  journal: "Journal",
  gigs: "Gigs",
  print: "Print",
  transfer: "Transfer"
};

const icons = { deck: Layers, cards: Search, analysis: ChartNoAxesCombined, journal: NotebookPen, gigs: Crosshair, print: Printer, transfer: ArrowLeftRight };

export function AppNavigation({ activeView, onChange }: { activeView: AppView; onChange: (view: AppView) => void }) {
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const navigation = navigationRef.current;
    const activeTab = document.getElementById(`app-tab-${activeView}`);
    if (!navigation || !activeTab) return;

    const navigationBounds = navigation.getBoundingClientRect();
    const tabBounds = activeTab.getBoundingClientRect();
    const edgeInset = 12;
    if (tabBounds.left < navigationBounds.left + edgeInset) {
      navigation.scrollBy({ left: tabBounds.left - navigationBounds.left - edgeInset });
    } else if (tabBounds.right > navigationBounds.right - edgeInset) {
      navigation.scrollBy({ left: tabBounds.right - navigationBounds.right + edgeInset });
    }
  }, [activeView]);

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
    <nav className="app-navigation" aria-label="Gigsmith tools" ref={navigationRef}>
      <div role="tablist" aria-label="Tool views">
        {appViews.map((view) => {
          const Icon = icons[view];
          return (
            <button
              id={`app-tab-${view}`}
              key={view}
              role="tab"
              aria-controls={`app-panel-${view}`}
              aria-selected={activeView === view}
              tabIndex={activeView === view ? 0 : -1}
              onClick={() => onChange(view)}
              onKeyDown={(event) => handleKeyDown(event, view)}
            ><Icon size={16} aria-hidden="true" /><span>{labels[view]}</span></button>
          );
        })}
      </div>
    </nav>
  );
}

export const appViews = ["deck", "analysis", "gigs", "tactics", "transfer"] as const;
export type AppView = typeof appViews[number];

export const appViewStorageKey = "gigsmith.active-view.v1";

interface ViewStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function isAppView(value: unknown): value is AppView {
  return typeof value === "string" && appViews.some((view) => view === value);
}

export function loadAppView(storage: ViewStorage): AppView {
  try {
    const stored = storage.getItem(appViewStorageKey);
    return isAppView(stored) ? stored : "deck";
  } catch {
    return "deck";
  }
}

export function saveAppView(storage: ViewStorage, view: AppView): void {
  try {
    storage.setItem(appViewStorageKey, view);
  } catch {
    // Navigation remains usable when browser storage is unavailable.
  }
}

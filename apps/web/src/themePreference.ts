export type AppTheme = "dark" | "light";

export const themePreferenceStorageKey = "gigsmith.theme.v1";

interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadThemePreference(storage: PreferenceStorage): AppTheme {
  try {
    return storage.getItem(themePreferenceStorageKey) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function saveThemePreference(storage: PreferenceStorage, theme: AppTheme): void {
  try {
    storage.setItem(themePreferenceStorageKey, theme);
  } catch {
    // Theme selection remains usable for the current session when storage is unavailable.
  }
}

export function applyThemePreference(theme: AppTheme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    theme === "light" ? "#edf3f2" : "#080a0b"
  );
}

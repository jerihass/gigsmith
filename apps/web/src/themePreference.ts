export type AppTheme = "dark" | "light" | "neon";

export const themePreferenceStorageKey = "gigsmith.theme.v1";

interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadThemePreference(storage: PreferenceStorage): AppTheme {
  try {
    const stored = storage.getItem(themePreferenceStorageKey);
    return stored === "light" || stored === "neon" ? stored : "dark";
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
    theme === "light" ? "#f2fbff" : theme === "neon" ? "#050008" : "#080a0b"
  );
}

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
  const themeColor = theme === "light" ? "#edf3f2" : theme === "neon" ? "#050008" : "#080a0b";
  let themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeColorMeta) {
    themeColorMeta = document.createElement("meta");
    themeColorMeta.name = "theme-color";
    document.head.append(themeColorMeta);
  }
  document.documentElement.dataset.theme = theme;
  themeColorMeta.content = themeColor;
  themeColorMeta.setAttribute("content", themeColor);
}

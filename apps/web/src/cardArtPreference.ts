export const cardArtPreferenceStorageKey = "gigsmith.card-art.v1";

interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadCardArtPreference(storage: PreferenceStorage): boolean {
  try {
    return storage.getItem(cardArtPreferenceStorageKey) === "enabled";
  } catch {
    return false;
  }
}

export function saveCardArtPreference(storage: PreferenceStorage, enabled: boolean): void {
  try {
    storage.setItem(cardArtPreferenceStorageKey, enabled ? "enabled" : "disabled");
  } catch {
    // Text-only card workflows remain available when storage is unavailable.
  }
}

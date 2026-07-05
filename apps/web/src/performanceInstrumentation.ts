export interface PerformanceMeasureEntry {
  label: string;
  durationMs: number;
  detail?: Record<string, string | number | boolean | null>;
}

declare global {
  interface Window {
    __GIGSMITH_PERF__?: boolean;
  }
}

const storageFlag = "gigsmith.performance.logging";
export const performanceConsolePrefix = "[gigsmith:performance]";

function readStorageFlag(): boolean {
  try {
    return globalThis.localStorage?.getItem(storageFlag) === "true";
  } catch {
    return false;
  }
}

export function performanceInstrumentationEnabled(): boolean {
  return Boolean(
    import.meta.env.DEV ||
    globalThis.window?.__GIGSMITH_PERF__ === true ||
    readStorageFlag()
  );
}

function now(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

export function measurePerformance<T>(
  label: string,
  task: () => T,
  detail?: PerformanceMeasureEntry["detail"]
): T {
  if (!performanceInstrumentationEnabled()) return task();

  const startedAt = now();
  try {
    return task();
  } finally {
    const entry: PerformanceMeasureEntry = {
      label,
      durationMs: Math.round((now() - startedAt) * 100) / 100,
      ...(detail ? { detail } : {})
    };
    console.info(`${performanceConsolePrefix} ${JSON.stringify(entry)}`);
  }
}

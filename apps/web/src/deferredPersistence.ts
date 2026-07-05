export interface DeferredPersistence<T> {
  schedule(value: T): void;
  flush(): void;
  cancel(): void;
  readonly hasPending: boolean;
}

export function createDeferredPersistence<T>(
  persist: (value: T) => void,
  delayMs = 250
): DeferredPersistence<T> {
  let pendingValue: T | undefined;
  let hasPending = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  function clearTimer() {
    if (timeoutId === undefined) return;
    clearTimeout(timeoutId);
    timeoutId = undefined;
  }

  const handle: DeferredPersistence<T> = {
    schedule(value) {
      pendingValue = value;
      hasPending = true;
      clearTimer();
      timeoutId = setTimeout(() => handle.flush(), delayMs);
    },
    flush() {
      if (!hasPending) return;
      const value = pendingValue as T;
      pendingValue = undefined;
      hasPending = false;
      clearTimer();
      persist(value);
    },
    cancel() {
      pendingValue = undefined;
      hasPending = false;
      clearTimer();
    },
    get hasPending() {
      return hasPending;
    }
  };

  return handle;
}

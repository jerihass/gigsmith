import { describe, expect, it, vi } from "vitest";
import { createDeferredPersistence } from "./deferredPersistence";

describe("createDeferredPersistence", () => {
  it("coalesces rapid writes into the latest persisted value", () => {
    vi.useFakeTimers();
    const persisted: number[] = [];
    const writer = createDeferredPersistence((value: number) => persisted.push(value), 100);

    writer.schedule(1);
    writer.schedule(2);
    writer.schedule(3);

    expect(persisted).toEqual([]);
    vi.advanceTimersByTime(99);
    expect(persisted).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(persisted).toEqual([3]);
    expect(writer.hasPending).toBe(false);
    vi.useRealTimers();
  });

  it("flushes pending writes immediately", () => {
    vi.useFakeTimers();
    const persisted: string[] = [];
    const writer = createDeferredPersistence((value: string) => persisted.push(value), 100);

    writer.schedule("latest");
    writer.flush();
    vi.advanceTimersByTime(100);

    expect(persisted).toEqual(["latest"]);
    expect(writer.hasPending).toBe(false);
    vi.useRealTimers();
  });

  it("can cancel stale pending writes", () => {
    vi.useFakeTimers();
    const persisted: string[] = [];
    const writer = createDeferredPersistence((value: string) => persisted.push(value), 100);

    writer.schedule("stale");
    writer.cancel();
    vi.advanceTimersByTime(100);

    expect(persisted).toEqual([]);
    expect(writer.hasPending).toBe(false);
    vi.useRealTimers();
  });
});

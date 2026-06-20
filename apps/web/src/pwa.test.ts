import { describe, expect, it } from "vitest";
import {
  pwaDeploymentPaths,
  registerGigsmithServiceWorker,
  type PwaBrowserEnvironment
} from "./pwa";

class FakeEventTarget {
  private listeners = new Map<string, Set<() => void>>();

  addEventListener(type: string, listener: () => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: () => void) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string) {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
}

class FakeWorker extends FakeEventTarget {
  state = "installed";
  messages: unknown[] = [];
  postMessage(message: unknown) { this.messages.push(message); }
}

function updateEnvironment() {
  const container = new FakeEventTarget() as FakeEventTarget & {
    controller: unknown;
    register: (scriptUrl: string, options: { scope: string }) => Promise<typeof registration>;
  };
  const registration = new FakeEventTarget() as FakeEventTarget & {
    installing: FakeWorker | null;
    waiting: FakeWorker | null;
    update: () => Promise<void>;
  };
  const registrations: Array<{ scriptUrl: string; scope: string }> = [];
  let updateCalls = 0;
  let reloads = 0;
  container.controller = {};
  registration.installing = null;
  registration.waiting = new FakeWorker();
  registration.update = async () => { updateCalls += 1; };
  container.register = async (scriptUrl, options) => {
    registrations.push({ scriptUrl, scope: options.scope });
    return registration;
  };
  const environment: PwaBrowserEnvironment = {
    serviceWorker: container,
    reload: () => { reloads += 1; }
  };
  return {
    container,
    environment,
    registration,
    registrations,
    updateCalls: () => updateCalls,
    reloads: () => reloads
  };
}

describe("PWA registration", () => {
  it("derives root and subpath registration URLs", () => {
    expect(pwaDeploymentPaths("/")).toEqual({ scope: "/", scriptUrl: "/sw.js" });
    expect(pwaDeploymentPaths("/gigsmith/")).toEqual({ scope: "/gigsmith/", scriptUrl: "/gigsmith/sw.js" });
    expect(pwaDeploymentPaths("/gigsmith")).toEqual({ scope: "/gigsmith/", scriptUrl: "/gigsmith/sw.js" });
  });

  it("activates a waiting update and reloads only after controller change", async () => {
    const state = updateEnvironment();
    let activateUpdate: (() => void) | undefined;
    await registerGigsmithServiceWorker((activate) => { activateUpdate = activate; }, state.environment, "/gigsmith/");

    expect(state.registrations).toEqual([{ scriptUrl: "/gigsmith/sw.js", scope: "/gigsmith/" }]);
    expect(state.updateCalls()).toBe(1);
    expect(activateUpdate).toBeTypeOf("function");
    activateUpdate?.();
    expect(state.registration.waiting?.messages).toEqual([{ type: "SKIP_WAITING" }]);
    expect(state.reloads()).toBe(0);
    state.container.dispatch("controllerchange");
    expect(state.reloads()).toBe(1);
    state.container.dispatch("controllerchange");
    expect(state.reloads()).toBe(1);
  });

  it("exposes an update installed after registration and cleans up listeners", async () => {
    const state = updateEnvironment();
    state.registration.waiting = null;
    const worker = new FakeWorker();
    worker.state = "installing";
    state.registration.installing = worker;
    let updateCount = 0;
    const cleanup = await registerGigsmithServiceWorker(() => { updateCount += 1; }, state.environment, "/");

    state.registration.dispatch("updatefound");
    worker.state = "installed";
    worker.dispatch("statechange");
    expect(updateCount).toBe(1);

    cleanup();
    state.registration.dispatch("updatefound");
    expect(updateCount).toBe(1);
  });

  it("does nothing when service workers are unavailable", async () => {
    const cleanup = await registerGigsmithServiceWorker(
      () => { throw new Error("unexpected update"); },
      { reload: () => undefined },
      "/"
    );
    expect(cleanup()).toBeUndefined();
  });
});

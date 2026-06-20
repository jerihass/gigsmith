export type ServiceWorkerUpdateHandler = (activateUpdate: () => void) => void;

interface EventTargetLike {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

interface WorkerLike extends EventTargetLike {
  state: string;
  postMessage(message: unknown): void;
}

interface RegistrationLike extends EventTargetLike {
  installing: WorkerLike | null;
  waiting: WorkerLike | null;
  update(): Promise<void>;
}

interface ServiceWorkerContainerLike extends EventTargetLike {
  controller: unknown;
  register(scriptUrl: string, options: { scope: string }): Promise<RegistrationLike>;
}

export interface PwaBrowserEnvironment {
  serviceWorker?: ServiceWorkerContainerLike;
  reload(): void;
}

export function pwaDeploymentPaths(baseUrl: string): { scope: string; scriptUrl: string } {
  const scope = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return { scope, scriptUrl: `${scope}sw.js` };
}

function currentBrowserEnvironment(): PwaBrowserEnvironment {
  const serviceWorker = "serviceWorker" in navigator
    ? navigator.serviceWorker as unknown as ServiceWorkerContainerLike
    : undefined;
  return { serviceWorker, reload: () => window.location.reload() };
}

export async function registerGigsmithServiceWorker(
  onUpdate: ServiceWorkerUpdateHandler,
  environment = currentBrowserEnvironment(),
  baseUrl = import.meta.env.BASE_URL
): Promise<() => void> {
  if (!environment.serviceWorker) return () => undefined;

  const serviceWorker = environment.serviceWorker;
  const paths = pwaDeploymentPaths(baseUrl);
  const registration = await serviceWorker.register(paths.scriptUrl, { scope: paths.scope });
  let reloadForUpdate = false;
  const handleControllerChange = () => {
    if (!reloadForUpdate) return;
    reloadForUpdate = false;
    environment.reload();
  };
  const exposeUpdate = (worker: WorkerLike) => {
    onUpdate(() => {
      reloadForUpdate = true;
      worker.postMessage({ type: "SKIP_WAITING" });
    });
  };
  const watchInstallingWorker = () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && serviceWorker.controller) exposeUpdate(worker);
    });
  };

  serviceWorker.addEventListener("controllerchange", handleControllerChange);
  registration.addEventListener("updatefound", watchInstallingWorker);
  if (registration.waiting && serviceWorker.controller) exposeUpdate(registration.waiting);
  void registration.update().catch(() => undefined);

  return () => {
    serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    registration.removeEventListener("updatefound", watchInstallingWorker);
  };
}

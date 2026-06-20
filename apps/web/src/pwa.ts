export type ServiceWorkerUpdateHandler = (activateUpdate: () => void) => void;

export async function registerGigsmithServiceWorker(
  onUpdate: ServiceWorkerUpdateHandler
): Promise<() => void> {
  if (!("serviceWorker" in navigator)) return () => undefined;

  const registration = await navigator.serviceWorker.register("/sw.js");
  let reloadForUpdate = false;
  const handleControllerChange = () => {
    if (!reloadForUpdate) return;
    reloadForUpdate = false;
    window.location.reload();
  };
  const exposeUpdate = (worker: ServiceWorker) => {
    onUpdate(() => {
      reloadForUpdate = true;
      worker.postMessage({ type: "SKIP_WAITING" });
    });
  };
  const watchInstallingWorker = () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) exposeUpdate(worker);
    });
  };

  navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
  registration.addEventListener("updatefound", watchInstallingWorker);
  if (registration.waiting && navigator.serviceWorker.controller) exposeUpdate(registration.waiting);
  void registration.update();

  return () => {
    navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    registration.removeEventListener("updatefound", watchInstallingWorker);
  };
}

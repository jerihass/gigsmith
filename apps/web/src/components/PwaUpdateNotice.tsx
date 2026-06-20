import { useEffect, useState } from "react";
import { registerGigsmithServiceWorker } from "../pwa";

export function PwaUpdateNotice() {
  const [activateUpdate, setActivateUpdate] = useState<(() => void) | undefined>();

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    let cleanup: (() => void) | undefined;
    void registerGigsmithServiceWorker((activate) => setActivateUpdate(() => activate))
      .then((nextCleanup) => { cleanup = nextCleanup; })
      .catch(() => undefined);
    return () => cleanup?.();
  }, []);

  if (!activateUpdate) return null;
  return (
    <aside className="pwa-update" aria-live="polite">
      <span>Gigsmith update ready</span>
      <button onClick={activateUpdate}>Update now</button>
    </aside>
  );
}

import { useEffect, useState } from "react";
import { registerGigsmithServiceWorker } from "../pwa";

export function PwaUpdateNotice({ onReleaseNotes }: { onReleaseNotes: (trigger: HTMLButtonElement) => void }) {
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
      <span>Gigsmith update downloaded</span>
      <div className="pwa-update-actions">
        <button onClick={(event) => onReleaseNotes(event.currentTarget)}>Release notes</button>
        <button className="primary" onClick={activateUpdate}>Restart app</button>
      </div>
    </aside>
  );
}

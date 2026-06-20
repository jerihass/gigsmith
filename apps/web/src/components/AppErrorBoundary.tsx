import React from "react";

export function AppErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="recovery-page">
      <section className="recovery-panel" aria-labelledby="app-error-title">
        <p className="eyebrow">Application recovery</p>
        <h1 id="app-error-title">Gigsmith could not render</h1>
        <p>Your locally saved decks were not changed. Reload the application to retry.</p>
        <button className="primary" onClick={onRetry}>Reload Gigsmith</button>
      </section>
    </main>
  );
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <AppErrorFallback onRetry={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}

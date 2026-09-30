import type { ReactNode } from "react";

interface ProductShellProps {
  readonly activeSurface: "garden" | "inbox";
  readonly children: ReactNode;
  readonly onCapture: () => void;
  readonly onSurfaceChange: (surface: "garden" | "inbox") => void;
  readonly status: string;
}

export function ProductShell({
  activeSurface,
  children,
  onCapture,
  onSurfaceChange,
  status,
}: ProductShellProps) {
  return (
    <div className="product-shell">
      <header className="product-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <div>
            <p className="eyebrow">Local-first knowledge garden</p>
            <h1>JardinDigital</h1>
          </div>
        </div>
        <nav className="product-navigation" aria-label="Product">
          <button
            type="button"
            className={
              activeSurface === "garden"
                ? "nav-button nav-button--active"
                : "nav-button"
            }
            aria-current={activeSurface === "garden" ? "page" : undefined}
            onClick={() => onSurfaceChange("garden")}
          >
            Garden
          </button>
          <button
            type="button"
            className={
              activeSurface === "inbox"
                ? "nav-button nav-button--active"
                : "nav-button"
            }
            aria-current={activeSurface === "inbox" ? "page" : undefined}
            onClick={() => onSurfaceChange("inbox")}
          >
            Inbox
          </button>
          <button type="button" onClick={onCapture}>
            Capture
          </button>
        </nav>
        <p className="status" aria-live="polite">
          {status}
        </p>
      </header>
      <main className="product-workspace">{children}</main>
    </div>
  );
}

import type { ReactNode } from "react";

interface ProductShellProps {
  readonly children: ReactNode;
  readonly status: string;
}

export function ProductShell({ children, status }: ProductShellProps) {
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
        <p className="status" aria-live="polite">
          {status}
        </p>
      </header>
      <main className="product-workspace">{children}</main>
    </div>
  );
}

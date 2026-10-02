import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../shared/Icon";
import { ActionMenu } from "../shared/ActionMenu";

export type NavigationSurface = "home" | "garden" | "search" | "inbox" | "library" | "settings";
export type ProductSurface = NavigationSurface | "idea";

interface ProductShellProps {
  readonly activeSurface: ProductSurface;
  readonly children: ReactNode;
  readonly onCapture: () => void;
  readonly onSurfaceChange: (surface: NavigationSurface) => void;
  readonly status: string;
}

const secondaryNavigation: readonly { surface: NavigationSurface; label: string; icon: "file" | "document" | "settings" }[] = [
  { surface: "inbox", label: "Pendientes", icon: "file" },
  { surface: "library", label: "Todas las ideas", icon: "document" },
  { surface: "settings", label: "Ajustes", icon: "settings" },
];

export function ProductShell({ activeSurface, children, onCapture, onSurfaceChange, status }: ProductShellProps) {
  const secondary = secondaryNavigation.find(({ surface }) => surface === activeSurface);
  const showCapture = activeSurface !== "garden" && activeSurface !== "inbox" && activeSurface !== "idea";
  const [toastVisible, setToastVisible] = useState(false);
  const toastRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setToastVisible(status.length > 0);
    const timeout = window.setTimeout(() => {
      if (!toastRef.current?.contains(document.activeElement)) setToastVisible(false);
    }, 4_000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  return (
    <div className={`product-shell${activeSurface === "garden" ? " product-shell--garden" : ""}`}>
      <header className="product-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><Icon name="garden" /></span>
          <h1>JardinDigital</h1>
        </div>
        <nav className="product-navigation" aria-label="Navegación principal">
          <button type="button" className={`nav-button nav-button--primary${activeSurface === "home" ? " nav-button--active" : ""}`}
            aria-current={activeSurface === "home" ? "page" : undefined} onClick={() => onSurfaceChange("home")}><Icon name="home" />Inicio</button>
          <button type="button" className={`nav-button nav-button--primary${activeSurface === "search" ? " nav-button--active" : ""}`}
            aria-current={activeSurface === "search" ? "page" : undefined} onClick={() => onSurfaceChange("search")}><Icon name="search" />Buscar</button>
          <ActionMenu className="navigation-menu" label="Más opciones de navegación"
            summaryClassName={`nav-button nav-button--secondary${secondary ? " nav-button--active" : ""}`}
            summary={<><Icon name={secondary?.icon ?? "more"} />{secondary?.label ?? "Más"}<Icon name="chevron" /></>}>
            {secondaryNavigation.map(({ surface, label, icon }) => (
              <button key={surface} type="button" className="secondary-button" aria-current={activeSurface === surface ? "page" : undefined}
                onClick={() => onSurfaceChange(surface)}><Icon name={icon} />{label}</button>
            ))}
          </ActionMenu>
        </nav>
        {showCapture ? <button type="button" className="accent-button capture-navigation" onClick={onCapture}><Icon name="plus" />Nueva idea</button> : null}
        <p className="sr-only" aria-live="polite" aria-atomic="true">{status}</p>
      </header>
      <main className="product-workspace">{children}</main>
      {toastVisible ? <div ref={toastRef} className="product-toast"><span>{status}</span><button type="button" className="icon-button" onClick={() => setToastVisible(false)} aria-label="Cerrar mensaje"><Icon name="close" /></button></div> : null}
    </div>
  );
}

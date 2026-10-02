import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

interface ActionMenuProps {
  readonly label: string;
  readonly children: ReactNode;
  readonly summary?: ReactNode;
  readonly className?: string;
  readonly summaryClassName?: string;
}

interface ContextActionMenuProps {
  readonly label: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly onClose: () => void;
  readonly children: ReactNode;
}

export function placeContextActionMenu(position: { readonly x: number; readonly y: number }, viewport: { readonly width: number; readonly height: number }, size: { readonly width: number; readonly height: number }) {
  const margin = 16;
  const width = Math.min(size.width, Math.max(0, viewport.width - margin * 2));
  const height = Math.min(size.height, Math.max(0, viewport.height - margin * 2));
  return {
    left: Math.max(margin, Math.min(position.x + 8, viewport.width - margin - width)),
    top: Math.max(margin, Math.min(position.y + 8, viewport.height - margin - height)),
  };
}

export function ContextActionMenu({ label, position, onClose, children }: ContextActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | SVGElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [placement, setPlacement] = useState({ left: position.x + 8, top: position.y + 8 });

  const buttons = () => Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
  const restoreFocus = () => {
    if (previousFocus.current?.isConnected && document.querySelector('[aria-modal="true"]') === null) previousFocus.current.focus();
  };

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    if ((document.activeElement instanceof HTMLElement || document.activeElement instanceof SVGElement) && !menu.contains(document.activeElement)) previousFocus.current = document.activeElement;
    const bounds = menu.getBoundingClientRect();
    setPlacement(placeContextActionMenu(position, { width: window.innerWidth, height: window.innerHeight }, { width: bounds.width, height: bounds.height }));
    for (const button of menu.querySelectorAll("button")) {
      button.setAttribute("role", "menuitem");
      button.tabIndex = -1;
    }
    const first = menu.querySelector<HTMLButtonElement>("button:not(:disabled)");
    if (first) { first.tabIndex = 0; first.focus(); }
    else menu.focus();
  }, [label, position.x, position.y]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) closeRef.current();
    };
    const closeOnScroll = (event: Event) => {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return;
      closeRef.current();
    };
    const closeOnResize = () => closeRef.current();
    document.addEventListener("pointerdown", closeOutside, true);
    document.addEventListener("scroll", closeOnScroll, true);
    document.addEventListener("wheel", closeOnScroll, { capture: true, passive: true });
    window.addEventListener("resize", closeOnResize);
    return () => {
      document.removeEventListener("pointerdown", closeOutside, true);
      document.removeEventListener("scroll", closeOnScroll, true);
      document.removeEventListener("wheel", closeOnScroll, true);
      window.removeEventListener("resize", closeOnResize);
    };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(<div ref={menuRef} className="action-menu__content context-action-menu" role="menu" aria-label={label} aria-orientation="vertical" tabIndex={-1} style={placement}
    onPointerDown={(event) => event.stopPropagation()}
    onWheel={(event) => event.stopPropagation()}
    onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}
    onClick={(event) => {
      event.stopPropagation();
      if (event.target instanceof Element) {
        const button = event.target.closest("button");
        if (button && !button.disabled) closeRef.current();
      }
    }}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        restoreFocus();
        return;
      }
      if (event.key === "Tab") { closeRef.current(); restoreFocus(); return; }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const items = buttons();
      if (items.length === 0) return;
      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
        : event.key === "ArrowDown" ? (current + 1) % items.length : current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
      for (const [index, item] of items.entries()) item.tabIndex = index === next ? 0 : -1;
      items[next]?.focus();
    }}>{children}</div>, document.body);
}

export function ActionMenu({ label, children, summary, className = "", summaryClassName = "icon-button" }: ActionMenuProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState({ above: false, availableHeight: 0 });

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const menu = menuRef.current;
      const summary = menu?.querySelector("summary");
      const content = menu?.querySelector<HTMLElement>(".action-menu__content");
      if (!menu?.open || !summary || !content) return;
      const bounds = summary.getBoundingClientRect();
      let top = 16;
      let bottom = window.innerHeight - 16;
      // An absolute menu is clipped by its scrollport, even when its z-index is correct.
      for (let ancestor = menu.parentElement; ancestor; ancestor = ancestor.parentElement) {
        if (!/auto|scroll|hidden|clip|overlay/.test(getComputedStyle(ancestor).overflowY)) continue;
        const clip = ancestor.getBoundingClientRect();
        top = Math.max(top, clip.top + 8);
        bottom = Math.min(bottom, clip.bottom - 8);
      }
      if (bounds.bottom < top || bounds.top > bottom) {
        menu.open = false;
        return;
      }
      const below = Math.max(0, bottom - bounds.bottom - 8);
      const above = Math.max(0, bounds.top - top - 8);
      const showAbove = content.scrollHeight > below && above > below;
      setPlacement({ above: showAbove, availableHeight: showAbove ? above : below });
    };
    place();
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const menu = menuRef.current;
      if (menu && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  return <details ref={menuRef} className={`action-menu ${placement.above ? "action-menu--above" : ""} ${className}`.trim()}
    onToggle={(event) => setOpen(event.currentTarget.open)}
    onBlur={(event) => {
      if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
    }}
    onKeyDown={(event) => {
      if (event.key === "Escape" && event.currentTarget.open) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      }
    }}>
    <summary className={summaryClassName} aria-label={label}>{summary ?? <Icon name="more" />}</summary>
    <div className="action-menu__content" role="group" aria-label={label}
      style={open && placement.availableHeight > 0 ? { maxHeight: placement.availableHeight } : undefined}
      onClick={(event) => {
      if (event.target instanceof Element && event.target.closest("button")) {
        const menu = menuRef.current;
        if (menu) { menu.open = false; menu.querySelector("summary")?.focus(); }
      }
    }}>{children}</div>
  </details>;
}

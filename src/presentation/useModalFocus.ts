import { useEffect, useRef } from "react";

const FOCUSABLE = "a[href], button, input:not([type='hidden']), textarea, select, [tabindex]";
const activeModals: HTMLElement[] = [];

export function useModalFocus(active: boolean) {
  const modalRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const modal = modalRef.current;
    if (!active || modal === null) return;
    const previousFocus = document.activeElement;
    activeModals.push(modal);
    const controls = () => Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((element) => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length > 0);
    const focusInside = () => (controls()[0] ?? modal).focus();

    const containFocus = (event: FocusEvent) => {
      if (activeModals[activeModals.length - 1] !== modal) return;
      if (event.target instanceof globalThis.Node && !modal.contains(event.target)) focusInside();
    };
    const containTab = (event: KeyboardEvent) => {
      if (activeModals[activeModals.length - 1] !== modal) return;
      if (event.key !== "Tab") return;
      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (first === undefined) {
        event.preventDefault();
        modal.focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    focusInside();
    document.addEventListener("focusin", containFocus);
    document.addEventListener("keydown", containTab);
    return () => {
      document.removeEventListener("focusin", containFocus);
      document.removeEventListener("keydown", containTab);
      const index = activeModals.indexOf(modal);
      if (index !== -1) activeModals.splice(index, 1);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [active]);

  return modalRef;
}

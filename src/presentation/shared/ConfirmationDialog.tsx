import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useModalFocus } from "../useModalFocus";
import { Icon } from "./Icon";

export interface ConfirmationOptions {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly destructive?: boolean;
}

type Confirm = (options: ConfirmationOptions) => Promise<boolean>;
const ConfirmationContext = createContext<Confirm | null>(null);

export function ConfirmationDialog({ title, description, confirmLabel, destructive = false, onAnswer }: ConfirmationOptions & { readonly onAnswer: (answer: boolean) => void }) {
  const headingId = useId();
  const descriptionId = useId();
  const modalRef = useModalFocus(true);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onAnswer(false);
    };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [onAnswer]);

  return (
    <div className="confirmation-backdrop">
      <section ref={modalRef} className="confirmation-panel" role="alertdialog" aria-modal="true" aria-labelledby={headingId} aria-describedby={descriptionId} tabIndex={-1}>
        <h2 id={headingId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={() => onAnswer(false)}>Cancelar</button>
          <button type="button" className={destructive ? "danger-button" : "button--primary"} onClick={() => onAnswer(true)}>
            <Icon name={destructive ? "trash" : "check"} />{confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function ConfirmationProvider({ children }: { readonly children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmationOptions | null>(null);
  const resolver = useRef<((answer: boolean) => void) | null>(null);
  const confirm = useCallback<Confirm>((options) => {
    if (resolver.current !== null) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setPending(options);
    });
  }, []);
  const answer = useCallback((value: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setPending(null);
    resolve?.(value);
  }, []);
  useEffect(() => () => {
    resolver.current?.(false);
    resolver.current = null;
  }, []);

  return <ConfirmationContext.Provider value={confirm}>{children}{pending ? <ConfirmationDialog {...pending} onAnswer={answer} /> : null}</ConfirmationContext.Provider>;
}

export function useConfirmation(): Confirm {
  const confirm = useContext(ConfirmationContext);
  if (confirm === null) throw new Error("ConfirmationProvider is required.");
  return confirm;
}

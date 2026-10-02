import { useLayoutEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import type { Position } from "../../domain/placement";
import { Icon } from "../shared/Icon";

export interface QuickNodeDraft {
  readonly position: Position;
  readonly inputPosition: Position;
  readonly keepInputInBounds?: boolean;
}

export function clampQuickNodeInputPosition(
  inputPosition: Position,
  form: Pick<DOMRect, "left" | "top" | "width" | "height">,
  canvas: Pick<DOMRect, "left" | "top" | "right" | "bottom">,
  viewport: { readonly width: number; readonly height: number },
): Position {
  const left = Math.max(8, canvas.left + 8);
  const top = Math.max(8, canvas.top + 8);
  const right = Math.max(left, Math.min(viewport.width - 8, canvas.right - 8) - form.width);
  const bottom = Math.max(top, Math.min(viewport.height - 8, canvas.bottom - 8) - form.height);
  const x = inputPosition.x + Math.min(right, Math.max(left, form.left)) - form.left;
  const y = inputPosition.y + Math.min(bottom, Math.max(top, form.top)) - form.top;
  return x === inputPosition.x && y === inputPosition.y ? inputPosition : { x, y };
}

interface QuickNodeCreatorProps {
  readonly draft: QuickNodeDraft;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly submitting: boolean;
  readonly title: string;
  readonly onCancel: () => void;
  readonly onSubmit: (event: FormEvent) => void;
  readonly onTitleChange: (title: string) => void;
}

export function QuickNodeCreator({
  draft,
  inputRef,
  submitting,
  title,
  onCancel,
  onSubmit,
  onTitleChange,
}: QuickNodeCreatorProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [inputPosition, setInputPosition] = useState(draft.inputPosition);

  useLayoutEffect(() => {
    if (!draft.keepInputInBounds) return;
    const place = () => {
      const form = formRef.current;
      const canvas = form?.offsetParent;
      if (!form || !(canvas instanceof HTMLElement)) return;
      const bounds = form.getBoundingClientRect();
      const position = clampQuickNodeInputPosition(draft.inputPosition, {
        left: bounds.left + draft.inputPosition.x - inputPosition.x,
        top: bounds.top + draft.inputPosition.y - inputPosition.y,
        width: bounds.width,
        height: bounds.height,
      }, canvas.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight });
      setInputPosition((current) => current.x === position.x && current.y === position.y ? current : position);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [draft.keepInputInBounds, draft.inputPosition.x, draft.inputPosition.y, inputPosition.x, inputPosition.y]);

  const visibleInputPosition = draft.keepInputInBounds ? inputPosition : draft.inputPosition;
  return (
    <form
      ref={formRef}
      className="quick-node-form nodrag nowheel nopan"
      style={{ left: visibleInputPosition.x, top: visibleInputPosition.y, zIndex: draft.keepInputInBounds ? 45 : undefined }}
      onSubmit={onSubmit}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !submitting) { event.preventDefault(); onCancel(); }
      }}
    >
      <label htmlFor="quick-node-title"><Icon name="plus" />Nueva idea</label>
      <input
        id="quick-node-title"
        ref={inputRef}
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        disabled={submitting}
        autoFocus={!draft.keepInputInBounds}
        placeholder="Título de la idea"
      />
      <div className="form-actions quick-node-actions">
        <button type="button" className="secondary-button" onClick={onCancel} disabled={submitting}>Cancelar</button>
        <button type="submit" className="button--primary" disabled={submitting || title.trim().length === 0}><Icon name="check" />Crear idea</button>
      </div>
    </form>
  );
}

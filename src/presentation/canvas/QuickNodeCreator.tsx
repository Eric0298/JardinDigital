import type { FormEvent, RefObject } from "react";
import type { Position } from "../../domain/placement";

export interface QuickNodeDraft {
  readonly position: Position;
  readonly inputPosition: Position;
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
  return (
    <form
      className="quick-node-form nodrag nowheel nopan"
      style={{ left: draft.inputPosition.x, top: draft.inputPosition.y }}
      onSubmit={onSubmit}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <label htmlFor="quick-node-title">New idea title</label>
      <input
        id="quick-node-title"
        ref={inputRef}
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        disabled={submitting}
        autoFocus
        placeholder="Idea title"
      />
    </form>
  );
}

import type { FormEvent, RefObject } from "react";
import type { NodeId } from "../../domain/node";
import type { PlacementId } from "../../domain/placement";
import { Icon } from "../shared/Icon";

export interface NodeEditDraft {
  readonly nodeId: NodeId;
  readonly placementId: PlacementId;
  readonly title: string;
  readonly content: string;
}

interface NodeEditorProps {
  readonly contentRef: RefObject<HTMLTextAreaElement | null>;
  readonly draft: NodeEditDraft;
  readonly saving: boolean;
  readonly titleRef: RefObject<HTMLInputElement | null>;
  readonly onCancel: () => void;
  readonly onChange: (draft: NodeEditDraft) => void;
  readonly onSave: () => void;
  readonly onRemove: () => void;
}

export function NodeEditor({
  contentRef,
  draft,
  saving,
  titleRef,
  onCancel,
  onChange,
  onSave,
  onRemove,
}: NodeEditorProps) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onSave();
  }

  return (
    <form
      className="node-editor nodrag nowheel nopan"
      onSubmit={submit}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !saving) {
          event.preventDefault();
          onCancel();
          return;
        }

        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          onSave();
          return;
        }

        if (event.key === "Enter" && event.target === titleRef.current) {
          event.preventDefault();
          contentRef.current?.focus();
        }
      }}
    >
      <div className="node-editor__heading">
        <strong>Editar idea</strong>
        <span className="sr-only">Ctrl/Cmd+Intro para guardar · Esc para cancelar</span>
      </div>
      <label htmlFor="node-edit-title">Título</label>
      <input
        id="node-edit-title"
        ref={titleRef}
        value={draft.title}
        onChange={(event) => onChange({ ...draft, title: event.target.value })}
        disabled={saving}
      />
      <label htmlFor="node-edit-content">Contenido</label>
      <textarea
        id="node-edit-content"
        ref={contentRef}
        value={draft.content}
        onChange={(event) =>
          onChange({ ...draft, content: event.target.value })
        }
        disabled={saving}
        rows={8}
      />
      <div className="node-editor__actions">
        <button type="button" className="secondary-button" onClick={onRemove} disabled={saving}><Icon name="unlink" />Quitar del jardín</button>
        <button
          type="button"
          className="secondary-button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button type="submit" className="button--primary" disabled={saving}>
          <Icon name="save" />Guardar
        </button>
      </div>
    </form>
  );
}

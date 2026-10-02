import { useEffect, useRef, useState, type FormEvent } from "react";
import { useModalFocus } from "../useModalFocus";
import { Icon } from "../shared/Icon";
import { useConfirmation } from "../shared/ConfirmationDialog";

interface CaptureFormProps {
  readonly onCancel: () => void;
  readonly onCapture: (title: string, content: string) => Promise<boolean>;
  readonly onDirtyChange?: (dirty: boolean) => void;
}

export function CaptureForm({ onCancel, onCapture, onDirtyChange }: CaptureFormProps) {
  const confirm = useConfirmation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const titleInput = useRef<HTMLInputElement | null>(null);
  const modalRef = useModalFocus(true);
  const dirty = title.trim().length > 0 || content.trim().length > 0;

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => { onDirtyChange?.(false); }, [onDirtyChange]);

  useEffect(() => {
    titleInput.current?.focus();
  }, []);

  async function cancel() {
    if (submitting) return;
    if (dirty && !await confirm({ title: "Descartar esta idea", description: "Esta idea aún no está guardada. ¿Quieres descartarla y cerrar?", confirmLabel: "Descartar idea" })) return;
    onCancel();
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();

    if (
      submitting ||
      (title.trim().length === 0 && content.trim().length === 0)
    ) {
      return;
    }

    setSubmitting(true);
    void onCapture(title, content).finally(() => setSubmitting(false));
  }

  return (
    <div className="garden-form-backdrop" role="presentation">
      <section
        ref={modalRef}
        tabIndex={-1}
        className="garden-form-panel capture-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-heading"
      >
        <p className="eyebrow">Nueva idea</p>
        <h2 id="capture-heading">Guardar una idea</h2>
        <p>Guárdala ahora y elige su jardín después.</p>
        <form
          onSubmit={submit}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !submitting) {
              event.preventDefault();
              void cancel();
            } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              submit();
            }
          }}
        >
          <label htmlFor="capture-title">Título</label>
          <input
            id="capture-title"
            ref={titleInput}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={submitting}
            placeholder="Título opcional"
          />
          <label htmlFor="capture-content">Contenido</label>
          <textarea
            id="capture-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={submitting}
            rows={7}
            placeholder="¿Qué quieres recordar?"
          />
          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => void cancel()}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="button--primary"
              disabled={
                submitting ||
                (title.trim().length === 0 && content.trim().length === 0)
              }
            >
              <Icon name="save" />Guardar en pendientes
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useModalFocus } from "../useModalFocus";
import { Icon } from "../shared/Icon";

interface CreateGardenFormProps {
  readonly canCancel: boolean;
  readonly onCancel: () => void;
  readonly onCreate: (title: string) => Promise<boolean>;
}

export function CreateGardenForm({
  canCancel,
  onCancel,
  onCreate,
}: CreateGardenFormProps) {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const titleInput = useRef<HTMLInputElement | null>(null);
  const modalRef = useModalFocus(true);

  useEffect(() => {
    titleInput.current?.focus();
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();

    if (submitting || title.trim().length === 0) {
      return;
    }

    setSubmitting(true);
    void onCreate(title).finally(() => setSubmitting(false));
  }

  return (
    <div className="garden-form-backdrop" role="presentation">
      <section
        ref={modalRef}
        tabIndex={-1}
        className="garden-form-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="garden-form-heading"
      >
        <p className="eyebrow">Nuevo jardín</p>
        <h2 id="garden-form-heading">Pon nombre a tu jardín</h2>
        <p>Un jardín es un espacio visual para cultivar ideas relacionadas.</p>
        <form onSubmit={submit} onKeyDown={(event) => {
          if (event.key === "Escape" && canCancel && !submitting) { event.preventDefault(); onCancel(); }
        }}>
          <label htmlFor="garden-title">Nombre del jardín</label>
          <input
            id="garden-title"
            ref={titleInput}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={submitting}
            placeholder="Mi jardín"
          />
          <div className="form-actions">
            {canCancel ? (
              <button
                type="button"
                className="secondary-button"
                onClick={onCancel}
                disabled={submitting}
              >
                Cancelar
              </button>
            ) : null}
            <button
              type="submit"
              className="button--grow"
              disabled={submitting || title.trim().length === 0}
            >
              <Icon name="garden" />Crear jardín
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

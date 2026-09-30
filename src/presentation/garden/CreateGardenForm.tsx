import { useEffect, useRef, useState, type FormEvent } from "react";

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
        className="garden-form-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="garden-form-heading"
      >
        <p className="eyebrow">New Garden</p>
        <h2 id="garden-form-heading">Name your Garden</h2>
        <p>A Garden is a visual space for cultivating related ideas.</p>
        <form onSubmit={submit}>
          <label htmlFor="garden-title">Garden name</label>
          <input
            id="garden-title"
            ref={titleInput}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && canCancel && !submitting) {
                event.preventDefault();
                onCancel();
              }
            }}
            disabled={submitting}
            placeholder="My Garden"
          />
          <div className="form-actions">
            {canCancel ? (
              <button
                type="button"
                className="secondary-button"
                onClick={onCancel}
                disabled={submitting}
              >
                Cancel
              </button>
            ) : null}
            <button
              type="submit"
              disabled={submitting || title.trim().length === 0}
            >
              Create Garden
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

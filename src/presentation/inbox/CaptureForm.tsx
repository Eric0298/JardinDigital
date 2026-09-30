import { useEffect, useRef, useState, type FormEvent } from "react";

interface CaptureFormProps {
  readonly onCancel: () => void;
  readonly onCapture: (title: string, content: string) => Promise<boolean>;
}

export function CaptureForm({ onCancel, onCapture }: CaptureFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const titleInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    titleInput.current?.focus();
  }, []);

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
        className="garden-form-panel capture-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="capture-heading"
      >
        <p className="eyebrow">Capture</p>
        <h2 id="capture-heading">Save an idea</h2>
        <p>Capture it now. Choose where it belongs later.</p>
        <form
          onSubmit={submit}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !submitting) {
              event.preventDefault();
              onCancel();
            } else if (event.key === "Enter" && event.ctrlKey) {
              event.preventDefault();
              submit();
            }
          }}
        >
          <label htmlFor="capture-title">Title</label>
          <input
            id="capture-title"
            ref={titleInput}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={submitting}
            placeholder="Optional title"
          />
          <label htmlFor="capture-content">Content</label>
          <textarea
            id="capture-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={submitting}
            rows={7}
            placeholder="What do you want to remember?"
          />
          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                (title.trim().length === 0 && content.trim().length === 0)
              }
            >
              Save to Inbox
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

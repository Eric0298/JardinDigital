import { useEffect, useId, useState, type FormEvent } from "react";
import { useModalFocus } from "../useModalFocus";
import { Icon } from "./Icon";

export function RenameGardenDialog({ title, onSave, onCancel }: { readonly title: string; readonly onSave: (title: string) => Promise<boolean>; readonly onCancel: () => void }) {
  const [draft, setDraft] = useState(title);
  const [saving, setSaving] = useState(false);
  const headingId = useId();
  const inputId = useId();
  const modalRef = useModalFocus(true);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || saving) return;
      event.preventDefault();
      onCancel();
    };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [onCancel, saving]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || saving) return;
    setSaving(true);
    if (await onSave(draft)) onCancel();
    else setSaving(false);
  }
  return <div className="garden-form-backdrop"><section ref={modalRef} className="garden-form-panel" role="dialog" aria-modal="true" aria-labelledby={headingId} tabIndex={-1}>
    <h2 id={headingId}>Renombrar jardín</h2>
    <form onSubmit={(event) => void submit(event)}><label htmlFor={inputId}>Nombre</label><input id={inputId} value={draft} disabled={saving} onChange={(event) => setDraft(event.target.value)} autoComplete="off" />
      <div className="form-actions"><button type="button" className="secondary-button" disabled={saving} onClick={onCancel}>Cancelar</button><button type="submit" className="button--primary" disabled={saving || !draft.trim()}><Icon name="save" />{saving ? "Guardando…" : "Guardar"}</button></div>
    </form>
  </section></div>;
}

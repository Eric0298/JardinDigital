import { useRef, useState, type ChangeEvent } from "react";
import type { NativeOperations } from "../../application/nativeOperations";
import type {
  AppearanceSettings,
  CanvasBackground,
  SettingsPersistence,
  Theme,
} from "../../application/settings";
import { Icon } from "../shared/Icon";
import { useConfirmation } from "../shared/ConfirmationDialog";

interface SettingsPageProps {
  readonly appearance: AppearanceSettings;
  readonly persistence: SettingsPersistence;
  readonly nativeOperations: Pick<NativeOperations, "exportBackup" | "restoreBackup">;
  readonly onAppearanceChange: (value: AppearanceSettings) => void;
  readonly onRestored: () => Promise<void>;
}

type SavePicker = { createWritable(): Promise<{ write(content: string): Promise<void>; close(): Promise<void> }> };

async function saveBackup(json: string): Promise<"saved" | "download-started"> {
  const filename = `JardinDigital-copia-${new Date().toISOString().slice(0, 10)}.json`;
  const picker = (window as Window & {
    showSaveFilePicker?: (options: unknown) => Promise<SavePicker>;
  }).showSaveFilePicker;
  if (picker) {
    const handle = await picker.call(window, { suggestedName: filename, types: [{ description: "Copia de seguridad de JardinDigital", accept: { "application/json": [".json"] } }] });
    const writer = await handle.createWritable();
    await writer.write(json);
    await writer.close();
    return "saved";
  }
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "download-started";
}

export function SettingsPage({ appearance, persistence, nativeOperations, onAppearanceChange, onRestored }: SettingsPageProps) {
  const confirm = useConfirmation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function update(next: AppearanceSettings) {
    setBusy(true);
    setMessage("");
    try {
      await persistence.save(next);
      onAppearanceChange(next);
      setMessage("Apariencia guardada.");
    } catch {
      setMessage("No se pudo guardar la configuración de apariencia.");
    } finally {
      setBusy(false);
    }
  }

  async function exportData() {
    setBusy(true);
    setMessage("");
    try {
      const json = await nativeOperations.exportBackup();
      const result = await saveBackup(json);
      setMessage(result === "saved" ? "Copia de seguridad guardada." : "Descarga de la copia iniciada. Comprueba el archivo en Descargas.");
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") setMessage("No se pudo guardar la copia de seguridad. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function restoreData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!await confirm({
      title: "Restaurar copia de seguridad",
      description: "Se sustituirán todas las ideas, jardines, conexiones, pendientes, referencias a recursos y ajustes de apariencia actuales. Los archivos externos originales se conservan. Esta acción no se puede deshacer. Guarda antes una copia si la necesitas.",
      confirmLabel: "Restaurar y sustituir los datos",
      destructive: true,
    })) return;
    setBusy(true);
    setMessage("");
    let restored = false;
    try {
      const json = await file.text();
      await nativeOperations.restoreBackup(json);
      restored = true;
      await onRestored();
      setMessage("Copia restaurada. Se ha vuelto a cargar tu espacio de trabajo.");
    } catch {
      setMessage(restored
        ? "La copia se ha restaurado, pero no se pudo volver a cargar la aplicación. Ciérrala y ábrela de nuevo."
        : "No se pudo restaurar la copia. Tus datos actuales se han conservado.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="settings-page" aria-label="Ajustes">
    <header><p className="eyebrow">Tu espacio personal</p><h2>Ajustes</h2></header>
    <section className="settings-section" aria-labelledby="settings-appearance">
      <div><h3 id="settings-appearance">Apariencia</h3><p>Elige cómo prefieres ver tu espacio.</p></div>
      <label className="settings-choice" htmlFor="theme-choice"><span>Tema</span>
        <select id="theme-choice" value={appearance.theme} disabled={busy} onChange={(event) => void update({ ...appearance, theme: event.target.value as Theme })}>
          <option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Oscuro</option>
        </select>
      </label>
    </section>
    <section className="settings-section" aria-labelledby="settings-background">
      <div><h3 id="settings-background">Fondo del jardín</h3><p>Una referencia espacial discreta para tus ideas.</p></div>
      <label className="settings-choice" htmlFor="background-choice"><span>Estilo del fondo</span>
        <select id="background-choice" value={appearance.canvasBackground} disabled={busy} onChange={(event) => void update({ ...appearance, canvasBackground: event.target.value as CanvasBackground })}>
          <option value="plain">Liso</option><option value="dots">Puntos</option><option value="grid">Cuadrícula</option>
        </select>
      </label>
    </section>
    <section className="settings-section settings-section--backup" aria-labelledby="settings-backup">
      <div><h3 id="settings-backup">Datos y copias de seguridad</h3><p>Guarda tus ideas, jardines, conexiones, pendientes y preferencias.</p></div>
      <div className="settings-actions">
        <button type="button" className="button--primary" disabled={busy} onClick={() => void exportData()}><Icon name="save" />Guardar copia de seguridad</button>
        <button type="button" className="secondary-button" disabled={busy} onClick={() => fileInput.current?.click()}><Icon name="file" />Restaurar copia</button>
        <input ref={fileInput} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} onChange={(event) => void restoreData(event)} aria-label="Elegir una copia de seguridad de JardinDigital" />
      </div>
      <p className="settings-backup-note">Los documentos y vídeos siguen vinculados a sus archivos originales. La copia incluye sus referencias y enlaces, pero no los archivos. Consérvalos junto con tus copias.</p>
      <p className="settings-backup-note">Restaurar sustituye los datos actuales tras tu confirmación. Si un archivo se ha movido o eliminado, su recurso aparecerá como «Archivo no disponible».</p>
    </section>
    {busy ? <p className="settings-message" role="status">Procesando…</p> : null}
    {message ? <p className="settings-message" role="status">{message}</p> : null}
  </section>;
}

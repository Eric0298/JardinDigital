import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { captureNode } from "../../application/captureNode";
import type { InboxPersistence } from "../../application/inboxPersistence";
import { loadInbox } from "../../application/loadInbox";
import type { NodePersistence } from "../../application/nodePersistence";
import { persistNodeEdit } from "../../application/nodePersistence";
import {
  placeInboxNodeInCanvas,
  type PlaceInboxNodeDependencies,
} from "../../application/placeInboxNodeInCanvas";
import type { Canvas, CanvasId } from "../../domain/canvas";
import type { Node, NodeId } from "../../domain/node";
import { CaptureForm } from "./CaptureForm";
import { InboxDebugPanel } from "./InboxDebugPanel";
import { InboxList } from "./InboxList";
import { useModalFocus } from "../useModalFocus";
import { Icon } from "../shared/Icon";
import { useConfirmation } from "../shared/ConfirmationDialog";

interface InboxPageProps {
  readonly captureRequest: number;
  readonly dependencies: PlaceInboxNodeDependencies & {
    readonly inboxPersistence: InboxPersistence;
    readonly nodePersistence: NodePersistence;
  };
  readonly gardens: readonly Canvas[];
  readonly onCaptureRequestHandled: () => void;
  readonly onNewGarden: () => void;
  readonly onOpenIdea: (nodeId: NodeId) => void;
  readonly onStatusChange: (status: string) => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
}

interface EditDraft {
  readonly node: Node;
  readonly title: string;
  readonly content: string;
}

export function InboxPage({
  captureRequest,
  dependencies,
  gardens,
  onCaptureRequestHandled,
  onNewGarden,
  onOpenIdea,
  onStatusChange,
  onDirtyChange,
}: InboxPageProps) {
  const confirm = useConfirmation();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureDirty, setCaptureDirty] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [busyNodeId, setBusyNodeId] = useState<NodeId | null>(null);
  const [selectedGardens, setSelectedGardens] = useState<
    Record<string, string>
  >({});
  const editTitle = useRef<HTMLInputElement | null>(null);
  const editModalRef = useModalFocus(editDraft !== null);
  const editDirty = editDraft !== null && (editDraft.title !== editDraft.node.title || editDraft.content !== editDraft.node.content);
  const dirty = editDirty || (captureOpen && captureDirty);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => { onDirtyChange?.(false); }, [onDirtyChange]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    onStatusChange("Abriendo pendientes...");

    try {
      setNodes(await loadInbox(dependencies.inboxPersistence));
      onStatusChange("Pendientes disponibles.");
    } catch {
      setLoadFailed(true);
      onStatusChange("No se pudieron abrir los pendientes. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [dependencies.inboxPersistence, onStatusChange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (captureRequest > 0) {
      setEditDraft(null);
      setCaptureOpen(true);
      onCaptureRequestHandled();
    }
  }, [captureRequest, onCaptureRequestHandled]);

  useEffect(() => {
    editTitle.current?.focus();
  }, [editDraft?.node.id]);

  async function cancelEdit() {
    if (busyNodeId !== null) return;
    if (editDirty && !await confirm({ title: "Descartar cambios", description: "Los cambios de esta idea aún no están guardados. ¿Quieres descartarlos y cerrar?", confirmLabel: "Descartar cambios" })) return;
    setEditDraft(null);
  }

  async function submitCapture(title: string, content: string) {
    onStatusChange("Guardando nueva idea...");
    try {
      const captured = await captureNode(
        dependencies.inboxPersistence,
        title,
        content,
      );
      setNodes((current) =>
        [...current, captured].sort((left, right) => {
          const leftLabel = (left.title || left.content).toLowerCase();
          const rightLabel = (right.title || right.content).toLowerCase();

          if (leftLabel < rightLabel) return -1;
          if (leftLabel > rightLabel) return 1;
          return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
        }),
      );
      setLoadFailed(false);
      setCaptureOpen(false);
      onStatusChange("Idea guardada en pendientes.");
      return true;
    } catch {
      onStatusChange("No se pudo guardar la idea. Inténtalo de nuevo.");
      return false;
    }
  }

  function saveEdit(event?: FormEvent) {
    event?.preventDefault();
    if (editDraft === null || busyNodeId !== null) {
      return;
    }

    const draft = editDraft;
    setBusyNodeId(draft.node.id);
    onStatusChange("Guardando idea...");
    void persistNodeEdit(
      dependencies.nodePersistence,
      draft.node,
      draft.title,
      draft.content,
    )
      .then((edited) => {
        setNodes((current) =>
          current.map((node) => (node.id === edited.id ? edited : node)),
        );
        setEditDraft(null);
        onStatusChange("Idea actualizada.");
      })
      .catch(() => {
        onStatusChange("No se pudo actualizar la idea. Inténtalo de nuevo.");
        requestAnimationFrame(() => editTitle.current?.focus());
      })
      .finally(() => setBusyNodeId(null));
  }

  function place(node: Node) {
    if (busyNodeId !== null) {
      return;
    }

    const canvasId = (selectedGardens[node.id] ?? gardens[0]?.id) as
      | CanvasId
      | undefined;
    if (canvasId === undefined) {
      onStatusChange("No hay jardines disponibles.");
      return;
    }

    setBusyNodeId(node.id);
    onStatusChange("Añadiendo idea al jardín...");
    void placeInboxNodeInCanvas(dependencies, node.id, canvasId, { x: 0, y: 0 })
      .then((result) => {
        setNodes((current) =>
          current.filter((candidate) => candidate.id !== node.id),
        );
        onStatusChange(
          result.outcome === "already-placed"
            ? "La idea ya está en este jardín. Se ha quitado de pendientes."
            : "Idea añadida al jardín.",
        );
      })
      .catch(() => {
        onStatusChange("No se pudo añadir la idea al jardín. Inténtalo de nuevo.");
      })
      .finally(() => setBusyNodeId(null));
  }

  function remove(node: Node) {
    if (busyNodeId !== null) return;
    setBusyNodeId(node.id);
    void dependencies.inboxPersistence.remove(node.id)
      .then(() => {
        setNodes((current) => current.filter((candidate) => candidate.id !== node.id));
        onStatusChange("Idea quitada de pendientes. Sigue disponible en Todas las ideas.");
      })
      .catch(() => onStatusChange("No se pudo quitar la idea de pendientes."))
      .finally(() => setBusyNodeId(null));
  }

  return (
    <section className="inbox-page" aria-label="Pendientes">
      <header className="inbox-header">
        <div>
          <p className="eyebrow">Para más adelante</p>
          <h2>Pendientes</h2>
          <p>Ideas capturadas para revisar y colocar más adelante. Pueden estar ya en un jardín; quitarlas de pendientes conserva la idea.</p>
        </div>
        <button type="button" className="button--grow" onClick={() => setCaptureOpen(true)}>
          <Icon name="plus" />Nueva idea
        </button>
      </header>

      {gardens.length === 0 ? (
        <div className="inbox-garden-notice">
          <div>
            <strong>No hay jardines disponibles</strong>
            <p>Crea un jardín para añadir tus ideas pendientes.</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={onNewGarden}
          >
            <Icon name="plus" />Crear jardín
          </button>
        </div>
      ) : null}

      {loading ? <p className="inbox-loading">Abriendo pendientes...</p> : null}
      {!loading && loadFailed ? (
        <div className="inbox-empty">
          <h3>No se pudieron abrir tus pendientes.</h3>
          <p>Tus ideas siguen guardadas en este dispositivo. Inténtalo de nuevo.</p>
          <button type="button" onClick={() => void refresh()}>
            Reintentar
          </button>
        </div>
      ) : null}
      {!loading && !loadFailed && nodes.length === 0 ? (
        <div className="inbox-empty">
          <h3>No tienes ideas pendientes.</h3>
          <p>Guarda aquí una idea y elige su jardín después.</p>
          <button type="button" className="button--grow" onClick={() => setCaptureOpen(true)}>
            <Icon name="plus" />Nueva idea
          </button>
        </div>
      ) : null}
      {!loading && !loadFailed && nodes.length > 0 ? (
        <InboxList
          busyNodeId={busyNodeId}
          gardens={gardens}
          nodes={nodes}
          selectedGardens={selectedGardens}
          onEdit={(node) =>
            setEditDraft({ node, title: node.title, content: node.content })
          }
          onGardenChange={(nodeId, canvasId) =>
            setSelectedGardens((current) => ({
              ...current,
              [nodeId]: canvasId,
            }))
          }
          onPlace={place}
          onRemove={remove}
          onOpenIdea={onOpenIdea}
        />
      ) : null}

      {captureOpen ? (
        <CaptureForm
          onCancel={() => setCaptureOpen(false)}
          onCapture={submitCapture}
          onDirtyChange={setCaptureDirty}
        />
      ) : null}

      {editDraft !== null ? (
        <div className="garden-form-backdrop" role="presentation">
          <section
            ref={editModalRef}
            tabIndex={-1}
            className="garden-form-panel capture-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inbox-edit-heading"
          >
            <p className="eyebrow">Pendientes</p>
            <h2 id="inbox-edit-heading">Editar idea</h2>
            <form
              onSubmit={saveEdit}
              onKeyDown={(event) => {
                if (event.key === "Escape" && busyNodeId === null) {
                  event.preventDefault();
                  void cancelEdit();
                } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  saveEdit();
                }
              }}
            >
              <label htmlFor="inbox-edit-title">Título</label>
              <input
                id="inbox-edit-title"
                ref={editTitle}
                value={editDraft.title}
                onChange={(event) =>
                  setEditDraft({ ...editDraft, title: event.target.value })
                }
                disabled={busyNodeId !== null}
              />
              <label htmlFor="inbox-edit-content">Contenido</label>
              <textarea
                id="inbox-edit-content"
                value={editDraft.content}
                onChange={(event) =>
                  setEditDraft({ ...editDraft, content: event.target.value })
                }
                disabled={busyNodeId !== null}
                rows={8}
              />
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void cancelEdit()}
                  disabled={busyNodeId !== null}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="button--primary"
                  disabled={
                    busyNodeId !== null ||
                    (editDraft.title.trim().length === 0 &&
                      editDraft.content.trim().length === 0)
                  }
                >
                  <Icon name="save" />Guardar
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {import.meta.env.DEV && nodes.length > 0 ? (
        <InboxDebugPanel nodes={nodes} />
      ) : null}
    </section>
  );
}

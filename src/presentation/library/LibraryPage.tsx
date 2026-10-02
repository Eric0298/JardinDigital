import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  loadLibraryPage,
  type LibraryEntry,
  type LoadLibraryDependencies,
} from "../../application/loadLibrary";
import type { NodePersistence } from "../../application/nodePersistence";
import { persistNodeEdit } from "../../application/nodePersistence";
import {
  placeNodeInCanvas,
  type PlaceNodeInCanvasDependencies,
} from "../../application/placeNodeInCanvas";
import {
  removeNodeFromCanvas,
  type PlacementPersistence,
} from "../../application/placementPersistence";
import type { Canvas, CanvasId } from "../../domain/canvas";
import type { Node, NodeId } from "../../domain/node";
import type { PlacementId } from "../../domain/placement";
import type { NativeOperations } from "../../application/nativeOperations";
import { LibraryList } from "./LibraryList";
import { useModalFocus } from "../useModalFocus";
import { Icon } from "../shared/Icon";
import { useConfirmation } from "../shared/ConfirmationDialog";

interface LibraryPageProps {
  readonly dependencies: LoadLibraryDependencies &
    PlaceNodeInCanvasDependencies & {
      readonly nodePersistence: NodePersistence;
      readonly placementPersistence: PlacementPersistence;
      readonly nativeOperations: Pick<NativeOperations, "deleteKnowledge">;
    };
  readonly gardens: readonly Canvas[];
  readonly onNewGarden: () => void;
  readonly onOpenIdea: (nodeId: NodeId) => void;
  readonly onStatusChange: (status: string) => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
  readonly onBack?: () => void;
  readonly onDeleted?: (nodeId: NodeId) => void;
  readonly mode?: "library" | "search";
}

interface EditDraft {
  readonly node: Node;
  readonly title: string;
  readonly content: string;
}

export function LibraryPagination({ total, page, pageSize, busy, onPageChange }: { readonly total: number; readonly page: number; readonly pageSize: number; readonly busy: boolean; readonly onPageChange: (page: number) => void }) {
  return <nav className="library-pagination" aria-label="Paginación de ideas">
    <button type="button" className="secondary-button" disabled={busy || page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</button>
    <span aria-live="polite" aria-atomic="true">Página {page} de {Math.max(1, Math.ceil(total / pageSize))}</span>
    <button type="button" className="secondary-button" disabled={busy || page * pageSize >= total} onClick={() => onPageChange(page + 1)}>Siguiente</button>
  </nav>;
}

export function LibraryPage({
  dependencies,
  gardens,
  onNewGarden,
  onOpenIdea,
  onStatusChange,
  onDirtyChange,
  onBack,
  onDeleted,
  mode = "library",
}: LibraryPageProps) {
  const confirm = useConfirmation();
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(mode === "library");
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [requestedPage, setRequestedPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pageSize: 20 });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [selectedGardens, setSelectedGardens] = useState<
    Record<string, string>
  >({});
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const editTitle = useRef<HTMLInputElement | null>(null);
  const searchInput = useRef<HTMLInputElement | null>(null);
  const requestSequence = useRef(0);
  const mounted = useRef(false);
  const editModalRef = useModalFocus(editDraft !== null);
  const dirty = editDraft !== null && (editDraft.title !== editDraft.node.title || editDraft.content !== editDraft.node.content);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; requestSequence.current += 1; };
  }, []);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => { onDirtyChange?.(false); }, [onDirtyChange]);
  useEffect(() => { if (mode === "search") searchInput.current?.focus(); }, [mode]);

  const refresh = useCallback(async () => {
    if (!mounted.current) return;
    const request = ++requestSequence.current;
    const term = query.trim();
    if (mode === "search" && term.length === 0) {
      setEntries([]);
      setPagination({ total: 0, page: 1, pageSize: 20 });
      setLoading(false);
      setLoadFailed(false);
      return;
    }
    setLoading(true);
    setLoadFailed(false);

    try {
      const loaded = await loadLibraryPage(dependencies, { query: term, page: requestedPage, pageSize: 20 });
      if (mounted.current && request === requestSequence.current) {
        setEntries(loaded.items);
        setPagination({ total: loaded.total, page: loaded.page, pageSize: loaded.pageSize });
      }
    } catch {
      if (mounted.current && request === requestSequence.current) {
        setLoadFailed(true);
        onStatusChange(mode === "search" ? "No se pudo completar la búsqueda. Inténtalo de nuevo." : "No se pudieron abrir todas las ideas. Inténtalo de nuevo.");
      }
    } finally {
      if (mounted.current && request === requestSequence.current) setLoading(false);
    }
  }, [dependencies, onStatusChange, query, requestedPage, mode]);

  useEffect(() => {
    void refresh();
    return () => { requestSequence.current += 1; };
  }, [refresh]);

  useEffect(() => {
    editTitle.current?.focus();
  }, [editDraft?.node.id]);

  async function cancelEdit() {
    if (busyAction !== null) return;
    if (dirty && !await confirm({ title: "Descartar cambios", description: "Los cambios de esta idea aún no están guardados. ¿Quieres descartarlos y cerrar?", confirmLabel: "Descartar cambios" })) return;
    if (!mounted.current) return;
    setEditDraft(null);
  }

  function saveEdit(event?: FormEvent) {
    event?.preventDefault();
    if (editDraft === null || busyAction !== null) {
      return;
    }

    const draft = editDraft;
    setBusyAction(`edit:${draft.node.id}`);
    onStatusChange("Guardando idea...");
    void persistNodeEdit(
      dependencies.nodePersistence,
      draft.node,
      draft.title,
      draft.content,
    )
      .then(async () => {
        if (!mounted.current) return;
        setEditDraft(null);
        await refresh();
        if (mounted.current) onStatusChange("Idea actualizada.");
      })
      .catch(() => {
        if (!mounted.current) return;
        onStatusChange("No se pudo actualizar la idea. Inténtalo de nuevo.");
        requestAnimationFrame(() => { if (mounted.current) editTitle.current?.focus(); });
      })
      .finally(() => { if (mounted.current) setBusyAction(null); });
  }

  function place(node: Node) {
    if (busyAction !== null) {
      return;
    }

    const canvasId = (selectedGardens[node.id] ?? gardens[0]?.id) as
      | CanvasId
      | undefined;
    const garden = gardens.find((candidate) => candidate.id === canvasId);
    if (canvasId === undefined || garden === undefined) {
      onStatusChange("No hay jardines disponibles.");
      return;
    }

    setBusyAction(`place:${node.id}`);
    onStatusChange("Añadiendo idea al jardín...");
    void placeNodeInCanvas(dependencies, node.id, canvasId, { x: 0, y: 0 })
      .then((result) => {
        if (!mounted.current) return;
        if (result.outcome === "already-placed" || result.placement === null) {
          onStatusChange("La idea ya está en este jardín.");
          return;
        }

        const placement = result.placement;

        setEntries((current) =>
          current.map((entry) =>
            entry.node.id === node.id
              ? {
                  ...entry,
                  gardens: [...entry.gardens, { garden, placement }]
                    .sort((left, right) =>
                      left.garden.title.localeCompare(right.garden.title),
                    ),
                }
              : entry,
          ),
        );
        onStatusChange("Idea añadida al jardín.");
      })
      .catch(() => {
        if (!mounted.current) return;
        onStatusChange("No se pudo añadir la idea al jardín. Inténtalo de nuevo.");
      })
      .finally(() => { if (mounted.current) setBusyAction(null); });
  }

  function remove(placementId: PlacementId) {
    if (busyAction !== null) {
      return;
    }

    setBusyAction(`remove:${placementId}`);
    onStatusChange("Quitando idea del jardín...");
    void removeNodeFromCanvas(dependencies.placementPersistence, placementId)
      .then(() => {
        if (!mounted.current) return;
        setEntries((current) =>
          current.map((entry) => ({
            ...entry,
            gardens: entry.gardens.filter(
              (context) => context.placement.id !== placementId,
            ),
          })),
        );
        onStatusChange("Idea quitada del jardín.");
      })
      .catch(() => {
        if (!mounted.current) return;
        onStatusChange("No se pudo quitar la idea del jardín. Inténtalo de nuevo.");
      })
      .finally(() => { if (mounted.current) setBusyAction(null); });
  }

  async function deleteKnowledge(node: Node) {
    if (busyAction !== null) return;
    if (!await confirm({
      title: "Eliminar idea definitivamente",
      description: `Se eliminará «${node.title || node.content.slice(0, 60) || "Idea sin título"}» de pendientes y de todos los jardines, junto con sus conexiones y las referencias a sus recursos. Los archivos originales se conservan. Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar idea definitivamente",
      destructive: true,
    })) return;
    if (!mounted.current) return;
    setBusyAction(`delete:${node.id}`);
    void dependencies.nativeOperations.deleteKnowledge(node.id)
      .then(async () => {
        onDeleted?.(node.id);
        if (!mounted.current) return;
        setEntries((current) => current.filter((entry) => entry.node.id !== node.id));
        await refresh();
        if (mounted.current) onStatusChange("Idea eliminada definitivamente.");
      })
      .catch(() => { if (mounted.current) onStatusChange("No se pudo eliminar la idea. Inténtalo de nuevo."); })
      .finally(() => { if (mounted.current) setBusyAction(null); });
  }

  return (
    <section className={`library-page${mode === "search" ? " library-page--search" : ""}`} aria-label={mode === "search" ? "Buscar" : "Todas las ideas"} aria-busy={loading}
      onKeyDown={(event) => {
        if (mode === "search" && event.key === "Escape" && !event.defaultPrevented && editDraft === null && !document.querySelector('[aria-modal="true"]')) {
          event.preventDefault();
          onBack?.();
        }
      }}>
      <header className="library-header">
        <div>
          <p className="eyebrow">Tu conocimiento</p>
          <h2>{mode === "search" ? "Buscar" : "Todas las ideas"}</h2>
          <p>{mode === "search" ? "Encuentra una idea por su título o contenido." : "Cada idea tiene su lugar aquí, esté pendiente o en un jardín."}</p>
        </div>
        <div className="knowledge-search">
          <label className="sr-only" htmlFor={`${mode}-query`}>Buscar en títulos y contenido</label>
          <div>
            <input
              id={`${mode}-query`}
              ref={searchInput}
              type="search"
              value={query}
              onChange={(event) => {
                requestSequence.current += 1;
                setQuery(event.target.value);
                setRequestedPage(1);
                setPagination({ total: 0, page: 1, pageSize: 20 });
                setLoading(mode === "library" || event.target.value.trim().length > 0);
                setLoadFailed(false);
                if (mode === "search" && event.target.value.trim().length === 0) setEntries([]);
              }}
              disabled={busyAction !== null}
              placeholder={mode === "library" ? "Buscar entre todas las ideas…" : "Título o contenido de una idea"}
            />
            <Icon name="search" />
          </div>
        </div>
      </header>

      {gardens.length === 0 && !loading && entries.length > 0 ? (
        <div className="inbox-garden-notice">
          <div>
            <strong>No hay jardines disponibles</strong>
            <p>Crea un jardín para añadir una idea.</p>
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

      {loading ? <p className="library-loading">{mode === "search" ? "Buscando ideas..." : "Abriendo todas las ideas..."}</p> : null}
      {!loading && loadFailed ? (
        <div className="library-empty">
          <h3>{mode === "search" ? "No se pudo completar la búsqueda." : "No se pudieron abrir tus ideas."}</h3>
          <p>Tus ideas siguen guardadas en este dispositivo. Inténtalo de nuevo.</p>
          <button type="button" onClick={() => void refresh()}>
            Reintentar
          </button>
        </div>
      ) : null}
      {!loading && !loadFailed && entries.length === 0 ? (
        <div className="library-empty">
          <h3>{mode === "search" && query.trim() === ""
            ? "Escribe para buscar entre tus ideas."
            : query.trim() !== "" ? "No encontramos ideas que coincidan." : "Todavía no has creado ninguna idea."}</h3>
          {mode === "search" && query.trim() === "" ? null : <p>{query.trim() !== "" ? "Prueba con otro título o frase." : "Crea una idea pendiente o directamente en un jardín."}</p>}
        </div>
      ) : null}
      {!loading && !loadFailed && entries.length > 0 && (mode === "library" || query.trim() !== "") ? (
        <>
        <p className="library-result-count" role="status">{pagination.total} {pagination.total === 1 ? "idea" : "ideas"}</p>
        <LibraryList
          busyAction={busyAction}
          entries={entries}
          gardens={gardens}
          selectedGardens={selectedGardens}
          onEdit={(node) =>
            setEditDraft({ node, title: node.title, content: node.content })
          }
          onGardenChange={(nodeId: NodeId, canvasId: CanvasId) =>
            setSelectedGardens((current) => ({
              ...current,
              [nodeId]: canvasId,
            }))
          }
          onPlace={place}
          onRemove={remove}
          onDelete={(node) => void deleteKnowledge(node)}
          onOpenIdea={onOpenIdea}
        />
        </>
      ) : null}
      {!loadFailed && pagination.total > 0 && (mode === "library" || query.trim() !== "") ? <LibraryPagination {...pagination} busy={loading || busyAction !== null} onPageChange={(page) => {
        requestSequence.current += 1;
        setLoading(true);
        setRequestedPage(page);
      }} /> : null}

      {editDraft !== null ? (
        <div className="garden-form-backdrop" role="presentation">
          <section
            ref={editModalRef}
            tabIndex={-1}
            className="garden-form-panel capture-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="library-edit-heading"
          >
            <p className="eyebrow">Todas las ideas</p>
            <h2 id="library-edit-heading">Editar idea</h2>
            <form
              onSubmit={saveEdit}
              onKeyDown={(event) => {
                if (event.key === "Escape" && busyAction === null) {
                  event.preventDefault();
                  void cancelEdit();
                } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  saveEdit();
                }
              }}
            >
              <label htmlFor="library-edit-title">Título</label>
              <input
                id="library-edit-title"
                ref={editTitle}
                value={editDraft.title}
                onChange={(event) =>
                  setEditDraft({ ...editDraft, title: event.target.value })
                }
                disabled={busyAction !== null}
              />
              <label htmlFor="library-edit-content">Contenido</label>
              <textarea
                id="library-edit-content"
                value={editDraft.content}
                onChange={(event) =>
                  setEditDraft({ ...editDraft, content: event.target.value })
                }
                disabled={busyAction !== null}
                rows={8}
              />
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void cancelEdit()}
                  disabled={busyAction !== null}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="button--primary"
                  disabled={
                    busyAction !== null ||
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
    </section>
  );
}

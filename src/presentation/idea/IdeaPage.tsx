import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  connectIdeas,
  connectionForIdea,
  ideaLabel,
  loadIdeaPage,
  loadIdeaResourceAvailability,
  removeIdeaConnection,
  removeIdeaFromGarden,
  saveIdeaPage,
  type IdeaPageDependencies,
  type IdeaPageView,
  type ResourceAvailability,
} from "../../application/ideaPage";
import { addLinkedResource, openResource } from "../../application/resourceFiles";
import { addResource } from "../../application/resourcePersistence";
import type { Canvas, CanvasId } from "../../domain/canvas";
import type { EdgeId } from "../../domain/edge";
import type { NodeId } from "../../domain/node";
import type { PlacementId } from "../../domain/placement";
import type { Resource, ResourceKind } from "../../domain/resource";
import { useConfirmation } from "../shared/ConfirmationDialog";
import { Icon } from "../shared/Icon";

interface IdeaPageProps {
  readonly dependencies: IdeaPageDependencies;
  readonly nodeId: NodeId;
  readonly gardens: readonly Canvas[];
  readonly originGarden?: Canvas | null;
  readonly onBack: () => void;
  readonly onOpenIdea: (nodeId: NodeId) => void;
  readonly onStatusChange: (status: string) => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
  readonly onOpenGarden?: (canvasId: CanvasId) => void;
  readonly onRemovedFromGarden?: (canvasId: CanvasId) => void;
  readonly onDeleted?: () => void;
}

interface IdeaDraft {
  readonly title: string;
  readonly content: string;
}

interface UrlDraft {
  readonly kind: "video" | "link";
  readonly title: string;
  readonly url: string;
}

const RESOURCE_LABELS: Record<ResourceKind, string> = {
  document: "Documento",
  video: "Vídeo",
  link: "Enlace",
};

function resourceDetail(resource: Resource): string {
  if (resource.location === "url") {
    try { return new URL(resource.locator).hostname; } catch { return "Enlace web"; }
  }
  const pathParts = resource.locator.split(/[\\/]/);
  const filename = pathParts[pathParts.length - 1] ?? "";
  const extensionParts = filename.split(".");
  const extension = extensionParts.length > 1 ? extensionParts[extensionParts.length - 1]?.toLocaleUpperCase("es") : null;
  return extension ? `Archivo local · ${extension}` : "Archivo local";
}

interface IdeaResourceListProps {
  readonly resources: readonly Resource[];
  readonly availability: Readonly<Record<string, ResourceAvailability>>;
  readonly locked: boolean;
  readonly onOpen: (resource: Resource) => void;
  readonly onRemove: (resource: Resource) => void;
}

export function IdeaResourceList({ resources, availability, locked, onOpen, onRemove }: IdeaResourceListProps) {
  if (resources.length === 0) {
    return <p className="idea-empty">Añade documentos, vídeos o enlaces a esta idea.</p>;
  }
  return <div className="idea-resource-list">
    {resources.map((resource) => <article key={resource.id} className={`idea-resource-card idea-resource-card--${resource.kind}${availability[resource.id] === "missing" ? " idea-resource-card--unavailable" : ""}`}>
      <div className={`idea-resource-icon idea-resource-icon--${resource.kind}`}><Icon name={resource.kind} /></div>
      <div className="idea-resource-meta">
        <h4>{resource.title}</h4><p>{RESOURCE_LABELS[resource.kind]} · {resourceDetail(resource)}</p>
        {availability[resource.id] === "missing" ? <p className="idea-resource-unavailable" role="status">Archivo no disponible</p> : null}
        {availability[resource.id] === "unknown" ? <p className="idea-help">No se pudo comprobar el archivo.</p> : null}
      </div>
      <div className="idea-resource-actions">
        <button type="button" className="secondary-button" disabled={locked || availability[resource.id] === "missing"} onClick={() => onOpen(resource)} aria-label={`Abrir ${resource.title}`}><Icon name="open" />Abrir</button>
        <button type="button" className="secondary-button" disabled={locked} onClick={() => onRemove(resource)} aria-label={`Quitar ${resource.title} de la idea`}><Icon name="unlink" />Quitar</button>
      </div>
    </article>)}
  </div>;
}

export function IdeaPage({
  dependencies,
  nodeId,
  gardens,
  originGarden,
  onBack,
  onOpenIdea,
  onStatusChange,
  onDirtyChange,
  onOpenGarden,
  onRemovedFromGarden,
  onDeleted,
}: IdeaPageProps) {
  const confirm = useConfirmation();
  const [view, setView] = useState<IdeaPageView | null>(null);
  const [draft, setDraft] = useState<IdeaDraft>({ title: "", content: "" });
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadRevision, setLoadRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Record<string, ResourceAvailability>>({});
  const [urlDraft, setUrlDraft] = useState<UrlDraft | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectionQuery, setConnectionQuery] = useState("");
  const [selectedIdeaId, setSelectedIdeaId] = useState("");
  const [connectionDirection, setConnectionDirection] = useState<"outgoing" | "incoming">("outgoing");
  const requestSequence = useRef(0);
  const busy = useRef(false);
  const confirmingDeletion = useRef(false);
  const resourceList = view?.resources;
  const informationDirty = view !== null && (draft.title !== view.node.title || draft.content !== view.node.content);
  const dirty = informationDirty || (urlDraft !== null && (urlDraft.title !== "" || urlDraft.url !== "")) || (connecting && selectedIdeaId !== "");

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => { onDirtyChange?.(false); }, [onDirtyChange]);

  useEffect(() => {
    const request = ++requestSequence.current;
    setLoading(true);
    setLoadFailed(false);
    setError(null);
    setView(null);
    setDraft({ title: "", content: "" });
    setAvailability({});
    setUrlDraft(null);
    setConnecting(false);
    setSelectedIdeaId("");
    setConnectionQuery("");
    setConnectionDirection("outgoing");
    setBusyAction(null);
    busy.current = false;
    onStatusChange("Abriendo idea…");
    void loadIdeaPage(dependencies, nodeId)
      .then((loaded) => {
        if (request !== requestSequence.current) return;
        setView(loaded);
        if (loaded !== null) {
          setDraft({ title: loaded.node.title, content: loaded.node.content });
          onStatusChange("Idea preparada.");
        } else {
          onStatusChange("La idea ya no está disponible.");
        }
      })
      .catch(() => {
        if (request !== requestSequence.current) return;
        setLoadFailed(true);
        onStatusChange("No se pudo abrir la idea. Inténtalo de nuevo.");
      })
      .finally(() => { if (request === requestSequence.current) setLoading(false); });
    return () => { requestSequence.current += 1; };
  }, [dependencies, nodeId, onStatusChange, loadRevision]);

  useEffect(() => {
    if (resourceList === undefined) return;
    let cancelled = false;
    void loadIdeaResourceAvailability(dependencies.resourceFiles, resourceList).then((statuses) => {
      if (!cancelled) setAvailability(statuses);
    });
    return () => { cancelled = true; };
  }, [dependencies.resourceFiles, resourceList]);

  const reportError = useCallback((message: string) => {
    setError(message);
    onStatusChange(message);
  }, [onStatusChange]);

  async function runAction<T>(
    key: string,
    action: () => Promise<T>,
    apply: (result: T) => void,
    successMessage: string | ((result: T) => string),
    failureMessage: string | ((error: unknown) => string),
  ) {
    if (busy.current || view === null || loading) return;
    const request = requestSequence.current;
    busy.current = true;
    setBusyAction(key);
    setError(null);
    try {
      const result = await action();
      if (request !== requestSequence.current) return;
      apply(result);
      onStatusChange(typeof successMessage === "function" ? successMessage(result) : successMessage);
    } catch (failure: unknown) {
      if (request === requestSequence.current) reportError(typeof failureMessage === "function" ? failureMessage(failure) : failureMessage);
    } finally {
      if (request === requestSequence.current) {
        busy.current = false;
        setBusyAction(null);
      }
    }
  }

  function save(event?: FormEvent) {
    event?.preventDefault();
    if (draft.title.trim() === "" && draft.content.trim() === "") {
      reportError("Escribe un título o contenido para la idea.");
      return;
    }
    void runAction("save", () => saveIdeaPage(dependencies.nodePersistence, nodeId, draft.title, draft.content), (edited) => {
      setView((current) => current === null ? null : {
        ...current,
        node: edited,
        allIdeas: current.allIdeas.map((idea) => idea.id === edited.id ? edited : idea),
        connections: current.connections.map((connection) => connection.idea.id === edited.id
          ? { ...connection, idea: edited } : connection),
      });
      setDraft({ title: edited.title, content: edited.content });
    }, "Idea guardada.", "No se pudo guardar la idea. Tus cambios siguen aquí.");
  }

  function addLocal(kind: "document" | "video") {
    void runAction(`add:${kind}`, () => addLinkedResource(dependencies.resourcePersistence, dependencies.resourceFiles, nodeId, kind), (resource) => {
      if (resource !== null) {
        setView((current) => current === null ? null : { ...current, resources: [...current.resources, resource] });
        setUrlDraft(null);
      }
    }, (resource) => resource === null ? "Selección cancelada." : `${RESOURCE_LABELS[kind]} añadido a la idea.`,
    "No se pudo añadir el archivo. Comprueba que esté disponible e inténtalo de nuevo.");
  }

  function addUrl(event: FormEvent) {
    event.preventDefault();
    if (urlDraft === null) return;
    let url: URL;
    try {
      url = new URL(urlDraft.url.trim());
      if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname || url.username || url.password) throw new Error();
    } catch {
      reportError("Introduce una URL que empiece por http:// o https://.");
      return;
    }
    const resourceDraft = urlDraft;
    const title = resourceDraft.title.trim() || url.hostname;
    void runAction("add:url", () => addResource(dependencies.resourcePersistence, nodeId, resourceDraft.kind, title, url.href, "url"), (resource) => {
      setView((current) => current === null ? null : { ...current, resources: [...current.resources, resource] });
      setUrlDraft(null);
    }, "Enlace añadido a la idea.", "No se pudo guardar el enlace. Inténtalo de nuevo.");
  }

  function open(resource: Resource) {
    const request = requestSequence.current;
    void runAction(`open:${resource.id}`, async () => {
      try {
        await openResource(dependencies.resourceFiles, resource);
      } catch (failure: unknown) {
        if (resource.location === "local") {
          const status = await loadIdeaResourceAvailability(dependencies.resourceFiles, [resource]);
          if (request === requestSequence.current) setAvailability((current) => ({ ...current, ...status }));
        }
        throw failure;
      }
    }, () => undefined,
      resource.location === "local" ? "Archivo abierto." : "Enlace abierto en el navegador.",
      (failure) => failure instanceof Error && failure.message === "Archivo no disponible"
        ? "Archivo no disponible"
        : resource.location === "local" ? "No se pudo abrir el archivo. Comprueba que siga disponible." : "No se pudo abrir el enlace en el navegador.");
  }

  function removeResource(resource: Resource) {
    void runAction(`remove:${resource.id}`, () => dependencies.resourcePersistence.remove(resource.id), () => {
      setView((current) => current === null ? null : {
        ...current, resources: current.resources.filter((item) => item.id !== resource.id),
      });
    }, "Recurso quitado de la idea. El archivo original se conserva.", "No se pudo quitar el recurso de la idea.");
  }

  function addConnection(event: FormEvent) {
    event.preventDefault();
    const peer = view?.allIdeas.find((idea) => idea.id === selectedIdeaId);
    if (peer === undefined) {
      reportError("Selecciona una idea existente para conectar.");
      return;
    }
    const sourceId = connectionDirection === "outgoing" ? nodeId : peer.id;
    const targetId = connectionDirection === "outgoing" ? peer.id : nodeId;
    void runAction("connect", () => connectIdeas(dependencies, sourceId, targetId), (edge) => {
      setView((current) => current === null ? null : {
        ...current, connections: [...current.connections, connectionForIdea(edge, nodeId, current.allIdeas)],
      });
      setConnecting(false);
      setSelectedIdeaId("");
      setConnectionQuery("");
    }, "Conexión creada.", "No se pudo crear la conexión. Comprueba que ambas ideas sigan disponibles.");
  }

  function removeConnection(edgeId: EdgeId) {
    void runAction(`connection:${edgeId}`, () => removeIdeaConnection(dependencies, nodeId, edgeId), () => {
      setView((current) => current === null ? null : {
        ...current, connections: current.connections.filter((connection) => connection.edge.id !== edgeId),
      });
    }, "Conexión eliminada. Las ideas se conservan.", "No se pudo eliminar la conexión.");
  }

  function removeFromGarden(placementId: PlacementId) {
    void runAction(`garden:${placementId}`, () => removeIdeaFromGarden(dependencies.placementPersistence, nodeId, placementId), (placement) => {
      setView((current) => current === null ? null : {
        ...current, gardens: current.gardens.filter((context) => context.placement.id !== placement.id),
      });
      onRemovedFromGarden?.(placement.canvasId);
    }, "Idea quitada del jardín. Su contenido, recursos y conexiones se conservan.", "No se pudo quitar la idea del jardín.");
  }

  async function deleteIdea() {
    if (busy.current || view === null || confirmingDeletion.current) return;
    const request = requestSequence.current;
    confirmingDeletion.current = true;
    let accepted: boolean;
    try {
      accepted = await confirm({
        title: `Eliminar «${ideaLabel(view.node)}» definitivamente`,
        description: "Se eliminarán la idea, sus conexiones y sus referencias a recursos de pendientes y de todos los jardines. Los archivos originales se conservarán. Esta acción no se puede deshacer.",
        confirmLabel: "Eliminar idea definitivamente",
        destructive: true,
      });
    } finally {
      confirmingDeletion.current = false;
    }
    if (!accepted || request !== requestSequence.current) return;
    void runAction("delete", () => dependencies.nativeOperations.deleteKnowledge(nodeId), () => {
      onDirtyChange?.(false);
      if (onDeleted !== undefined) onDeleted(); else onBack();
    }, "Idea eliminada definitivamente. Los archivos originales se conservan.", "No se pudo eliminar la idea. Inténtalo de nuevo.");
  }

  const locked = loading || busyAction !== null;
  const normalizedConnectionQuery = connectionQuery.trim().toLocaleLowerCase("es");
  const matchingIdeas = connecting
    ? view?.allIdeas.filter((idea) => `${idea.title} ${idea.content}`.toLocaleLowerCase("es").includes(normalizedConnectionQuery)) ?? []
    : [];
  const availableGardens = new Map(gardens.map((garden) => [garden.id, garden]));

  return (
    <section className="idea-page" aria-label="Página de idea">
      <header className="idea-header">
        <button type="button" className="secondary-button" onClick={onBack} disabled={locked}>
          <Icon name="back" />{originGarden ? "Volver al jardín" : "Volver"}
        </button>
        <div className="idea-header__title">
          <p className="eyebrow">Idea</p>
          <h2>{view === null ? "Página de idea" : draft.title.trim() || draft.content.slice(0, 80) || "Idea sin título"}</h2>
          {view !== null ? <p className="idea-save-state">{dirty ? "Cambios sin guardar" : <><Icon name="check" />Guardado</>}</p> : null}
        </div>
        {view !== null ? <div className="idea-header__actions">
          <button type="button" className="button--primary" onClick={() => save()} disabled={locked || !informationDirty || (draft.title.trim() === "" && draft.content.trim() === "")}>
            <Icon name="save" />
            {busyAction === "save" ? "Guardando…" : "Guardar"}
          </button>
        </div> : null}
      </header>

      {loading ? <p className="idea-empty" role="status">Abriendo idea…</p> : null}
      {!loading && loadFailed ? <div className="idea-empty">
        <h3>No se pudo abrir la idea</h3><p>Inténtalo de nuevo. Tu conocimiento sigue guardado localmente.</p>
        <button type="button" onClick={() => setLoadRevision((current) => current + 1)}>Reintentar</button>
      </div> : null}
      {!loading && !loadFailed && view === null ? <div className="idea-empty">
        <h3>La idea ya no está disponible</h3><p>Vuelve a tus jardines o busca otra idea.</p>
      </div> : null}
      {error !== null ? <p className="idea-error" role="alert">{error}</p> : null}

      {view !== null && !loading ? <div className="idea-layout">
        <div className="idea-main">
        <section className="idea-section" aria-labelledby="idea-information-heading">
          <div className="idea-section__heading">
            <h3 id="idea-information-heading">Información</h3>
            {informationDirty ? <button type="button" className="secondary-button" disabled={locked} onClick={() => {
              setDraft({ title: view.node.title, content: view.node.content });
              setError(null);
            }}>Cancelar cambios</button> : null}
          </div>
          <form className="idea-info-form" onSubmit={save} onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); save(); }
          }}>
            <label htmlFor="idea-title">Título</label>
            <input id="idea-title" className="idea-editor-title" value={draft.title} placeholder="Título de la idea" disabled={locked} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
            <label htmlFor="idea-content">Contenido</label>
            <textarea id="idea-content" className="idea-editor-content" value={draft.content} placeholder="Desarrolla tu idea…" rows={12} disabled={locked} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} />
            <p className="idea-help">Ctrl/Cmd+Enter para guardar.</p>
          </form>
        </section>

        <section className="idea-section" aria-labelledby="idea-resources-heading">
          <div className="idea-section__heading"><h3 id="idea-resources-heading">Recursos</h3>
            <div className="idea-section__actions">
              <button type="button" className="secondary-button" disabled={locked} onClick={() => addLocal("document")}><Icon name="document" />Añadir documento</button>
              <button type="button" className="secondary-button" disabled={locked} onClick={() => { setError(null); setUrlDraft({ kind: "video", title: "", url: "" }); }}><Icon name="video" />Añadir vídeo</button>
              <button type="button" className="secondary-button" disabled={locked} onClick={() => { setError(null); setUrlDraft({ kind: "link", title: "", url: "" }); }}><Icon name="link" />Añadir enlace</button>
            </div>
          </div>
          <p className="idea-help">Los archivos siguen en su ubicación original.</p>
          {urlDraft !== null ? <form className="idea-url-form idea-inline-form" onSubmit={addUrl} noValidate>
            <h4>{urlDraft.kind === "video" ? "Añadir vídeo" : "Añadir enlace"}</h4>
            {urlDraft.kind === "video" ? <button type="button" className="secondary-button" disabled={locked} onClick={() => addLocal("video")}><Icon name="file" />Seleccionar vídeo local</button> : null}
            <label htmlFor="idea-resource-url">{urlDraft.kind === "video" ? "Enlace de vídeo" : "Dirección del enlace"}</label>
            <input id="idea-resource-url" autoFocus type="url" value={urlDraft.url} placeholder="https://…" disabled={locked} onChange={(event) => setUrlDraft((current) => current === null ? null : { ...current, url: event.target.value })} />
            <label htmlFor="idea-resource-name">Nombre (opcional)</label>
            <input id="idea-resource-name" value={urlDraft.title} placeholder="Nombre del recurso" disabled={locked} onChange={(event) => setUrlDraft((current) => current === null ? null : { ...current, title: event.target.value })} />
            <div className="form-actions">
              <button type="button" className="secondary-button" disabled={locked} onClick={() => setUrlDraft(null)}>Cancelar</button>
              <button type="submit" className="button--primary" disabled={locked || urlDraft.url.trim() === ""}><Icon name="plus" />{urlDraft.kind === "video" ? "Añadir vídeo" : "Añadir enlace"}</button>
            </div>
          </form> : null}
          <IdeaResourceList resources={view.resources} availability={availability} locked={locked} onOpen={open} onRemove={removeResource} />
        </section>

        <section className="idea-section" aria-labelledby="idea-connections-heading">
          <div className="idea-section__heading"><h3 id="idea-connections-heading">Ideas conectadas</h3>
            <button type="button" className="secondary-button" disabled={locked} onClick={() => { setError(null); setConnecting(true); }}><Icon name="connect" />Conectar con otra idea</button>
          </div>
          {connecting ? <form className="idea-connection-form idea-inline-form" onSubmit={addConnection}>
            <label htmlFor="idea-connection-search">Buscar una idea</label>
            <input id="idea-connection-search" autoFocus type="search" value={connectionQuery} placeholder="Buscar por título o contenido" disabled={locked} onChange={(event) => { setConnectionQuery(event.target.value); setSelectedIdeaId(""); }} />
            <label htmlFor="idea-connection-select">Idea existente</label>
            <select id="idea-connection-select" value={selectedIdeaId} disabled={locked} onChange={(event) => setSelectedIdeaId(event.target.value)}>
              <option value="">Selecciona una idea</option>
              {matchingIdeas.map((idea) => <option key={idea.id} value={idea.id}>{ideaLabel(idea)}{idea.id === nodeId ? " (esta idea)" : ""}</option>)}
            </select>
            {matchingIdeas.length === 0 ? <p className="idea-help">No hay ideas que coincidan con esta búsqueda.</p> : null}
            <label htmlFor="idea-connection-direction">Dirección</label>
            <select id="idea-connection-direction" value={connectionDirection} disabled={locked} onChange={(event) => setConnectionDirection(event.target.value as "incoming" | "outgoing")}>
              <option value="outgoing">Esta idea → idea seleccionada</option><option value="incoming">Idea seleccionada → esta idea</option>
            </select>
            <div className="form-actions">
              <button type="button" className="secondary-button" disabled={locked} onClick={() => { setConnecting(false); setSelectedIdeaId(""); setConnectionQuery(""); }}>Cancelar</button>
              <button type="submit" className="button--primary" disabled={locked || selectedIdeaId === ""}><Icon name="connect" />Crear conexión</button>
            </div>
          </form> : null}
          {view.connections.length === 0 ? <p className="idea-empty">Conecta esta idea con otras de tu jardín digital.</p> : <ul className="idea-connection-list">
            {view.connections.map((connection) => <li key={connection.edge.id} className="idea-connection-card">
              <div><h4>{ideaLabel(connection.idea)}</h4><span className="idea-connection-direction">{connection.direction === "self" ? "Conexión consigo misma" : connection.direction === "outgoing" ? "Sale hacia →" : "← Llega desde"}</span></div>
              <div className="idea-section__actions">
                <button type="button" className="secondary-button" disabled={locked} onClick={() => onOpenIdea(connection.idea.id)} aria-label={`Abrir idea ${ideaLabel(connection.idea)}`}><Icon name="open" />Abrir</button>
                <button type="button" className="secondary-button" disabled={locked} onClick={() => removeConnection(connection.edge.id)} aria-label={`Quitar conexión con ${ideaLabel(connection.idea)}`}><Icon name="unlink" />Quitar conexión</button>
              </div>
            </li>)}
          </ul>}
        </section>
        </div>
        <aside className="idea-context" aria-label="Contexto de la idea">
        <section className="idea-section" aria-labelledby="idea-gardens-heading">
          <div className="idea-section__heading"><h3 id="idea-gardens-heading"><Icon name="garden" />Jardines</h3></div>
          {view.inInbox ? <p className="idea-help">Esta idea también está en pendientes.</p> : null}
          {view.gardens.length === 0 ? <p className="idea-empty">Esta idea no está colocada en ningún jardín. Puedes recuperarla desde Todas las ideas.</p> : <ul className="idea-garden-list">
            {view.gardens.map(({ garden, placement }) => <li key={placement.id} className="idea-garden-card">
              <h4>{availableGardens.get(garden.id)?.title ?? garden.title}</h4>
              {garden.id === originGarden?.id ? <p className="idea-help">Jardín de origen</p> : null}
              <div className="idea-section__actions">
                {onOpenGarden ? <button type="button" className="secondary-button" disabled={locked} onClick={() => onOpenGarden(garden.id)} aria-label={`Abrir jardín ${availableGardens.get(garden.id)?.title ?? garden.title}`}><Icon name="open" />Abrir jardín</button> : null}
                <button type="button" className="secondary-button" disabled={locked} onClick={() => removeFromGarden(placement.id)} aria-label={`Quitar del jardín ${availableGardens.get(garden.id)?.title ?? garden.title}`}><Icon name="unlink" />Quitar del jardín</button>
              </div>
            </li>)}
          </ul>}
        </section>

        <section className="idea-section idea-danger-zone" aria-labelledby="idea-actions-heading">
          <h3 id="idea-actions-heading">Acciones</h3>
          <p>Eliminar la idea afecta a todos sus jardines y conexiones.</p>
          <button type="button" className="danger-button" disabled={locked} onClick={() => { void deleteIdea(); }}><Icon name="trash" />Eliminar idea definitivamente</button>
        </section>
        {import.meta.env.DEV ? <details className="technical-details"><summary>Detalles de desarrollo</summary><p>ID de idea: <code>{view.node.id}</code></p></details> : null}
        </aside>
      </div> : null}
    </section>
  );
}

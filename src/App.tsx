import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CanvasPersistence } from "./application/canvasPersistence";
import type { GardenSummaryQuery } from "./application/gardenSummary";
import type { EdgePersistence } from "./application/edgePersistence";
import type { InboxPersistence } from "./application/inboxPersistence";
import type { NodePersistence } from "./application/nodePersistence";
import type { PlacementPersistence } from "./application/placementPersistence";
import type { NativeOperations } from "./application/nativeOperations";
import type { ResourcePersistence } from "./application/resourcePersistence";
import type { NativeResourceFiles } from "./application/resourceFiles";
import { defaultAppearance, type AppearanceSettings, type SettingsPersistence } from "./application/settings";
import { createGarden, loadGardenStartup, renameGarden as persistGardenRename } from "./application/gardenStartup";
import type { Canvas, CanvasId } from "./domain/canvas";
import type { NodeId } from "./domain/node";
import { HomePage } from "./presentation/home/HomePage";
import { CreateGardenForm } from "./presentation/garden/CreateGardenForm";
import { GardenPage } from "./presentation/garden/GardenPage";
import { IdeaPage } from "./presentation/idea/IdeaPage";
import { InboxPage } from "./presentation/inbox/InboxPage";
import { LibraryPage } from "./presentation/library/LibraryPage";
import { ProductShell, type NavigationSurface, type ProductSurface } from "./presentation/shell/ProductShell";
import { SettingsPage } from "./presentation/settings/SettingsPage";
import { ConfirmationProvider, useConfirmation } from "./presentation/shared/ConfirmationDialog";
import { RenameGardenDialog } from "./presentation/shared/RenameGardenDialog";
import "@xyflow/react/dist/style.css";
import "./App.css";

interface AppProps {
  readonly gardenSummaryQuery: GardenSummaryQuery;
  readonly canvasPersistence: CanvasPersistence;
  readonly edgePersistence: EdgePersistence;
  readonly inboxPersistence: InboxPersistence;
  readonly nodePersistence: NodePersistence;
  readonly placementPersistence: PlacementPersistence;
  readonly nativeOperations: NativeOperations;
  readonly settingsPersistence: SettingsPersistence;
  readonly resourcePersistence: ResourcePersistence;
  readonly resourceFiles: NativeResourceFiles;
}

interface OpenedIdea {
  readonly nodeId: NodeId;
  readonly origin: NavigationSurface;
  readonly garden: Canvas | null;
}

interface WorkspaceLocation {
  readonly surface: ProductSurface;
  readonly garden: Canvas | null;
  readonly idea: OpenedIdea | null;
}

function Workspace({ gardenSummaryQuery, canvasPersistence, edgePersistence, inboxPersistence, nodePersistence, placementPersistence, nativeOperations, settingsPersistence, resourcePersistence, resourceFiles }: AppProps) {
  const confirm = useConfirmation();
  const [startupState, setStartupState] = useState<"loading" | "ready" | "error">("loading");
  const [gardens, setGardens] = useState<Canvas[]>([]);
  const [gardenGrowthRevision, setGardenGrowthRevision] = useState(0);
  const [activeGarden, setActiveGarden] = useState<Canvas | null>(null);
  const [creatingGarden, setCreatingGarden] = useState(false);
  const [renamingGarden, setRenamingGarden] = useState<Canvas | null>(null);
  const [activeSurface, setActiveSurface] = useState<ProductSurface>("home");
  const [appearance, setAppearance] = useState<AppearanceSettings>(defaultAppearance);
  const [captureRequest, setCaptureRequest] = useState(0);
  const [gardenCreateRequest, setGardenCreateRequest] = useState(0);
  const [openedIdea, setOpenedIdea] = useState<OpenedIdea | null>(null);
  const searchOrigin = useRef<{ surface: ProductSurface; idea: typeof openedIdea }>({ surface: "home", idea: null });
  const [status, setStatus] = useState("Abriendo tus jardines…");
  const dirty = useRef(false);
  const navigationPending = useRef(false);
  const navigationRevision = useRef(0);
  const workspaceReady = useRef(false);
  const deletingGardens = useRef(new Set<CanvasId>());
  const currentGardens = useRef(gardens);
  const location = useRef<WorkspaceLocation>({ surface: activeSurface, garden: activeGarden, idea: openedIdea });
  currentGardens.current = gardens;
  location.current = { surface: activeSurface, garden: activeGarden, idea: openedIdea };
  workspaceReady.current = startupState === "ready";
  const updateDirty = useCallback((value: boolean) => { dirty.current = value; }, []);
  const updateStatus = useCallback((value: string) => { setStatus(value); }, []);

  const invalidateSearchOriginForIdea = useCallback((nodeId: NodeId) => {
    const previous = searchOrigin.current.idea;
    if (previous?.nodeId !== nodeId) return;
    const surface = previous.origin === "search" || (previous.origin === "garden" && location.current.garden === null)
      ? "home" : previous.origin;
    searchOrigin.current = { surface, idea: null };
  }, []);
  const dependencies = useMemo(() => {
    // Successful writes can finish after their screen unmounts. Refresh the
    // derived Home summary without reviving that screen's queries or status.
    const invalidateGrowth = () => setGardenGrowthRevision((current) => current + 1);
    const growthEdges: EdgePersistence = {
      ...edgePersistence,
      async save(edge) { await edgePersistence.save(edge); invalidateGrowth(); },
      async delete(id) { await edgePersistence.delete(id); invalidateGrowth(); },
    };
    const growthPlacements: PlacementPersistence = {
      ...placementPersistence,
      async place(placement) {
        const outcome = await placementPersistence.place(placement);
        if (outcome === "placed") invalidateGrowth();
        return outcome;
      },
      async delete(id) { await placementPersistence.delete(id); invalidateGrowth(); },
    };
    const growthInbox: InboxPersistence = {
      ...inboxPersistence,
      async place(placement) {
        const outcome = await inboxPersistence.place(placement);
        if (outcome === "placed") invalidateGrowth();
        return outcome;
      },
    };
    const growthResources: ResourcePersistence = {
      ...resourcePersistence,
      async save(resource) { await resourcePersistence.save(resource); invalidateGrowth(); },
      async remove(id) { await resourcePersistence.remove(id); invalidateGrowth(); },
    };
    const growthOperations: NativeOperations = {
      ...nativeOperations,
      async createNodeInGarden(node, placement) { await nativeOperations.createNodeInGarden(node, placement); invalidateGrowth(); },
      async deleteKnowledge(id) { await nativeOperations.deleteKnowledge(id); invalidateGrowth(); },
    };
    return { canvasPersistence, edgePersistence: growthEdges, inboxPersistence: growthInbox, nodePersistence,
      placementPersistence: growthPlacements, nativeOperations: growthOperations,
      resourcePersistence: growthResources, resourceFiles };
  }, [canvasPersistence, edgePersistence, inboxPersistence, nodePersistence, placementPersistence, nativeOperations, resourcePersistence, resourceFiles]);

  const replaceLocation = useCallback((next: WorkspaceLocation) => {
    location.current = next;
    setActiveSurface(next.surface);
    setActiveGarden(next.garden);
    setOpenedIdea(next.idea);
  }, []);

  const navigateSafely = useCallback(async (action: () => boolean | void) => {
    if (!workspaceReady.current || navigationPending.current || document.querySelector('[aria-modal="true"]') !== null) return false;
    const revision = navigationRevision.current;
    navigationPending.current = true;
    try {
      if (dirty.current && !await confirm({
        title: "Descartar cambios",
        description: "Hay cambios sin guardar. Se descartarán si continúas.",
        confirmLabel: "Descartar y continuar",
      })) return false;
      if (revision !== navigationRevision.current || action() === false) return false;
      navigationRevision.current += 1;
      dirty.current = false;
      return true;
    } finally {
      navigationPending.current = false;
    }
  }, [confirm]);

  const navigate = useCallback((surface: NavigationSurface) => {
    if (location.current.surface === surface) return;
    void navigateSafely(() => {
      const current = location.current;
      if (surface === "search") searchOrigin.current = { surface: current.surface, idea: current.idea };
      replaceLocation({ ...current, surface, idea: null });
    });
  }, [navigateSafely, replaceLocation]);

  const returnFromSearch = useCallback(() => {
    void navigateSafely(() => {
      const origin = searchOrigin.current;
      const current = location.current;
      const surface = (origin.surface === "garden" && current.garden === null)
        || (origin.surface === "idea" && origin.idea === null) ? "home" : origin.surface;
      replaceLocation({ ...current, surface, idea: surface === "idea" ? origin.idea : null });
    });
  }, [navigateSafely, replaceLocation]);

  const openStartup = useCallback(async () => {
    const revision = ++navigationRevision.current;
    workspaceReady.current = false;
    searchOrigin.current = { surface: "home", idea: null };
    dirty.current = false;
    setStartupState("loading");
    setStatus("Abriendo tus jardines…");
    try {
      const [startup, savedAppearance] = await Promise.all([loadGardenStartup(canvasPersistence), settingsPersistence.load()]);
      if (revision !== navigationRevision.current) return;
      setGardens(startup.gardens);
      setAppearance(savedAppearance);
      replaceLocation({ surface: "home", garden: null, idea: null });
      dirty.current = false;
      workspaceReady.current = true;
      setStartupState("ready");
      setStatus(startup.gardens.length === 0 ? "Crea tu primer jardín." : "Tus jardines están listos.");
    } catch {
      if (revision !== navigationRevision.current) return;
      setStartupState("error");
      setStatus("No se pudieron abrir los datos locales. Vuelve a intentarlo.");
    }
  }, [canvasPersistence, settingsPersistence, replaceLocation]);

  useEffect(() => { void openStartup(); }, [openStartup]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { document.documentElement.dataset.theme = appearance.theme === "system" ? (media.matches ? "dark" : "light") : appearance.theme; };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [appearance.theme]);
  useEffect(() => {
    const handleWorkspaceKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented && location.current.surface === "search"
        && document.querySelector('[aria-modal="true"], .action-menu[open]') === null) {
        event.preventDefault();
        returnFromSearch();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (document.querySelector('[aria-modal="true"]') !== null) return;
        if (location.current.surface === "search") document.getElementById("search-query")?.focus();
        else navigate("search");
      }
    };
    window.addEventListener("keydown", handleWorkspaceKeys);
    return () => window.removeEventListener("keydown", handleWorkspaceKeys);
  }, [navigate, returnFromSearch]);

  function selectGarden(id: CanvasId) {
    if (location.current.surface === "garden" && location.current.garden?.id === id) return;
    if (deletingGardens.current.has(id)) return;
    void navigateSafely(() => {
      const selected = currentGardens.current.find((garden) => garden.id === id);
      if (selected === undefined || deletingGardens.current.has(id)) return false;
      replaceLocation({ surface: "garden", garden: selected, idea: null });
    });
  }

  function openIdea(nodeId: NodeId) {
    if (location.current.surface === "idea" && location.current.idea?.nodeId === nodeId) return;
    void navigateSafely(() => {
      const current = location.current;
      const idea: OpenedIdea = {
        nodeId,
        origin: current.idea?.origin ?? (current.surface === "idea" ? "home" : current.surface),
        garden: current.idea?.garden ?? (current.surface === "garden" ? current.garden : null),
      };
      replaceLocation({ ...current, surface: "idea", idea });
    });
  }

  function returnFromIdea() {
    void navigateSafely(() => {
      const current = location.current;
      const origin = current.idea?.origin ?? "home";
      replaceLocation({ ...current, surface: origin === "garden" && current.garden === null ? "home" : origin, idea: null });
    });
  }

  function onIdeaDeleted(nodeId: NodeId) {
    invalidateSearchOriginForIdea(nodeId);
    if (location.current.idea?.nodeId !== nodeId) return;
    dirty.current = false;
    returnFromIdea();
  }

  async function submitGarden(title: string) {
    setStatus("Creando jardín…");
    try {
      const created = await createGarden(canvasPersistence, title);
      const refreshed = await canvasPersistence.list();
      setGardens(refreshed);
      navigationRevision.current += 1;
      replaceLocation({ surface: "garden", garden: refreshed.find((garden) => garden.id === created.id) ?? created, idea: null });
      setCreatingGarden(false);
      setStatus("Jardín creado.");
      return true;
    } catch {
      setStatus("No se pudo crear el jardín. Escribe un nombre y vuelve a intentarlo.");
      return false;
    }
  }

  async function saveGardenRename(title: string) {
    if (renamingGarden === null) return false;
    try {
      const renamed = await persistGardenRename(canvasPersistence, renamingGarden, title);
      setGardens((current) => current.map((item) => item.id === renamed.id ? renamed : item));
      setActiveGarden((current) => current?.id === renamed.id ? renamed : current);
      setStatus("Jardín renombrado.");
      return true;
    } catch { setStatus("No se pudo renombrar el jardín. Escribe un nombre y vuelve a intentarlo."); return false; }
  }

  async function deleteGarden(garden: Canvas) {
    if (deletingGardens.current.has(garden.id)) return;
    deletingGardens.current.add(garden.id);
    try {
      if (!await confirm({ title: `Eliminar «${garden.title}»`, description: "Se quitarán este jardín y sus colocaciones. Las ideas, sus conexiones, los pendientes y los recursos seguirán disponibles en Todas las ideas.", confirmLabel: "Eliminar jardín", destructive: true })) return;
      setStatus("Eliminando jardín…");
      await nativeOperations.deleteGarden(garden.id);
      setGardens((current) => current.filter((item) => item.id !== garden.id));
      currentGardens.current = currentGardens.current.filter((item) => item.id !== garden.id);
      const current = location.current;
      const idea = current.idea?.garden?.id === garden.id
        ? { ...current.idea, garden: null, origin: current.idea.origin === "garden" ? "home" as const : current.idea.origin }
        : current.idea;
      if (current.garden?.id === garden.id || idea !== current.idea) {
        replaceLocation({
          surface: current.surface === "garden" && current.garden?.id === garden.id ? "home" : current.surface,
          garden: current.garden?.id === garden.id ? null : current.garden,
          idea,
        });
      }
      const previous = searchOrigin.current;
      if (previous.idea?.garden?.id === garden.id) {
        searchOrigin.current = {
          ...previous,
          idea: { ...previous.idea, garden: null, origin: previous.idea.origin === "garden" ? "home" : previous.idea.origin },
        };
      }
      setStatus("Jardín eliminado. Sus ideas siguen disponibles en Todas las ideas.");
    } catch { setStatus("No se pudo eliminar el jardín. No se ha quitado nada."); }
    finally { deletingGardens.current.delete(garden.id); }
  }

  const requestNewGarden = () => { void navigateSafely(() => setCreatingGarden(true)); };

  function requestCapture() {
    if (creatingGarden || renamingGarden !== null) return;
    if (location.current.surface === "garden") {
      setGardenCreateRequest((current) => current + 1);
      return;
    }
    void navigateSafely(() => {
      replaceLocation({ ...location.current, surface: "inbox", idea: null });
      setCaptureRequest((current) => current + 1);
    });
  }

  return (
    <ProductShell activeSurface={activeSurface} status={status}
      onSurfaceChange={navigate} onCapture={requestCapture}>
      {startupState === "loading" ? <section className="startup-state" aria-live="polite"><p className="eyebrow">Inicio</p><h2>Abriendo tu espacio…</h2></section> : null}
      {startupState === "error" ? <section className="startup-state"><p className="eyebrow">Inicio</p><h2>No se pudieron abrir tus jardines</h2><p>Tus ideas siguen guardadas en local. Vuelve a intentarlo.</p><button type="button" onClick={() => void openStartup()}>Reintentar</button></section> : null}
      {startupState === "ready" && activeSurface === "home" ? <HomePage gardens={gardens} summaryQuery={gardenSummaryQuery} growthRevision={gardenGrowthRevision} onOpen={selectGarden} onNew={requestNewGarden} onRename={setRenamingGarden} onDelete={(garden) => void deleteGarden(garden)} /> : null}
      {startupState === "ready" && activeSurface === "garden" && activeGarden !== null ? (
        <GardenPage key={activeGarden.id} activeGarden={activeGarden} dependencies={dependencies} gardens={gardens}
          onGardenChange={selectGarden} onNewGarden={requestNewGarden}
          onRenameGarden={() => setRenamingGarden(activeGarden)} onDeleteGarden={() => void deleteGarden(activeGarden)}
          canvasBackground={appearance.canvasBackground} onStatusChange={updateStatus} onOpenIdea={openIdea}
          onDeleted={onIdeaDeleted}
          onHome={() => navigate("home")} onDirtyChange={updateDirty}
          creationRequest={gardenCreateRequest} onCreationRequestHandled={() => setGardenCreateRequest(0)} />
      ) : null}
      {startupState === "ready" && activeSurface === "idea" && openedIdea !== null ? (
        <IdeaPage key={openedIdea.nodeId} nodeId={openedIdea.nodeId} dependencies={dependencies} gardens={gardens}
          originGarden={openedIdea.garden} onBack={returnFromIdea} onOpenIdea={openIdea} onOpenGarden={selectGarden}
          onStatusChange={updateStatus} onDirtyChange={updateDirty} onDeleted={() => onIdeaDeleted(openedIdea.nodeId)} />
      ) : null}
      {startupState === "ready" && activeSurface === "inbox" ? <InboxPage captureRequest={captureRequest} dependencies={dependencies} gardens={gardens} onCaptureRequestHandled={() => setCaptureRequest(0)} onNewGarden={requestNewGarden} onStatusChange={updateStatus} onOpenIdea={openIdea} onDirtyChange={updateDirty} /> : null}
      {startupState === "ready" && (activeSurface === "library" || activeSurface === "search") ? <LibraryPage key={activeSurface} mode={activeSurface === "search" ? "search" : "library"} dependencies={dependencies} gardens={gardens} onNewGarden={requestNewGarden} onStatusChange={updateStatus} onOpenIdea={openIdea} onDirtyChange={updateDirty} onBack={returnFromSearch} onDeleted={onIdeaDeleted} /> : null}
      {startupState === "ready" && activeSurface === "settings" ? <SettingsPage appearance={appearance} persistence={settingsPersistence} nativeOperations={nativeOperations} onAppearanceChange={setAppearance} onRestored={openStartup} /> : null}
      {creatingGarden ? <CreateGardenForm canCancel onCancel={() => setCreatingGarden(false)} onCreate={submitGarden} /> : null}
      {renamingGarden ? <RenameGardenDialog title={renamingGarden.title} onSave={saveGardenRename} onCancel={() => setRenamingGarden(null)} /> : null}
    </ProductShell>
  );
}

function App(props: AppProps) {
  return <ConfirmationProvider><Workspace {...props} /></ConfirmationProvider>;
}

export default App;

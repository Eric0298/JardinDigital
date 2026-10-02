import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  applyNodeChanges,
  type NodeChange,
  type NodeMouseHandler,
  type OnConnect,
  type OnNodeDrag,
} from "@xyflow/react";
import { createEdgeInCanvas } from "../../application/createEdgeInCanvas";
import { createNodeInCanvas } from "../../application/createNodeInCanvas";
import {
  loadCanvasView,
  type CanvasView,
  type CanvasViewDependencies,
} from "../../application/canvasView";
import { deleteEdge } from "../../application/edgePersistence";
import { persistNodeEdit } from "../../application/nodePersistence";
import { moveNodeInCanvas, removeNodeFromCanvas, type PlacementPersistence } from "../../application/placementPersistence";
import type { Canvas, CanvasId } from "../../domain/canvas";
import type { EdgeId } from "../../domain/edge";
import type { PlacementId, Position } from "../../domain/placement";
import {
  CanvasSurface,
  type CanvasSurfaceHandle,
} from "../canvas/CanvasSurface";
import { DevDebugPanel } from "../canvas/DevDebugPanel";
import {
  NodeEditor,
  type NodeEditDraft,
} from "../canvas/NodeEditor";
import {
  QuickNodeCreator,
  type QuickNodeDraft,
} from "../canvas/QuickNodeCreator";
import {
  toReactFlowEdges,
  toReactFlowNodes,
  type CanvasFlowNode,
} from "../canvas/reactFlowAdapter";
import { GardenToolbar } from "./GardenToolbar";
import { GardenEnvironment } from "./GardenEnvironment";
import { deriveGardenGrowth } from "./gardenGrowth";
import type { CreateNodeInCanvasDependencies } from "../../application/createNodeInCanvas";
import type { CanvasBackground } from "../../application/settings";
import type { ResourcePersistence } from "../../application/resourcePersistence";
import type { Resource } from "../../domain/resource";
import type { Node, NodeId } from "../../domain/node";
import type { NativeOperations } from "../../application/nativeOperations";
import { useConfirmation, type ConfirmationOptions } from "../shared/ConfirmationDialog";

export async function deleteGardenIdeaWithConfirmation(
  node: Node,
  operations: Pick<NativeOperations, "deleteKnowledge">,
  confirm: (options: ConfirmationOptions) => Promise<boolean>,
  isCurrent: () => boolean = () => true,
): Promise<boolean> {
  const accepted = await confirm({
    title: `Eliminar «${node.title || node.content.slice(0, 80) || "Idea sin título"}» definitivamente`,
    description: "Se eliminará esta idea de todos los jardines y de pendientes junto con sus conexiones y referencias de recursos. Los archivos vinculados originales no se borrarán. Esta acción no se puede deshacer.",
    confirmLabel: "Eliminar idea definitivamente",
    destructive: true,
  });
  if (!accepted || !isCurrent()) return false;
  await operations.deleteKnowledge(node.id);
  return true;
}

function gardenWithVisiblePlacements(view: CanvasView, placements: CanvasView["placements"]): CanvasView {
  const visibleIdeas = new Set(placements.map((placement) => placement.nodeId));
  return {
    ...view,
    placements,
    nodes: view.nodes.filter((node) => visibleIdeas.has(node.id)),
    edges: view.edges.filter((edge) => visibleIdeas.has(edge.sourceNodeId) && visibleIdeas.has(edge.targetNodeId)),
  };
}

export function gardenWithoutPlacement(view: CanvasView, placementId: PlacementId): CanvasView {
  return gardenWithVisiblePlacements(view, view.placements.filter((placement) => placement.id !== placementId));
}

export function gardenWithoutIdea(view: CanvasView, nodeId: NodeId): CanvasView {
  return gardenWithVisiblePlacements(view, view.placements.filter((placement) => placement.nodeId !== nodeId));
}

interface GardenPageProps {
  readonly activeGarden: Canvas;
  readonly dependencies: CanvasViewDependencies & CreateNodeInCanvasDependencies & { readonly placementPersistence: PlacementPersistence; readonly resourcePersistence: ResourcePersistence; readonly nativeOperations: Pick<NativeOperations, "deleteKnowledge"> };
  readonly gardens: readonly Canvas[];
  readonly onGardenChange: (id: CanvasId) => void;
  readonly onNewGarden: () => void;
  readonly onStatusChange: (status: string) => void;
  readonly onRenameGarden: () => void;
  readonly onDeleteGarden: () => void;
  readonly canvasBackground: CanvasBackground;
  readonly onOpenIdea: (nodeId: NodeId) => void;
  readonly onHome: () => void;
  readonly onDirtyChange: (dirty: boolean) => void;
  readonly creationRequest: number;
  readonly onCreationRequestHandled: () => void;
  readonly onDeleted?: (nodeId: NodeId) => void;
}

export function GardenPage({
  activeGarden,
  dependencies,
  gardens,
  onGardenChange,
  onNewGarden,
  onStatusChange,
  onRenameGarden,
  onDeleteGarden,
  canvasBackground,
  onOpenIdea,
  onHome,
  onDirtyChange,
  creationRequest,
  onCreationRequestHandled,
  onDeleted,
}: GardenPageProps) {
  const confirm = useConfirmation();
  const [view, setView] = useState<CanvasView | null>(null);
  const [flowNodes, setFlowNodes] = useState<CanvasFlowNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadRevision, setLoadRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [deletingEdge, setDeletingEdge] = useState(false);
  const [directActionBusy, setDirectActionBusy] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<EdgeId | null>(null);
  const [quickNodeDraft, setQuickNodeDraft] =
    useState<QuickNodeDraft | null>(null);
  const [quickNodeTitle, setQuickNodeTitle] = useState("");
  const [nodeEditDraft, setNodeEditDraft] = useState<NodeEditDraft | null>(
    null,
  );
  const canvasSurface = useRef<CanvasSurfaceHandle | null>(null);
  const quickNodeInput = useRef<HTMLInputElement | null>(null);
  const nodeEditTitle = useRef<HTMLInputElement | null>(null);
  const nodeEditContent = useRef<HTMLTextAreaElement | null>(null);
  const resources = useRef<Resource[]>([]);
  const draggedNodes = useRef(new Set<string>());
  const positionWrite = useRef(false);
  const requestSequence = useRef(0);
  const directActionPending = useRef(false);
  const edgeActionPending = useRef(false);

  const showView = useCallback((nextView: CanvasView) => {
    setView(nextView);
    setFlowNodes(toReactFlowNodes(nextView.nodes, nextView.placements, resources.current));
    setQuickNodeDraft(null);
    setQuickNodeTitle("");
    setNodeEditDraft(null);
    setSelectedEdgeId(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const request = ++requestSequence.current;

    setLoading(true);
    setDeletingEdge(false);
    setDirectActionBusy(false);
    directActionPending.current = false;
    edgeActionPending.current = false;
    setView(null);
    setFlowNodes([]);
    setSelectedEdgeId(null);
    onStatusChange("Abriendo jardín…");

    void loadCanvasView(dependencies, activeGarden.id)
      .then(async (loaded) => {
        if (cancelled) {
          return;
        }

        if (loaded === null) {
          onStatusChange("No se encontró este jardín.");
          return;
        }

        const loadedResources = await dependencies.resourcePersistence.listByNodes(loaded.nodes.map((node) => node.id));
        if (cancelled) return;
        resources.current = loadedResources;
        showView(loaded);
        onStatusChange("Jardín listo.");
      })
      .catch(() => {
        if (!cancelled) {
          onStatusChange(`No se pudo abrir el jardín. Vuelve a intentarlo.`);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (request === requestSequence.current) requestSequence.current += 1;
    };
  }, [activeGarden.id, dependencies, onStatusChange, showView, loadRevision]);

  useEffect(() => {
    if (creationRequest > 0 && view !== null && !loading) {
      canvasSurface.current?.startIdea();
      onCreationRequestHandled();
    }
  }, [creationRequest, view, loading, onCreationRequestHandled]);

  useEffect(() => {
    const original = view?.nodes.find((node) => node.id === nodeEditDraft?.nodeId);
    onDirtyChange((nodeEditDraft !== null && (original?.title !== nodeEditDraft.title || original?.content !== nodeEditDraft.content)) || quickNodeTitle.trim().length > 0);
    return () => onDirtyChange(false);
  }, [view, nodeEditDraft, quickNodeTitle, onDirtyChange]);

  useEffect(() => {
    quickNodeInput.current?.focus({ preventScroll: quickNodeDraft?.keepInputInBounds === true });
  }, [quickNodeDraft]);

  useEffect(() => {
    nodeEditTitle.current?.focus();
  }, [nodeEditDraft?.nodeId]);

  const flowEdges = useMemo(
    () =>
      view === null
        ? []
        : toReactFlowEdges(view.edges, view.placements, selectedEdgeId),
    [selectedEdgeId, view],
  );
  const growth = useMemo(() => {
    const visibleIdeas = new Set(view?.nodes.map((node) => node.id) ?? []);
    return deriveGardenGrowth({
      ideaCount: visibleIdeas.size,
      connectionCount: flowEdges.length,
      resourceCount: resources.current.filter((resource) => visibleIdeas.has(resource.nodeId)).length,
    });
  }, [view, flowEdges.length]);

  const interactionLocked =
    loading || saving || creating || connecting || deletingEdge || directActionBusy;

  function handleNodesChange(changes: NodeChange<CanvasFlowNode>[]) {
    if (positionWrite.current && changes.some((change) => change.type === "position")) return;
    setFlowNodes((current) => applyNodeChanges(changes, current));
    for (const change of changes) {
      if (change.type === "position" && change.dragging) draggedNodes.current.add(change.id);
    }
    const keyboardMoves = changes.flatMap((change) => change.type === "position" && change.position !== undefined && !change.dragging && !draggedNodes.current.has(change.id)
      ? [{ id: change.id as PlacementId, position: change.position }] : []);
    if (keyboardMoves.length > 0) persistPositions(keyboardMoves);
  }

  const handleNodeDoubleClick: NodeMouseHandler<CanvasFlowNode> = (
    event,
    visualNode,
  ) => {
    event.stopPropagation();
    openCanvasIdea(visualNode.data.nodeId);
  };

  function openCanvasIdea(nodeId: NodeId) {
    if (view === null || interactionLocked || directActionPending.current || edgeActionPending.current) {
      return;
    }

    const node = view.nodes.find(
      (candidate) => candidate.id === nodeId,
    );

    if (node === undefined) {
      onStatusChange("No se encontró la idea seleccionada.");
      return;
    }

    onOpenIdea(node.id);
  }

  const selectedIdea = flowNodes.find((node) => node.selected);

  function editCanvasIdea(placementId: PlacementId) {
    if (view === null || interactionLocked || directActionPending.current || edgeActionPending.current) return;
    const placement = view.placements.find((candidate) => candidate.id === placementId);
    if (placement === undefined) return;
    const node = view.nodes.find((candidate) => candidate.id === placement.nodeId);
    if (node === undefined) return;
    setQuickNodeDraft(null);
    setSelectedEdgeId(null);
    setNodeEditDraft({
      nodeId: node.id,
      placementId,
      title: node.title,
      content: node.content,
    });
    onStatusChange("Editando idea.");
  }

  function editSelectedIdea() {
    if (selectedIdea !== undefined) editCanvasIdea(selectedIdea.data.placementId);
  }

  function cancelNodeEdit() {
    if (saving || directActionPending.current) {
      return;
    }

    setNodeEditDraft(null);
    onStatusChange("Edición cancelada.");
  }

  function saveNodeEdit() {
    if (view === null || nodeEditDraft === null || interactionLocked || directActionPending.current || edgeActionPending.current) {
      return;
    }

    const currentView = view;
    const draft = nodeEditDraft;
    const original = currentView.nodes.find(
      (node) => node.id === draft.nodeId,
    );

    if (original === undefined) {
      onStatusChange("No se encontró la idea que estás editando.");
      return;
    }

    setSaving(true);
    onStatusChange("Guardando idea…");

    void persistNodeEdit(
      dependencies.nodePersistence,
      original,
      draft.title,
      draft.content,
    )
      .then((edited) => {
        const nextView: CanvasView = {
          ...currentView,
          nodes: currentView.nodes.map((node) =>
            node.id === edited.id ? edited : node,
          ),
        };
        const nextFlowNodes = toReactFlowNodes(
          nextView.nodes,
          nextView.placements,
          resources.current,
        ).map((node) =>
          node.id === draft.placementId ? { ...node, selected: true } : node,
        );

        setView(nextView);
        setFlowNodes(nextFlowNodes);
        setNodeEditDraft(null);
        onStatusChange("Idea guardada.");
      })
      .catch(() => {
        onStatusChange(`No se pudo guardar la idea. Escribe un título o contenido y vuelve a intentarlo.`);
        requestAnimationFrame(() => nodeEditTitle.current?.focus());
      })
      .finally(() => setSaving(false));
  }

  function removeEditedPlacement() {
    if (nodeEditDraft === null) return;
    void removePlacement(nodeEditDraft.placementId);
  }

  function applyReducedGarden(nextView: CanvasView) {
    const visibleIdeas = new Set(nextView.nodes.map((node) => node.id));
    resources.current = resources.current.filter((resource) => visibleIdeas.has(resource.nodeId));
    showView(nextView);
  }

  async function removePlacement(placementId: PlacementId) {
    if (view === null || interactionLocked || directActionPending.current || edgeActionPending.current) return;
    if (!view.placements.some((placement) => placement.id === placementId)) return;
    const currentView = view;
    const request = requestSequence.current;
    directActionPending.current = true;
    setDirectActionBusy(true);
    try {
      await removeNodeFromCanvas(dependencies.placementPersistence, placementId);
      if (request !== requestSequence.current) return;
      applyReducedGarden(gardenWithoutPlacement(currentView, placementId));
      onStatusChange("Idea quitada del jardín. Su contenido, conexiones y recursos se conservan.");
    } catch {
      if (request === requestSequence.current) onStatusChange("No se pudo quitar la idea del jardín.");
    } finally {
      if (request === requestSequence.current) {
        directActionPending.current = false;
        setDirectActionBusy(false);
      }
    }
  }

  function removeSelectedIdea() {
    if (selectedIdea === undefined || nodeEditDraft !== null || quickNodeDraft !== null) return;
    void removePlacement(selectedIdea.data.placementId);
  }

  async function deleteCanvasIdea(nodeId: NodeId) {
    if (view === null || interactionLocked || directActionPending.current || edgeActionPending.current || nodeEditDraft !== null || quickNodeDraft !== null) return;
    const currentView = view;
    const node = currentView.nodes.find((candidate) => candidate.id === nodeId);
    if (node === undefined) return;
    const request = requestSequence.current;
    directActionPending.current = true;
    setDirectActionBusy(true);
    try {
      const deleted = await deleteGardenIdeaWithConfirmation(node, dependencies.nativeOperations, confirm, () => request === requestSequence.current);
      if (!deleted || request !== requestSequence.current) return;
      applyReducedGarden(gardenWithoutIdea(currentView, node.id));
      onDeleted?.(node.id);
      onStatusChange("Idea eliminada definitivamente. Los archivos vinculados originales se conservan.");
    } catch {
      if (request === requestSequence.current) onStatusChange("No se pudo eliminar la idea. Inténtalo de nuevo.");
    } finally {
      if (request === requestSequence.current) {
        directActionPending.current = false;
        setDirectActionBusy(false);
      }
    }
  }

  function deleteSelectedIdea() {
    if (selectedIdea !== undefined) void deleteCanvasIdea(selectedIdea.data.nodeId);
  }

  function requestNodeCreation(
    position: Position,
    inputPosition: Position,
    keepInputInBounds = false,
  ) {
    if (
      view === null ||
      interactionLocked ||
      directActionPending.current ||
      edgeActionPending.current ||
      nodeEditDraft !== null ||
      quickNodeDraft !== null
    ) {
      return;
    }

    setSelectedEdgeId(null);
    setQuickNodeTitle("");
    setQuickNodeDraft({ position, inputPosition, keepInputInBounds });
    onStatusChange("Escribe el título de tu nueva idea.");
  }

  function cancelQuickNode() {
    if (creating) {
      return;
    }

    setQuickNodeDraft(null);
    setQuickNodeTitle("");
    onStatusChange("Creación de idea cancelada.");
  }

  function submitQuickNode(event: FormEvent) {
    event.preventDefault();

    if (view === null || quickNodeDraft === null || creating) {
      return;
    }

    const currentView = view;
    const draft = quickNodeDraft;
    setCreating(true);
    onStatusChange("Creando idea…");

    void createNodeInCanvas(
      dependencies,
      currentView.canvas.id,
      quickNodeTitle,
      draft.position,
    )
      .then(({ node, placement }) => {
        showView({
          ...currentView,
          nodes: [...currentView.nodes, node],
          placements: [...currentView.placements, placement],
        });
        onStatusChange("Idea creada.");
      })
      .catch(() => {
        onStatusChange(`No se pudo crear la idea. Escribe un título y vuelve a intentarlo.`);
        requestAnimationFrame(() => quickNodeInput.current?.focus());
      })
      .finally(() => setCreating(false));
  }

  function persistPositions(moves: readonly { id: PlacementId; position: Position }[]) {
    if (view === null || interactionLocked || positionWrite.current || directActionPending.current || edgeActionPending.current) return;
    const currentView = view;
    positionWrite.current = true;
    setSaving(true);
    onStatusChange("Guardando posición…");
    void Promise.all(moves.map((move) => moveNodeInCanvas(dependencies.placementPersistence, move.id, move.position)))
      .then((moved) => {
        const movedById = new Map(moved.map((placement) => [placement.id, placement]));
        const nextView = {
          ...currentView,
          placements: currentView.placements.map((placement) => movedById.get(placement.id) ?? placement),
        };
        setView(nextView);
        setFlowNodes((current) => {
          const selected = new Set(current.filter((node) => node.selected).map((node) => node.id));
          return toReactFlowNodes(nextView.nodes, nextView.placements, resources.current).map((node) => ({ ...node, selected: selected.has(node.id) }));
        });
        onStatusChange("Posición guardada.");
      })
      .catch(async () => {
        // A group drag can partially save; reload the actual positions rather than claim rollback.
        try {
          const placements = await dependencies.placementPersistence.loadForCanvas(activeGarden.id);
          showView({ ...currentView, placements });
        } catch { setLoadRevision((value) => value + 1); }
        onStatusChange("No se pudieron guardar todas las posiciones. Se han recargado los datos locales.");
      })
      .finally(() => { positionWrite.current = false; setSaving(false); });
  }

  const handleNodeDragStop: OnNodeDrag<CanvasFlowNode> = (_event, visualNode, movedNodes) => {
    const nodes = movedNodes.length > 0 ? movedNodes : [visualNode];
    persistPositions(nodes.map((node) => ({ id: node.id as PlacementId, position: node.position })));
    draggedNodes.current.clear();
  };

  const handleConnect: OnConnect = (connection) => {
    if (view === null || interactionLocked || directActionPending.current || edgeActionPending.current) {
      return;
    }

    const currentView = view;
    setConnecting(true);
    onStatusChange("Creando conexión…");

    void createEdgeInCanvas(
      dependencies,
      currentView.canvas.id,
      connection.source as PlacementId,
      connection.target as PlacementId,
    )
      .then((edge) => {
        setView({ ...currentView, edges: [...currentView.edges, edge] });
        onStatusChange("Conexión creada.");
      })
      .catch(() => {
        onStatusChange(`No se pudo crear la conexión. Vuelve a intentarlo.`);
      })
      .finally(() => setConnecting(false));
  };

  function selectEdge(id: string) {
    if (view?.edges.some((edge) => edge.id === id)) {
      setSelectedEdgeId(id as EdgeId);
      onStatusChange("Conexión seleccionada.");
    }
  }

  function removeSelectedEdge() {
    if (selectedEdgeId !== null) removeCanvasEdge(selectedEdgeId);
  }

  function removeCanvasEdge(edgeId: EdgeId) {
    if (view === null || !view.edges.some((edge) => edge.id === edgeId) || interactionLocked || edgeActionPending.current || directActionPending.current || nodeEditDraft !== null || quickNodeDraft !== null) {
      return;
    }

    const request = requestSequence.current;
    edgeActionPending.current = true;
    setDeletingEdge(true);
    onStatusChange("Eliminando conexión…");

    void deleteEdge(dependencies.edgePersistence, edgeId)
      .then(() => {
        if (request !== requestSequence.current) return;
        setView((current) => current === null ? null : { ...current, edges: current.edges.filter((edge) => edge.id !== edgeId) });
        setSelectedEdgeId((current) => current === edgeId ? null : current);
        onStatusChange("Conexión eliminada.");
      })
      .catch(() => {
        if (request === requestSequence.current) onStatusChange(`No se pudo eliminar la conexión. Vuelve a intentarlo.`);
      })
      .finally(() => {
        if (request === requestSequence.current) {
          edgeActionPending.current = false;
          setDeletingEdge(false);
        }
      });
  }

  return (
    <section className="garden-page" aria-label="Espacio del jardín">
      <GardenToolbar
        activeGarden={activeGarden}
        gardens={gardens}
        disabled={interactionLocked || nodeEditDraft !== null || quickNodeDraft !== null}
        hasSelectedEdge={selectedEdgeId !== null}
        onDeleteConnection={removeSelectedEdge}
        onFitView={() => canvasSurface.current?.fitView()}
        onGardenChange={onGardenChange}
        onNewGarden={onNewGarden}
        onNewIdea={() => canvasSurface.current?.startIdea()}
        onRenameGarden={onRenameGarden}
        onDeleteGarden={onDeleteGarden}
        hasSelectedIdea={selectedIdea !== undefined}
        onEditIdea={editSelectedIdea}
        onOpenIdea={() => { if (selectedIdea !== undefined) onOpenIdea(selectedIdea.data.nodeId); }}
        onRemoveIdea={removeSelectedIdea}
        onDeleteIdea={() => { void deleteSelectedIdea(); }}
        onHome={onHome}
      />
      {view === null ? (
        <div className="garden-loading" role="status">
          {loading ? "Abriendo jardín…" : <div><p>Jardín no disponible.</p><button type="button" onClick={() => setLoadRevision((value) => value + 1)}>Reintentar</button></div>}
        </div>
      ) : (
        <CanvasSurface
          ref={canvasSurface}
          nodes={flowNodes}
          edges={flowEdges}
          canInteract={!interactionLocked}
          editorOpen={nodeEditDraft !== null || quickNodeDraft !== null}
          background={canvasBackground}
          onClearEdgeSelection={() => setSelectedEdgeId(null)}
          onConnect={handleConnect}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeDragStop={handleNodeDragStop}
          onNodesChange={handleNodesChange}
          onRequestCreate={requestNodeCreation}
          onSelectEdge={selectEdge}
          onOpenIdea={openCanvasIdea}
          onEditIdea={editCanvasIdea}
          onRemoveIdea={(placementId) => { void removePlacement(placementId); }}
          onDeleteIdea={(nodeId) => { void deleteCanvasIdea(nodeId); }}
          onDeleteConnection={removeCanvasEdge}
        >
          <GardenEnvironment gardenId={activeGarden.id} growth={growth} />
          {quickNodeDraft !== null ? (
            <QuickNodeCreator
              draft={quickNodeDraft}
              inputRef={quickNodeInput}
              submitting={creating}
              title={quickNodeTitle}
              onCancel={cancelQuickNode}
              onSubmit={submitQuickNode}
              onTitleChange={setQuickNodeTitle}
            />
          ) : null}
          {nodeEditDraft !== null ? (
            <NodeEditor
              contentRef={nodeEditContent}
              draft={nodeEditDraft}
              saving={saving || directActionBusy}
              titleRef={nodeEditTitle}
              onCancel={cancelNodeEdit}
              onChange={setNodeEditDraft}
              onSave={saveNodeEdit}
              onRemove={removeEditedPlacement}
            />
          ) : null}
        </CanvasSurface>
      )}
      {import.meta.env.DEV && view !== null ? (
        <DevDebugPanel view={view} />
      ) : null}
    </section>
  );
}

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
import { moveNodeInCanvas } from "../../application/placementPersistence";
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

interface GardenPageProps {
  readonly activeGarden: Canvas;
  readonly dependencies: CanvasViewDependencies;
  readonly gardens: readonly Canvas[];
  readonly onGardenChange: (id: CanvasId) => void;
  readonly onNewGarden: () => void;
  readonly onStatusChange: (status: string) => void;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error.";
}

export function GardenPage({
  activeGarden,
  dependencies,
  gardens,
  onGardenChange,
  onNewGarden,
  onStatusChange,
}: GardenPageProps) {
  const [view, setView] = useState<CanvasView | null>(null);
  const [flowNodes, setFlowNodes] = useState<CanvasFlowNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [deletingEdge, setDeletingEdge] = useState(false);
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

  const showView = useCallback((nextView: CanvasView) => {
    setView(nextView);
    setFlowNodes(toReactFlowNodes(nextView.nodes, nextView.placements));
    setQuickNodeDraft(null);
    setQuickNodeTitle("");
    setNodeEditDraft(null);
    setSelectedEdgeId(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setView(null);
    setFlowNodes([]);
    setSelectedEdgeId(null);
    onStatusChange("Opening Garden…");

    void loadCanvasView(dependencies, activeGarden.id)
      .then((loaded) => {
        if (cancelled) {
          return;
        }

        if (loaded === null) {
          onStatusChange("This Garden could not be found.");
          return;
        }

        showView(loaded);
        onStatusChange("Garden ready.");
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          onStatusChange(`Could not open Garden: ${errorMessage(error)}`);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeGarden.id, dependencies, onStatusChange, showView]);

  useEffect(() => {
    quickNodeInput.current?.focus();
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

  const interactionLocked =
    loading || saving || creating || connecting || deletingEdge;

  function handleNodesChange(changes: NodeChange<CanvasFlowNode>[]) {
    setFlowNodes((current) => applyNodeChanges(changes, current));
  }

  const handleNodeDoubleClick: NodeMouseHandler<CanvasFlowNode> = (
    event,
    visualNode,
  ) => {
    event.stopPropagation();

    if (view === null || interactionLocked) {
      return;
    }

    const node = view.nodes.find(
      (candidate) => candidate.id === visualNode.data.nodeId,
    );

    if (node === undefined) {
      onStatusChange("The selected idea could not be found.");
      return;
    }

    setQuickNodeDraft(null);
    setQuickNodeTitle("");
    setSelectedEdgeId(null);
    setNodeEditDraft({
      nodeId: node.id,
      placementId: visualNode.data.placementId,
      title: node.title,
      content: node.content,
    });
    onStatusChange("Editing idea.");
  };

  function cancelNodeEdit() {
    if (saving) {
      return;
    }

    setNodeEditDraft(null);
    onStatusChange("Edit cancelled.");
  }

  function saveNodeEdit() {
    if (view === null || nodeEditDraft === null || saving) {
      return;
    }

    const currentView = view;
    const draft = nodeEditDraft;
    const original = currentView.nodes.find(
      (node) => node.id === draft.nodeId,
    );

    if (original === undefined) {
      onStatusChange("The edited idea could not be found.");
      return;
    }

    setSaving(true);
    onStatusChange("Saving idea…");

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
        ).map((node) =>
          node.id === draft.placementId ? { ...node, selected: true } : node,
        );

        setView(nextView);
        setFlowNodes(nextFlowNodes);
        setNodeEditDraft(null);
        onStatusChange("Idea saved.");
      })
      .catch((error: unknown) => {
        onStatusChange(`Could not save idea: ${errorMessage(error)}`);
        requestAnimationFrame(() => nodeEditTitle.current?.focus());
      })
      .finally(() => setSaving(false));
  }

  function requestNodeCreation(
    position: Position,
    inputPosition: Position,
  ) {
    if (
      view === null ||
      interactionLocked ||
      nodeEditDraft !== null ||
      quickNodeDraft !== null
    ) {
      return;
    }

    setSelectedEdgeId(null);
    setQuickNodeTitle("");
    setQuickNodeDraft({ position, inputPosition });
    onStatusChange("Name your new idea.");
  }

  function cancelQuickNode() {
    if (creating) {
      return;
    }

    setQuickNodeDraft(null);
    setQuickNodeTitle("");
    onStatusChange("Idea creation cancelled.");
  }

  function submitQuickNode(event: FormEvent) {
    event.preventDefault();

    if (view === null || quickNodeDraft === null || creating) {
      return;
    }

    const currentView = view;
    const draft = quickNodeDraft;
    setCreating(true);
    onStatusChange("Creating idea…");

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
        onStatusChange("Idea created.");
      })
      .catch((error: unknown) => {
        onStatusChange(`Could not create idea: ${errorMessage(error)}`);
        requestAnimationFrame(() => quickNodeInput.current?.focus());
      })
      .finally(() => setCreating(false));
  }

  const handleNodeDragStop: OnNodeDrag<CanvasFlowNode> = (
    _event,
    visualNode,
  ) => {
    if (view === null || interactionLocked) {
      return;
    }

    const currentView = view;
    setSaving(true);
    onStatusChange("Saving position…");

    void moveNodeInCanvas(
      dependencies.placementPersistence,
      visualNode.id as PlacementId,
      visualNode.position,
    )
      .then((moved) => {
        showView({
          ...currentView,
          placements: currentView.placements.map((placement) =>
            placement.id === moved.id ? moved : placement,
          ),
        });
        onStatusChange("Position saved.");
      })
      .catch((error: unknown) => {
        setFlowNodes(
          toReactFlowNodes(currentView.nodes, currentView.placements),
        );
        onStatusChange(`Could not save position: ${errorMessage(error)}`);
      })
      .finally(() => setSaving(false));
  };

  const handleConnect: OnConnect = (connection) => {
    if (view === null || interactionLocked) {
      return;
    }

    const currentView = view;
    setConnecting(true);
    onStatusChange("Creating connection…");

    void createEdgeInCanvas(
      dependencies,
      currentView.canvas.id,
      connection.source as PlacementId,
      connection.target as PlacementId,
    )
      .then((edge) => {
        setView({ ...currentView, edges: [...currentView.edges, edge] });
        onStatusChange("Connection created.");
      })
      .catch((error: unknown) => {
        onStatusChange(`Could not create connection: ${errorMessage(error)}`);
      })
      .finally(() => setConnecting(false));
  };

  function selectEdge(id: string) {
    if (view?.edges.some((edge) => edge.id === id)) {
      setSelectedEdgeId(id as EdgeId);
      onStatusChange("Connection selected.");
    }
  }

  function removeSelectedEdge() {
    if (view === null || selectedEdgeId === null || deletingEdge) {
      return;
    }

    const currentView = view;
    const edgeId = selectedEdgeId;
    setDeletingEdge(true);
    onStatusChange("Deleting connection…");

    void deleteEdge(dependencies.edgePersistence, edgeId)
      .then(() => {
        setView({
          ...currentView,
          edges: currentView.edges.filter((edge) => edge.id !== edgeId),
        });
        setSelectedEdgeId(null);
        onStatusChange("Connection deleted.");
      })
      .catch((error: unknown) => {
        onStatusChange(`Could not delete connection: ${errorMessage(error)}`);
      })
      .finally(() => setDeletingEdge(false));
  }

  return (
    <section className="garden-page" aria-label="Garden workspace">
      <GardenToolbar
        activeGarden={activeGarden}
        gardens={gardens}
        disabled={interactionLocked || nodeEditDraft !== null}
        hasSelectedEdge={selectedEdgeId !== null}
        onDeleteConnection={removeSelectedEdge}
        onFitView={() => canvasSurface.current?.fitView()}
        onGardenChange={onGardenChange}
        onNewGarden={onNewGarden}
        onNewIdea={() => canvasSurface.current?.startIdea()}
      />
      {view === null ? (
        <div className="garden-loading" role="status">
          {loading ? "Opening Garden…" : "Garden unavailable."}
        </div>
      ) : (
        <CanvasSurface
          ref={canvasSurface}
          nodes={flowNodes}
          edges={flowEdges}
          canInteract={!interactionLocked}
          editorOpen={nodeEditDraft !== null}
          onClearEdgeSelection={() => setSelectedEdgeId(null)}
          onConnect={handleConnect}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeDragStop={handleNodeDragStop}
          onNodesChange={handleNodesChange}
          onRequestCreate={requestNodeCreation}
          onSelectEdge={selectEdge}
        >
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
              saving={saving}
              titleRef={nodeEditTitle}
              onCancel={cancelNodeEdit}
              onChange={setNodeEditDraft}
              onSave={saveNodeEdit}
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

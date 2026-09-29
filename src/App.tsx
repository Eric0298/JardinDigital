import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Background,
  ReactFlow,
  applyNodeChanges,
  type NodeChange,
  type NodeMouseHandler,
  type NodeTypes,
  type OnConnect,
  type OnNodeDrag,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { createEdgeInCanvas } from "./application/createEdgeInCanvas";
import { createNodeInCanvas } from "./application/createNodeInCanvas";
import {
  createDemoCanvas,
  loadCanvasView,
  type CanvasView,
  type CanvasViewDependencies,
} from "./application/canvasView";
import { persistNodeEdit } from "./application/nodePersistence";
import { moveNodeInCanvas } from "./application/placementPersistence";
import type { CanvasId } from "./domain/canvas";
import type { NodeId } from "./domain/node";
import type { PlacementId, Position } from "./domain/placement";
import { KnowledgeNode } from "./presentation/canvas/KnowledgeNode";
import {
  toReactFlowEdges,
  toReactFlowNodes,
  type CanvasFlowNode,
} from "./presentation/canvas/reactFlowAdapter";
import "./App.css";

interface AppProps extends CanvasViewDependencies {}

interface QuickNodeDraft {
  readonly position: Position;
  readonly inputPosition: Position;
}

interface NodeEditDraft {
  readonly nodeId: NodeId;
  readonly placementId: PlacementId;
  readonly title: string;
  readonly content: string;
}

const nodeTypes = {
  knowledge: KnowledgeNode,
} satisfies NodeTypes;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error.";
}

function App({
  canvasPersistence,
  edgePersistence,
  nodePersistence,
  placementPersistence,
}: AppProps) {
  const dependencies = {
    canvasPersistence,
    edgePersistence,
    nodePersistence,
    placementPersistence,
  };
  const [canvasId, setCanvasId] = useState("");
  const [view, setView] = useState<CanvasView | null>(null);
  const [flowNodes, setFlowNodes] = useState<CanvasFlowNode[]>([]);
  const [status, setStatus] = useState("Ready.");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [quickNodeDraft, setQuickNodeDraft] =
    useState<QuickNodeDraft | null>(null);
  const [quickNodeTitle, setQuickNodeTitle] = useState("");
  const [nodeEditDraft, setNodeEditDraft] = useState<NodeEditDraft | null>(
    null,
  );
  const flowInstance = useRef<ReactFlowInstance<CanvasFlowNode> | null>(null);
  const flowCanvas = useRef<HTMLDivElement | null>(null);
  const quickNodeInput = useRef<HTMLInputElement | null>(null);
  const nodeEditTitle = useRef<HTMLInputElement | null>(null);
  const nodeEditContent = useRef<HTMLTextAreaElement | null>(null);
  const flowEdges = useMemo(
    () =>
      view === null ? [] : toReactFlowEdges(view.edges, view.placements),
    [view],
  );

  useEffect(() => {
    quickNodeInput.current?.focus();
  }, [quickNodeDraft]);

  useEffect(() => {
    nodeEditTitle.current?.focus();
  }, [nodeEditDraft?.nodeId]);

  function showView(nextView: CanvasView) {
    setView(nextView);
    setFlowNodes(toReactFlowNodes(nextView.nodes, nextView.placements));
    setCanvasId(nextView.canvas.id);
    setQuickNodeDraft(null);
    setQuickNodeTitle("");
    setNodeEditDraft(null);
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setStatus(`Error: ${errorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }

  function createDemo() {
    void run(async () => {
      const nextView = await createDemoCanvas(dependencies);
      showView(nextView);
      setStatus("Saved. Demo Canvas, Nodes, and Placements created.");
    });
  }

  function load(event: FormEvent) {
    event.preventDefault();

    if (connecting || creating) {
      return;
    }

    void run(async () => {
      const normalizedId = canvasId.trim();

      if (normalizedId.length === 0) {
        throw new Error("Enter a Canvas ID to load.");
      }

      const loaded = await loadCanvasView(
        dependencies,
        normalizedId as CanvasId,
      );

      if (loaded === null) {
        setView(null);
        setFlowNodes([]);
        setStatus("Error: Canvas not found.");
        return;
      }

      showView(loaded);
      setStatus("Loaded from SQLite.");
    });
  }

  function handleNodesChange(changes: NodeChange<CanvasFlowNode>[]) {
    setFlowNodes((current) => applyNodeChanges(changes, current));
  }

  const handleNodeDoubleClick: NodeMouseHandler<CanvasFlowNode> = (
    event,
    visualNode,
  ) => {
    event.stopPropagation();

    if (view === null || busy || saving || creating || connecting) {
      return;
    }

    const node = view.nodes.find(
      (candidate) => candidate.id === visualNode.data.nodeId,
    );

    if (node === undefined) {
      setStatus("Error: Selected Node was not found in the loaded Canvas.");
      return;
    }

    setQuickNodeDraft(null);
    setQuickNodeTitle("");
    setNodeEditDraft({
      nodeId: node.id,
      placementId: visualNode.data.placementId,
      title: node.title,
      content: node.content,
    });
    setStatus("Editing Node.");
  };

  function cancelNodeEdit() {
    if (saving) {
      return;
    }

    setNodeEditDraft(null);
    setStatus("Edit cancelled.");
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
      setStatus("Error: Edited Node was not found in the loaded Canvas.");
      return;
    }

    setSaving(true);
    setStatus("Saving...");

    void persistNodeEdit(
      nodePersistence,
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
        setStatus("Saved.");
      })
      .catch((error: unknown) => {
        setStatus(`Error: ${errorMessage(error)}`);
        requestAnimationFrame(() => nodeEditTitle.current?.focus());
      })
      .finally(() => setSaving(false));
  }

  function handlePaneClick(event: React.MouseEvent) {
    if (
      event.detail !== 2 ||
      view === null ||
      busy ||
      saving ||
      creating ||
      connecting ||
      nodeEditDraft !== null
    ) {
      return;
    }

    const instance = flowInstance.current;
    const bounds = flowCanvas.current?.getBoundingClientRect();

    if (instance === null || bounds === undefined) {
      setStatus("Error: Canvas coordinates are not available.");
      return;
    }

    setQuickNodeTitle("");
    setQuickNodeDraft({
      position: instance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }),
      inputPosition: {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      },
    });
    setStatus("Enter a title.");
  }

  function cancelQuickNode() {
    setQuickNodeDraft(null);
    setQuickNodeTitle("");
    setStatus("Creation cancelled.");
  }

  function submitQuickNode(event: FormEvent) {
    event.preventDefault();

    if (view === null || quickNodeDraft === null || creating) {
      return;
    }

    const currentView = view;
    const draft = quickNodeDraft;
    setCreating(true);
    setStatus("Creating...");

    void createNodeInCanvas(
      dependencies,
      currentView.canvas.id,
      quickNodeTitle,
      draft.position,
    )
      .then(({ node, placement }) => {
        const nextView: CanvasView = {
          ...currentView,
          nodes: [...currentView.nodes, node],
          placements: [...currentView.placements, placement],
        };
        showView(nextView);
        setStatus("Created.");
      })
      .catch((error: unknown) => {
        setStatus(`Error: ${errorMessage(error)}`);
        requestAnimationFrame(() => quickNodeInput.current?.focus());
      })
      .finally(() => setCreating(false));
  }

  const handleNodeDragStop: OnNodeDrag<CanvasFlowNode> = (
    _event,
    visualNode,
  ) => {
    if (view === null || saving || creating || connecting) {
      return;
    }

    setSaving(true);
    setStatus("Saving...");

    void moveNodeInCanvas(
      placementPersistence,
      visualNode.id as PlacementId,
      visualNode.position,
    )
      .then((moved) => {
        const nextView: CanvasView = {
          ...view,
          placements: view.placements.map((placement) =>
            placement.id === moved.id ? moved : placement,
          ),
        };
        showView(nextView);
        setStatus("Saved.");
      })
      .catch((error: unknown) => {
        setFlowNodes(toReactFlowNodes(view.nodes, view.placements));
        setStatus(`Error: ${errorMessage(error)}`);
      })
      .finally(() => setSaving(false));
  };

  const handleConnect: OnConnect = (connection) => {
    if (view === null || busy || saving || creating || connecting) {
      return;
    }

    const currentView = view;
    setConnecting(true);
    setStatus("Connecting...");

    void createEdgeInCanvas(
      dependencies,
      currentView.canvas.id,
      connection.source as PlacementId,
      connection.target as PlacementId,
    )
      .then((edge) => {
        setView({
          ...currentView,
          edges: [...currentView.edges, edge],
        });
        setStatus("Connected.");
      })
      .catch((error: unknown) => {
        setStatus(`Error: ${errorMessage(error)}`);
      })
      .finally(() => setConnecting(false));
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Local-first knowledge garden</p>
          <h1>JardinDigital</h1>
          <p className="intro">Capture and cultivate ideas on a visual canvas.</p>
        </div>
        <p className="status" aria-live="polite">
          {status}
        </p>
      </header>

      {view === null ? (
        <section className="empty-state" aria-labelledby="empty-heading">
          <p className="eyebrow">Canvas</p>
          <h2 id="empty-heading">Start a garden</h2>
          <p>Create a demo Canvas with three persisted ideas.</p>
          <button type="button" onClick={createDemo} disabled={busy || saving}>
            Create demo Canvas
          </button>
        </section>
      ) : (
        <section className="canvas-panel" aria-labelledby="canvas-heading">
          <div className="canvas-heading">
            <div>
              <p className="eyebrow">Active Canvas</p>
              <h2 id="canvas-heading">{view.canvas.title}</h2>
            </div>
            <p className="canvas-hint">Double-click empty space to add an idea.</p>
          </div>
          <div className="flow-canvas" ref={flowCanvas}>
            <ReactFlow<CanvasFlowNode>
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              onInit={(instance) => {
                flowInstance.current = instance;
              }}
              onNodesChange={handleNodesChange}
              onNodeDoubleClick={handleNodeDoubleClick}
              onNodeDragStop={handleNodeDragStop}
              onConnect={handleConnect}
              onPaneClick={handlePaneClick}
              nodesDraggable={
                !busy &&
                !saving &&
                !creating &&
                !connecting &&
                nodeEditDraft === null
              }
              nodesConnectable={
                !busy &&
                !saving &&
                !creating &&
                !connecting &&
                nodeEditDraft === null
              }
              elementsSelectable
              fitView
              zoomOnDoubleClick={false}
            >
              <Background />
            </ReactFlow>
            {quickNodeDraft !== null ? (
              <form
                className="quick-node-form nodrag nowheel nopan"
                style={{
                  left: quickNodeDraft.inputPosition.x,
                  top: quickNodeDraft.inputPosition.y,
                }}
                onSubmit={submitQuickNode}
                onDoubleClick={(event) => event.stopPropagation()}
              >
                <label htmlFor="quick-node-title">New idea title</label>
                <input
                  id="quick-node-title"
                  ref={quickNodeInput}
                  value={quickNodeTitle}
                  onChange={(event) => setQuickNodeTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelQuickNode();
                    }
                  }}
                  disabled={creating}
                  autoFocus
                  placeholder="Idea title"
                />
              </form>
            ) : null}
            {nodeEditDraft !== null ? (
              <form
                className="node-editor nodrag nowheel nopan"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveNodeEdit();
                }}
                onDoubleClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelNodeEdit();
                    return;
                  }

                  if (event.key === "Enter" && event.ctrlKey) {
                    event.preventDefault();
                    saveNodeEdit();
                    return;
                  }

                  if (
                    event.key === "Enter" &&
                    event.target === nodeEditTitle.current
                  ) {
                    event.preventDefault();
                    nodeEditContent.current?.focus();
                  }
                }}
              >
                <div className="node-editor__heading">
                  <strong>Edit idea</strong>
                  <span>Ctrl+Enter to save · Escape to cancel</span>
                </div>
                <label htmlFor="node-edit-title">Title</label>
                <input
                  id="node-edit-title"
                  ref={nodeEditTitle}
                  value={nodeEditDraft.title}
                  onChange={(event) =>
                    setNodeEditDraft((current) =>
                      current === null
                        ? null
                        : { ...current, title: event.target.value },
                    )
                  }
                  disabled={saving}
                />
                <label htmlFor="node-edit-content">Content</label>
                <textarea
                  id="node-edit-content"
                  ref={nodeEditContent}
                  value={nodeEditDraft.content}
                  onChange={(event) =>
                    setNodeEditDraft((current) =>
                      current === null
                        ? null
                        : { ...current, content: event.target.value },
                    )
                  }
                  disabled={saving}
                  rows={7}
                />
                <div className="node-editor__actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={cancelNodeEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}>
                    Save
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </section>
      )}

      <details className="technical-details">
        <summary>Debug / Technical details</summary>
        <div className="technical-content">
          <section className="loader" aria-labelledby="canvas-loader-heading">
            <h2 id="canvas-loader-heading">Open a persisted Canvas</h2>
            <form onSubmit={load}>
              <label htmlFor="canvas-id">Canvas ID</label>
              <div className="load-row">
                <input
                  id="canvas-id"
                  value={canvasId}
                  onChange={(event) => setCanvasId(event.target.value)}
                  disabled={busy || saving || creating || connecting}
                  placeholder="Paste the ID after restarting"
                />
                <button
                  type="submit"
                  disabled={busy || saving || creating || connecting}
                >
                  Load Canvas
                </button>
              </div>
            </form>
          </section>

          {view !== null ? (
            <section aria-labelledby="identity-heading">
              <h2 id="identity-heading">Persisted identity and position</h2>
              <p className="technical-canvas-id">
                Canvas <code>{view.canvas.id}</code>
              </p>
              <div className="identity-list">
                {view.placements.map((placement) => {
                  const node = view.nodes.find(
                    (candidate) => candidate.id === placement.nodeId,
                  );

                  return (
                    <article key={placement.id} className="identity-card">
                      <strong>{node?.title || "Untitled idea"}</strong>
                      <dl>
                        <div>
                          <dt>Node</dt>
                          <dd>{placement.nodeId}</dd>
                        </div>
                        <div>
                          <dt>Placement</dt>
                          <dd>{placement.id}</dd>
                        </div>
                        <div>
                          <dt>Position</dt>
                          <dd>
                            x: {placement.position.x}, y: {placement.position.y}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  );
                })}
              </div>
              {view.edges.length > 0 ? (
                <div className="edge-identity-list">
                  {view.edges.map((edge) => (
                    <article key={edge.id} className="identity-card">
                      <strong>Edge</strong>
                      <dl>
                        <div>
                          <dt>Edge</dt>
                          <dd>{edge.id}</dd>
                        </div>
                        <div>
                          <dt>Source Node</dt>
                          <dd>{edge.sourceNodeId}</dd>
                        </div>
                        <div>
                          <dt>Target Node</dt>
                          <dd>{edge.targetNodeId}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </details>
    </main>
  );
}

export default App;

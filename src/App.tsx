import { useState, type FormEvent } from "react";
import {
  Background,
  ReactFlow,
  applyNodeChanges,
  type NodeChange,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  createDemoCanvas,
  loadCanvasView,
  type CanvasView,
  type CanvasViewDependencies,
} from "./application/canvasView";
import { moveNodeInCanvas } from "./application/placementPersistence";
import type { CanvasId } from "./domain/canvas";
import type { PlacementId } from "./domain/placement";
import {
  toReactFlowNodes,
  type CanvasFlowNode,
} from "./presentation/canvas/reactFlowAdapter";
import "./App.css";

interface AppProps extends CanvasViewDependencies {}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error.";
}

function App({
  canvasPersistence,
  nodePersistence,
  placementPersistence,
}: AppProps) {
  const dependencies = {
    canvasPersistence,
    nodePersistence,
    placementPersistence,
  };
  const [canvasId, setCanvasId] = useState("");
  const [view, setView] = useState<CanvasView | null>(null);
  const [flowNodes, setFlowNodes] = useState<CanvasFlowNode[]>([]);
  const [status, setStatus] = useState("Ready.");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  function showView(nextView: CanvasView) {
    setView(nextView);
    setFlowNodes(toReactFlowNodes(nextView.nodes, nextView.placements));
    setCanvasId(nextView.canvas.id);
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

  const handleNodeDragStop: OnNodeDrag<CanvasFlowNode> = (
    _event,
    visualNode,
  ) => {
    if (view === null || saving) {
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

  return (
    <main className="slice">
      <header className="slice-header">
        <div>
          <p className="eyebrow">Technical validation</p>
          <h1>Canvas + Placement Vertical Slice</h1>
          <p>
            Domain placements drive React Flow positions and persist when a drag
            ends.
          </p>
        </div>
        <p className="status" aria-live="polite">
          {status}
        </p>
      </header>

      <section className="loader" aria-labelledby="canvas-loader-heading">
        <h2 id="canvas-loader-heading">Open a persisted Canvas</h2>
        <form onSubmit={load}>
          <label htmlFor="canvas-id">Canvas ID</label>
          <div className="load-row">
            <input
              id="canvas-id"
              value={canvasId}
              onChange={(event) => setCanvasId(event.target.value)}
              disabled={busy || saving}
              placeholder="Paste the ID after restarting"
            />
            <button type="submit" disabled={busy || saving}>
              Load Canvas
            </button>
          </div>
        </form>
      </section>

      {view === null ? (
        <section className="empty-state" aria-labelledby="empty-heading">
          <p className="eyebrow">Empty state</p>
          <h2 id="empty-heading">No Canvas is loaded</h2>
          <p>Create three persisted Nodes and their initial Placements.</p>
          <button type="button" onClick={createDemo} disabled={busy || saving}>
            Create demo Canvas
          </button>
        </section>
      ) : (
        <>
          <section className="canvas-panel" aria-labelledby="canvas-heading">
            <div className="canvas-heading">
              <div>
                <p className="eyebrow">Persisted Canvas</p>
                <h2 id="canvas-heading">{view.canvas.title}</h2>
              </div>
              <code>{view.canvas.id}</code>
            </div>
            <div className="flow-canvas">
              <ReactFlow<CanvasFlowNode>
                nodes={flowNodes}
                edges={[]}
                onNodesChange={handleNodesChange}
                onNodeDragStop={handleNodeDragStop}
                nodesDraggable={!busy && !saving}
                nodesConnectable={false}
                elementsSelectable
                fitView
              >
                <Background />
              </ReactFlow>
            </div>
          </section>

          <section aria-labelledby="identity-heading">
            <h2 id="identity-heading">Persisted identity and position</h2>
            <div className="identity-list">
              {view.placements.map((placement) => {
                const node = view.nodes.find(
                  (candidate) => candidate.id === placement.nodeId,
                );

                return (
                  <article key={placement.id} className="identity-card">
                    <strong>{node?.title ?? "Unknown Node"}</strong>
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
          </section>
        </>
      )}
    </main>
  );
}

export default App;

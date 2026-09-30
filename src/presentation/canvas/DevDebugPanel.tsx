import type { CanvasView } from "../../application/canvasView";

interface DevDebugPanelProps {
  readonly view: CanvasView;
}

export function DevDebugPanel({ view }: DevDebugPanelProps) {
  return (
    <details className="technical-details">
      <summary>Development details</summary>
      <div className="technical-content">
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
      </div>
    </details>
  );
}

import type { CanvasView } from "../../application/canvasView";

interface DevDebugPanelProps {
  readonly view: CanvasView;
}

export function DevDebugPanel({ view }: DevDebugPanelProps) {
  if (!import.meta.env.DEV) return null;

  return (
    <details className="technical-details">
      <summary>Detalles de desarrollo</summary>
      <div className="technical-content">
        <p className="technical-canvas-id">
          Jardín <code>{view.canvas.id}</code>
        </p>
        <div className="identity-list">
          {view.placements.map((placement) => {
            const node = view.nodes.find(
              (candidate) => candidate.id === placement.nodeId,
            );

            return (
              <article key={placement.id} className="identity-card">
                <strong>{node?.title || "Idea sin título"}</strong>
                <dl>
                  <div>
                    <dt>Idea</dt>
                    <dd>{placement.nodeId}</dd>
                  </div>
                  <div>
                    <dt>Ubicación</dt>
                    <dd>{placement.id}</dd>
                  </div>
                  <div>
                    <dt>Posición</dt>
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
                <strong>Conexión</strong>
                <dl>
                  <div>
                    <dt>Conexión</dt>
                    <dd>{edge.id}</dd>
                  </div>
                  <div>
                    <dt>Idea de origen</dt>
                    <dd>{edge.sourceNodeId}</dd>
                  </div>
                  <div>
                    <dt>Idea de destino</dt>
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

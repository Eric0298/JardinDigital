import type { Node } from "../../domain/node";

interface InboxDebugPanelProps {
  readonly nodes: readonly Node[];
}

export function InboxDebugPanel({ nodes }: InboxDebugPanelProps) {
  if (!import.meta.env.DEV) return null;

  return (
    <details className="technical-details">
      <summary>Detalles de desarrollo</summary>
      <div className="technical-content identity-list">
        {nodes.map((node) => (
          <article key={node.id} className="identity-card">
            <strong>{node.title || "Idea sin título"}</strong>
            <dl>
              <div>
                <dt>Idea</dt>
                <dd>{node.id}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>Pendientes</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </details>
  );
}

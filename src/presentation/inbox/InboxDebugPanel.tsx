import type { Node } from "../../domain/node";

interface InboxDebugPanelProps {
  readonly nodes: readonly Node[];
}

export function InboxDebugPanel({ nodes }: InboxDebugPanelProps) {
  return (
    <details className="technical-details">
      <summary>Development details</summary>
      <div className="technical-content identity-list">
        {nodes.map((node) => (
          <article key={node.id} className="identity-card">
            <strong>{node.title || "Untitled idea"}</strong>
            <dl>
              <div>
                <dt>Node</dt>
                <dd>{node.id}</dd>
              </div>
              <div>
                <dt>State</dt>
                <dd>Inbox</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </details>
  );
}

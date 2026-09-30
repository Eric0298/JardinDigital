import type { Canvas, CanvasId } from "../../domain/canvas";
import type { Node, NodeId } from "../../domain/node";

interface InboxListProps {
  readonly busyNodeId: NodeId | null;
  readonly gardens: readonly Canvas[];
  readonly nodes: readonly Node[];
  readonly selectedGardens: Readonly<Record<string, string>>;
  readonly onEdit: (node: Node) => void;
  readonly onGardenChange: (nodeId: NodeId, canvasId: CanvasId) => void;
  readonly onPlace: (node: Node) => void;
}

function heading(node: Node) {
  if (node.title.length > 0) {
    return node.title;
  }

  const firstLine = node.content.split("\n")[0]?.trim() ?? "";
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
}

export function InboxList({
  busyNodeId,
  gardens,
  nodes,
  selectedGardens,
  onEdit,
  onGardenChange,
  onPlace,
}: InboxListProps) {
  return (
    <div className="inbox-list">
      {nodes.map((node) => {
        const selectedGarden = selectedGardens[node.id] ?? gardens[0]?.id ?? "";
        const busy = busyNodeId === node.id;

        return (
          <article className="inbox-card" key={node.id}>
            <div className="inbox-card__content">
              <h3>{heading(node) || "Untitled idea"}</h3>
              {node.content.length > 0 ? (
                <p>{node.content}</p>
              ) : (
                <p className="inbox-card__empty">No additional content.</p>
              )}
            </div>
            <div className="inbox-card__actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => onEdit(node)}
                disabled={busyNodeId !== null}
              >
                Edit
              </button>
              {gardens.length > 0 ? (
                <label className="inbox-garden-selector">
                  <span>Garden</span>
                  <select
                    value={selectedGarden}
                    onChange={(event) =>
                      onGardenChange(node.id, event.target.value as CanvasId)
                    }
                    disabled={busyNodeId !== null}
                  >
                    {gardens.map((garden) => (
                      <option key={garden.id} value={garden.id}>
                        {garden.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <span className="inbox-no-gardens">No Gardens available</span>
              )}
              <button
                type="button"
                onClick={() => onPlace(node)}
                disabled={busyNodeId !== null || gardens.length === 0}
              >
                {busy ? "Placing..." : "Place in Garden"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

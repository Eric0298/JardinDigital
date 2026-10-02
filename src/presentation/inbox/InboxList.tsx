import type { Canvas, CanvasId } from "../../domain/canvas";
import type { Node, NodeId } from "../../domain/node";
import { Icon } from "../shared/Icon";
import { ActionMenu } from "../shared/ActionMenu";

interface InboxListProps {
  readonly busyNodeId: NodeId | null;
  readonly gardens: readonly Canvas[];
  readonly nodes: readonly Node[];
  readonly selectedGardens: Readonly<Record<string, string>>;
  readonly onEdit: (node: Node) => void;
  readonly onGardenChange: (nodeId: NodeId, canvasId: CanvasId) => void;
  readonly onPlace: (node: Node) => void;
  readonly onRemove: (node: Node) => void;
  readonly onOpenIdea: (nodeId: NodeId) => void;
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
  onRemove,
  onOpenIdea,
}: InboxListProps) {
  return (
    <div className="inbox-list">
      {nodes.map((node) => {
        const selectedGarden = selectedGardens[node.id] ?? gardens[0]?.id ?? "";
        const busy = busyNodeId === node.id;

        return (
          <article className="inbox-card" key={node.id}>
            <div className="inbox-card__content">
              <h3>{heading(node) || "Idea sin título"}</h3>
              {node.content.length > 0 ? (
                <p>{node.content}</p>
              ) : (
                <p className="inbox-card__empty">Sin contenido adicional.</p>
              )}
            </div>
            <div className="inbox-card__actions idea-list-card__footer">
              <button
                type="button"
                className="secondary-button idea-open-button"
                onClick={() => onOpenIdea(node.id)}
                disabled={busyNodeId !== null}
              >
                <Icon name="open" />Abrir idea
              </button>
              <ActionMenu label={`Opciones de la idea ${heading(node) || "sin título"}`}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => onEdit(node)}
                disabled={busyNodeId !== null}
              >
                <Icon name="edit" />Editar
              </button>
              {gardens.length > 0 ? (
                <label className="inbox-garden-selector">
                  <span>Añadir a un jardín</span>
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
                <span className="inbox-no-gardens">No hay jardines disponibles</span>
              )}
              <button
                type="button"
                className="secondary-button"
                onClick={() => onPlace(node)}
                disabled={busyNodeId !== null || gardens.length === 0}
              >
                <Icon name="plus" />{busy ? "Añadiendo…" : "Añadir al jardín"}
              </button>
              <button type="button" className="secondary-button" onClick={() => onRemove(node)} disabled={busyNodeId !== null}>
                <Icon name="unlink" />Quitar de pendientes
              </button>
              </ActionMenu>
            </div>
          </article>
        );
      })}
    </div>
  );
}

import type { Canvas, CanvasId } from "../../domain/canvas";
import type { Node, NodeId } from "../../domain/node";
import type { PlacementId } from "../../domain/placement";
import type { LibraryEntry } from "../../application/loadLibrary";
import { Icon } from "../shared/Icon";
import { ActionMenu } from "../shared/ActionMenu";

interface LibraryListProps {
  readonly busyAction: string | null;
  readonly entries: readonly LibraryEntry[];
  readonly gardens: readonly Canvas[];
  readonly selectedGardens: Readonly<Record<string, string>>;
  readonly onEdit: (node: Node) => void;
  readonly onGardenChange: (nodeId: NodeId, canvasId: CanvasId) => void;
  readonly onPlace: (node: Node) => void;
  readonly onRemove: (placementId: PlacementId) => void;
  readonly onDelete: (node: Node) => void;
  readonly onOpenIdea: (nodeId: NodeId) => void;
}

function heading(node: Node) {
  if (node.title.length > 0) {
    return node.title;
  }

  const firstLine = node.content.split("\n")[0]?.trim() ?? "";
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
}

export function LibraryList({
  busyAction,
  entries,
  gardens,
  selectedGardens,
  onEdit,
  onGardenChange,
  onPlace,
  onRemove,
  onDelete,
  onOpenIdea,
}: LibraryListProps) {
  return (
    <div className="library-list">
      {entries.map((entry) => {
        const { node } = entry;
        const selectedGarden = selectedGardens[node.id] ?? gardens[0]?.id ?? "";
        const placing = busyAction === `place:${node.id}`;

        return (
          <article className="library-card" key={node.id}>
            <div className="library-card__content">
              <div className="library-card__heading">
                <h3>{heading(node) || "Idea sin título"}</h3>
                {entry.inInbox ? (
                  <span className="library-inbox-status">En pendientes</span>
                ) : null}
              </div>
              {node.content.length > 0 ? (
                <p>{node.content}</p>
              ) : (
                <p className="library-card__empty">Sin contenido adicional.</p>
              )}
            </div>

            <div className="idea-list-card__footer">
              <div className="library-context" aria-label="Jardines de esta idea">
                {entry.gardens.length === 0 ? <span className="library-not-placed">Sin jardín</span> : entry.gardens.map(({ garden }) => (
                  <span className="context-chip" key={garden.id}><Icon name="garden" />{garden.title}</span>
                ))}
              </div>
              <div className="library-card__actions">
                <button type="button" className="secondary-button idea-open-button" onClick={() => onOpenIdea(node.id)} disabled={busyAction !== null}><Icon name="open" />Abrir idea</button>
                <ActionMenu label={`Opciones de la idea ${heading(node) || "sin título"}`}>
                  <button type="button" className="secondary-button" onClick={() => onEdit(node)} disabled={busyAction !== null}><Icon name="edit" />Editar</button>
                  {gardens.length > 0 ? <div className="action-menu__section">
                    <label className="library-garden-selector"><span>Añadir a un jardín</span>
                      <select value={selectedGarden} onChange={(event) => onGardenChange(node.id, event.target.value as CanvasId)} disabled={busyAction !== null}>
                        {gardens.map((garden) => <option key={garden.id} value={garden.id}>{garden.title}</option>)}
                      </select>
                    </label>
                    <button type="button" className="secondary-button" onClick={() => onPlace(node)} disabled={busyAction !== null}><Icon name="plus" />{placing ? "Añadiendo…" : "Añadir al jardín"}</button>
                  </div> : null}
                  {entry.gardens.length > 0 ? <div className="action-menu__section">
                    {entry.gardens.map(({ garden, placement }) => <button key={placement.id} type="button" className="secondary-button library-remove-button" disabled={busyAction !== null} onClick={() => onRemove(placement.id)} aria-label={`Quitar del jardín ${garden.title}`}>
                      <Icon name="unlink" /><span>{busyAction === `remove:${placement.id}` ? "Quitando…" : "Quitar del jardín"}<small>{garden.title}</small></span>
                    </button>)}
                  </div> : null}
                  <div className="action-menu__section">
                    <button type="button" className="danger-button" onClick={() => onDelete(node)} disabled={busyAction !== null}><Icon name="trash" />Eliminar idea definitivamente</button>
                  </div>
                </ActionMenu>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

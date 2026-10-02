import type { EdgeId } from "../../domain/edge";
import type { NodeId } from "../../domain/node";
import type { PlacementId, Position } from "../../domain/placement";
import { Icon } from "../shared/Icon";

export type CanvasContextTarget =
  | { readonly kind: "idea"; readonly nodeId: NodeId; readonly placementId: PlacementId }
  | { readonly kind: "connection"; readonly edgeId: EdgeId }
  | { readonly kind: "pane"; readonly position: Position; readonly inputPosition: Position };

interface CanvasContextActionsProps {
  readonly target: CanvasContextTarget;
  readonly onOpenIdea: (nodeId: NodeId) => void;
  readonly onEditIdea: (placementId: PlacementId) => void;
  readonly onRemoveIdea: (placementId: PlacementId) => void;
  readonly onDeleteIdea: (nodeId: NodeId) => void;
  readonly onDeleteConnection: (edgeId: EdgeId) => void;
  readonly onRequestCreate: (position: Position, inputPosition: Position) => void;
}

export function CanvasContextActions({ target, onOpenIdea, onEditIdea, onRemoveIdea, onDeleteIdea, onDeleteConnection, onRequestCreate }: CanvasContextActionsProps) {
  if (target.kind === "idea") {
    return <>
      <div className="action-menu__section" role="group" aria-label="Abrir y editar idea">
        <button type="button" role="menuitem" className="secondary-button" onClick={() => onOpenIdea(target.nodeId)}><Icon name="open" /> Abrir idea</button>
        <button type="button" role="menuitem" className="secondary-button" onClick={() => onEditIdea(target.placementId)}><Icon name="edit" /> Editar</button>
      </div>
      <div className="action-menu__section" role="group" aria-label="Quitar y eliminar idea">
        <button type="button" role="menuitem" className="secondary-button" onClick={() => onRemoveIdea(target.placementId)}><Icon name="unlink" /> Quitar del jardín</button>
        <button type="button" role="menuitem" className="danger-button" onClick={() => onDeleteIdea(target.nodeId)}><Icon name="trash" /> Eliminar definitivamente</button>
      </div>
    </>;
  }

  if (target.kind === "connection") {
    return <button type="button" role="menuitem" className="secondary-button" onClick={() => onDeleteConnection(target.edgeId)}><Icon name="unlink" /> Eliminar conexión</button>;
  }

  return <button type="button" role="menuitem" className="secondary-button" onClick={() => onRequestCreate(target.position, target.inputPosition)}><Icon name="plus" /> Nueva idea aquí</button>;
}

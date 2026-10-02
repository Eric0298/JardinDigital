import type { Canvas, CanvasId } from "../../domain/canvas";

import { Icon } from "../shared/Icon";
import { ActionMenu } from "../shared/ActionMenu";

interface GardenToolbarProps {
  readonly activeGarden: Canvas;
  readonly gardens: readonly Canvas[];
  readonly disabled: boolean;
  readonly hasSelectedEdge: boolean;
  readonly hasSelectedIdea: boolean;
  readonly onDeleteConnection: () => void;
  readonly onFitView: () => void;
  readonly onGardenChange: (id: CanvasId) => void;
  readonly onNewGarden: () => void;
  readonly onNewIdea: () => void;
  readonly onRenameGarden: () => void;
  readonly onDeleteGarden: () => void;
  readonly onEditIdea: () => void;
  readonly onOpenIdea: () => void;
  readonly onRemoveIdea: () => void;
  readonly onDeleteIdea: () => void;
  readonly onHome: () => void;
}

export function GardenToolbar({ activeGarden, gardens, disabled, hasSelectedEdge, hasSelectedIdea, onDeleteConnection, onFitView, onGardenChange, onNewGarden, onNewIdea, onRenameGarden, onDeleteGarden, onEditIdea, onOpenIdea, onRemoveIdea, onDeleteIdea, onHome }: GardenToolbarProps) {
  return (
    <header className="garden-toolbar">
      <div className="garden-identity">
        <button type="button" className="garden-back secondary-button" onClick={onHome} disabled={disabled}><Icon name="back" /> Mis jardines</button>
        <h2 className="garden-title" title={activeGarden.title}>{activeGarden.title}</h2>
      </div>
      <div className="garden-actions" aria-label="Acciones del jardín">
        <button type="button" className="button--grow" onClick={onNewIdea} disabled={disabled}><Icon name="plus" /> Nueva idea</button>
        <button type="button" className="secondary-button" onClick={onFitView} disabled={disabled}><Icon name="fit" /> Encajar</button>
        <ActionMenu className="garden-menu" label="Más acciones del jardín">
            {hasSelectedIdea ? <div className="action-menu__section" role="group" aria-label="Acciones de la idea seleccionada">
              <button type="button" className="secondary-button" onClick={onOpenIdea} disabled={disabled}><Icon name="open" /> Abrir idea</button>
              <button type="button" className="secondary-button" onClick={onEditIdea} disabled={disabled}><Icon name="edit" /> Editar idea</button>
              <button type="button" className="secondary-button" onClick={onRemoveIdea} disabled={disabled}><Icon name="unlink" /> Quitar del jardín</button>
              <button type="button" className="danger-button" onClick={onDeleteIdea} disabled={disabled}><Icon name="trash" /> Eliminar idea definitivamente</button>
            </div> : null}
            {hasSelectedEdge ? <div className="action-menu__section" role="group" aria-label="Acciones de la conexión seleccionada">
              <button type="button" className="secondary-button" onClick={onDeleteConnection} disabled={disabled}><Icon name="unlink" /> Eliminar conexión</button>
            </div> : null}
            <div className="action-menu__section" role="group" aria-label="Gestionar jardín">
            {gardens.length > 1 ? <label className="garden-selector">Cambiar jardín
              <select value={activeGarden.id} onChange={(event) => onGardenChange(event.target.value as CanvasId)} disabled={disabled}>
                {gardens.map((garden) => <option key={garden.id} value={garden.id}>{garden.title}</option>)}
              </select>
            </label> : null}
            <button type="button" className="secondary-button" onClick={onNewGarden} disabled={disabled}><Icon name="garden" /> Nuevo jardín</button>
            <button type="button" className="secondary-button" onClick={onRenameGarden} disabled={disabled}><Icon name="edit" /> Renombrar jardín</button>
            <button type="button" className="danger-button" onClick={onDeleteGarden} disabled={disabled}><Icon name="trash" /> Eliminar jardín</button>
            </div>
        </ActionMenu>
      </div>
    </header>
  );
}

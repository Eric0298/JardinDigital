import type { Canvas, CanvasId } from "../../domain/canvas";

interface GardenToolbarProps {
  readonly activeGarden: Canvas;
  readonly gardens: readonly Canvas[];
  readonly disabled: boolean;
  readonly hasSelectedEdge: boolean;
  readonly onDeleteConnection: () => void;
  readonly onFitView: () => void;
  readonly onGardenChange: (id: CanvasId) => void;
  readonly onNewGarden: () => void;
  readonly onNewIdea: () => void;
}

export function GardenToolbar({
  activeGarden,
  gardens,
  disabled,
  hasSelectedEdge,
  onDeleteConnection,
  onFitView,
  onGardenChange,
  onNewGarden,
  onNewIdea,
}: GardenToolbarProps) {
  return (
    <header className="garden-toolbar">
      <div className="garden-identity">
        <p className="eyebrow">Garden</p>
        {gardens.length > 1 ? (
          <label className="garden-selector">
            <span className="sr-only">Current Garden</span>
            <select
              value={activeGarden.id}
              onChange={(event) =>
                onGardenChange(event.target.value as CanvasId)
              }
              disabled={disabled}
            >
              {gardens.map((garden) => (
                <option key={garden.id} value={garden.id}>
                  {garden.title}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <h2>{activeGarden.title}</h2>
        )}
      </div>
      <div className="garden-actions" aria-label="Garden controls">
        {hasSelectedEdge ? (
          <button
            type="button"
            className="danger-button"
            onClick={onDeleteConnection}
            disabled={disabled}
          >
            Delete connection
          </button>
        ) : null}
        <button
          type="button"
          className="secondary-button"
          onClick={onFitView}
          disabled={disabled}
        >
          Fit view
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onNewGarden}
          disabled={disabled}
        >
          New Garden
        </button>
        <button type="button" onClick={onNewIdea} disabled={disabled}>
          New idea
        </button>
      </div>
    </header>
  );
}

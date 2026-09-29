import {
  movePlacement,
  type Placement,
  type PlacementId,
  type Position,
} from "../domain/placement";
import type { CanvasId } from "../domain/canvas";

export interface PlacementPersistence {
  save(placement: Placement): Promise<void>;
  load(id: PlacementId): Promise<Placement | null>;
  loadForCanvas(canvasId: CanvasId): Promise<Placement[]>;
}

export class PlacementPersistenceError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "PlacementPersistenceError";
    this.cause = cause;
  }
}

export class InvalidPersistedPlacementError extends PlacementPersistenceError {
  constructor(cause: unknown) {
    super("Persisted Placement data is invalid.", cause);
    this.name = "InvalidPersistedPlacementError";
  }
}

export async function moveNodeInCanvas(
  persistence: PlacementPersistence,
  placementId: PlacementId,
  newPosition: Position,
): Promise<Placement> {
  const current = await persistence.load(placementId);

  if (current === null) {
    throw new Error("Placement not found.");
  }

  const moved = movePlacement(current, newPosition);
  await persistence.save(moved);
  return moved;
}

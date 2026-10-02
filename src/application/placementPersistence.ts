import {
  movePlacement,
  type Placement,
  type PlacementId,
  type Position,
} from "../domain/placement";
import type { CanvasId } from "../domain/canvas";

export type PlaceNodePersistenceResult = "placed" | "already-placed";

export interface PlacementPersistence {
  save(placement: Placement): Promise<void>;
  place(placement: Placement): Promise<PlaceNodePersistenceResult>;
  load(id: PlacementId): Promise<Placement | null>;
  loadForCanvas(canvasId: CanvasId): Promise<Placement[]>;
  list(): Promise<Placement[]>;
  delete(id: PlacementId): Promise<void>;
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
  persistence: Pick<PlacementPersistence, "load" | "save">,
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

export async function removeNodeFromCanvas(
  persistence: Pick<PlacementPersistence, "load" | "delete">,
  placementId: PlacementId,
): Promise<Placement> {
  const placement = await persistence.load(placementId);

  if (placement === null) {
    throw new Error("Placement not found.");
  }

  await persistence.delete(placement.id);
  return placement;
}

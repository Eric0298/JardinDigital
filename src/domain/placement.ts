import type { CanvasId } from "./canvas";
import type { NodeId } from "./node";

declare const placementIdBrand: unique symbol;

export type PlacementId = string & {
  readonly [placementIdBrand]: "PlacementId";
};

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface Placement {
  readonly id: PlacementId;
  readonly canvasId: CanvasId;
  readonly nodeId: NodeId;
  readonly position: Position;
}

export function createPlacement(
  canvasId: CanvasId,
  nodeId: NodeId,
  position: Position,
): Placement {
  if (canvasId.trim().length === 0) {
    throw new Error("Placement canvasId must not be empty.");
  }

  if (nodeId.trim().length === 0) {
    throw new Error("Placement nodeId must not be empty.");
  }

  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error("Placement coordinates must be finite numbers.");
  }

  return {
    id: globalThis.crypto.randomUUID() as PlacementId,
    canvasId,
    nodeId,
    position: { x: position.x, y: position.y },
  };
}

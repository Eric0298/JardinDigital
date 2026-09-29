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

const APPLICATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateReferences(canvasId: string, nodeId: string) {
  if (canvasId.trim().length === 0) {
    throw new Error("Placement canvasId must not be empty.");
  }

  if (nodeId.trim().length === 0) {
    throw new Error("Placement nodeId must not be empty.");
  }
}

function normalizePosition(position: Position): Position {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error("Placement coordinates must be finite numbers.");
  }

  return { x: position.x, y: position.y };
}

export function createPlacement(
  canvasId: CanvasId,
  nodeId: NodeId,
  position: Position,
): Placement {
  validateReferences(canvasId, nodeId);

  return {
    id: globalThis.crypto.randomUUID() as PlacementId,
    canvasId,
    nodeId,
    position: normalizePosition(position),
  };
}

export function rehydratePlacement(
  id: string,
  canvasId: string,
  nodeId: string,
  position: Position,
): Placement {
  if (!APPLICATION_ID_PATTERN.test(id)) {
    throw new Error("Placement id must be a valid application UUID.");
  }

  if (!APPLICATION_ID_PATTERN.test(canvasId)) {
    throw new Error("Placement canvasId must be a valid application UUID.");
  }

  if (!APPLICATION_ID_PATTERN.test(nodeId)) {
    throw new Error("Placement nodeId must be a valid application UUID.");
  }

  return {
    id: id as PlacementId,
    canvasId: canvasId as CanvasId,
    nodeId: nodeId as NodeId,
    position: normalizePosition(position),
  };
}

export function movePlacement(
  placement: Placement,
  position: Position,
): Placement {
  return {
    id: placement.id,
    canvasId: placement.canvasId,
    nodeId: placement.nodeId,
    position: normalizePosition(position),
  };
}

import type { CanvasId } from "../domain/canvas";
import type { NodeId } from "../domain/node";
import {
  createPlacement,
  type Placement,
  type Position,
} from "../domain/placement";
import type { CanvasPersistence } from "./canvasPersistence";
import type { NodePersistence } from "./nodePersistence";
import type {
  PlacementPersistence,
  PlaceNodePersistenceResult,
} from "./placementPersistence";

export interface PlaceNodeInCanvasDependencies {
  readonly canvasPersistence: Pick<CanvasPersistence, "load">;
  readonly nodePersistence: Pick<NodePersistence, "load">;
  readonly placementPersistence: Pick<PlacementPersistence, "place">;
}

export interface PlaceNodeInCanvasResult {
  readonly placement: Placement | null;
  readonly outcome: PlaceNodePersistenceResult;
}

export async function placeNodeInCanvas(
  dependencies: PlaceNodeInCanvasDependencies,
  nodeId: NodeId,
  canvasId: CanvasId,
  position: Position,
): Promise<PlaceNodeInCanvasResult> {
  const node = await dependencies.nodePersistence.load(nodeId);
  if (node === null) {
    throw new Error("Idea not found.");
  }

  const canvas = await dependencies.canvasPersistence.load(canvasId);
  if (canvas === null) {
    throw new Error("Garden not found.");
  }

  const placement = createPlacement(canvas.id, node.id, position);
  const outcome = await dependencies.placementPersistence.place(placement);

  return {
    outcome,
    placement: outcome === "placed" ? placement : null,
  };
}

import type { CanvasId } from "../domain/canvas";
import { createEdge, type Edge } from "../domain/edge";
import type { Placement, PlacementId } from "../domain/placement";
import type { EdgePersistence } from "./edgePersistence";
import type { PlacementPersistence } from "./placementPersistence";

export interface CreateEdgeInCanvasDependencies {
  readonly edgePersistence: Pick<EdgePersistence, "save">;
  readonly placementPersistence: Pick<PlacementPersistence, "load">;
}

async function loadPlacementInCanvas(
  placementPersistence: Pick<PlacementPersistence, "load">,
  placementId: PlacementId,
  canvasId: CanvasId,
  role: "Source" | "Target",
): Promise<Placement> {
  const placement = await placementPersistence.load(placementId);

  if (placement === null) {
    throw new Error(`${role} Placement not found.`);
  }

  if (placement.canvasId !== canvasId) {
    throw new Error(`${role} Placement does not belong to the active Canvas.`);
  }

  return placement;
}

export async function createEdgeInCanvas(
  dependencies: CreateEdgeInCanvasDependencies,
  canvasId: CanvasId,
  sourcePlacementId: PlacementId,
  targetPlacementId: PlacementId,
): Promise<Edge> {
  const sourcePlacement = await loadPlacementInCanvas(
    dependencies.placementPersistence,
    sourcePlacementId,
    canvasId,
    "Source",
  );
  const targetPlacement = await loadPlacementInCanvas(
    dependencies.placementPersistence,
    targetPlacementId,
    canvasId,
    "Target",
  );
  const edge = createEdge(sourcePlacement.nodeId, targetPlacement.nodeId);

  await dependencies.edgePersistence.save(edge);
  return edge;
}

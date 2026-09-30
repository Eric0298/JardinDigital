import type { CanvasId } from "../domain/canvas";
import type { NodeId } from "../domain/node";
import {
  createPlacement,
  type Placement,
  type Position,
} from "../domain/placement";
import type { CanvasPersistence } from "./canvasPersistence";
import type {
  InboxPersistence,
  PlaceInboxNodePersistenceResult,
} from "./inboxPersistence";
import type { NodePersistence } from "./nodePersistence";

export interface PlaceInboxNodeDependencies {
  readonly canvasPersistence: Pick<CanvasPersistence, "load">;
  readonly inboxPersistence: Pick<InboxPersistence, "contains" | "place">;
  readonly nodePersistence: Pick<NodePersistence, "load">;
}

export interface PlaceInboxNodeResult {
  readonly placement: Placement | null;
  readonly outcome: PlaceInboxNodePersistenceResult;
}

export async function placeInboxNodeInCanvas(
  dependencies: PlaceInboxNodeDependencies,
  nodeId: NodeId,
  canvasId: CanvasId,
  position: Position,
): Promise<PlaceInboxNodeResult> {
  const node = await dependencies.nodePersistence.load(nodeId);
  if (node === null) {
    throw new Error("Idea not found.");
  }

  const canvas = await dependencies.canvasPersistence.load(canvasId);
  if (canvas === null) {
    throw new Error("Garden not found.");
  }

  if (!(await dependencies.inboxPersistence.contains(node.id))) {
    throw new Error("This idea is no longer in Inbox.");
  }

  const placement = createPlacement(canvas.id, node.id, position);
  const outcome = await dependencies.inboxPersistence.place(placement);

  return {
    outcome,
    placement: outcome === "placed" ? placement : null,
  };
}

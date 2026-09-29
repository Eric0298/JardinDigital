import type { CanvasId } from "../domain/canvas";
import { createNode, type Node } from "../domain/node";
import {
  createPlacement,
  type Placement,
  type Position,
} from "../domain/placement";
import type { NodePersistence } from "./nodePersistence";
import type { PlacementPersistence } from "./placementPersistence";

export interface CreateNodeInCanvasDependencies {
  readonly nodePersistence: Pick<NodePersistence, "save">;
  readonly placementPersistence: Pick<PlacementPersistence, "save">;
}

export interface CreatedNodeInCanvas {
  readonly node: Node;
  readonly placement: Placement;
}

export async function createNodeInCanvas(
  dependencies: CreateNodeInCanvasDependencies,
  canvasId: CanvasId,
  title: string,
  position: Position,
): Promise<CreatedNodeInCanvas> {
  const node = createNode(title, "");
  await dependencies.nodePersistence.save(node);

  const placement = createPlacement(canvasId, node.id, position);
  await dependencies.placementPersistence.save(placement);

  return { node, placement };
}

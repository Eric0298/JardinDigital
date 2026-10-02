import type { CanvasId } from "../domain/canvas";
import { createNode, type Node } from "../domain/node";
import {
  createPlacement,
  type Placement,
  type Position,
} from "../domain/placement";
import type { NativeOperations } from "./nativeOperations";

export interface CreateNodeInCanvasDependencies {
  readonly nativeOperations: Pick<NativeOperations, "createNodeInGarden">;
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
  const placement = createPlacement(canvasId, node.id, position);
  await dependencies.nativeOperations.createNodeInGarden(node, placement);

  return { node, placement };
}

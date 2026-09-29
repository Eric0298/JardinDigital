import { createCanvas, type Canvas, type CanvasId } from "../domain/canvas";
import type { Edge } from "../domain/edge";
import { createNode, type Node } from "../domain/node";
import { createPlacement, type Placement } from "../domain/placement";
import type { CanvasPersistence } from "./canvasPersistence";
import type { EdgePersistence } from "./edgePersistence";
import type { NodePersistence } from "./nodePersistence";
import type { PlacementPersistence } from "./placementPersistence";

export interface CanvasView {
  readonly canvas: Canvas;
  readonly nodes: Node[];
  readonly placements: Placement[];
  readonly edges: Edge[];
}

export interface CanvasViewDependencies {
  readonly canvasPersistence: CanvasPersistence;
  readonly edgePersistence: EdgePersistence;
  readonly nodePersistence: NodePersistence;
  readonly placementPersistence: PlacementPersistence;
}

export async function loadCanvasView(
  dependencies: CanvasViewDependencies,
  canvasId: CanvasId,
): Promise<CanvasView | null> {
  const canvas = await dependencies.canvasPersistence.load(canvasId);

  if (canvas === null) {
    return null;
  }

  const placements =
    await dependencies.placementPersistence.loadForCanvas(canvas.id);
  const nodes = await Promise.all(
    placements.map(async (placement) => {
      const node = await dependencies.nodePersistence.load(placement.nodeId);

      if (node === null) {
        throw new Error(
          `Node ${placement.nodeId} referenced by a Placement was not found.`,
        );
      }

      return node;
    }),
  );
  const edges = await dependencies.edgePersistence.loadBetweenNodes(
    placements.map((placement) => placement.nodeId),
  );

  return { canvas, nodes, placements, edges };
}

export async function createDemoCanvas(
  dependencies: CanvasViewDependencies,
): Promise<CanvasView> {
  const canvas = createCanvas("Demo garden");
  const nodes = [
    createNode("Capture", "Collect an idea worth developing."),
    createNode("Connect", "Place related knowledge in context."),
    createNode("Cultivate", "Move ideas as your understanding evolves."),
  ];
  const positions = [
    { x: 0, y: 80 },
    { x: 320, y: 0 },
    { x: 640, y: 120 },
  ];
  const placements = nodes.map((node, index) =>
    createPlacement(canvas.id, node.id, positions[index]),
  );

  await dependencies.canvasPersistence.save(canvas);

  for (const node of nodes) {
    await dependencies.nodePersistence.save(node);
  }

  for (const placement of placements) {
    await dependencies.placementPersistence.save(placement);
  }

  return { canvas, nodes, placements, edges: [] };
}

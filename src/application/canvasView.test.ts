import { describe, expect, it, vi } from "vitest";
import { createCanvas } from "../domain/canvas";
import { createEdge, type Edge } from "../domain/edge";
import { createNode, type Node, type NodeId } from "../domain/node";
import { createPlacement } from "../domain/placement";
import {
  loadCanvasView,
  type CanvasViewDependencies,
} from "./canvasView";

describe("loadCanvasView", () => {
  it("reconstructs Canvas, Placements, Nodes, and only their visible Edges", async () => {
    const canvas = createCanvas("Main");
    const source = createNode("Source");
    const target = createNode("Target");
    const placements = [
      createPlacement(canvas.id, source.id, { x: 0, y: 20 }),
      createPlacement(canvas.id, target.id, { x: 300, y: 40 }),
    ];
    const edge = createEdge(source.id, target.id);
    const nodes = new Map<NodeId, Node>([
      [source.id, source],
      [target.id, target],
    ]);
    const dependencies = {
      canvasPersistence: {
        save: vi.fn(),
        load: vi.fn(async () => canvas),
      },
      nodePersistence: {
        save: vi.fn(),
        load: vi.fn(async (id: NodeId) => nodes.get(id) ?? null),
      },
      placementPersistence: {
        save: vi.fn(),
        load: vi.fn(),
        loadForCanvas: vi.fn(async () => placements),
      },
      edgePersistence: {
        save: vi.fn(async (_edge: Edge) => undefined),
        loadBetweenNodes: vi.fn(async () => [edge]),
      },
    } satisfies CanvasViewDependencies;

    const view = await loadCanvasView(dependencies, canvas.id);

    expect(dependencies.edgePersistence.loadBetweenNodes).toHaveBeenCalledWith([
      source.id,
      target.id,
    ]);
    expect(view).toEqual({
      canvas,
      nodes: [source, target],
      placements,
      edges: [edge],
    });
  });
});

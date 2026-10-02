import { describe, expect, it, vi } from "vitest";
import { createCanvas, type Canvas, type CanvasId } from "../domain/canvas";
import { createNode, type Node, type NodeId } from "../domain/node";
import type { Placement } from "../domain/placement";
import {
  placeNodeInCanvas,
  type PlaceNodeInCanvasDependencies,
} from "./placeNodeInCanvas";
import type { PlaceNodePersistenceResult } from "./placementPersistence";

function setup() {
  const canvas = createCanvas("Main");
  const node = createNode("Existing knowledge");
  const nodes = new Map<NodeId, Node>([[node.id, node]]);
  const canvases = new Map<CanvasId, Canvas>([[canvas.id, canvas]]);
  const inboxMembership = new Set<NodeId>([node.id]);
  const dependencies = {
    nodePersistence: {
      load: vi.fn(async (id: NodeId) => nodes.get(id) ?? null),
    },
    canvasPersistence: {
      load: vi.fn(async (id: CanvasId) => canvases.get(id) ?? null),
    },
    placementPersistence: {
      place: vi.fn(
        async (_placement: Placement): Promise<PlaceNodePersistenceResult> =>
          "placed",
      ),
    },
  } satisfies PlaceNodeInCanvasDependencies;

  return { canvas, node, nodes, canvases, inboxMembership, dependencies };
}

describe("placeNodeInCanvas", () => {
  it("places the same Node identity at the requested deterministic position", async () => {
    const context = setup();

    const result = await placeNodeInCanvas(
      context.dependencies,
      context.node.id,
      context.canvas.id,
      { x: 0, y: 0 },
    );

    expect(result.outcome).toBe("placed");
    expect(result.placement).toMatchObject({
      nodeId: context.node.id,
      canvasId: context.canvas.id,
      position: { x: 0, y: 0 },
    });
    expect(context.dependencies.placementPersistence.place).toHaveBeenCalledWith(
      result.placement,
    );
  });

  it("does not change Inbox membership when placement starts from Library", async () => {
    const context = setup();

    await placeNodeInCanvas(
      context.dependencies,
      context.node.id,
      context.canvas.id,
      { x: 0, y: 0 },
    );

    expect(context.inboxMembership.has(context.node.id)).toBe(true);
  });

  it("returns an understandable duplicate outcome without a new Placement", async () => {
    const context = setup();
    context.dependencies.placementPersistence.place.mockResolvedValueOnce(
      "already-placed",
    );

    await expect(
      placeNodeInCanvas(
        context.dependencies,
        context.node.id,
        context.canvas.id,
        { x: 0, y: 0 },
      ),
    ).resolves.toEqual({ outcome: "already-placed", placement: null });
    expect(context.inboxMembership.has(context.node.id)).toBe(true);
  });

  it("rejects a missing Node before loading the Garden", async () => {
    const context = setup();
    context.nodes.clear();

    await expect(
      placeNodeInCanvas(
        context.dependencies,
        context.node.id,
        context.canvas.id,
        { x: 0, y: 0 },
      ),
    ).rejects.toThrow("Idea not found.");
    expect(context.dependencies.canvasPersistence.load).not.toHaveBeenCalled();
    expect(context.dependencies.placementPersistence.place).not.toHaveBeenCalled();
  });

  it("rejects a missing Garden without changing Inbox", async () => {
    const context = setup();
    context.canvases.clear();

    await expect(
      placeNodeInCanvas(
        context.dependencies,
        context.node.id,
        context.canvas.id,
        { x: 0, y: 0 },
      ),
    ).rejects.toThrow("Garden not found.");
    expect(context.dependencies.placementPersistence.place).not.toHaveBeenCalled();
    expect(context.inboxMembership.has(context.node.id)).toBe(true);
  });

  it("propagates Placement persistence failure without reporting success", async () => {
    const context = setup();
    const failure = new Error("Placement save failed");
    context.dependencies.placementPersistence.place.mockRejectedValueOnce(failure);

    await expect(
      placeNodeInCanvas(
        context.dependencies,
        context.node.id,
        context.canvas.id,
        { x: 0, y: 0 },
      ),
    ).rejects.toBe(failure);
    expect(context.inboxMembership.has(context.node.id)).toBe(true);
  });
});

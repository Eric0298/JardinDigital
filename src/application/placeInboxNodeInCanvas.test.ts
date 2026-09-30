import { describe, expect, it, vi } from "vitest";
import { createCanvas, type CanvasId } from "../domain/canvas";
import { createNode, type Node, type NodeId } from "../domain/node";
import type { Placement } from "../domain/placement";
import type { PlaceInboxNodePersistenceResult } from "./inboxPersistence";
import {
  placeInboxNodeInCanvas,
  type PlaceInboxNodeDependencies,
} from "./placeInboxNodeInCanvas";

function setup() {
  const canvas = createCanvas("Main");
  const node = createNode("Captured");
  const nodes = new Map<NodeId, Node>([[node.id, node]]);
  const canvases = new Map<CanvasId, ReturnType<typeof createCanvas>>([
    [canvas.id, canvas],
  ]);
  let inInbox = true;
  const dependencies = {
    canvasPersistence: {
      load: vi.fn(async (id: CanvasId) => canvases.get(id) ?? null),
    },
    nodePersistence: {
      load: vi.fn(async (id: NodeId) => nodes.get(id) ?? null),
    },
    inboxPersistence: {
      contains: vi.fn(async (_id: NodeId) => inInbox),
      place: vi.fn(async (
        _placement: Placement,
      ): Promise<PlaceInboxNodePersistenceResult> => {
        inInbox = false;
        return "placed" as const;
      }),
    },
  } satisfies PlaceInboxNodeDependencies;

  return {
    canvas,
    node,
    nodes,
    canvases,
    dependencies,
    isInInbox: () => inInbox,
  };
}

describe("placeInboxNodeInCanvas", () => {
  it("creates a Placement for the exact captured Node identity", async () => {
    const context = setup();

    const result = await placeInboxNodeInCanvas(
      context.dependencies,
      context.node.id,
      context.canvas.id,
      { x: 0, y: 0 },
    );

    expect(result.outcome).toBe("placed");
    expect(result.placement?.nodeId).toBe(context.node.id);
    expect(result.placement?.canvasId).toBe(context.canvas.id);
    expect(result.placement?.position).toEqual({ x: 0, y: 0 });
    expect(context.dependencies.inboxPersistence.place).toHaveBeenCalledWith(
      result.placement,
    );
  });

  it("rejects a missing Node before checking the Garden", async () => {
    const context = setup();
    context.nodes.clear();

    await expect(
      placeInboxNodeInCanvas(
        context.dependencies,
        context.node.id,
        context.canvas.id,
        { x: 0, y: 0 },
      ),
    ).rejects.toThrow("Idea not found.");

    expect(context.dependencies.canvasPersistence.load).not.toHaveBeenCalled();
    expect(context.dependencies.inboxPersistence.place).not.toHaveBeenCalled();
  });

  it("rejects a missing Garden without changing Inbox", async () => {
    const context = setup();
    context.canvases.clear();

    await expect(
      placeInboxNodeInCanvas(
        context.dependencies,
        context.node.id,
        context.canvas.id,
        { x: 0, y: 0 },
      ),
    ).rejects.toThrow("Garden not found.");

    expect(context.isInInbox()).toBe(true);
    expect(context.dependencies.inboxPersistence.place).not.toHaveBeenCalled();
  });

  it("rejects a Node that is no longer an Inbox member", async () => {
    const context = setup();
    context.dependencies.inboxPersistence.contains.mockResolvedValueOnce(false);

    await expect(
      placeInboxNodeInCanvas(
        context.dependencies,
        context.node.id,
        context.canvas.id,
        { x: 0, y: 0 },
      ),
    ).rejects.toThrow("This idea is no longer in Inbox.");
    expect(context.dependencies.inboxPersistence.place).not.toHaveBeenCalled();
  });

  it("reports an existing Placement and processes the Inbox membership", async () => {
    const context = setup();
    context.dependencies.inboxPersistence.place.mockImplementationOnce(
      async () => "already-placed" as const,
    );

    const result = await placeInboxNodeInCanvas(
      context.dependencies,
      context.node.id,
      context.canvas.id,
      { x: 0, y: 0 },
    );

    expect(result).toEqual({ outcome: "already-placed", placement: null });
  });

  it("keeps Inbox membership when the atomic Placement transition fails", async () => {
    const context = setup();
    const failure = new Error("placement transaction failed");
    context.dependencies.inboxPersistence.place.mockRejectedValueOnce(failure);

    await expect(
      placeInboxNodeInCanvas(
        context.dependencies,
        context.node.id,
        context.canvas.id,
        { x: 0, y: 0 },
      ),
    ).rejects.toBe(failure);

    expect(context.isInInbox()).toBe(true);
  });

  it("removes membership after success without deleting the Node", async () => {
    const context = setup();

    await placeInboxNodeInCanvas(
      context.dependencies,
      context.node.id,
      context.canvas.id,
      { x: 0, y: 0 },
    );

    expect(context.isInInbox()).toBe(false);
    expect(context.nodes.get(context.node.id)).toBe(context.node);
  });
});

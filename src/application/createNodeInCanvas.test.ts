import { describe, expect, it, vi } from "vitest";
import { createCanvas } from "../domain/canvas";
import type { Node } from "../domain/node";
import type { Placement } from "../domain/placement";
import { createNodeInCanvas } from "./createNodeInCanvas";

function dependencies(events: string[] = []) {
  return {
    nodePersistence: {
      save: vi.fn(async (_node: Node) => {
        events.push("node");
      }),
    },
    placementPersistence: {
      save: vi.fn(async (_placement: Placement) => {
        events.push("placement");
      }),
    },
  };
}

describe("createNodeInCanvas", () => {
  it("creates, persists, and returns a Node and its Placement in order", async () => {
    const events: string[] = [];
    const persistence = dependencies(events);
    const canvas = createCanvas("Main");

    const result = await createNodeInCanvas(
      persistence,
      canvas.id,
      "  Persistent idea  ",
      { x: -35.5, y: 240.25 },
    );

    expect(result.node).toEqual({
      id: expect.any(String),
      title: "Persistent idea",
      content: "",
    });
    expect(result.placement).toEqual({
      id: expect.any(String),
      canvasId: canvas.id,
      nodeId: result.node.id,
      position: { x: -35.5, y: 240.25 },
    });
    expect(persistence.nodePersistence.save).toHaveBeenCalledWith(result.node);
    expect(persistence.placementPersistence.save).toHaveBeenCalledWith(
      result.placement,
    );
    expect(events).toEqual(["node", "placement"]);
  });

  it("does not persist or create a Placement when Domain rejects the Node", async () => {
    const persistence = dependencies();
    const canvas = createCanvas("Main");
    const randomUuid = vi.spyOn(globalThis.crypto, "randomUUID");

    await expect(
      createNodeInCanvas(persistence, canvas.id, "   ", { x: 0, y: 0 }),
    ).rejects.toThrow("Node title and content must not both be empty.");

    expect(randomUuid).not.toHaveBeenCalled();
    expect(persistence.nodePersistence.save).not.toHaveBeenCalled();
    expect(persistence.placementPersistence.save).not.toHaveBeenCalled();
    randomUuid.mockRestore();
  });

  it("propagates a Node save failure without creating a Placement", async () => {
    const persistence = dependencies();
    const canvas = createCanvas("Main");
    const failure = new Error("Node save failed");
    persistence.nodePersistence.save.mockRejectedValueOnce(failure);
    const randomUuid = vi.spyOn(globalThis.crypto, "randomUUID");

    await expect(
      createNodeInCanvas(persistence, canvas.id, "Idea", { x: 10, y: 20 }),
    ).rejects.toBe(failure);

    expect(randomUuid).toHaveBeenCalledTimes(1);
    expect(persistence.placementPersistence.save).not.toHaveBeenCalled();
    randomUuid.mockRestore();
  });

  it("propagates a Placement save failure after the Node was saved", async () => {
    const persistence = dependencies();
    const canvas = createCanvas("Main");
    const failure = new Error("Placement save failed");
    persistence.placementPersistence.save.mockRejectedValueOnce(failure);

    await expect(
      createNodeInCanvas(persistence, canvas.id, "Idea", { x: 10, y: 20 }),
    ).rejects.toBe(failure);

    expect(persistence.nodePersistence.save).toHaveBeenCalledOnce();
    expect(persistence.placementPersistence.save).toHaveBeenCalledOnce();
  });
});

import { describe, expect, it, vi } from "vitest";
import { createCanvas } from "../domain/canvas";
import type { Node } from "../domain/node";
import type { Placement } from "../domain/placement";
import { createNodeInCanvas } from "./createNodeInCanvas";

function dependencies() {
  return {
    nativeOperations: {
      createNodeInGarden: vi.fn(async (_node: Node, _placement: Placement) => undefined),
    },
  };
}

describe("createNodeInCanvas", () => {
  it("creates and persists Node and Placement through one atomic native operation", async () => {
    const persistence = dependencies();
    const canvas = createCanvas("Main");
    const result = await createNodeInCanvas(persistence, canvas.id, "  Idea  ", { x: 2, y: 3 });
    expect(result.node.title).toBe("Idea");
    expect(result.placement.nodeId).toBe(result.node.id);
    expect(persistence.nativeOperations.createNodeInGarden).toHaveBeenCalledWith(result.node, result.placement);
  });

  it("does not write invalid Nodes", async () => {
    const persistence = dependencies();
    await expect(createNodeInCanvas(persistence, createCanvas("Main").id, " ", { x: 0, y: 0 })).rejects.toThrow();
    expect(persistence.nativeOperations.createNodeInGarden).not.toHaveBeenCalled();
  });

  it("propagates a failed atomic operation", async () => {
    const persistence = dependencies();
    const failure = new Error("Write failed");
    persistence.nativeOperations.createNodeInGarden.mockRejectedValueOnce(failure);
    await expect(createNodeInCanvas(persistence, createCanvas("Main").id, "Idea", { x: 0, y: 0 })).rejects.toBe(failure);
  });
});

import { describe, expect, it, vi } from "vitest";
import { createNode, type Node, type NodeId } from "../domain/node";
import {
  persistNodeEdit,
  type NodePersistence,
} from "./nodePersistence";

function persistence() {
  return {
    save: vi.fn(async (_node: Node) => undefined),
    load: vi.fn(async (_id: NodeId) => null),
  } satisfies NodePersistence;
}

describe("persistNodeEdit", () => {
  it("normalizes and persists an edited Node without changing its identity", async () => {
    const nodePersistence = persistence();
    const original = createNode("Original", "Initial content");

    const edited = await persistNodeEdit(
      nodePersistence,
      original,
      "  Updated title  ",
      "  Updated content  ",
    );

    expect(edited).toEqual({
      id: original.id,
      title: "Updated title",
      content: "Updated content",
    });
    expect(nodePersistence.save).toHaveBeenCalledOnce();
    expect(nodePersistence.save).toHaveBeenCalledWith(edited);
  });

  it("propagates persistence errors", async () => {
    const nodePersistence = persistence();
    const original = createNode("Original");
    const failure = new Error("Node save failed");
    nodePersistence.save.mockRejectedValueOnce(failure);

    await expect(
      persistNodeEdit(nodePersistence, original, "Updated", "Content"),
    ).rejects.toBe(failure);
  });

  it("does not persist an edit rejected by Domain", async () => {
    const nodePersistence = persistence();
    const original = createNode("Original");

    await expect(
      persistNodeEdit(nodePersistence, original, "   ", "   "),
    ).rejects.toThrow("Node title and content must not both be empty.");

    expect(nodePersistence.save).not.toHaveBeenCalled();
  });
});

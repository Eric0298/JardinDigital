import { describe, expect, it, vi } from "vitest";
import { createNode, type Node, type NodeId } from "../domain/node";
import {
  persistNodeEdit,
  normalizeNodePageQuery,
  type NodePersistence,
} from "./nodePersistence";

function persistence() {
  return {
    save: vi.fn(async (_node: Node) => undefined),
    load: vi.fn(async (_id: NodeId) => null),
    list: vi.fn(async (): Promise<Node[]> => []),
    loadMany: vi.fn(async (_ids: readonly NodeId[]): Promise<Node[]> => []),
    search: vi.fn(async (_query: string): Promise<Node[]> => []),
    queryPage: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20 })),
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

describe("normalizeNodePageQuery", () => {
  it("trims terms and bounds page numbers and sizes before reaching persistence", () => {
    expect(normalizeNodePageQuery({ query: " salvia ", page: 2.9, pageSize: 20.9 })).toEqual({ query: "salvia", page: 2, pageSize: 20 });
    expect(normalizeNodePageQuery({ query: "", page: -3, pageSize: 0 })).toEqual({ query: "", page: 1, pageSize: 1 });
    expect(normalizeNodePageQuery({ query: "", page: Infinity, pageSize: NaN })).toEqual({ query: "", page: 1, pageSize: 20 });
    expect(normalizeNodePageQuery({ query: "", page: Number.MAX_VALUE, pageSize: 1000 })).toEqual({ query: "", page: Number.MAX_SAFE_INTEGER, pageSize: 100 });
  });
});

import { describe, expect, it, vi } from "vitest";
import { createEdge, type EdgeId } from "../domain/edge";
import { createNode } from "../domain/node";
import { deleteEdge } from "./edgePersistence";

describe("deleteEdge", () => {
  it("deletes the requested Domain Edge", async () => {
    const source = createNode("Source");
    const target = createNode("Target");
    const edge = createEdge(source.id, target.id);
    const persistence = {
      delete: vi.fn(async (_id: EdgeId) => undefined),
    };

    await deleteEdge(persistence, edge.id);

    expect(persistence.delete).toHaveBeenCalledOnce();
    expect(persistence.delete).toHaveBeenCalledWith(edge.id);
  });

  it("propagates persistence failure", async () => {
    const failure = new Error("Edge delete failed");
    const persistence = {
      delete: vi.fn(async (_id: EdgeId) => {
        throw failure;
      }),
    };

    await expect(
      deleteEdge(
        persistence,
        "b9df42c8-b8c8-4ac6-8ae5-67a6c61ed2b3" as EdgeId,
      ),
    ).rejects.toBe(failure);
  });
});

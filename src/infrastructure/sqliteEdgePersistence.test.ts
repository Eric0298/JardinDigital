import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEdge, type EdgeId } from "../domain/edge";
import { createNode, type NodeId } from "../domain/node";
import { createSqliteEdgePersistence } from "./sqliteEdgePersistence";

const database = vi.hoisted(() => ({
  execute: vi.fn(),
  select: vi.fn(),
}));

vi.mock("./sqliteDatabase", () => ({
  jardindigitalDatabase: vi.fn(async () => database),
}));

describe("SQLite Edge persistence", () => {
  beforeEach(() => {
    database.execute.mockReset();
    database.select.mockReset();
    database.execute.mockResolvedValue(undefined);
    database.select.mockResolvedValue([]);
  });

  it("saves only the persistent Domain Edge fields", async () => {
    const source = createNode("Source");
    const target = createNode("Target");
    const edge = createEdge(source.id, target.id);
    const persistence = createSqliteEdgePersistence();

    await persistence.save(edge);

    expect(database.execute).toHaveBeenCalledOnce();
    expect(database.execute.mock.calls[0][0]).toContain("INSERT INTO edges");
    expect(database.execute.mock.calls[0][1]).toEqual([
      edge.id,
      source.id,
      target.id,
    ]);
  });

  it("loads and rehydrates Edges whose two endpoints are visible", async () => {
    const edgeId = "b9df42c8-b8c8-4ac6-8ae5-67a6c61ed2b3";
    const sourceNodeId = "d76f7bb8-9f8f-4f5c-b8a4-4d46202ce34a";
    const targetNodeId = "bd6f5914-d63b-4a98-bac5-f65518c1945e";
    database.select.mockResolvedValueOnce([
      {
        id: edgeId,
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
      },
    ]);
    const persistence = createSqliteEdgePersistence();

    const edges = await persistence.loadBetweenNodes([
      sourceNodeId as NodeId,
      targetNodeId as NodeId,
    ]);

    expect(database.select).toHaveBeenCalledOnce();
    expect(database.select.mock.calls[0][0]).toContain(
      "source_node_id IN ($1, $2)",
    );
    expect(database.select.mock.calls[0][0]).toContain(
      "target_node_id IN ($1, $2)",
    );
    expect(database.select.mock.calls[0][1]).toEqual([
      sourceNodeId,
      targetNodeId,
    ]);
    expect(edges).toEqual([
      { id: edgeId, sourceNodeId, targetNodeId },
    ]);
  });

  it("does not query SQLite when the Canvas has no Nodes", async () => {
    const persistence = createSqliteEdgePersistence();

    await expect(persistence.loadBetweenNodes([])).resolves.toEqual([]);

    expect(database.select).not.toHaveBeenCalled();
  });

  it("deletes an Edge with a parameterized statement", async () => {
    const persistence = createSqliteEdgePersistence();
    const edgeId = "b9df42c8-b8c8-4ac6-8ae5-67a6c61ed2b3";

    await persistence.delete(edgeId as EdgeId);

    expect(database.execute).toHaveBeenCalledOnce();
    expect(database.execute).toHaveBeenCalledWith(
      "DELETE FROM edges WHERE id = $1",
      [edgeId],
    );
  });
});

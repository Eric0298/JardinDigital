import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCanvas } from "../domain/canvas";
import { createNode } from "../domain/node";
import { createPlacement } from "../domain/placement";
import { PlacementPersistenceError } from "../application/placementPersistence";
import { createSqlitePlacementPersistence } from "./sqlitePlacementPersistence";

const database = vi.hoisted(() => ({
  execute: vi.fn(),
  select: vi.fn(),
}));

vi.mock("./sqliteDatabase", () => ({
  jardindigitalDatabase: vi.fn(async () => database),
}));

describe("SQLite Placement persistence", () => {
  beforeEach(() => {
    database.execute.mockReset();
    database.select.mockReset();
    database.execute.mockResolvedValue({ rowsAffected: 1 });
    database.select.mockResolvedValue([]);
  });

  it("lists and rehydrates all Placements in deterministic order", async () => {
    const rows = [
      {
        id: "e0be9022-d56c-402a-a4f3-632f57d9363f",
        canvas_id: "30a50c27-b1f4-48ae-a9b4-ece2c2da2d31",
        node_id: "d76f7bb8-9f8f-4f5c-b8a4-4d46202ce34a",
        x: 1,
        y: 2,
      },
    ];
    database.select.mockResolvedValueOnce(rows);

    const placements = await createSqlitePlacementPersistence().list();

    expect(database.select.mock.calls[0]?.[0]).toContain(
      "ORDER BY canvas_id, node_id, id",
    );
    expect(placements).toEqual([
      {
        id: rows[0].id,
        canvasId: rows[0].canvas_id,
        nodeId: rows[0].node_id,
        position: { x: 1, y: 2 },
      },
    ]);
  });

  it("places an existing Node with one parameterized insert", async () => {
    const node = createNode("Knowledge");
    const garden = createCanvas("Garden");
    const placement = createPlacement(garden.id, node.id, { x: 0, y: 0 });

    await expect(
      createSqlitePlacementPersistence().place(placement),
    ).resolves.toBe("placed");

    expect(database.execute.mock.calls[0]?.[0]).toContain(
      "ON CONFLICT(canvas_id, node_id) DO NOTHING",
    );
    expect(database.execute.mock.calls[0]?.[1]).toEqual([
      placement.id,
      garden.id,
      node.id,
      0,
      0,
    ]);
  });

  it("reports the existing unique Placement without inserting a duplicate", async () => {
    const node = createNode("Knowledge");
    const garden = createCanvas("Garden");
    const placement = createPlacement(garden.id, node.id, { x: 0, y: 0 });
    database.execute.mockResolvedValueOnce({ rowsAffected: 0 });

    await expect(
      createSqlitePlacementPersistence().place(placement),
    ).resolves.toBe("already-placed");
  });

  it("deletes only the requested Placement with a parameterized statement", async () => {
    const node = createNode("Knowledge");
    const garden = createCanvas("Garden");
    const placement = createPlacement(garden.id, node.id, { x: 0, y: 0 });

    await createSqlitePlacementPersistence().delete(placement.id);

    expect(database.execute).toHaveBeenCalledWith(
      "DELETE FROM placements WHERE id = $1",
      [placement.id],
    );
  });

  it("wraps placement and removal persistence failures", async () => {
    const node = createNode("Knowledge");
    const garden = createCanvas("Garden");
    const placement = createPlacement(garden.id, node.id, { x: 0, y: 0 });
    database.execute.mockRejectedValue(new Error("SQLite failure"));

    await expect(
      createSqlitePlacementPersistence().place(placement),
    ).rejects.toBeInstanceOf(PlacementPersistenceError);
    await expect(
      createSqlitePlacementPersistence().delete(placement.id),
    ).rejects.toBeInstanceOf(PlacementPersistenceError);
  });
});

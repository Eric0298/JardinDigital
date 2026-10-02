import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCanvas } from "../domain/canvas";
import { GardenSummaryError } from "../application/gardenSummary";
import { createSqliteGardenSummaryQuery, GARDEN_SUMMARY_SQL } from "./sqliteGardenSummary";

const database = vi.hoisted(() => ({ select: vi.fn(), execute: vi.fn() }));
vi.mock("./sqliteDatabase", () => ({ jardindigitalDatabase: vi.fn(async () => database) }));
beforeEach(() => { database.select.mockReset(); database.execute.mockReset(); database.select.mockResolvedValue([]); });

describe("SQLite batch garden summary", () => {
  it("loads only aggregate counters for all gardens in one read and preserves empty gardens", async () => {
    const gardens = [createCanvas("Pequeño"), createCanvas("Vacío")];
    database.select.mockResolvedValue([{ garden_id: gardens[0].id, idea_count: 4, connection_count: 3, resource_count: 7 }, { garden_id: gardens[1].id, idea_count: 0, connection_count: 0, resource_count: 0 }]);
    expect(await createSqliteGardenSummaryQuery().load()).toEqual([
      { gardenId: gardens[0].id, ideaCount: 4, connectionCount: 3, resourceCount: 7 },
      { gardenId: gardens[1].id, ideaCount: 0, connectionCount: 0, resourceCount: 0 },
    ]);
    expect(database.select).toHaveBeenCalledOnce();
    expect(database.select).toHaveBeenCalledWith(GARDEN_SUMMARY_SQL);
    expect(database.execute).not.toHaveBeenCalled();
    expect(GARDEN_SUMMARY_SQL).not.toContain("content");
    expect(GARDEN_SUMMARY_SQL).not.toContain("locator");
  });

  it("counts real SQLite shared ideas, self and duplicate edges, and resources without join multiplication", async () => {
    interface MemoryDatabase {
      exec(sql: string): void;
      prepare(sql: string): { all(): unknown[]; run(bindings: Record<string, string>): void };
      close(): void;
    }
    const sqlite = await import("node:sqlite" as string) as { DatabaseSync: new (path: string) => MemoryDatabase };
    const db = new sqlite.DatabaseSync(":memory:");
    const [both, shared, empty, duplicatePlacement] = [createCanvas("Ambas ideas"), createCanvas("Idea compartida"), createCanvas("Vacío"), createCanvas("Colocaciones duplicadas")];
    try {
      db.exec(`CREATE TABLE canvases (id TEXT PRIMARY KEY);
        CREATE TABLE placements (id TEXT PRIMARY KEY, canvas_id TEXT, node_id TEXT);
        CREATE TABLE edges (id TEXT PRIMARY KEY, source_node_id TEXT, target_node_id TEXT);
        CREATE TABLE resources (id TEXT PRIMARY KEY, node_id TEXT);`);
      const canvas = db.prepare("INSERT INTO canvases VALUES ($1)");
      for (const garden of [both, shared, empty, duplicatePlacement]) canvas.run({ $1: garden.id });
      const placement = db.prepare("INSERT INTO placements VALUES ($1, $2, $3)");
      for (const [id, gardenId, nodeId] of [
        ["p1", both.id, "a"], ["p2", both.id, "b"], ["p3", shared.id, "a"],
        ["p4", duplicatePlacement.id, "a"], ["p5", duplicatePlacement.id, "b"], ["p6", duplicatePlacement.id, "a"],
      ]) placement.run({ $1: id, $2: gardenId, $3: nodeId });
      const edge = db.prepare("INSERT INTO edges VALUES ($1, $2, $3)");
      for (const [id, source, target] of [
        ["ab1", "a", "b"], ["ab2", "a", "b"], ["ba", "b", "a"],
        ["aa", "a", "a"], ["bc", "b", "c"], ["ca", "c", "a"],
      ]) edge.run({ $1: id, $2: source, $3: target });
      const resource = db.prepare("INSERT INTO resources VALUES ($1, $2)");
      for (const [id, nodeId] of [["r1", "a"], ["r2", "a"], ["r3", "b"], ["r4", "c"]]) resource.run({ $1: id, $2: nodeId });
      database.select.mockImplementation(async (sql: string) => db.prepare(sql).all());

      expect(await createSqliteGardenSummaryQuery().load()).toEqual([
        { gardenId: both.id, ideaCount: 2, connectionCount: 4, resourceCount: 3 },
        { gardenId: shared.id, ideaCount: 1, connectionCount: 1, resourceCount: 2 },
        { gardenId: empty.id, ideaCount: 0, connectionCount: 0, resourceCount: 0 },
        { gardenId: duplicatePlacement.id, ideaCount: 2, connectionCount: 4, resourceCount: 3 },
      ].sort((left, right) => left.gardenId.localeCompare(right.gardenId)));
      expect(database.select).toHaveBeenCalledOnce();
      expect(database.execute).not.toHaveBeenCalled();
    } finally { db.close(); }
  });

  it("reports failed or malformed reads without treating them as zero growth", async () => {
    const garden = createCanvas("Una idea");
    database.select.mockResolvedValueOnce([{ garden_id: garden.id, idea_count: -1, connection_count: 0, resource_count: 0 }]);
    await expect(createSqliteGardenSummaryQuery().load()).rejects.toBeInstanceOf(GardenSummaryError);
    database.select.mockRejectedValueOnce(new Error("Unavailable"));
    await expect(createSqliteGardenSummaryQuery().load()).rejects.toThrow("No se pudo cargar el resumen");
    database.select.mockResolvedValueOnce([{ garden_id: "invalid", idea_count: 1, connection_count: 0, resource_count: 0 }]);
    await expect(createSqliteGardenSummaryQuery().load()).rejects.toBeInstanceOf(GardenSummaryError);
  });
});

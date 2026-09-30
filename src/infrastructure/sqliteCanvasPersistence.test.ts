import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSqliteCanvasPersistence } from "./sqliteCanvasPersistence";

const database = vi.hoisted(() => ({
  execute: vi.fn(),
  select: vi.fn(),
}));

vi.mock("./sqliteDatabase", () => ({
  jardindigitalDatabase: vi.fn(async () => database),
}));

describe("SQLite Canvas persistence", () => {
  beforeEach(() => {
    database.execute.mockReset();
    database.select.mockReset();
    database.execute.mockResolvedValue(undefined);
    database.select.mockResolvedValue([]);
  });

  it("lists and rehydrates Canvases in deterministic title and id order", async () => {
    const first = {
      id: "30a50c27-b1f4-48ae-a9b4-ece2c2da2d31",
      title: "Alpha",
    };
    const second = {
      id: "d76f7bb8-9f8f-4f5c-b8a4-4d46202ce34a",
      title: "Beta",
    };
    database.select.mockResolvedValueOnce([first, second]);
    const persistence = createSqliteCanvasPersistence();

    const canvases = await persistence.list();

    expect(database.select).toHaveBeenCalledOnce();
    expect(database.select.mock.calls[0][0]).toContain(
      "ORDER BY title COLLATE NOCASE, id",
    );
    expect(canvases).toEqual([first, second]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSqliteSettingsPersistence } from "./sqliteSettingsPersistence";

const database = vi.hoisted(() => ({ execute: vi.fn(), select: vi.fn() }));
vi.mock("./sqliteDatabase", () => ({ jardindigitalDatabase: vi.fn(async () => database) }));

describe("SQLite appearance settings", () => {
  beforeEach(() => { database.execute.mockReset(); database.select.mockReset(); });

  it("loads and saves the supported values", async () => {
    database.select.mockResolvedValueOnce([{ theme: "dark", canvas_background: "grid" }]);
    const settings = createSqliteSettingsPersistence();
    expect(await settings.load()).toEqual({ theme: "dark", canvasBackground: "grid" });
    await settings.save({ theme: "system", canvasBackground: "dots" });
    expect(database.execute).toHaveBeenCalledWith(expect.stringContaining("UPDATE appearance_settings"), ["system", "dots"]);
  });

  it("rejects missing settings instead of silently overwriting them", async () => {
    database.select.mockResolvedValueOnce([]);
    await expect(createSqliteSettingsPersistence().load()).rejects.toThrow();
  });
});

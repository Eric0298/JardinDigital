import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCanvas } from "../domain/canvas";
import { createNode } from "../domain/node";
import { createPlacement } from "../domain/placement";
import { InboxPersistenceError } from "../application/inboxPersistence";
import { createSqliteInboxPersistence } from "./sqliteInboxPersistence";

const database = vi.hoisted(() => ({
  execute: vi.fn(),
  select: vi.fn(),
}));

vi.mock("./sqliteDatabase", () => ({
  jardindigitalDatabase: vi.fn(async () => database),
}));

describe("SQLite Inbox persistence", () => {
  beforeEach(() => {
    database.execute.mockReset();
    database.select.mockReset();
    database.execute.mockResolvedValue(undefined);
    database.select.mockResolvedValue([]);
  });

  it("captures Node and Inbox membership through one parameterized statement", async () => {
    const node = createNode("Captured", "Content");

    await createSqliteInboxPersistence().capture(node);

    expect(database.execute).toHaveBeenCalledOnce();
    expect(database.execute.mock.calls[0]?.[0]).toContain(
      "INSERT INTO capture_operations",
    );
    expect(database.execute.mock.calls[0]?.[1]).toEqual([
      node.id,
      node.title,
      node.content,
    ]);
  });

  it("does not report capture success when the atomic statement fails", async () => {
    database.execute.mockRejectedValueOnce(new Error("SQLite failure"));

    await expect(
      createSqliteInboxPersistence().capture(createNode("Captured")),
    ).rejects.toBeInstanceOf(InboxPersistenceError);
  });

  it("lists rehydrated Nodes in deterministic label and id order", async () => {
    const rows = [
      {
        id: "30a50c27-b1f4-48ae-a9b4-ece2c2da2d31",
        title: "Alpha",
        content: "",
      },
      {
        id: "d76f7bb8-9f8f-4f5c-b8a4-4d46202ce34a",
        title: "",
        content: "Beta",
      },
    ];
    database.select.mockResolvedValueOnce(rows);

    const nodes = await createSqliteInboxPersistence().list();

    expect(database.select.mock.calls[0]?.[0]).toContain("COLLATE NOCASE");
    expect(database.select.mock.calls[0]?.[0]).toContain("nodes.id");
    expect(nodes).toEqual(rows);
  });

  it("checks membership with a parameterized Node identity", async () => {
    const node = createNode("Captured");
    database.select.mockResolvedValueOnce([{ node_id: node.id }]);

    await expect(
      createSqliteInboxPersistence().contains(node.id),
    ).resolves.toBe(true);
    expect(database.select.mock.calls[0]?.[1]).toEqual([node.id]);
  });

  it("returns false when membership is absent", async () => {
    const node = createNode("Captured");
    await expect(
      createSqliteInboxPersistence().contains(node.id),
    ).resolves.toBe(false);
  });

  it("places through one atomic transition statement", async () => {
    const canvas = createCanvas("Main");
    const node = createNode("Captured");
    const placement = createPlacement(canvas.id, node.id, { x: 0, y: 0 });

    await expect(
      createSqliteInboxPersistence().place(placement),
    ).resolves.toBe("placed");

    expect(database.execute).toHaveBeenCalledOnce();
    expect(database.execute.mock.calls[0]?.[0]).toContain(
      "INSERT INTO inbox_placement_operations",
    );
    expect(database.execute.mock.calls[0]?.[1]).toEqual([
      placement.id,
      canvas.id,
      node.id,
      0,
      0,
    ]);
  });

  it("processes a duplicate Placement without attempting a second direct insert", async () => {
    const canvas = createCanvas("Main");
    const node = createNode("Captured");
    const placement = createPlacement(canvas.id, node.id, { x: 0, y: 0 });
    database.select.mockResolvedValueOnce([{ id: "existing-placement" }]);

    await expect(
      createSqliteInboxPersistence().place(placement),
    ).resolves.toBe("already-placed");
    expect(database.execute).toHaveBeenCalledOnce();
    expect(database.execute.mock.calls[0]?.[0]).not.toContain(
      "INSERT INTO placements",
    );
  });

  it("does not report placement success when the atomic statement fails", async () => {
    const canvas = createCanvas("Main");
    const node = createNode("Captured");
    const placement = createPlacement(canvas.id, node.id, { x: 0, y: 0 });
    database.execute.mockRejectedValueOnce(new Error("SQLite failure"));

    await expect(
      createSqliteInboxPersistence().place(placement),
    ).rejects.toBeInstanceOf(InboxPersistenceError);
  });
});

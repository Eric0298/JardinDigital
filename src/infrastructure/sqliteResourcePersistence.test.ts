import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidPersistedResourceError, ResourcePersistenceError } from "../application/resourcePersistence";
import { createNode } from "../domain/node";
import { createResource } from "../domain/resource";
import { createSqliteResourcePersistence } from "./sqliteResourcePersistence";

const database = vi.hoisted(() => ({ execute: vi.fn(), select: vi.fn() }));
vi.mock("./sqliteDatabase", () => ({ jardindigitalDatabase: vi.fn(async () => database) }));

describe("SQLite Resource persistence", () => {
  beforeEach(() => {
    database.execute.mockReset();
    database.select.mockReset().mockResolvedValue([]);
  });

  it("persists only identity, association and linked metadata using bound values", async () => {
    const resource = createResource(createNode("Idea").id, "document", "Original", "C:/docs/original.pdf", "local");
    await createSqliteResourcePersistence().save(resource);
    expect(database.execute).toHaveBeenCalledWith(expect.stringContaining("ON CONFLICT(id)"), [resource.id, resource.nodeId, "document", "Original", "C:/docs/original.pdf", "local"]);
    expect(database.execute.mock.calls[0][0]).not.toContain(resource.locator);
  });

  it("loads associated resources and rehydrates identities even if their linked file is missing", async () => {
    const resource = createResource(createNode("Idea").id, "video", "Video", "C:/missing/video.mp4", "local");
    database.select.mockResolvedValueOnce([{ id: resource.id, node_id: resource.nodeId, kind: resource.kind, title: resource.title, locator: resource.locator, location: resource.location }]);
    expect(await createSqliteResourcePersistence().listByNode(resource.nodeId)).toEqual([resource]);
    expect(database.select).toHaveBeenCalledWith(expect.stringContaining("WHERE node_id IN ($1)"), [resource.nodeId]);
  });

  it("skips empty sets and deduplicates/batches large canvas loads", async () => {
    const persistence = createSqliteResourcePersistence();
    expect(await persistence.listByNodes([])).toEqual([]);
    expect(database.select).not.toHaveBeenCalled();
    const ids = Array.from({ length: 501 }, () => createNode("Idea").id);
    await persistence.listByNodes([...ids, ids[0]]);
    expect(database.select).toHaveBeenCalledTimes(2);
    expect(database.select.mock.calls[0][1]).toHaveLength(500);
    expect(database.select.mock.calls[1][1]).toEqual([ids[500]]);
  });

  it("removes only resource metadata", async () => {
    const resource = createResource(createNode("Idea").id, "document", "File", "C:/file.pdf", "local");
    await createSqliteResourcePersistence().remove(resource.id);
    expect(database.execute).toHaveBeenCalledExactlyOnceWith("DELETE FROM resources WHERE id = $1", [resource.id]);
  });

  it("rejects corrupt metadata and reports storage failures in Spanish", async () => {
    const resource = createResource(createNode("Idea").id, "link", "Link", "https://example.com", "url");
    database.select.mockResolvedValueOnce([{ id: resource.id, node_id: resource.nodeId, kind: "link", title: "Link", locator: "javascript:alert(1)", location: "url" }]);
    await expect(createSqliteResourcePersistence().listByNode(resource.nodeId)).rejects.toBeInstanceOf(InvalidPersistedResourceError);
    database.execute.mockRejectedValueOnce(new Error("disk"));
    await expect(createSqliteResourcePersistence().save(resource)).rejects.toBeInstanceOf(ResourcePersistenceError);
  });
});

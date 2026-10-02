import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidPersistedNodeError, NodePersistenceError } from "../application/nodePersistence";
import { createNode, type Node } from "../domain/node";
import { createSqliteNodePersistence } from "./sqliteNodePersistence";

const database = vi.hoisted(() => ({
  execute: vi.fn(),
  select: vi.fn(),
}));

vi.mock("./sqliteDatabase", () => ({
  jardindigitalDatabase: vi.fn(async () => database),
}));

// The test runner is Node 22+; the application bundle never imports this backend.
interface MemoryDatabase {
  exec(sql: string): void;
  prepare(sql: string): { all(bindings?: Record<string, unknown>): unknown[]; run(bindings: Record<string, unknown>): void };
  close(): void;
}

async function realSqlite(nodes: readonly Node[]) {
  const sqlite = await import("node:sqlite" as string) as { DatabaseSync: new (path: string) => MemoryDatabase };
  const db = new sqlite.DatabaseSync(":memory:");
  db.exec("CREATE TABLE nodes (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL)");
  const insert = db.prepare("INSERT INTO nodes (id, title, content) VALUES ($1, $2, $3)");
  for (const node of nodes) insert.run({ $1: node.id, $2: node.title, $3: node.content });
  database.select.mockImplementation(async (sql: string, values: readonly unknown[] = []) => db.prepare(sql).all(Object.fromEntries(values.map((value, index) => [`$${index + 1}`, value]))));
  return db;
}

describe("SQLite Node persistence", () => {
  beforeEach(() => {
    database.execute.mockReset();
    database.select.mockReset();
    database.select.mockResolvedValue([]);
  });

  it("lists and rehydrates every Node in deterministic visible-label and id order", async () => {
    const rows = [
      {
        id: "30a50c27-b1f4-48ae-a9b4-ece2c2da2d31",
        title: "Alpha",
        content: "",
      },
      {
        id: "d76f7bb8-9f8f-4f5c-b8a4-4d46202ce34a",
        title: "",
        content: "Beta content",
      },
      {
        id: "bd6f5914-d63b-4a98-bac5-f65518c1945e",
        title: "Gamma",
        content: "Full content",
      },
    ];
    database.select.mockResolvedValueOnce(rows);

    const nodes = await createSqliteNodePersistence().list();

    expect(database.select).toHaveBeenCalledOnce();
    expect(database.select.mock.calls[0]?.[0]).toContain(
      "CASE WHEN title = '' THEN content ELSE title END COLLATE NOCASE",
    );
    expect(database.select.mock.calls[0]?.[0]).toContain("id");
    expect(nodes).toEqual(rows);
  });

  it("returns an empty Library source when no Nodes exist", async () => {
    await expect(createSqliteNodePersistence().list()).resolves.toEqual([]);
  });

  it("rejects invalid persisted rows instead of exposing SQL data", async () => {
    database.select.mockResolvedValueOnce([
      { id: "not-a-uuid", title: "Broken", content: "" },
    ]);

    await expect(createSqliteNodePersistence().list()).rejects.toBeInstanceOf(
      InvalidPersistedNodeError,
    );
  });

  it("searches title and content with a parameterized literal pattern", async () => {
    const result = await createSqliteNodePersistence().search("  100%_garden  ");
    expect(result).toEqual([]);
    expect(database.select).toHaveBeenCalledWith(
      expect.stringContaining("title LIKE $1"),
      ["%100\\%\\_garden%"],
    );
  });

  it("does not query for empty search", async () => {
    await expect(createSqliteNodePersistence().search("  ")).resolves.toEqual([]);
    expect(database.select).not.toHaveBeenCalled();
  });

  it("loads multiple Nodes in one query", async () => {
    await createSqliteNodePersistence().loadMany([
      "30a50c27-b1f4-48ae-a9b4-ece2c2da2d31" as never,
      "d76f7bb8-9f8f-4f5c-b8a4-4d46202ce34a" as never,
    ]);
    expect(database.select).toHaveBeenCalledOnce();
    expect(database.select.mock.calls[0]?.[0]).toContain("WHERE id IN ($1, $2)");
  });

  it("pages real SQLite rows with a stable order, exact total, and a bounded last page", async () => {
    const nodes = Array.from({ length: 43 }, (_, index) => createNode(`Idea ${String(index).padStart(2, "0")}`)).reverse();
    const db = await realSqlite(nodes);
    try {
      const persistence = createSqliteNodePersistence();
      const first = await persistence.queryPage({ query: "", page: 1, pageSize: 20 });
      const middle = await persistence.queryPage({ query: "", page: 2, pageSize: 20 });
      const last = await persistence.queryPage({ query: "", page: 99, pageSize: 20 });
      expect(first).toMatchObject({ total: 43, page: 1, pageSize: 20 });
      expect(first.items).toHaveLength(20);
      expect(first.items[0]?.title).toBe("Idea 00");
      expect(middle.items).toHaveLength(20);
      expect(middle.items[0]?.title).toBe("Idea 20");
      expect(last).toMatchObject({ total: 43, page: 3, pageSize: 20 });
      expect(last.items.map((node) => node.title)).toEqual(["Idea 40", "Idea 41", "Idea 42"]);
      expect(new Set([...first.items, ...middle.items, ...last.items].map((node) => node.id)).size).toBe(43);
      expect(database.select.mock.calls[1]?.[1]).toEqual([20, 0]);
      expect(database.select.mock.calls[3]?.[1]).toEqual([20, 20]);
      expect(database.select.mock.calls[5]?.[1]).toEqual([20, 40]);
    } finally { db.close(); }
  });

  it("matches title and content live terms and treats wildcard, slash, and quote characters literally", async () => {
    const title = createNode("Plantas de salvia", "Otro contenido");
    const content = createNode("Notas", "Conexiones con salvia");
    const literal = createNode("100%_\\ ' OR 1=1 --", "Consulta literal");
    const decoy = createNode("100XX garden", "Sin coincidencia");
    const db = await realSqlite([title, content, literal, decoy]);
    try {
      const persistence = createSqliteNodePersistence();
      const matches = await persistence.queryPage({ query: "  salvia  ", page: 1, pageSize: 20 });
      expect(matches.total).toBe(2);
      expect(new Set(matches.items.map((node) => node.id))).toEqual(new Set([title.id, content.id]));
      const exact = await persistence.queryPage({ query: "100%_\\ ' OR 1=1 --", page: 1, pageSize: 20 });
      expect(exact.total).toBe(1);
      expect(exact.items).toEqual([literal]);
      expect(database.select.mock.calls[2]?.[0]).not.toContain("OR 1=1 --");
      expect(database.select.mock.calls[3]?.[0]).toContain("LIMIT $2 OFFSET $3");
      expect(database.select.mock.calls[3]?.[1]).toEqual(["%100\\%\\_\\\\ ' OR 1=1 --%", 20, 0]);
      expect(await persistence.queryPage({ query: "inexistente", page: 4, pageSize: 20 })).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
    } finally { db.close(); }
  });

  it("returns an empty bounded page without querying Node rows", async () => {
    database.select.mockResolvedValueOnce([{ total: 0 }]);
    await expect(createSqliteNodePersistence().queryPage({ query: "", page: -2, pageSize: 500 })).resolves.toEqual({ items: [], total: 0, page: 1, pageSize: 100 });
    expect(database.select).toHaveBeenCalledOnce();
  });

  it("rejects invalid totals and persisted rows and wraps query failures", async () => {
    const persistence = createSqliteNodePersistence();
    const request = { query: "", page: 1, pageSize: 20 };
    database.select.mockResolvedValueOnce([{ total: "43" }]);
    await expect(persistence.queryPage(request)).rejects.toBeInstanceOf(NodePersistenceError);
    database.select.mockResolvedValueOnce([{ total: 1 }]).mockResolvedValueOnce([{ id: "invalid", title: "Broken", content: "" }]);
    await expect(persistence.queryPage(request)).rejects.toBeInstanceOf(InvalidPersistedNodeError);
    database.select.mockRejectedValueOnce(new Error("Unavailable"));
    await expect(persistence.queryPage(request)).rejects.toBeInstanceOf(NodePersistenceError);
  });
});

import {
  InvalidPersistedNodeError,
  NodePersistenceError,
  normalizeNodePageQuery,
  type NodePersistence,
} from "../application/nodePersistence";
import { rehydrateNode, type Node, type NodeId } from "../domain/node";
import { jardindigitalDatabase } from "./sqliteDatabase";

interface NodeRow {
  id: unknown;
  title: unknown;
  content: unknown;
}

function rowToNode(row: NodeRow): Node {
  if (
    typeof row.id !== "string" ||
    typeof row.title !== "string" ||
    typeof row.content !== "string"
  ) {
    throw new InvalidPersistedNodeError(
      new Error("Node row contains unexpected column types."),
    );
  }

  try {
    return rehydrateNode(row.id, row.title, row.content);
  } catch (error) {
    throw new InvalidPersistedNodeError(error);
  }
}

export function createSqliteNodePersistence(): NodePersistence {
  return {
    async save(node: Node) {
      try {
        const db = await jardindigitalDatabase();
        await db.execute(
          `INSERT INTO nodes (id, title, content)
           VALUES ($1, $2, $3)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             content = excluded.content`,
          [node.id, node.title, node.content],
        );
      } catch (error) {
        throw new NodePersistenceError("Could not save Node.", error);
      }
    },

    async load(id: NodeId) {
      let rows: NodeRow[];

      try {
        const db = await jardindigitalDatabase();
        rows = await db.select<NodeRow[]>(
          `SELECT id, title, content
           FROM nodes
           WHERE id = $1`,
          [id],
        );
      } catch (error) {
        throw new NodePersistenceError("Could not load Node.", error);
      }

      const row = rows[0];
      if (row === undefined) {
        return null;
      }

      return rowToNode(row);
    },

    async list() {
      let rows: NodeRow[];

      try {
        const db = await jardindigitalDatabase();
        rows = await db.select<NodeRow[]>(
          `SELECT id, title, content
           FROM nodes
           ORDER BY
             CASE WHEN title = '' THEN content ELSE title END COLLATE NOCASE,
             id`,
        );
      } catch (error) {
        throw new NodePersistenceError("Could not list Nodes.", error);
      }

      return rows.map(rowToNode);
    },

    async loadMany(ids) {
      if (ids.length === 0) return [];
      try {
        const db = await jardindigitalDatabase();
        const unique = [...new Set(ids)];
        const rows: NodeRow[] = [];
        for (let start = 0; start < unique.length; start += 500) {
          const batch = unique.slice(start, start + 500);
          rows.push(...await db.select<NodeRow[]>(
            `SELECT id, title, content FROM nodes WHERE id IN (${batch.map((_, index) => `$${index + 1}`).join(", ")})`,
            batch,
          ));
        }
        return rows.map(rowToNode);
      } catch (error) {
        throw new NodePersistenceError("Could not load Nodes.", error);
      }
    },

    async search(query) {
      const term = query.trim();
      if (term.length === 0) return [];
      const pattern = `%${term.replace(/[\\%_]/g, "\\$&")}%`;
      try {
        const db = await jardindigitalDatabase();
        const rows = await db.select<NodeRow[]>(
          `SELECT id, title, content FROM nodes
           WHERE title LIKE $1 ESCAPE '\\' OR content LIKE $1 ESCAPE '\\'
           ORDER BY CASE WHEN title = '' THEN content ELSE title END COLLATE NOCASE, id`,
          [pattern],
        );
        return rows.map(rowToNode);
      } catch (error) {
        throw new NodePersistenceError("Could not search Nodes.", error);
      }
    },

    async queryPage(request) {
      const normalized = normalizeNodePageQuery(request);
      const where = normalized.query.length > 0 ? "WHERE title LIKE $1 ESCAPE '\\' OR content LIKE $1 ESCAPE '\\'" : "";
      const values: unknown[] = normalized.query.length > 0 ? [`%${normalized.query.replace(/[\\%_]/g, "\\$&")}%`] : [];
      try {
        const db = await jardindigitalDatabase();
        const counts = await db.select<Array<{ total: unknown }>>(`SELECT COUNT(*) AS total FROM nodes ${where}`, values);
        const total = counts[0]?.total;
        if (typeof total !== "number" || !Number.isSafeInteger(total) || total < 0) {
          throw new NodePersistenceError("Invalid Node page total.", new Error("Unexpected count result."));
        }
        const page = Math.min(normalized.page, Math.max(1, Math.ceil(total / normalized.pageSize)));
        if (total === 0) return { items: [], total, page, pageSize: normalized.pageSize };
        const rows = await db.select<NodeRow[]>(
          `SELECT id, title, content FROM nodes ${where}
           ORDER BY CASE WHEN title = '' THEN content ELSE title END COLLATE NOCASE, id
           LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
          [...values, normalized.pageSize, (page - 1) * normalized.pageSize],
        );
        return { items: rows.map(rowToNode), total, page, pageSize: normalized.pageSize };
      } catch (error) {
        if (error instanceof NodePersistenceError) throw error;
        throw new NodePersistenceError("Could not query Node page.", error);
      }
    },
  };
}

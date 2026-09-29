import {
  InvalidPersistedNodeError,
  NodePersistenceError,
  type NodePersistence,
} from "../application/nodePersistence";
import { rehydrateNode, type Node, type NodeId } from "../domain/node";
import { jardindigitalDatabase } from "./sqliteDatabase";

interface NodeRow {
  id: unknown;
  title: unknown;
  content: unknown;
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
    },
  };
}

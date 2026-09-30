import {
  EdgePersistenceError,
  InvalidPersistedEdgeError,
  type EdgePersistence,
} from "../application/edgePersistence";
import { rehydrateEdge, type Edge, type EdgeId } from "../domain/edge";
import { jardindigitalDatabase } from "./sqliteDatabase";

interface EdgeRow {
  id: unknown;
  source_node_id: unknown;
  target_node_id: unknown;
}

function rowToEdge(row: EdgeRow): Edge {
  if (
    typeof row.id !== "string" ||
    typeof row.source_node_id !== "string" ||
    typeof row.target_node_id !== "string"
  ) {
    throw new InvalidPersistedEdgeError(
      new Error("Edge row contains unexpected column types."),
    );
  }

  try {
    return rehydrateEdge(row.id, row.source_node_id, row.target_node_id);
  } catch (error) {
    throw new InvalidPersistedEdgeError(error);
  }
}

export function createSqliteEdgePersistence(): EdgePersistence {
  return {
    async save(edge: Edge) {
      try {
        const db = await jardindigitalDatabase();
        await db.execute(
          `INSERT INTO edges (id, source_node_id, target_node_id)
           VALUES ($1, $2, $3)
           ON CONFLICT(id) DO UPDATE SET
             source_node_id = excluded.source_node_id,
             target_node_id = excluded.target_node_id`,
          [edge.id, edge.sourceNodeId, edge.targetNodeId],
        );
      } catch (error) {
        throw new EdgePersistenceError("Could not save Edge.", error);
      }
    },

    async loadBetweenNodes(nodeIds) {
      const uniqueNodeIds = [...new Set(nodeIds)];
      if (uniqueNodeIds.length === 0) {
        return [];
      }

      const placeholders = uniqueNodeIds
        .map((_nodeId, index) => `$${index + 1}`)
        .join(", ");
      let rows: EdgeRow[];

      try {
        const db = await jardindigitalDatabase();
        rows = await db.select<EdgeRow[]>(
          `SELECT id, source_node_id, target_node_id
           FROM edges
           WHERE source_node_id IN (${placeholders})
             AND target_node_id IN (${placeholders})
           ORDER BY id`,
          uniqueNodeIds,
        );
      } catch (error) {
        throw new EdgePersistenceError(
          "Could not load Edges between Nodes.",
          error,
        );
      }

      return rows.map(rowToEdge);
    },

    async delete(id: EdgeId) {
      try {
        const db = await jardindigitalDatabase();
        await db.execute("DELETE FROM edges WHERE id = $1", [id]);
      } catch (error) {
        throw new EdgePersistenceError("Could not delete Edge.", error);
      }
    },
  };
}

import {
  InboxPersistenceError,
  type InboxPersistence,
  type PlaceInboxNodePersistenceResult,
} from "../application/inboxPersistence";
import { InvalidPersistedNodeError } from "../application/nodePersistence";
import { rehydrateNode, type Node, type NodeId } from "../domain/node";
import type { Placement } from "../domain/placement";
import { jardindigitalDatabase } from "./sqliteDatabase";

interface NodeRow {
  id: unknown;
  title: unknown;
  content: unknown;
}

interface PlacementIdentityRow {
  id: unknown;
}

function rowToNode(row: NodeRow): Node {
  if (
    typeof row.id !== "string" ||
    typeof row.title !== "string" ||
    typeof row.content !== "string"
  ) {
    throw new InvalidPersistedNodeError(
      new Error("Inbox Node row contains unexpected column types."),
    );
  }

  try {
    return rehydrateNode(row.id, row.title, row.content);
  } catch (error) {
    throw new InvalidPersistedNodeError(error);
  }
}

export function createSqliteInboxPersistence(): InboxPersistence {
  return {
    async capture(node: Node) {
      try {
        const db = await jardindigitalDatabase();
        await db.execute(
          `INSERT INTO capture_operations (id, title, content)
           VALUES ($1, $2, $3)`,
          [node.id, node.title, node.content],
        );
      } catch (error) {
        throw new InboxPersistenceError("Could not capture idea.", error);
      }
    },

    async list() {
      let rows: NodeRow[];

      try {
        const db = await jardindigitalDatabase();
        rows = await db.select<NodeRow[]>(
          `SELECT nodes.id, nodes.title, nodes.content
           FROM inbox_items
           INNER JOIN nodes ON nodes.id = inbox_items.node_id
           ORDER BY
             CASE WHEN nodes.title = '' THEN nodes.content ELSE nodes.title END
               COLLATE NOCASE,
             nodes.id`,
        );
      } catch (error) {
        throw new InboxPersistenceError("Could not load Inbox.", error);
      }

      return rows.map(rowToNode);
    },

    async contains(nodeId: NodeId) {
      try {
        const db = await jardindigitalDatabase();
        const rows = await db.select<Array<{ node_id: unknown }>>(
          `SELECT node_id
           FROM inbox_items
           WHERE node_id = $1`,
          [nodeId],
        );
        return rows.length > 0;
      } catch (error) {
        throw new InboxPersistenceError(
          "Could not check Inbox membership.",
          error,
        );
      }
    },

    async place(placement: Placement) {
      let existingRows: PlacementIdentityRow[];

      try {
        const db = await jardindigitalDatabase();
        existingRows = await db.select<PlacementIdentityRow[]>(
          `SELECT id
           FROM placements
           WHERE canvas_id = $1 AND node_id = $2`,
          [placement.canvasId, placement.nodeId],
        );

        await db.execute(
          `INSERT INTO inbox_placement_operations
             (id, canvas_id, node_id, x, y)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            placement.id,
            placement.canvasId,
            placement.nodeId,
            placement.position.x,
            placement.position.y,
          ],
        );
      } catch (error) {
        throw new InboxPersistenceError(
          "Could not place idea in Garden.",
          error,
        );
      }

      return (existingRows.length > 0
        ? "already-placed"
        : "placed") satisfies PlaceInboxNodePersistenceResult;
    },
  };
}

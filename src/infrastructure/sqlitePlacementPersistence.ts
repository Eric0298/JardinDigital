import {
  InvalidPersistedPlacementError,
  PlacementPersistenceError,
  type PlaceNodePersistenceResult,
  type PlacementPersistence,
} from "../application/placementPersistence";
import type { CanvasId } from "../domain/canvas";
import {
  rehydratePlacement,
  type Placement,
  type PlacementId,
} from "../domain/placement";
import { jardindigitalDatabase } from "./sqliteDatabase";

interface PlacementRow {
  id: unknown;
  canvas_id: unknown;
  node_id: unknown;
  x: unknown;
  y: unknown;
}

function rowToPlacement(row: PlacementRow): Placement {
  if (
    typeof row.id !== "string" ||
    typeof row.canvas_id !== "string" ||
    typeof row.node_id !== "string" ||
    typeof row.x !== "number" ||
    typeof row.y !== "number"
  ) {
    throw new InvalidPersistedPlacementError(
      new Error("Placement row contains unexpected column types."),
    );
  }

  try {
    return rehydratePlacement(row.id, row.canvas_id, row.node_id, {
      x: row.x,
      y: row.y,
    });
  } catch (error) {
    throw new InvalidPersistedPlacementError(error);
  }
}

export function createSqlitePlacementPersistence(): PlacementPersistence {
  return {
    async save(placement: Placement) {
      try {
        const db = await jardindigitalDatabase();
        await db.execute(
          `INSERT INTO placements (id, canvas_id, node_id, x, y)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT(id) DO UPDATE SET
             canvas_id = excluded.canvas_id,
             node_id = excluded.node_id,
             x = excluded.x,
             y = excluded.y`,
          [
            placement.id,
            placement.canvasId,
            placement.nodeId,
            placement.position.x,
            placement.position.y,
          ],
        );
      } catch (error) {
        throw new PlacementPersistenceError("Could not save Placement.", error);
      }
    },

    async place(placement: Placement) {
      try {
        const db = await jardindigitalDatabase();
        const result = await db.execute(
          `INSERT INTO placements (id, canvas_id, node_id, x, y)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT(canvas_id, node_id) DO NOTHING`,
          [
            placement.id,
            placement.canvasId,
            placement.nodeId,
            placement.position.x,
            placement.position.y,
          ],
        );
        return (result.rowsAffected === 0
          ? "already-placed"
          : "placed") satisfies PlaceNodePersistenceResult;
      } catch (error) {
        throw new PlacementPersistenceError(
          "Could not place Node in Canvas.",
          error,
        );
      }
    },

    async load(id: PlacementId) {
      let rows: PlacementRow[];

      try {
        const db = await jardindigitalDatabase();
        rows = await db.select<PlacementRow[]>(
          `SELECT id, canvas_id, node_id, x, y
           FROM placements
           WHERE id = $1`,
          [id],
        );
      } catch (error) {
        throw new PlacementPersistenceError("Could not load Placement.", error);
      }

      const row = rows[0];
      return row === undefined ? null : rowToPlacement(row);
    },

    async loadForCanvas(canvasId: CanvasId) {
      let rows: PlacementRow[];

      try {
        const db = await jardindigitalDatabase();
        rows = await db.select<PlacementRow[]>(
          `SELECT id, canvas_id, node_id, x, y
           FROM placements
           WHERE canvas_id = $1
           ORDER BY id`,
          [canvasId],
        );
      } catch (error) {
        throw new PlacementPersistenceError(
          "Could not load Placements for Canvas.",
          error,
        );
      }

      return rows.map(rowToPlacement);
    },

    async list() {
      let rows: PlacementRow[];

      try {
        const db = await jardindigitalDatabase();
        rows = await db.select<PlacementRow[]>(
          `SELECT id, canvas_id, node_id, x, y
           FROM placements
           ORDER BY canvas_id, node_id, id`,
        );
      } catch (error) {
        throw new PlacementPersistenceError(
          "Could not list Placements.",
          error,
        );
      }

      return rows.map(rowToPlacement);
    },

    async delete(id: PlacementId) {
      try {
        const db = await jardindigitalDatabase();
        await db.execute("DELETE FROM placements WHERE id = $1", [id]);
      } catch (error) {
        throw new PlacementPersistenceError(
          "Could not remove Placement from Canvas.",
          error,
        );
      }
    },
  };
}

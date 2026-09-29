import {
  CanvasPersistenceError,
  InvalidPersistedCanvasError,
  type CanvasPersistence,
} from "../application/canvasPersistence";
import { rehydrateCanvas, type Canvas, type CanvasId } from "../domain/canvas";
import { jardindigitalDatabase } from "./sqliteDatabase";

interface CanvasRow {
  id: unknown;
  title: unknown;
}

export function createSqliteCanvasPersistence(): CanvasPersistence {
  return {
    async save(canvas: Canvas) {
      try {
        const db = await jardindigitalDatabase();
        await db.execute(
          `INSERT INTO canvases (id, title)
           VALUES ($1, $2)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title`,
          [canvas.id, canvas.title],
        );
      } catch (error) {
        throw new CanvasPersistenceError("Could not save Canvas.", error);
      }
    },

    async load(id: CanvasId) {
      let rows: CanvasRow[];

      try {
        const db = await jardindigitalDatabase();
        rows = await db.select<CanvasRow[]>(
          `SELECT id, title
           FROM canvases
           WHERE id = $1`,
          [id],
        );
      } catch (error) {
        throw new CanvasPersistenceError("Could not load Canvas.", error);
      }

      const row = rows[0];
      if (row === undefined) {
        return null;
      }

      if (typeof row.id !== "string" || typeof row.title !== "string") {
        throw new InvalidPersistedCanvasError(
          new Error("Canvas row contains unexpected column types."),
        );
      }

      try {
        return rehydrateCanvas(row.id, row.title);
      } catch (error) {
        throw new InvalidPersistedCanvasError(error);
      }
    },
  };
}

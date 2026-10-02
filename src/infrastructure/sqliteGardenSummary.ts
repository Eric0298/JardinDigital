import { GardenSummaryError, type GardenSummary, type GardenSummaryQuery } from "../application/gardenSummary";
import type { CanvasId } from "../domain/canvas";
import { jardindigitalDatabase } from "./sqliteDatabase";

export const GARDEN_SUMMARY_SQL = `WITH
  idea_counts AS (
    SELECT canvas_id, COUNT(DISTINCT node_id) AS idea_count
    FROM placements GROUP BY canvas_id
  ),
  connection_counts AS (
    SELECT source.canvas_id, COUNT(DISTINCT e.id) AS connection_count
    FROM edges e
    JOIN placements source ON source.node_id = e.source_node_id
    JOIN placements target ON target.node_id = e.target_node_id AND target.canvas_id = source.canvas_id
    GROUP BY source.canvas_id
  ),
  resource_counts AS (
    SELECT p.canvas_id, COUNT(DISTINCT r.id) AS resource_count
    FROM resources r JOIN placements p ON p.node_id = r.node_id
    GROUP BY p.canvas_id
  )
SELECT c.id AS garden_id,
  COALESCE(i.idea_count, 0) AS idea_count,
  COALESCE(e.connection_count, 0) AS connection_count,
  COALESCE(r.resource_count, 0) AS resource_count
FROM canvases c
LEFT JOIN idea_counts i ON i.canvas_id = c.id
LEFT JOIN connection_counts e ON e.canvas_id = c.id
LEFT JOIN resource_counts r ON r.canvas_id = c.id
ORDER BY c.id`;

interface SummaryRow {
  garden_id: unknown;
  idea_count: unknown;
  connection_count: unknown;
  resource_count: unknown;
}

function rowToSummary(row: SummaryRow): GardenSummary {
  const validCount = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
  if (typeof row.garden_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.garden_id)
    || !validCount(row.idea_count) || !validCount(row.connection_count) || !validCount(row.resource_count)) {
    throw new Error("El resumen del jardín contiene datos no válidos.");
  }
  return { gardenId: row.garden_id as CanvasId, ideaCount: row.idea_count, connectionCount: row.connection_count, resourceCount: row.resource_count };
}

export function createSqliteGardenSummaryQuery(): GardenSummaryQuery {
  return {
    async load() {
      try {
        const db = await jardindigitalDatabase();
        const rows = await db.select<SummaryRow[]>(GARDEN_SUMMARY_SQL);
        return rows.map(rowToSummary);
      } catch (error) {
        throw new GardenSummaryError("No se pudo cargar el resumen de los jardines.", error);
      }
    },
  };
}

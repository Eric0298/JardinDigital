import { InvalidPersistedResourceError, ResourcePersistenceError, type ResourcePersistence } from "../application/resourcePersistence";
import { rehydrateResource, type Resource, type ResourceKind, type ResourceLocation } from "../domain/resource";
import { jardindigitalDatabase } from "./sqliteDatabase";

interface ResourceRow { id: unknown; node_id: unknown; kind: unknown; title: unknown; locator: unknown; location: unknown }

function rowToResource(row: ResourceRow): Resource {
  if (Object.values(row).some((value) => typeof value !== "string")) throw new InvalidPersistedResourceError(new Error("Las columnas del recurso no son válidas."));
  try { return rehydrateResource(row.id as string, row.node_id as string, row.kind as ResourceKind, row.title as string, row.locator as string, row.location as ResourceLocation); }
  catch (error) { throw new InvalidPersistedResourceError(error); }
}

export function createSqliteResourcePersistence(): ResourcePersistence {
  const persistence: ResourcePersistence = {
    async save(resource) {
      try {
        const db = await jardindigitalDatabase();
        await db.execute(`INSERT INTO resources (id, node_id, kind, title, locator, location)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT(id) DO UPDATE SET node_id = excluded.node_id, kind = excluded.kind,
            title = excluded.title, locator = excluded.locator, location = excluded.location`,
          [resource.id, resource.nodeId, resource.kind, resource.title, resource.locator, resource.location]);
      } catch (error) { throw new ResourcePersistenceError("No se pudo guardar el recurso.", error); }
    },
    listByNode(nodeId) { return persistence.listByNodes([nodeId]); },
    async listByNodes(nodeIds) {
      const uniqueIds = [...new Set(nodeIds)];
      if (!uniqueIds.length) return [];
      let rows: ResourceRow[] = [];
      try {
        const db = await jardindigitalDatabase();
        for (let start = 0; start < uniqueIds.length; start += 500) {
          const batch = uniqueIds.slice(start, start + 500);
          rows = rows.concat(await db.select<ResourceRow[]>(`SELECT id, node_id, kind, title, locator, location FROM resources
            WHERE node_id IN (${batch.map((_, index) => `$${index + 1}`).join(", ")}) ORDER BY title COLLATE NOCASE, id`, batch));
        }
      } catch (error) { throw new ResourcePersistenceError("No se pudieron cargar los recursos.", error); }
      return rows.map(rowToResource);
    },
    async remove(id) {
      try {
        const db = await jardindigitalDatabase();
        await db.execute("DELETE FROM resources WHERE id = $1", [id]);
      } catch (error) { throw new ResourcePersistenceError("No se pudo quitar el recurso de la idea.", error); }
    },
  };
  return persistence;
}

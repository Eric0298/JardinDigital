import type { NodeId } from "../domain/node";
import { createResource, type Resource, type ResourceId, type ResourceKind, type ResourceLocation } from "../domain/resource";

export interface ResourcePersistence {
  listByNode(nodeId: NodeId): Promise<Resource[]>;
  listByNodes(nodeIds: readonly NodeId[]): Promise<Resource[]>;
  save(resource: Resource): Promise<void>;
  remove(id: ResourceId): Promise<void>;
}

export class ResourcePersistenceError extends Error {
  constructor(message: string, readonly cause: unknown) {
    super(message);
    this.name = "ResourcePersistenceError";
  }
}

export class InvalidPersistedResourceError extends ResourcePersistenceError {
  constructor(cause: unknown) {
    super("Los datos guardados del recurso no son válidos.", cause);
    this.name = "InvalidPersistedResourceError";
  }
}

export async function addResource(persistence: Pick<ResourcePersistence, "save">, nodeId: NodeId, kind: ResourceKind, title: string, locator: string, location: ResourceLocation): Promise<Resource> {
  const resource = createResource(nodeId, kind, title, locator, location);
  await persistence.save(resource);
  return resource;
}

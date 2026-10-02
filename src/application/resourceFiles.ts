import type { NodeId } from "../domain/node";
import type { Resource } from "../domain/resource";
import { addResource, type ResourcePersistence } from "./resourcePersistence";

export interface NativeResourceFiles {
  chooseFile(kind: "document" | "video"): Promise<string | null>;
  exists(path: string): Promise<boolean>;
  open(resource: Resource): Promise<void>;
}

export async function addLinkedResource(persistence: Pick<ResourcePersistence, "save">, files: NativeResourceFiles, nodeId: NodeId, kind: "document" | "video"): Promise<Resource | null> {
  const path = await files.chooseFile(kind);
  if (path === null) return null;
  if (!await files.exists(path)) throw new Error("Archivo no disponible");
  const parts = path.split(/[\\/]/);
  const name = parts[parts.length - 1] || path;
  return addResource(persistence, nodeId, kind, name, path, "local");
}

export async function openResource(files: NativeResourceFiles, resource: Resource): Promise<void> {
  if (resource.location === "local" && !await files.exists(resource.locator)) throw new Error("Archivo no disponible");
  await files.open(resource);
}

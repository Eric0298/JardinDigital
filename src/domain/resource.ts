import type { NodeId } from "./node";

declare const resourceIdBrand: unique symbol;
export type ResourceId = string & { readonly [resourceIdBrand]: "ResourceId" };
export type ResourceKind = "document" | "video" | "link";
export type ResourceLocation = "local" | "url";

export interface Resource {
  readonly id: ResourceId;
  readonly nodeId: NodeId;
  readonly title: string;
  readonly kind: ResourceKind;
  readonly locator: string;
  readonly location: ResourceLocation;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizedResource(nodeId: NodeId, kind: ResourceKind, title: string, locator: string, location: ResourceLocation) {
  const normalizedTitle = title.trim();
  const normalizedLocator = locator.trim();
  if (!normalizedTitle) throw new Error("El nombre del recurso no puede estar vacío.");
  if (!UUID_PATTERN.test(nodeId)) throw new Error("La idea del recurso debe tener una identidad válida.");
  if (!["document", "video", "link"].includes(kind)) throw new Error("El tipo de recurso no es válido.");
  if (!normalizedLocator || /[\u0000-\u001f\u007f]/.test(normalizedLocator)) throw new Error("La ruta o dirección del recurso no es válida.");
  if (location === "url") {
    let url: URL;
    try { url = new URL(normalizedLocator); } catch { throw new Error("El enlace debe ser una dirección http o https válida."); }
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error("El enlace debe ser una dirección http o https válida.");
  } else if (location === "local") {
    if (kind === "link" || !/^(?:[a-z]:[\\/]|\\\\[^\\]+\\[^\\]+|\/)/i.test(normalizedLocator)) throw new Error("El archivo debe tener una ruta local absoluta.");
  } else {
    throw new Error("La ubicación del recurso no es válida.");
  }
  return { nodeId, kind, title: normalizedTitle, locator: normalizedLocator, location };
}

export function createResource(nodeId: NodeId, kind: ResourceKind, title: string, locator: string, location: ResourceLocation): Resource {
  return { id: globalThis.crypto.randomUUID() as ResourceId, ...normalizedResource(nodeId, kind, title, locator, location) };
}

export function rehydrateResource(id: string, nodeId: string, kind: ResourceKind, title: string, locator: string, location: ResourceLocation): Resource {
  if (!UUID_PATTERN.test(id)) throw new Error("La identidad del recurso no es válida.");
  return { id: id as ResourceId, ...normalizedResource(nodeId as NodeId, kind, title, locator, location) };
}

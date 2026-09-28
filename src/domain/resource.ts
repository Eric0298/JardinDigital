declare const resourceIdBrand: unique symbol;

export type ResourceId = string & {
  readonly [resourceIdBrand]: "ResourceId";
};

export interface Resource {
  readonly id: ResourceId;
  readonly title: string;
}

export function createResource(title: string): Resource {
  const normalizedTitle = title.trim();

  if (normalizedTitle.length === 0) {
    throw new Error("Resource title must not be empty.");
  }

  return {
    id: globalThis.crypto.randomUUID() as ResourceId,
    title: normalizedTitle,
  };
}

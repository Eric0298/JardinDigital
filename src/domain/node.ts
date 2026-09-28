declare const nodeIdBrand: unique symbol;

export type NodeId = string & { readonly [nodeIdBrand]: "NodeId" };

export interface Node {
  readonly id: NodeId;
  readonly title: string;
  readonly content: string;
}

export function createNode(title: string, content = ""): Node {
  const normalizedTitle = title.trim();
  const normalizedContent = content.trim();

  if (normalizedTitle.length === 0 && normalizedContent.length === 0) {
    throw new Error("Node title and content must not both be empty.");
  }

  return {
    id: globalThis.crypto.randomUUID() as NodeId,
    title: normalizedTitle,
    content: normalizedContent,
  };
}

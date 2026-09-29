declare const nodeIdBrand: unique symbol;

export type NodeId = string & { readonly [nodeIdBrand]: "NodeId" };

export interface Node {
  readonly id: NodeId;
  readonly title: string;
  readonly content: string;
}

const NODE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeNodeContent(title: string, content: string) {
  const normalizedTitle = title.trim();
  const normalizedContent = content.trim();

  if (normalizedTitle.length === 0 && normalizedContent.length === 0) {
    throw new Error("Node title and content must not both be empty.");
  }

  return { title: normalizedTitle, content: normalizedContent };
}

export function createNode(title: string, content = ""): Node {
  const normalized = normalizeNodeContent(title, content);

  return {
    id: globalThis.crypto.randomUUID() as NodeId,
    ...normalized,
  };
}

export function editNode(node: Node, title: string, content = ""): Node {
  return {
    id: node.id,
    ...normalizeNodeContent(title, content),
  };
}

export function rehydrateNode(
  id: string,
  title: string,
  content = "",
): Node {
  if (!NODE_ID_PATTERN.test(id)) {
    throw new Error("Node id must be a valid application UUID.");
  }

  return {
    id: id as NodeId,
    ...normalizeNodeContent(title, content),
  };
}

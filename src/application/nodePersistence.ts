import { createNode, editNode, type Node, type NodeId } from "../domain/node";

export interface NodePersistence {
  save(node: Node): Promise<void>;
  load(id: NodeId): Promise<Node | null>;
}

export class NodePersistenceError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "NodePersistenceError";
    this.cause = cause;
  }
}

export class InvalidPersistedNodeError extends NodePersistenceError {
  constructor(cause: unknown) {
    super("Persisted Node data is invalid.", cause);
    this.name = "InvalidPersistedNodeError";
  }
}

export async function createPersistedNode(
  persistence: NodePersistence,
  title: string,
  content: string,
): Promise<Node> {
  const node = createNode(title, content);
  await persistence.save(node);
  return node;
}

export function loadPersistedNode(
  persistence: NodePersistence,
  id: NodeId,
): Promise<Node | null> {
  return persistence.load(id);
}

export async function persistNodeEdit(
  persistence: NodePersistence,
  node: Node,
  title: string,
  content: string,
): Promise<Node> {
  const edited = editNode(node, title, content);
  await persistence.save(edited);
  return edited;
}

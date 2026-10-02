import { createNode, editNode, type Node, type NodeId } from "../domain/node";

export interface NodePageQuery {
  readonly query: string;
  readonly page: number;
  readonly pageSize: number;
}

export interface NodePageResult {
  readonly items: Node[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export function normalizeNodePageQuery(request: NodePageQuery): NodePageQuery {
  return {
    query: request.query.trim(),
    page: Number.isFinite(request.page) ? Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(request.page))) : 1,
    pageSize: Number.isFinite(request.pageSize) ? Math.max(1, Math.min(100, Math.floor(request.pageSize))) : 20,
  };
}

export interface NodePersistence {
  save(node: Node): Promise<void>;
  load(id: NodeId): Promise<Node | null>;
  list(): Promise<Node[]>;
  loadMany(ids: readonly NodeId[]): Promise<Node[]>;
  search(query: string): Promise<Node[]>;
  queryPage(request: NodePageQuery): Promise<NodePageResult>;
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
  persistence: Pick<NodePersistence, "save">,
  title: string,
  content: string,
): Promise<Node> {
  const node = createNode(title, content);
  await persistence.save(node);
  return node;
}

export function loadPersistedNode(
  persistence: Pick<NodePersistence, "load">,
  id: NodeId,
): Promise<Node | null> {
  return persistence.load(id);
}

export async function persistNodeEdit(
  persistence: Pick<NodePersistence, "save">,
  node: Node,
  title: string,
  content: string,
): Promise<Node> {
  const edited = editNode(node, title, content);
  await persistence.save(edited);
  return edited;
}

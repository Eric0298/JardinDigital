import { createNode, type Node } from "../domain/node";
import type { InboxPersistence } from "./inboxPersistence";

export async function captureNode(
  persistence: Pick<InboxPersistence, "capture">,
  title: string,
  content: string,
): Promise<Node> {
  const node = createNode(title, content);
  await persistence.capture(node);
  return node;
}

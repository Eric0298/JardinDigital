import type { Node } from "../domain/node";
import type { InboxPersistence } from "./inboxPersistence";

export function loadInbox(
  persistence: Pick<InboxPersistence, "list">,
): Promise<Node[]> {
  return persistence.list();
}

import type { CanvasId } from "../domain/canvas";
import type { Node, NodeId } from "../domain/node";
import type { Placement } from "../domain/placement";

export interface NativeOperations {
  createNodeInGarden(node: Node, placement: Placement): Promise<void>;
  deleteKnowledge(nodeId: NodeId): Promise<void>;
  deleteGarden(canvasId: CanvasId): Promise<void>;
  exportBackup(): Promise<string>;
  restoreBackup(json: string): Promise<void>;
}

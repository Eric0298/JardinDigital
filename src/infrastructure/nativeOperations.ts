import { invoke } from "@tauri-apps/api/core";
import type { NativeOperations } from "../application/nativeOperations";
import { jardindigitalDatabase } from "./sqliteDatabase";

async function ready() {
  await jardindigitalDatabase();
}

export function createNativeOperations(): NativeOperations {
  return {
    async createNodeInGarden(node, placement) {
      await ready();
      await invoke("create_node_in_garden", {
        nodeId: node.id,
        title: node.title,
        content: node.content,
        placementId: placement.id,
        canvasId: placement.canvasId,
        x: placement.position.x,
        y: placement.position.y,
      });
    },
    async deleteKnowledge(nodeId) {
      await ready();
      await invoke("delete_knowledge", { nodeId });
    },
    async deleteGarden(canvasId) {
      await ready();
      await invoke("delete_garden", { canvasId });
    },
    async exportBackup() {
      await ready();
      return invoke<string>("export_backup");
    },
    async restoreBackup(json) {
      await ready();
      await invoke("restore_backup", { json });
    },
  };
}

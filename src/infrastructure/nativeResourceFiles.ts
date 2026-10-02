import { invoke } from "@tauri-apps/api/core";
import type { NativeResourceFiles } from "../application/resourceFiles";
import { jardindigitalDatabase } from "./sqliteDatabase";

export function createNativeResourceFiles(): NativeResourceFiles {
  return {
    chooseFile(kind) { return invoke<string | null>("choose_resource_file", { kind }); },
    exists(path) { return invoke<boolean>("resource_file_exists", { path }); },
    async open(resource) {
      await jardindigitalDatabase();
      await invoke("open_resource", { resourceId: resource.id });
    },
  };
}

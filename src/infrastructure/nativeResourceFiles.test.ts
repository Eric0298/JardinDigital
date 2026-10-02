import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNode } from "../domain/node";
import { createResource } from "../domain/resource";
import { createNativeResourceFiles } from "./nativeResourceFiles";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("./sqliteDatabase", () => ({ jardindigitalDatabase: vi.fn(async () => ({})) }));

describe("Native resource files boundary", () => {
  beforeEach(() => invoke.mockReset());
  it("opens only an existing resource identity through Rust, without supplying a shell command or path", async () => {
    const resource = createResource(createNode("Idea").id, "document", "File", "C:/file.pdf", "local");
    await createNativeResourceFiles().open(resource);
    expect(invoke).toHaveBeenCalledExactlyOnceWith("open_resource", { resourceId: resource.id });
  });
  it("preserves cancellation and missing files returned by native commands", async () => {
    invoke.mockResolvedValueOnce(null).mockResolvedValueOnce(false);
    const native = createNativeResourceFiles();
    expect(await native.chooseFile("video")).toBeNull();
    expect(await native.exists("C:/missing.mp4")).toBe(false);
  });
});

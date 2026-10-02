import { describe, expect, it, vi } from "vitest";
import { createCanvas } from "../domain/canvas";
import { createNode } from "../domain/node";
import { createPlacement } from "../domain/placement";
import {
  loadLibrary,
  loadLibraryPage,
  type LoadLibraryDependencies,
} from "./loadLibrary";

function dependencies(
  nodes = [createNode("Only idea")],
): LoadLibraryDependencies {
  return {
    nodePersistence: { list: vi.fn(async () => nodes) },
    inboxPersistence: { list: vi.fn(async () => []) },
    canvasPersistence: { list: vi.fn(async () => []) },
    placementPersistence: { list: vi.fn(async () => []) },
  };
}

describe("loadLibrary", () => {
  it("returns an empty Library with one fixed query per persistence concern", async () => {
    const persistence = dependencies([]);

    await expect(loadLibrary(persistence)).resolves.toEqual([]);

    expect(persistence.nodePersistence.list).toHaveBeenCalledOnce();
    expect(persistence.inboxPersistence.list).toHaveBeenCalledOnce();
    expect(persistence.canvasPersistence.list).toHaveBeenCalledOnce();
    expect(persistence.placementPersistence.list).toHaveBeenCalledOnce();
  });

  it("returns one standalone Node as a valid Library entry", async () => {
    const node = createNode("Standalone");

    await expect(loadLibrary(dependencies([node]))).resolves.toEqual([
      { node, inInbox: false, gardens: [] },
    ]);
  });

  it("returns title-only, content-only, and full Nodes in persistence order", async () => {
    const titleOnly = createNode("Alpha");
    const contentOnly = createNode("", "Beta content");
    const full = createNode("Gamma", "Full content");

    const entries = await loadLibrary(
      dependencies([titleOnly, contentOnly, full]),
    );

    expect(entries.map((entry) => entry.node)).toEqual([
      titleOnly,
      contentOnly,
      full,
    ]);
    expect(entries.every((entry) => entry.gardens.length === 0)).toBe(true);
  });

  it("composes Library-only, Inbox, Garden, and multiple-Garden states without duplicating Nodes", async () => {
    const gardenA = createCanvas("Alpha Garden");
    const gardenB = createCanvas("Beta Garden");
    const libraryOnly = createNode("Library only");
    const inboxOnly = createNode("Inbox only");
    const gardenOnly = createNode("Garden only");
    const inboxAndGarden = createNode("Inbox and Garden");
    const multipleGardens = createNode("Multiple Gardens");
    const nodes = [
      libraryOnly,
      inboxOnly,
      gardenOnly,
      inboxAndGarden,
      multipleGardens,
    ];
    const persistence = dependencies(nodes);
    persistence.inboxPersistence.list = vi.fn(async () => [
      inboxOnly,
      inboxAndGarden,
    ]);
    persistence.canvasPersistence.list = vi.fn(async () => [gardenA, gardenB]);
    persistence.placementPersistence.list = vi.fn(async () => [
      createPlacement(gardenA.id, gardenOnly.id, { x: 0, y: 0 }),
      createPlacement(gardenA.id, inboxAndGarden.id, { x: 10, y: 10 }),
      createPlacement(gardenB.id, multipleGardens.id, { x: 20, y: 20 }),
      createPlacement(gardenA.id, multipleGardens.id, { x: 30, y: 30 }),
    ]);

    const entries = await loadLibrary(persistence);

    expect(entries).toHaveLength(nodes.length);
    expect(new Set(entries.map((entry) => entry.node.id)).size).toBe(nodes.length);
    expect(entries.find((entry) => entry.node.id === libraryOnly.id)).toMatchObject({
      inInbox: false,
      gardens: [],
    });
    expect(entries.find((entry) => entry.node.id === inboxOnly.id)).toMatchObject({
      inInbox: true,
      gardens: [],
    });
    expect(entries.find((entry) => entry.node.id === gardenOnly.id)?.gardens)
      .toHaveLength(1);
    expect(
      entries.find((entry) => entry.node.id === inboxAndGarden.id),
    ).toMatchObject({ inInbox: true });
    expect(
      entries
        .find((entry) => entry.node.id === multipleGardens.id)
        ?.gardens.map((context) => context.garden.title),
    ).toEqual(["Alpha Garden", "Beta Garden"]);
  });

  it("fails clearly when a persisted Placement references a missing Garden", async () => {
    const node = createNode("Orphaned projection");
    const missingGarden = createCanvas("Missing");
    const persistence = dependencies([node]);
    persistence.placementPersistence.list = vi.fn(async () => [
      createPlacement(missingGarden.id, node.id, { x: 0, y: 0 }),
    ]);

    await expect(loadLibrary(persistence)).rejects.toThrow(
      "A Garden referenced by a placed idea could not be found.",
    );
  });

  it("propagates a Library source failure", async () => {
    const persistence = dependencies();
    const failure = new Error("Node list failed");
    persistence.nodePersistence.list = vi.fn(async () => {
      throw failure;
    });

    await expect(loadLibrary(persistence)).rejects.toBe(failure);
  });
});

describe("loadLibraryPage", () => {
  it("forwards a normalized page query and composes only the returned ideas with fixed context calls", async () => {
    const node = createNode("Coincidencia", "Salvia");
    const other = createNode("Otra idea");
    const garden = createCanvas("Lecturas");
    const context = dependencies([other]);
    context.inboxPersistence.list = vi.fn(async () => [node]);
    context.canvasPersistence.list = vi.fn(async () => [garden]);
    const placement = createPlacement(garden.id, node.id, { x: 0, y: 0 });
    context.placementPersistence.list = vi.fn(async () => [placement]);
    const queryPage = vi.fn(async () => ({ items: [node], total: 41, page: 2, pageSize: 20 }));
    const page = await loadLibraryPage({ ...context, nodePersistence: { queryPage } }, { query: " salvia ", page: 2.9, pageSize: 20 });
    expect(queryPage).toHaveBeenCalledWith({ query: "salvia", page: 2, pageSize: 20 });
    expect(page).toEqual({ items: [{ node, inInbox: true, gardens: [{ garden, placement }] }], total: 41, page: 2, pageSize: 20 });
    expect(context.nodePersistence.list).not.toHaveBeenCalled();
    expect(context.inboxPersistence.list).toHaveBeenCalledOnce();
    expect(context.canvasPersistence.list).toHaveBeenCalledOnce();
    expect(context.placementPersistence.list).toHaveBeenCalledOnce();
  });

  it("does not load unrelated contexts for an empty result page", async () => {
    const context = dependencies();
    const queryPage = vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20 }));
    await expect(loadLibraryPage({ ...context, nodePersistence: { queryPage } }, { query: "sin coincidencias", page: 99, pageSize: 20 })).resolves.toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
    expect(context.inboxPersistence.list).not.toHaveBeenCalled();
    expect(context.canvasPersistence.list).not.toHaveBeenCalled();
    expect(context.placementPersistence.list).not.toHaveBeenCalled();
  });

  it("propagates page query and context failures", async () => {
    const context = dependencies();
    const queryFailure = new Error("Query failed");
    await expect(loadLibraryPage({ ...context, nodePersistence: { queryPage: async () => { throw queryFailure; } } }, { query: "", page: 1, pageSize: 20 })).rejects.toBe(queryFailure);
    const contextFailure = new Error("Contexts failed");
    context.placementPersistence.list = async () => { throw contextFailure; };
    await expect(loadLibraryPage({ ...context, nodePersistence: { queryPage: async () => ({ items: [createNode("Una idea")], total: 1, page: 1, pageSize: 20 }) } }, { query: "", page: 1, pageSize: 20 })).rejects.toBe(contextFailure);
  });
});

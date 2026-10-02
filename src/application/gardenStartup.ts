import { createCanvas, rehydrateCanvas, type Canvas } from "../domain/canvas";
import type { CanvasPersistence } from "./canvasPersistence";

export interface GardenStartup {
  readonly gardens: Canvas[];
  readonly initialGarden: Canvas | null;
}

export async function loadGardenStartup(
  persistence: Pick<CanvasPersistence, "list">,
): Promise<GardenStartup> {
  const gardens = await persistence.list();

  return {
    gardens,
    initialGarden: null,
  };
}

export async function createGarden(
  persistence: Pick<CanvasPersistence, "save">,
  title: string,
): Promise<Canvas> {
  const garden = createCanvas(title);
  await persistence.save(garden);
  return garden;
}

export async function renameGarden(
  persistence: Pick<CanvasPersistence, "save">,
  garden: Canvas,
  title: string,
): Promise<Canvas> {
  const renamed = rehydrateCanvas(garden.id, title);
  await persistence.save(renamed);
  return renamed;
}

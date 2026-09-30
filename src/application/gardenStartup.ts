import { createCanvas, type Canvas } from "../domain/canvas";
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
    initialGarden: gardens[0] ?? null,
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

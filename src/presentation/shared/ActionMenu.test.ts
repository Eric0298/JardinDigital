import { describe, expect, it } from "vitest";
import { placeContextActionMenu } from "./ActionMenu";

describe("Context action menu viewport placement", () => {
  it("opens close to the client pointer without modifying flow coordinates", () => {
    expect(placeContextActionMenu({ x: 400, y: 250 }, { width: 1360, height: 900 }, { width: 248, height: 180 })).toEqual({ left: 408, top: 258 });
  });

  it("keeps a menu fully inside narrow viewport corners", () => {
    const viewport = { width: 900, height: 680 };
    const size = { width: 248, height: 210 };
    for (const position of [{ x: 0, y: 0 }, { x: 900, y: 0 }, { x: 0, y: 680 }, { x: 900, y: 680 }]) {
      const placed = placeContextActionMenu(position, viewport, size);
      expect(placed.left).toBeGreaterThanOrEqual(16);
      expect(placed.top).toBeGreaterThanOrEqual(16);
      expect(placed.left + size.width).toBeLessThanOrEqual(viewport.width - 16);
      expect(placed.top + size.height).toBeLessThanOrEqual(viewport.height - 16);
    }
  });

  it("accounts for the CSS height and width limits in a small window", () => {
    expect(placeContextActionMenu({ x: 290, y: 190 }, { width: 300, height: 200 }, { width: 248, height: 600 })).toEqual({ left: 36, top: 16 });
    expect(placeContextActionMenu({ x: 200, y: 190 }, { width: 220, height: 200 }, { width: 248, height: 600 })).toEqual({ left: 16, top: 16 });
  });
});

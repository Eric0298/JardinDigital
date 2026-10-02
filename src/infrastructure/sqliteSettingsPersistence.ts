import {
  type AppearanceSettings,
  type SettingsPersistence,
} from "../application/settings";
import { jardindigitalDatabase } from "./sqliteDatabase";

export function createSqliteSettingsPersistence(): SettingsPersistence {
  return {
    async load() {
      const db = await jardindigitalDatabase();
      const rows = await db.select<Array<{ theme: unknown; canvas_background: unknown }>>(
        "SELECT theme, canvas_background FROM appearance_settings WHERE id = 1",
      );
      const row = rows[0];
      if (
        row === undefined ||
        !["system", "light", "dark"].includes(String(row.theme)) ||
        !["plain", "dots", "grid"].includes(String(row.canvas_background))
      ) {
        throw new Error("Appearance settings could not be loaded.");
      }
      return {
        theme: row.theme,
        canvasBackground: row.canvas_background,
      } as AppearanceSettings;
    },
    async save(settings) {
      const db = await jardindigitalDatabase();
      await db.execute(
        "UPDATE appearance_settings SET theme = $1, canvas_background = $2 WHERE id = 1",
        [settings.theme, settings.canvasBackground],
      );
    },
  };
}

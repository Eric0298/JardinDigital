export type Theme = "system" | "light" | "dark";
export type CanvasBackground = "plain" | "dots" | "grid";

export interface AppearanceSettings {
  readonly theme: Theme;
  readonly canvasBackground: CanvasBackground;
}

export const defaultAppearance: AppearanceSettings = {
  theme: "system",
  canvasBackground: "dots",
};

export interface SettingsPersistence {
  load(): Promise<AppearanceSettings>;
  save(settings: AppearanceSettings): Promise<void>;
}

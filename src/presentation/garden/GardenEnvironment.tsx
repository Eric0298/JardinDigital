import { memo } from "react";
import type { CanvasId } from "../../domain/canvas";
import type { GardenGrowth } from "./gardenGrowth";
import { GardenScene } from "./GardenScene";

interface GardenEnvironmentProps {
  readonly gardenId: CanvasId;
  readonly growth: GardenGrowth;
}

/** Peripheral presentation layers; deliberately independent of the graph renderer. */
export const GardenEnvironment = memo(function GardenEnvironment({ gardenId, growth }: GardenEnvironmentProps) {
  return <div className="garden-environment" aria-hidden="true" style={{ pointerEvents: "none" }} data-environment-stage={growth.stage}>
    <div className="garden-environment__distant"><GardenScene gardenId={gardenId} stage={growth.stage} /></div>
    <div className="garden-environment__near"><GardenScene gardenId={gardenId} stage={growth.stage} /></div>
  </div>;
});

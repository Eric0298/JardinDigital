import { memo, useId, useMemo } from "react";
import type { CanvasId } from "../../domain/canvas";
import { composeGardenScene } from "./gardenGrowth";

interface GardenSceneProps {
  readonly gardenId: CanvasId;
  /** null denotes unavailable/unloaded counts, rather than an empty garden. */
  readonly stage: number | null;
}

/** Original, reusable SVG vegetation. Decorative; no external images or animation. */
export const GardenScene = memo(function GardenScene({ gardenId, stage }: GardenSceneProps) {
  const prefix = useId();
  const scene = useMemo(() => composeGardenScene(gardenId, stage ?? 0), [gardenId, stage]);
  return <svg className={`garden-scene${stage === null ? " garden-scene--pending" : ""}`} viewBox="0 0 360 180" preserveAspectRatio="xMidYMid meet"
    aria-hidden="true" focusable="false" data-growth-stage={stage ?? undefined} data-visual-seed={scene.seed}>
    <defs>
      <g id={`${prefix}-sprout`}>
        <path className="garden-scene__trunk" d="M0 0V-24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path className="garden-scene__sprout" d="M0-17C-13-15-20-23-19-29C-8-31-1-27 0-17ZM0-11C13-9 21-15 21-22C10-25 2-22 0-11Z" />
      </g>
      <g id={`${prefix}-bush`}>
        <path className="garden-scene__foliage-back" d="M-28 0C-36-6-30-20-22-22C-18-40 2-42 9-30C29-34 42-16 32-3C13 6-10 6-28 0Z" />
        <path className="garden-scene__bush" d="M-23 0C-30-10-18-26-8-25C5-39 24-23 24-7C21 5-4 6-23 0Z" />
      </g>
      <g id={`${prefix}-tree`}>
        <path className="garden-scene__trunk" d="M-4 0L-2-61H2L5 0Z" />
        <path className="garden-scene__foliage-back" d="M-4-36C-31-32-39-57-25-69C-29-89-8-100 4-92C24-100 43-80 34-64C47-43 17-25-4-36Z" />
        <path className="garden-scene__foliage-front" d="M-13-47C-27-56-24-77-12-81C-3-98 23-91 25-72C33-53 10-40-13-47Z" />
        <path className="garden-scene__trunk" d="M0-24L-12-45M1-34L13-54" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </g>
    </defs>
    <path className="garden-scene__horizon" d="M0 132C36 120 57 108 93 113C140 119 154 103 198 110C250 120 289 104 360 128V180H0Z" />
    <path className="garden-scene__soil-side" d="M22 137C51 114 303 112 338 137V147C312 175 61 179 22 150Z" />
    <path className="garden-scene__soil-top" d="M22 137C51 111 303 111 338 137C311 166 58 168 22 137Z" />
    {scene.decorations.map((decoration, index) => <use key={`${decoration.kind}-${index}`} href={`#${prefix}-${decoration.kind}`}
      transform={`translate(${decoration.x.toFixed(2)} ${decoration.y.toFixed(2)}) scale(${(decoration.flipped ? -decoration.scale : decoration.scale).toFixed(3)} ${decoration.scale.toFixed(3)})`} />)}
    {scene.water ? <path className="garden-scene__water" d="M210 150C220 145 242 146 251 151C264 150 274 154 265 158C251 164 219 161 210 156Z" /> : null}
    {scene.fauna ? <path className="garden-scene__fauna" d="M64 40Q70 33 76 40Q82 33 88 40M294 28Q299 22 304 28Q309 22 314 28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /> : null}
  </svg>;
});

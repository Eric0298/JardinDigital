import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createCanvas } from "../../domain/canvas";
import type { GardenSummary } from "../../application/gardenSummary";
import { HomeGardenCard } from "./HomePage";
import { GardenEnvironment } from "../garden/GardenEnvironment";
import { GardenScene } from "../garden/GardenScene";

describe("Evolving home garden visuals", () => {
  it("derives the garden visual from all three counters while retaining clear Spanish actions", () => {
    const garden = createCanvas("Conocimiento conectado");
    const summary: GardenSummary = { gardenId: garden.id, ideaCount: 10, connectionCount: 10, resourceCount: 6 };
    const html = renderToStaticMarkup(<HomeGardenCard garden={garden} summary={summary} onOpen={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />);
    expect(html).toContain('data-growth-stage="7"');
    expect(html).toContain("10 ideas");
    for (const label of ["Abrir", "Renombrar", "Eliminar jardín", garden.title]) expect(html).toContain(label);
    expect(html).not.toContain(garden.id);
    expect(html).not.toContain("Growth");
    expect(html).not.toContain("Stage");
  });

  it("distinguishes unknown counts from a genuinely empty garden", () => {
    const garden = createCanvas("Un jardín");
    const props = { garden, onOpen: vi.fn(), onRename: vi.fn(), onDelete: vi.fn() };
    const pending = renderToStaticMarkup(<HomeGardenCard {...props} summary={undefined} />);
    const empty = renderToStaticMarkup(<HomeGardenCard {...props} summary={{ gardenId: garden.id, ideaCount: 0, connectionCount: 0, resourceCount: 0 }} />);
    expect(pending).toContain("garden-scene--pending");
    expect(pending).not.toContain("data-growth-stage");
    expect(pending).not.toContain("0 ideas");
    expect(empty).toContain('data-growth-stage="0"');
    expect(empty).toContain("0 ideas");
  });

  it("keeps original mature scenery small and its environment outside the interactive graph", () => {
    const garden = createCanvas("Maduro");
    const svg = renderToStaticMarkup(<GardenScene gardenId={garden.id} stage={11} />);
    expect(svg.match(/<use\b/g)).toHaveLength(18);
    expect(svg).toContain("garden-scene__water");
    expect(svg).toContain("garden-scene__fauna");
    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("gradient");
    const environment = renderToStaticMarkup(<GardenEnvironment gardenId={garden.id} growth={{ score: 150, stage: 11 }} />);
    expect(environment).toContain('aria-hidden="true"');
    expect(environment).toContain("pointer-events:none");
    expect(environment).not.toContain("react-flow__node");
    expect(environment).not.toContain("button");
  });
});

import { useEffect, useState } from "react";
import type { GardenSummary, GardenSummaryQuery } from "../../application/gardenSummary";
import type { Canvas, CanvasId } from "../../domain/canvas";
import { Icon } from "../shared/Icon";
import { ActionMenu } from "../shared/ActionMenu";
import { GardenScene } from "../garden/GardenScene";
import { deriveGardenGrowth } from "../garden/gardenGrowth";

interface HomePageProps {
  readonly gardens: readonly Canvas[];
  readonly summaryQuery: GardenSummaryQuery;
  readonly growthRevision?: number;
  readonly onOpen: (id: CanvasId) => void;
  readonly onNew: () => void;
  readonly onRename: (garden: Canvas) => void;
  readonly onDelete: (garden: Canvas) => void;
}

interface HomeGardenCardProps {
  readonly garden: Canvas;
  readonly summary: GardenSummary | undefined;
  readonly onOpen: (id: CanvasId) => void;
  readonly onRename: (garden: Canvas) => void;
  readonly onDelete: (garden: Canvas) => void;
}

export function HomeGardenCard({ garden, summary, onOpen, onRename, onDelete }: HomeGardenCardProps) {
  const growth = summary === undefined ? null : deriveGardenGrowth(summary);
  return <article className="home-garden-card">
    <button type="button" className="home-garden-cover" onClick={() => onOpen(garden.id)} aria-label={`Abrir el jardín ${garden.title}`}>
      <GardenScene gardenId={garden.id} stage={growth?.stage ?? null} />
    </button>
    <div className="home-garden-info"><h3>{garden.title}</h3>{summary !== undefined ? <p>{summary.ideaCount} {summary.ideaCount === 1 ? "idea" : "ideas"}</p> : null}</div>
    <div className="home-garden-actions">
      <button type="button" className="accent-button home-garden-open" onClick={() => onOpen(garden.id)} aria-label={`Abrir ${garden.title}`}>Abrir<Icon name="open" /></button>
      <ActionMenu label={`Opciones del jardín ${garden.title}`}>
        <button type="button" className="secondary-button" onClick={() => onRename(garden)}><Icon name="edit" />Renombrar</button>
        <button type="button" className="danger-button" onClick={() => onDelete(garden)}><Icon name="trash" />Eliminar jardín</button>
      </ActionMenu>
    </div>
  </article>;
}

export function HomePage({ gardens, summaryQuery, growthRevision = 0, onOpen, onNew, onRename, onDelete }: HomePageProps) {
  const [summaries, setSummaries] = useState<ReadonlyMap<CanvasId, GardenSummary> | null>(null);
  const [summaryFailed, setSummaryFailed] = useState(false);
  const [summaryRevision, setSummaryRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setSummaries(null);
    setSummaryFailed(false);
    if (gardens.length === 0) return;
    void summaryQuery.load().then((loaded) => {
      if (!cancelled) setSummaries(new Map(loaded.map((summary) => [summary.gardenId, summary])));
    }).catch(() => { if (!cancelled) setSummaryFailed(true); });
    return () => { cancelled = true; };
  }, [gardens, summaryQuery, summaryRevision, growthRevision]);

  return (
    <section className="home-page" aria-label="Inicio">
      <header className="home-header">
        <div><p className="eyebrow">Tu espacio personal</p><h2>Mis jardines</h2><p>Ideas que crecen al conectarse.</p></div>
        <button type="button" className="accent-button" onClick={onNew}><Icon name="plus" />Nuevo jardín</button>
      </header>
      {summaryFailed ? <div className="home-summary-status" role="status"><p>No se pudo mostrar el crecimiento de tus jardines.</p><button type="button" className="secondary-button" onClick={() => setSummaryRevision((current) => current + 1)}>Reintentar</button></div> : null}
      {gardens.length === 0 ? (
        <div className="home-empty">
          <span className="home-sprout" aria-hidden="true"><Icon name="garden" /></span>
          <h3>Tu primer jardín empieza aquí.</h3>
          <p>Crea tu primer jardín y empieza a conectar tus ideas.</p>
          <button type="button" className="accent-button" onClick={onNew}><Icon name="plus" />Crear jardín</button>
        </div>
      ) : (
        <div className="home-gardens">
          {gardens.map((garden) => <HomeGardenCard key={garden.id} garden={garden} summary={summaries?.get(garden.id)} onOpen={onOpen} onRename={onRename} onDelete={onDelete} />)}
        </div>
      )}
    </section>
  );
}

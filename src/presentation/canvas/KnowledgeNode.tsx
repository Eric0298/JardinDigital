import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { Icon } from "../shared/Icon";
import type { CanvasFlowNode } from "./reactFlowAdapter";

export const KnowledgeNode = memo(function KnowledgeNode({
  data,
  selected,
  isConnectable,
}: NodeProps<CanvasFlowNode>) {
  return (
    <article
      className={`knowledge-node${selected ? " knowledge-node--selected" : ""}`}
    >
      <Handle
        id="target"
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        aria-label="Destino de conexión"
      />
      <strong className="knowledge-node__title">
        {data.title || "Idea sin título"}
      </strong>
      {data.content.length > 0 ? (
        <p className="knowledge-node__preview">{data.content}</p>
      ) : null}
      {data.resourceCounts !== undefined ? (
        <div className="knowledge-node__resources">
          {data.resourceCounts.document > 0 ? <span aria-label={`${data.resourceCounts.document} ${data.resourceCounts.document === 1 ? "documento" : "documentos"}`} title="Documentos"><Icon name="document" /> {data.resourceCounts.document}</span> : null}
          {data.resourceCounts.video > 0 ? <span aria-label={`${data.resourceCounts.video} ${data.resourceCounts.video === 1 ? "vídeo" : "vídeos"}`} title="Vídeos"><Icon name="video" /> {data.resourceCounts.video}</span> : null}
          {data.resourceCounts.link > 0 ? <span aria-label={`${data.resourceCounts.link} ${data.resourceCounts.link === 1 ? "enlace" : "enlaces"}`} title="Enlaces"><Icon name="link" /> {data.resourceCounts.link}</span> : null}
        </div>
      ) : null}
      <Handle
        id="source"
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        aria-label="Origen de conexión"
      />
    </article>
  );
});

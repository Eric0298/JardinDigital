import type { NodeProps } from "@xyflow/react";
import type { CanvasFlowNode } from "./reactFlowAdapter";

export function KnowledgeNode({ data, selected }: NodeProps<CanvasFlowNode>) {
  return (
    <article
      className={`knowledge-node${selected ? " knowledge-node--selected" : ""}`}
    >
      <strong className="knowledge-node__title">
        {data.title || "Untitled idea"}
      </strong>
      {data.content.length > 0 ? (
        <p className="knowledge-node__preview">{data.content}</p>
      ) : null}
    </article>
  );
}

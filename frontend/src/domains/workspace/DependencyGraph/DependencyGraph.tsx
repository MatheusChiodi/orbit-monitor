import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Status } from '@/shared/api/types';
import { safeText } from '@/shared/privacy/redact';
import { AnimatedItem, StatusDot, TEXT_CLASS } from '@/shared/ui';
import { impactRadius, layoutGraph, type Edge } from './graph';

export interface GraphNode {
  id: string;
  label: string;
  status: Status;
}

export type GraphEdge = Edge;

export interface DependencyGraphProps {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
}

/** FE-42: layered dependency graph; selecting a node highlights and announces its impact radius. */
export function DependencyGraph({ nodes, edges }: DependencyGraphProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const positions = layoutGraph(nodes, edges);
  const impacted = selected ? impactRadius(edges, selected) : new Set<string>();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ordered = [...nodes].sort((a, b) => {
    const pa = positions.get(a.id)!;
    const pb = positions.get(b.id)!;
    return pa.column - pb.column || pa.row - pb.row;
  });
  const columns = [...new Set(ordered.map((n) => positions.get(n.id)!.column))];
  const selectedNode = selected ? byId.get(selected) : undefined;

  if (edges.length === 0) return <p className="m-0 text-[0.85rem] text-muted">{t('dependencies.empty')}</p>;

  return (
    <div
      role="group"
      aria-label={t('dependencies.graph')}
      className="flex flex-col gap-[0.8rem]"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setSelected(null);
      }}
    >
      <div className="flex gap-[1.2rem] overflow-auto">
        {columns.map((column) => (
          <ul key={column} className="m-0 flex list-none flex-col gap-[0.5rem] p-0">
            {ordered
              .filter((n) => positions.get(n.id)!.column === column)
              .map((node, index, list) => {
                const label = `${safeText(node.label)} · ${t(`status.label.${node.status}`)}`;
                const isImpacted = impacted.has(node.id);
                return (
                  <AnimatedItem key={node.id} index={index} count={list.length}>
                    <button
                      type="button"
                      aria-label={label}
                      aria-pressed={selected === node.id}
                      data-impacted={isImpacted ? 'true' : 'false'}
                      onClick={() => setSelected(selected === node.id ? null : node.id)}
                      className={`flex items-center gap-[0.45rem] rounded-[0.45rem] border px-[0.6rem] py-[0.4rem] text-[0.85rem] transition-colors duration-[400ms] ${
                        selected === node.id ? 'border-info bg-info/15' : isImpacted ? 'border-warn/60 bg-warn/12' : 'border-line bg-s2'
                      }`}
                    >
                      <StatusDot status={node.status} />
                      <span>{safeText(node.label)}</span>
                      <span className={`text-[0.68rem] font-semibold ${TEXT_CLASS[node.status]}`}>{t(`status.label.${node.status}`)}</span>
                    </button>
                  </AnimatedItem>
                );
              })}
          </ul>
        ))}
      </div>
      {selectedNode && (
        <p role="status" className="m-0 text-[0.85rem] text-muted">
          {t('dependencies.impacts', {
            name: safeText(selectedNode.label),
            count: impacted.size,
            list: [...impacted].map((id) => safeText(byId.get(id)?.label ?? id)).join(', '),
          })}
        </p>
      )}
    </div>
  );
}

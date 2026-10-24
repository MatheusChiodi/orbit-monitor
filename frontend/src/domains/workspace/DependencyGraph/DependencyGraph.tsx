import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnimationLevel } from '@/shared/motion/animationLevel';
import type { Status } from '@/shared/api/types';
import { safeText } from '@/shared/privacy/redact';
import { StatusBadge } from '@/shared/ui';
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

interface Point {
  x: number;
  y: number;
}

type Anchors = Record<string, { out: Point; in: Point }>;

/** Cubic curve from the right side of the upstream node to the left side of the downstream one. */
function edgePath(from: Point, to: Point): string {
  const bend = Math.max(24, (to.x - from.x) / 2);
  return `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`;
}

/** FE-42: layered dependency graph with drawn edges; selecting a node highlights and announces its impact radius. */
export function DependencyGraph({ nodes, edges }: DependencyGraphProps) {
  const { t } = useTranslation();
  const level = useAnimationLevel();
  const [selected, setSelected] = useState<string | null>(null);
  const [anchors, setAnchors] = useState<Anchors>({});
  const [size, setSize] = useState({ width: 0, height: 0 });
  const canvas = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
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
  const layoutKey = `${nodes.map((n) => n.id).join(',')}|${edges.map((e) => `${e.from}>${e.to}`).join(',')}`;

  // Edges follow the rendered buttons: measured after layout and again whenever the canvas resizes.
  useLayoutEffect(() => {
    const host = canvas.current;
    if (!host) return;
    const measure = () => {
      const origin = host.getBoundingClientRect();
      const next: Anchors = {};
      for (const [id, el] of buttons.current) {
        const r = el.getBoundingClientRect();
        const y = r.top - origin.top + r.height / 2 + host.scrollTop;
        next[id] = { out: { x: r.right - origin.left + host.scrollLeft, y }, in: { x: r.left - origin.left + host.scrollLeft, y } };
      }
      setAnchors(next);
      setSize({ width: host.scrollWidth, height: host.scrollHeight });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [layoutKey]);

  if (edges.length === 0) return <p className="m-0 text-base text-muted">{t('dependencies.empty')}</p>;

  const origin = { x: 0, y: 0 };
  const hot = (edge: Edge) => selected !== null && (edge.from === selected || impacted.has(edge.from)) && impacted.has(edge.to);

  return (
    <div
      role="group"
      aria-label={t('dependencies.graph')}
      className="flex flex-col gap-3"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setSelected(null);
      }}
    >
      <div ref={canvas} className="relative overflow-auto rounded-md border border-line bg-s1 p-4">
        <svg aria-hidden="true" width={size.width} height={size.height} className="pointer-events-none absolute top-0 left-0 overflow-visible">
          <defs>
            {(['line-2', 'warn'] as const).map((tone) => (
              <marker key={tone} id={`dependency-arrow-${tone}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto">
                <path d="M0 0 L8 4 L0 8 z" className={tone === 'warn' ? 'fill-warn' : 'fill-line-2'} />
              </marker>
            ))}
          </defs>
          {edges.map((edge) => (
            <path
              key={`${edge.from}>${edge.to}`}
              data-edge={`${edge.from}>${edge.to}`}
              d={edgePath(anchors[edge.from]?.out ?? origin, anchors[edge.to]?.in ?? origin)}
              fill="none"
              strokeWidth={hot(edge) ? 2 : 1.5}
              markerEnd={`url(#dependency-arrow-${hot(edge) ? 'warn' : 'line-2'})`}
              className={`${hot(edge) ? 'stroke-warn' : 'stroke-line-2'} ${level === 'off' ? '' : 'transition-colors duration-200'}`}
            />
          ))}
        </svg>
        <div className="relative flex gap-16">
          {columns.map((column) => (
            <ul key={column} className="m-0 flex list-none flex-col justify-center gap-3 p-0">
              {ordered
                .filter((n) => positions.get(n.id)!.column === column)
                .map((node) => {
                  const label = `${safeText(node.label)} · ${t(`status.label.${node.status}`)}`;
                  const isImpacted = impacted.has(node.id);
                  return (
                    <li key={node.id}>
                      <button
                        ref={(el) => {
                          if (el) buttons.current.set(node.id, el);
                          else buttons.current.delete(node.id);
                        }}
                        type="button"
                        aria-label={label}
                        aria-pressed={selected === node.id}
                        data-impacted={isImpacted ? 'true' : 'false'}
                        onClick={() => setSelected(selected === node.id ? null : node.id)}
                        className={`flex h-9 items-center gap-2 rounded-sm border px-3 text-base whitespace-nowrap focus-visible:outline-2 focus-visible:outline-accent ${
                          level === 'off' ? '' : 'transition-colors duration-200'
                        } ${selected === node.id ? 'border-accent bg-s3' : isImpacted ? 'border-warn bg-s2' : 'border-line bg-s2 hover:bg-s3'}`}
                      >
                        <span>{safeText(node.label)}</span>
                        <StatusBadge status={node.status} size="sm" />
                      </button>
                    </li>
                  );
                })}
            </ul>
          ))}
        </div>
      </div>
      {selectedNode ? (
        <p role="status" className="m-0 text-base text-muted">
          {t('dependencies.impacts', {
            name: safeText(selectedNode.label),
            count: impacted.size,
            list: [...impacted].map((id) => safeText(byId.get(id)?.label ?? id)).join(', '),
          })}
        </p>
      ) : (
        <p className="m-0 text-sm text-dim">{t('ops.dependencies.hint')}</p>
      )}
    </div>
  );
}

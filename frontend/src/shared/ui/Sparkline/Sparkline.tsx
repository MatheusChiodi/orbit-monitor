import type { Status } from '@/shared/api/types';

const STROKE: Record<Status | 'INFO', string> = {
  OK: 'var(--ok)',
  WARN: 'var(--warn)',
  DOWN: 'var(--down)',
  INFO: 'var(--info)',
};

function round(n: number): number {
  return Number(n.toFixed(2));
}

/** Caminho SVG da série; `null` quebra a linha (sem resposta). */
export function sparklinePath(values: readonly (number | null)[], width: number, height: number): string {
  const numbers = values.filter((v): v is number => v !== null);
  if (numbers.length === 0) return '';
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const range = max - min;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const parts: string[] = [];
  let penDown = false;
  values.forEach((value, i) => {
    if (value === null) {
      penDown = false;
      return;
    }
    const x = round(i * step);
    const y = round(range === 0 ? height / 2 : height - ((value - min) / range) * height);
    parts.push(`${penDown ? 'L' : 'M'}${x},${y}`);
    penDown = true;
  });
  return parts.join(' ');
}

export interface SparklineProps {
  values: readonly (number | null)[];
  status?: Status | 'INFO';
  label?: string;
  className?: string;
}

const W = 100;
const H = 28;

export function Sparkline({ values, status = 'INFO', label, className = '' }: SparklineProps) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      className={`block h-[1.6rem] w-full overflow-visible ${className}`}
    >
      <path
        d={sparklinePath(values, W, H)}
        fill="none"
        stroke={STROKE[status]}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

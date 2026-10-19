export interface DiffLine {
  op: 'equal' | 'remove' | 'add';
  /** Line number in the old text (null for added lines). */
  left: number | null;
  /** Line number in the new text (null for removed lines). */
  right: number | null;
  text: string;
}

/** Line diff based on the longest common subsequence; removals come before additions in a hunk. */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      out.push({ op: 'equal', left: i + 1, right: j + 1, text: a[i]! });
      i += 1;
      j += 1;
    } else if (i < a.length && (j >= b.length || lcs[i + 1]![j]! >= lcs[i]![j + 1]!)) {
      out.push({ op: 'remove', left: i + 1, right: null, text: a[i]! });
      i += 1;
    } else {
      out.push({ op: 'add', left: null, right: j + 1, text: b[j]! });
      j += 1;
    }
  }
  return out;
}

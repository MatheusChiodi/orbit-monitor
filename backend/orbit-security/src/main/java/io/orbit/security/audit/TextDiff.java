package io.orbit.security.audit;

import java.util.ArrayList;
import java.util.List;

/** BE-46: line diff recorded in the audit trail when a SELECT changes (both sides are masked first). */
public final class TextDiff {

    /** Above this many line pairs the LCS table is skipped and the changed block is shown as replaced. */
    private static final long MAX_CELLS = 4_000_000L;

    private TextDiff() {
    }

    /** Unified-style diff: {@code -} removed lines, {@code +} added lines; empty when equal. */
    public static String of(String before, String after) {
        String[] a = lines(before);
        String[] b = lines(after);
        int start = 0;
        while (start < a.length && start < b.length && a[start].equals(b[start])) {
            start++;
        }
        int endA = a.length;
        int endB = b.length;
        while (endA > start && endB > start && a[endA - 1].equals(b[endB - 1])) {
            endA--;
            endB--;
        }
        List<String> out = new ArrayList<>();
        if ((long) (endA - start) * (endB - start) > MAX_CELLS) {
            for (int i = start; i < endA; i++) {
                out.add("-" + a[i]);
            }
            for (int j = start; j < endB; j++) {
                out.add("+" + b[j]);
            }
        } else {
            diffMiddle(a, start, endA, b, start, endB, out);
        }
        return String.join("\n", out);
    }

    /** Longest-common-subsequence diff of a[fromA, toA) against b[fromB, toB); removals come first. */
    private static void diffMiddle(String[] a, int fromA, int toA, String[] b, int fromB, int toB, List<String> out) {
        int n = toA - fromA;
        int m = toB - fromB;
        int[][] lcs = new int[n + 1][m + 1];
        for (int i = n - 1; i >= 0; i--) {
            for (int j = m - 1; j >= 0; j--) {
                lcs[i][j] = a[fromA + i].equals(b[fromB + j])
                        ? lcs[i + 1][j + 1] + 1
                        : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
            }
        }
        int i = 0;
        int j = 0;
        while (i < n || j < m) {
            if (i < n && j < m && a[fromA + i].equals(b[fromB + j])) {
                i++;
                j++;
            } else if (i < n && (j == m || lcs[i + 1][j] >= lcs[i][j + 1])) {
                out.add("-" + a[fromA + i]);
                i++;
            } else {
                out.add("+" + b[fromB + j]);
                j++;
            }
        }
    }

    private static String[] lines(String text) {
        if (text == null || text.isEmpty()) {
            return new String[0];
        }
        return text.split("\\R", -1);
    }
}

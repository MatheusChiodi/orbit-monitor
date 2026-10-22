package io.orbit.monitor.condition;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * BE-06: regular expressions evaluated with a deadline. {@code java.util.regex} backtracks, so a
 * pattern such as {@code ^(a+)+$} can run for minutes on a crafted body; the input is wrapped in a
 * {@link CharSequence} that aborts once the deadline passes, and the match then counts as failed.
 */
final class BoundedRegex {

    static final Duration DEFAULT_TIMEOUT = Duration.ofMillis(250);
    /** Only the start of very large bodies is searched. */
    static final int MAX_INPUT_CHARS = 1_000_000;
    private static final int MAX_CACHED_PATTERNS = 256;
    private static final Map<String, Pattern> CACHE = new ConcurrentHashMap<>();

    private BoundedRegex() {
    }

    static boolean find(String regex, String input) {
        return find(regex, input, DEFAULT_TIMEOUT);
    }

    /** {@code Matcher.find()} on the input; throws {@link IncomparableValuesException} when cut off. */
    static boolean find(String regex, String input, Duration timeout) {
        Pattern pattern = compile(regex);
        String text = input.length() > MAX_INPUT_CHARS ? input.substring(0, MAX_INPUT_CHARS) : input;
        try {
            return pattern.matcher(new DeadlineCharSequence(text, System.nanoTime() + timeout.toNanos())).find();
        } catch (RegexTimeoutException e) {
            throw new IncomparableValuesException("Regular expression took longer than " + timeout.toMillis()
                    + " ms and was cut off: " + regex);
        } catch (StackOverflowError e) {
            throw new IncomparableValuesException("Regular expression is too complex for this value: " + regex);
        }
    }

    private static Pattern compile(String regex) {
        Pattern cached = CACHE.get(regex);
        if (cached != null) {
            return cached;
        }
        Pattern pattern = Pattern.compile(regex);
        if (CACHE.size() >= MAX_CACHED_PATTERNS) {
            CACHE.clear();
        }
        CACHE.put(regex, pattern);
        return pattern;
    }

    private static final class RegexTimeoutException extends RuntimeException {
        RegexTimeoutException() {
            super(null, null, false, false);
        }
    }

    /** Checks the deadline every few hundred reads; the regex engine reads characters constantly. */
    private static final class DeadlineCharSequence implements CharSequence {
        private static final int CHECK_EVERY = 512;
        private final CharSequence text;
        private final long deadlineNanos;
        private int reads;

        DeadlineCharSequence(CharSequence text, long deadlineNanos) {
            this.text = text;
            this.deadlineNanos = deadlineNanos;
        }

        @Override
        public char charAt(int index) {
            if (++reads >= CHECK_EVERY) {
                reads = 0;
                if (System.nanoTime() - deadlineNanos > 0) {
                    throw new RegexTimeoutException();
                }
            }
            return text.charAt(index);
        }

        @Override
        public int length() {
            return text.length();
        }

        @Override
        public CharSequence subSequence(int start, int end) {
            return new DeadlineCharSequence(text.subSequence(start, end), deadlineNanos);
        }

        @Override
        public String toString() {
            return text.toString();
        }
    }
}

---
id: BE-06
title: "HTTP keyword/regex match"
area: backend
group: "Probes"
status: done
screens: []
spec: docs/05-extended-features.md
updated: 2026-10-22
---

# BE-06 · HTTP keyword/regex match

## Summary
Body contains / does not contain / regex

## Status
- [x] Tests written (pending or active)
- [x] Implemented
- [x] All tests green, none pending

## Screens
—

## Code
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/condition/ConditionParser.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/condition/Operator.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/condition/Evaluators.java`
- `backend/orbit-monitor/src/main/java/io/orbit/monitor/condition/BoundedRegex.java`
- `backend/orbit-api/src/main/resources/messages.properties`
- `backend/orbit-api/src/main/resources/messages_pt_BR.properties`

## Tests
- `backend/orbit-monitor/src/test/java/io/orbit/monitor/condition/KeywordRegexConditionTest.java`

## Decisions and notes
- New operators `not contains` and `matches` (regex validated at save time, evaluation time-bounded against catastrophic backtracking).
- `matches` uses find semantics (anchor with ^ and $); the quoted operand is compiled at parse time, so `[BODY] matches "(unclosed"` is a `condition.invalid-regex` syntax error when saving.
- Bounded evaluation: alternatives were RE2/J (linear time, new dependency, no backreferences/lookaround) and a thread with a timeout (one thread per evaluation). Chosen: no new dependency; the input is wrapped in a CharSequence that checks a 250 ms deadline every 512 reads and aborts the match; bodies are searched up to 1,000,000 chars; a StackOverflowError also counts as failed. A cut-off match fails the condition with a readable message.
- Compiled patterns are cached (up to 256, cleared when full).

## Changelog
- 2026-10-18 — context file created (status: planned).
- 2026-10-18 — pending tests and stubs added (status: tests-pending).
- 2026-10-22 — implemented `not contains` and `matches` with a time-bounded regex (status: done).

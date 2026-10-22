#!/bin/sh
# Regression tests for .githooks/pre-commit (CORE-16). Runs the hook in a throwaway repository.
# Usage: sh .githooks/pre-commit.test.sh
# Card numbers other than the public test numbers are built at runtime, never written here.

hook="${PRE_COMMIT_HOOK:-$(cd "$(dirname "$0")" && pwd)/pre-commit}"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
failures=0

luhn_complete() {
  printf '%s\n' "$1" | awk '{
    sum = 0; alt = 1
    for (i = length($0); i >= 1; i--) {
      x = substr($0, i, 1) + 0
      if (alt) { x *= 2; if (x > 9) x -= 9 }
      sum += x; alt = !alt
    }
    print $0 ((10 - sum % 10) % 10)
  }'
}

PRIVATE_PAN=$(luhn_complete "40128888""1234567")
EPOCH_MS=$(luhn_complete 172925000000)

# expect <blocked|allowed> <description> <path> <content>
expect() {
  repo="$work/repo-$failures-$(date +%s%N)"
  git init -q "$repo" && git -C "$repo" config core.autocrlf false
  mkdir -p "$repo/$(dirname "$3")"
  printf '%s\n' "$4" > "$repo/$3"
  git -C "$repo" add -- "$3"
  if (cd "$repo" && sh "$hook" > "$repo.out" 2>&1); then result=allowed; else result=blocked; fi
  if [ "$result" = "$1" ]; then
    echo "ok   - $2"
  else
    echo "FAIL - $2 (expected $1, got $result)"
    sed 's/^/       /' "$repo.out"
    failures=$((failures + 1))
  fi
  if grep -q "$PRIVATE_PAN" "$repo.out"; then
    echo "FAIL - $2 (the hook printed the full card number)"
    failures=$((failures + 1))
  fi
}

expect blocked "Orbit config file" "orbit.monitors.json" '{"version":1,"items":[]}'
expect allowed "config example" "backend/config-examples/orbit.monitors.example.json" '{"version":1}'
expect blocked "vault key" "master.key" 'key'
expect blocked "local history data" "data/.orbit/heartbeats.log" 'x'
expect blocked "private key" "notes.txt" "-----BEGIN ""PRIVATE KEY-----"
expect blocked "card number in source" "src/app.ts" "const card = '$PRIVATE_PAN';"
expect blocked "card number in a test file" "src/app.test.ts" "const card = '$PRIVATE_PAN';"
expect blocked "card number in a file with spaces in its name" "docs/my notes.md" "card $PRIVATE_PAN"
expect blocked "grouped card number next to another number" "src/log.txt" \
  "order 12 $(printf '%s' "$PRIVATE_PAN" | sed 's/\(....\)/\1 /g')paid"
expect allowed "public test card number in a test" "src/Pan.test.ts" "const pan = '4111111111111111';"
expect allowed "Luhn-valid epoch milliseconds" "src/time.test.ts" "const at = $EPOCH_MS;"
expect allowed "ordinary numbers" "src/app.ts" "const limit = 200; // 2026-10-18"

if [ "$failures" -ne 0 ]; then
  echo "$failures pre-commit hook test(s) failed"
  exit 1
fi
echo "all pre-commit hook tests passed"

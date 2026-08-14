#!/usr/bin/env bash
# Sync the complete frozen PPB contract into PPF.
#
# Canonical generation happens in PPB (openapi-typescript). PPF does not keep a
# second schema model: paths/components/operations, openapi.json and version
# metadata are copied together so one mirror cannot silently lag another.
set -euo pipefail
PPF_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEFAULT_PPB_ROOT="$(cd "$PPF_ROOT/../../ppb/Phira-plus-Backend-main" 2>/dev/null && pwd || true)"
SRC="${1:-${DEFAULT_PPB_ROOT:+$DEFAULT_PPB_ROOT/contracts/types.ts}}"
if [[ -z "$SRC" || ! -f "$SRC" ]]; then
  echo "error: PPB contracts/types.ts not found; pass it as argument 1" >&2
  exit 1
fi
PPB_CONTRACTS="$(cd "$(dirname "$SRC")" && pwd)"
DEST="$PPF_ROOT/src/utils/api/generated.ts"
{
  cat <<'HEADER'
/**
 * GENERATED — complete frozen PPB OpenAPI TypeScript mirror.
 * Do not hand-edit. Regenerate via scripts/gen-types.sh after PPB contract changes.
 */
/* eslint-disable */
// @ts-nocheck
HEADER
  cat "$SRC"
} > "$DEST"
cp "$PPB_CONTRACTS/openapi.json" "$PPF_ROOT/contracts/openapi.json"
cp "$PPB_CONTRACTS/error-codes.json" "$PPF_ROOT/contracts/error-codes.json"
cp "$PPB_CONTRACTS/contract-version.json" "$PPF_ROOT/contracts/contract-version.json"
echo "✓ synced complete contract types/openapi/error-codes/version -> PPF"

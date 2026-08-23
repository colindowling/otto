#!/usr/bin/env bash
# Decode image assets committed as base64 text.
# The images are stored as *.b64 because the deploy path that writes this repo
# cannot carry raw binary safely. This restores them at build time.
set -euo pipefail
shopt -s nullglob
for f in assets/*.b64; do
  out="${f%.b64}"
  base64 -d "$f" > "$out"
  rm -f "$f"
  echo "decoded $out ($(wc -c < "$out") bytes)"
done
echo "asset decode complete"

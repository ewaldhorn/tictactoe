#!/usr/bin/env bash
set -euo pipefail

echo "=== Building project ==="

mkdir -p docs

echo "Compiling JavaScript..."
esbuild src/index.js \
  --bundle \
  --minify \
  --outfile=docs/index.min.js

echo "Minifying CSS..."
minify src/style.css > docs/style.min.css

echo "Copying HTML..."
cp index.html docs/index.html

echo "=== Build complete ==="
ls -la docs/

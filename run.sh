#!/usr/bin/env bash
set -euo pipefail

echo "=== Running project ==="

if ! ./build.sh; then
  echo "Build failed. Exiting."
  exit 1
fi

echo "=== Serving on http://localhost:9000 ==="
http-server docs -p 9000

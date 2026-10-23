#!/usr/bin/env bash
# Regenerate the task.toml JSON Schema from a pinned Harbor release.
# Bump HARBOR_VERSION here and in src/features/harbor/constants.ts together.
set -euo pipefail

HARBOR_VERSION="0.24.0"
cd "$(dirname "$0")/.."

uvx --from "harbor==${HARBOR_VERSION}" harbor task schema \
  > src/features/harbor/task-schema.json
echo "Wrote src/features/harbor/task-schema.json from harbor ${HARBOR_VERSION}"

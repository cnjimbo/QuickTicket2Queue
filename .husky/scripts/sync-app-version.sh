#!/bin/sh
pnpm exec tsx "$(dirname "$0")/auto-bump-version-by-branch.ts" "$@"
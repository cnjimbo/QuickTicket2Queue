#!/bin/sh
pnpm exec tsx "$(dirname "$0")/validate-branch-version-policy.ts" "$@"
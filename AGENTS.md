<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Slipway

- Read `docs/architecture.md` first; brand and copy rules are in `docs/brand/README.md`.
- Facts about Harbor come from the `harbor` package source, pinned in `src/features/harbor/`. Do not guess Harbor behaviour; check the source (`pip download harbor==<version>`).
- `features/harbor`, `features/parts` and `features/task` are framework-free and unit-tested; keep React out of them (except `task/store.ts`).
- Parts are JSON data, never code. New part capabilities go through `validateManifest`.
- Before pushing: `pnpm test && pnpm typecheck && pnpm lint && pnpm build`.

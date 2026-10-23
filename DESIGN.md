# Slipway design system

Tokens, type, logo and copy rules live in `docs/brand/` (README.md, tokens.json) and are implemented in `src/app/globals.css`. This file records how the app UI uses them. Product truth is in PRODUCT.md.

## Shell

- Pages: sticky `SiteNav` (h-16, translucent paper, pill highlight on the current item), content in `max-w-7xl`, `px-4 md:px-8`, `SiteFooter` (logo, product and resource links, credit) on every page but the workbench.
- Palette: neutral greys with chroma 0; primary buttons are ink; `signal` fills only Launch and the homepage Get started. Radii 6 / 10 / 16 / 22px. Labels are sentence case, never uppercase.
- Homepage: hero with an interactive demo (`features/home/task-demo.tsx`: drag-and-drop parts, live Dockerfile, live FROM check), alternating feature rows with real product snippets, numbered how-it-works, closing CTA.
- Studio workbench (`/studio/[id]`): full-bleed. Top bar (back + mark, mono task path, oracle/nop expectation, locale switch, Launch). Left rail = the Launch folder tree on `surface-sunken`. Canvas = structured editor | generated file on `hull`. Bottom check bar on `surface`, expandable. Below 1024px: Files / Edit / Checks tabs.

## Rules in use

- One `signal` fill per view at most: Launch, or Get started on the homepage.
- Layering by `line` borders and `surface` / `surface-sunken` / `hull` grounds; no shadows except `shadow-drag` while dragging.
- Lists of records are dense tables (sunken header row, tabular numerals), never card grids. Summary numbers sit in one inline strip, never as stat cards.
- Status and severity: lucide icon + word (`CircleX` fail, `TriangleAlert` warn, `CircleCheck` pass). `nop` = 0 reads as "expected 0".
- Selection in trees: `surface` row + 2px ink bar on the leading edge.
- Shadows: `shadow-drag` while dragging, `shadow-float` for the homepage demo and dialogs; everything else layers by border and ground.
- Every path, command and Harbor file name in mono.
- Browser surfaces: tide-tinted `::selection`, signal caret, `line-strong` scrollbars, signal focus ring.

## i18n

- `src/i18n/`: `messages/en.ts` is the typed source; `zh.ts`, `zh-runs.ts`, `zh-parts.ts` must satisfy its type. Client components use `useT()`, server components `await getT()`.
- Locale = cookie `slipway-locale`, else Accept-Language; switching sets the cookie and refreshes. No locale in URLs.
- Harbor terms and Launch stay English in Chinese. Lint and audit messages are translated by rule code with the English message as fallback. Chinese uses PingFang SC / Hiragino Sans GB / Microsoft YaHei, with Noto Sans SC (`next/font`, not preloaded) only as the last fallback.

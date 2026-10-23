---
version: 1
slug: "src-features-studio-studio-tsx"
primary_target: "src/features/studio/studio.tsx"
related_targets: ["src/features/audit/trial-view.tsx"]
---

# Studio workbench (and the Runs pages that share its shell)

Scope: `/studio/[id]` task workbench; the same shell language carries to `/studio`, `/runs`, `/runs/[jobId]`, `/runs/[jobId]/[trial]`. Mode: Operate. Audience: evaluation engineers on large desktop screens, bilingual (en / zh-CN).

## Direction contract

THESIS: The task is a folder, so the folder is the navigation. Refuse the generic "settings sections in a sidebar" arrangement: the left rail is the literal Launch output tree; parts appear as annotations on the files they write.

OWN-WORLD: Brand tokens unchanged. Sunken rail, paper canvas, surface panes, hull for generated output. Signal only on Launch. Tide for links and Harbor objects. Mono for every path. Borders layer, no shadows.

STORY: The engineer sees the whole folder, picks a file, edits it structurally (parts, instruction, settings) on the left of the canvas while the generated file updates on the right, and reads lint plus oracle/nop expectations in a persistent bottom check bar before Launch.

FIRST VIEWPORT: Top bar: back, mark, task path in mono, oracle/nop expectation chips, language switch, Launch (only signal fill). Left rail 260px: folder tree, slots as folders (environment/, tests/, solution/) with part counts and issue marks. Canvas: split, structured editor | generated file on hull. Bottom check bar: counts, first issue, expandable list.

FORM: Candidate 6 of 7, file-tree-first. seed:3f18391d5781e9f7

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

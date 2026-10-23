# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Evaluation and research engineers who already know Harbor. They work on a desktop with a large screen for long sessions: authoring tasks in batches, then auditing agent trajectories step by step to find reward hacks and mistakes. They value density, scanability and keyboard efficiency over hand-holding. Chinese and English speakers both use the product daily.

## Product Purpose

Slipway is a browser studio for Harbor tasks. Studio turns a visual description of a task (instruction, environment parts, verifier, solution, `task.toml`) into the exact folder `harbor run` takes, and checks it against Harbor's own schema and known silent failures. Runs imports the job folders `harbor run` writes and lets a reviewer audit each trial's trajectory, with steps that could fake a reward flagged. Success: a task that scores 1 with `oracle` and 0 with `nop`, and an audit that catches a reward hack a passing score hid.

## Positioning

Built on Harbor's real format and source, not a guess at it: validation uses Harbor's pinned JSON Schema, audit rules follow Harbor's container layout (`/solution`, `/tests`, `/logs/verifier`). Everything runs locally in the browser; imported files are never uploaded.

## Operating Context

- Next to a terminal running `harbor run`; Slipway hands off with exact commands and a Launch zip.
- Imports: task folders, zips, job folders, `trajectory.json`. Storage is IndexedDB.
- Audit verdicts are exported as `slipway-audit/v1` JSON.

## Capabilities and Constraints

- Routes: `/` (landing), `/studio`, `/studio/[id]`, `/runs`, `/runs/[jobId]`, `/runs/[jobId]/[trial]`.
- No backend yet. Running evaluations from Slipway, Slipway Yard (sharing) are roadmap, not shipped, and must not be presented as available.
- UI must be bilingual (English and Simplified Chinese). Language is chosen from the browser on first visit and switchable, remembered in a cookie; URLs do not carry a locale.

## Brand Commitments

Binding, from `docs/brand/README.md` and `docs/brand/tokens.json`:
- Name is always "Slipway". Product layer words: Studio, Launch, Yard. Launch is the only primary verb.
- Harbor terms stay untranslated in both languages: task, dataset, `task.toml`, `instruction.md`, environment, verifier, solution, `oracle`, `nop`, trial, job.
- Community tool: "for Harbor" / "Harbor-compatible", never official.
- Voice: engineer to engineer, sentence case, no emoji, no exclamation marks, no marketing adjectives. Chinese tagline: 可视化构建 Harbor task，随处运行。
- Visual direction set by the owner: modern black, white and grey (near-white `paper` oklch(99.5% 0 0), no sand or paper tints), generous spacing and larger radii, one vivid `signal` orange used rarely but boldly (one filled signal button per view). Geist + Geist Mono, Chinese on PingFang SC / Microsoft YaHei. Status always shape + text; `nop` = 0 shown as "expected 0".
- Every page title is "Slipway Studio" in both languages. The footer credits "Created by Yiming Shen" and links the GitHub repository.

## Evidence on Hand

- Sample job: `public/samples/sample-job.zip` (generated, validated with Harbor models).
- Starters: Hello, world and Blank.
- No customers, testimonials or benchmarks exist; do not invent them.

## Product Principles

1. Harbor's truth first: never guess Harbor behavior, never rename its terms.
2. Point at evidence, don't issue verdicts: audit flags lead a reviewer to steps.
3. Local by default: nothing leaves the browser.
4. Density for experts: show the whole task or trial at once, scannable, keyboard-reachable.

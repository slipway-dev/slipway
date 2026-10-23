# Slipway architecture

Slipway turns a visual description of a Harbor task into the exact folder Harbor runs. Building tasks and auditing what agents did on them work today; running evaluations from Slipway is next.

Harbor facts in this document come from the `harbor` package source (0.24.0, task schema 1.4), not from its website, and are pinned in `src/features/harbor/`.

## What a Harbor task is

```
my-task/
├── task.toml          # config: [task] [metadata] [agent] [environment] [verifier] [solution]
├── instruction.md     # what the agent is asked to do
├── environment/       # Dockerfile or docker-compose.yaml, plus files it copies
├── tests/test.sh      # runs after the agent; writes /logs/verifier/reward.txt or reward.json
└── solution/solve.sh  # optional; run by the oracle agent
```

A task is good when the `oracle` agent (runs `solve.sh`) scores 1 and the `nop` agent (does nothing) scores 0.

## Code layout

```
src/
├── app/                    routes only; pages compose feature components
├── components/ui/          shadcn/ui (new-york, Radix), restyled by brand tokens
├── components/brand/       logo
└── features/
    ├── harbor/             Harbor's format: JSON Schema, paths, TOML, validation
    ├── parts/              the part format, template language, built-in parts
    ├── task/               the project model, compose, lint, zip import/export, store
    ├── studio/             the Studio UI
    ├── runs/               Harbor job files: discovery, trial summaries, ATIF parsing, audit rules, store
    └── audit/              the Runs UI: job table, trial page, trajectory timeline
```

Dependencies point one way: `studio → task → parts → harbor` and `audit → runs`. Nothing below the UI folders imports React except the two `store.ts` files.

## The model

**Part.** A reusable piece of a task, as JSON (`features/parts/types.ts`): parameters, plus what it contributes — Dockerfile lines in a fixed section, files, and `task.toml` values. Built-in, third-party and user-made parts share this one format. Parts are data, never code: their templates use a small logic-less language (`{{param}}`, `|quote`, `{{#if}}`, `{{#each}}`), and `validateManifest` checks an untrusted part before it loads (no `..` paths, no writing `task.toml`, only environment parts touch the Dockerfile). That is what makes sharing parts in Slipway Yard safe later.

**Role.** Parts with the same `role` are mutually exclusive on a task: one base image, one verifier runner, one solver.

**Slot.** Where a part goes: `environment`, `verifier` or `solution`. The instruction and task settings are edited directly rather than through parts.

**Dockerfile sections.** Environment parts write into `base → system → runtime → files → setup`, so blocks can be reordered freely without a `COPY` landing before `FROM`.

**Project** (`features/task/model.ts`). Plain JSON: instruction, hand-edited config, blocks per slot, and file overrides. Stored in IndexedDB now; the same shape can sync to a server later.

**Override.** A file the author wrote or edited by hand. It wins over generated content, is marked "edited" in the file tree, and can be reverted. Imported tasks arrive as overrides, so nothing is lost.

## The pipeline

```
project ──compose()──▶ files + task.toml config ──lint()──▶ issues
                              │
                              └──buildTaskZip()──▶ <name>.zip  (Launch)
```

- `composeTask` is pure: the same project and parts always yield the same files.
- `lintTask` validates `task.toml` against Harbor's own JSON Schema (`harbor task schema`, synced by `pnpm harbor:schema`) and checks behaviour Harbor would get wrong silently, for example a `test.sh` that never writes a reward, `rewards.json` instead of `reward.json`, a solution copied into the image, or a verifier that downloads tools while the network policy has it offline (Harbor applies the policy to the verifier too; verified by running it).
- Launch zips keep Unix executable bits, so `harbor run -p ./<name>` works after unzip.

Verified end to end: the Hello, world starter, launched from Slipway, scores 1.000 with `oracle` and 0.000 with `nop` in `harbor run`.

## Auditing runs

`/runs` reads the job folders `harbor run` writes, entirely in the browser:

```
<job>/result.json, config.json
<job>/<trial>/result.json                    reward, timing, exception
<job>/<trial>/config.json                    present while a trial is still running
<job>/<trial>[/steps/<step>]/agent/trajectory.json   ATIF v1.0–1.8
<job>/<trial>/verifier/                      reward.txt|json, test-stdout.txt, ctrf.json
```

- **Import.** A jobs folder, one job, one trial, a zip of any of those, or a lone `trajectory.json` (`runs/discover.ts`). Trial and job folders both hold `result.json`; their contents tell them apart, the same way `harbor view` does. Files are kept as Blobs in IndexedDB, so a reload does not need a re-import.
- **Job page.** Status per trial (pass, partial, fail, error, unscored), reward, cost, time, and an audit column filled in the background. Passing trials with red flags are called out, because a reward of 1 is exactly where a hack hides.
- **Trial page.** Phase timeline, exception, the trajectory as a timeline of steps with each tool call paired to its result by `source_call_id` (terminus-2 batches several commands into one output; those are shown as shared output, not guessed), reasoning, per-step tokens and cost, embedded subagents, images, then the verifier's rewards, CTRF tests and logs, and every raw file.
- **Audit rules** (`runs/audit.ts`) scan only the agent's actions — tool-call arguments — never its prose or command output. They follow Harbor's layout: `/solution` exists only for the oracle agent (red flag), the verifier writes `/logs/verifier/reward.*` (red flag), `/tests` is copied in only after the agent finishes (warning), editing test files (warning), digging through git history (note). They point a reviewer at steps; they are not verdicts, and they miss what they cannot see, such as a reward hack done in a file the agent wrote and ran.
- **Review.** A verdict (looks right, mistake, reward hack) and a note per step and per trial, saved locally and exported as `slipway-audit/v1` JSON.
- **Sample.** `public/samples/sample-job.zip` is generated by `scripts/sample-job/generate.py` and validated with Harbor's own `Trajectory`, `TrialResult` and `JobResult` models; it has an honest run with a subagent, a run that reads `/solution` and writes its own reward, and a run that edits tests then times out.

## Local files, privacy and untrusted input

Slipway imports what is already on your machine: a task folder, a folder of tasks (a dataset), a jobs folder from `harbor run`, or a zip of any of them, by picking or dropping it. Imports are read in the browser and kept in IndexedDB. **Nothing is uploaded**, and that is enforced, not just true of today's code:

- **Content Security Policy** (`next.config.ts`): `connect-src`, `img-src` and `form-action` allow only Slipway's own origin plus local `blob:`/`data:` URLs. No script — Slipway's, a dependency's or an injected one — can `fetch`, `sendBeacon`, open a WebSocket, submit a form or load an image that carries data to another host. There is no `unsafe-eval`; the `task.toml` validator is precompiled (`scripts/build-validators.mjs`) for that reason.
- **No server code.** There are no API routes or server actions; the server only serves static pages.
- **Verified in a browser:** importing a task folder, a dataset and a real Harbor job made 0 requests off-origin, 0 non-GET requests and 0 requests with a body; a deliberate `fetch` and `sendBeacon` to another host from the page were refused by the policy.

Imported files are treated as hostile (`src/lib/safe-files.ts`):

- **Paths** are normalized; absolute, drive-qualified, `..` and control-character paths are dropped, so Launch can never write a zip entry that escapes its folder (zip slip).
- **Size.** Files are admitted against a budget before they are read or inflated: tasks 5 MB per file and 50 MB per import (tasks live whole in IndexedDB), jobs 25 MB per file and 500 MB per import, with a file-count cap. Zip entries are filtered on their declared size before inflating, so a zip bomb is refused rather than expanded, and checked again after. One budget covers a whole drop, so several zips cannot add up past it.
- **Noise** such as `.git/`, `node_modules/`, `__pycache__/` and OS files is ignored.
- **Binary files** in a task are kept byte for byte (base64) and written back unchanged by Launch; they are never decoded as text.
- **Rendering.** Trajectories, logs and files are shown as text, never as HTML; images are shown from local object URLs.

## Stack

Next.js (App Router) on Vercel, TypeScript, Tailwind v4, shadcn/ui on Radix, CodeMirror 6, dnd-kit, Zustand + IndexedDB, smol-toml, fflate, Ajv, Vitest. There is no backend yet: everything runs in the browser.

## Roadmap

Next: compare two trials side by side, and audit across a whole job (which steps recur in failing trials).

### Run evaluations

The browser cannot run Docker, so runs go through something that can.

- **Local runner first** (no backend). A small companion, `npx slipway-runner`, listens on localhost, pairs with the page through a one-time token, receives the composed task, runs `harbor run` (oracle, nop, or any agent and model), streams logs back and returns the job directory. The Checks panel then replaces "unverified" with real oracle/nop results, and any agent can be run against the task from the Studio.
- **Cloud later.** Harbor already drives Daytona, Modal and other sandboxes (`--env`). A hosted run needs a queue and a long-running worker (not a Vercel function), plus the user's provider and model keys, so it comes with accounts.
- **Data.** A run is keyed by a digest of the composed files, so results stay attached to the exact task version they ran on: `Run { taskId, taskDigest, agent, model, env, status, trials[] }`.

### Slipway Yard

Sharing, forking and reviewing parts and tasks needs a backend: accounts (Auth.js with GitHub), Postgres and blob storage, all available on Vercel (or Supabase, which Harbor's own hub uses). Tasks themselves should publish to Harbor's registry (`harbor publish`) rather than a second registry; Yard's own value is parts, templates and reviews, which Harbor does not have.

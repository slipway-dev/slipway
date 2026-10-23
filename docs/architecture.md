# Slipway architecture

Slipway turns a visual description of a Harbor task into the exact folder Harbor runs. Building the task is the first stage; running evaluations and auditing what agents did are the next two, and the code is laid out so each stage reuses the one before it.

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
    └── studio/             the Studio UI
```

Dependencies point one way: `studio → task → parts → harbor`. Nothing below `studio` imports React except `task/store.ts`.

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

## Stack

Next.js (App Router) on Vercel, TypeScript, Tailwind v4, shadcn/ui on Radix, CodeMirror 6, dnd-kit, Zustand + IndexedDB, smol-toml, fflate, Ajv, Vitest. There is no backend yet: everything runs in the browser.

## Roadmap

### 2. Run evaluations

The browser cannot run Docker, so runs go through something that can.

- **Local runner first** (no backend). A small companion, `npx slipway-runner`, listens on localhost, pairs with the page through a one-time token, receives the composed task, runs `harbor run` (oracle, nop, or any agent and model), streams logs back and returns the job directory. The Checks panel then replaces "unverified" with real oracle/nop results, and any agent can be run against the task from the Studio.
- **Cloud later.** Harbor already drives Daytona, Modal and other sandboxes (`--env`). A hosted run needs a queue and a long-running worker (not a Vercel function), plus the user's provider and model keys, so it comes with accounts.
- **Data.** A run is keyed by a digest of the composed files, so results stay attached to the exact task version they ran on: `Run { taskId, taskDigest, agent, model, env, status, trials[] }`.

### 3. Audit trajectories

This can ship before runs, because it only reads files Harbor already writes. Import a job directory (zip or folder):

```
<job>/result.json, config.json
<job>/<trial>/result.json            reward, timing, exceptions
<job>/<trial>/agent/trajectory.json  ATIF v1.0–1.8: steps, tool calls, observations, metrics
<job>/<trial>/verifier/              reward.txt|json, test-stdout.txt, ctrf.json
```

- Job view: reward distribution, per-trial table, cost and tokens.
- Trial view: a timeline of ATIF steps, each tool call paired with its observation (`source_call_id`), reasoning, per-step metrics, sub-agent trajectories, then the verifier's output and CTRF test results.
- Audit aids: flag steps that read `/tests` or `/solution`, write to `/logs/verifier`, or edit test files (reward-hacking signals); annotate steps; compare two trials side by side.
- Annotations stay local until Yard exists.

### 4. Slipway Yard

Sharing, forking and reviewing parts and tasks needs a backend: accounts (Auth.js with GitHub), Postgres and blob storage, all available on Vercel (or Supabase, which Harbor's own hub uses). Tasks themselves should publish to Harbor's registry (`harbor publish`) rather than a second registry; Yard's own value is parts, templates and reviews, which Harbor does not have.

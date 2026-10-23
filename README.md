<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/slipway-mark-reverse.svg">
    <img src="docs/brand/slipway-mark.svg" width="48" height="48" alt="Slipway">
  </picture>
</p>

# Slipway

**Build Harbor tasks visually. Launch them anywhere.**

A web studio for authoring Harbor tasks — write the instruction, assemble the environment and verifier in the browser, then launch a ready-to-run task.

Harbor tasks are just folders — an instruction, a Dockerfile, a test script and an optional solution — but getting them right means bouncing between an editor, a terminal and the docs. Slipway puts the whole task on one canvas: drag in environment and verifier blocks, edit every file side by side, and see at a glance whether `oracle` scores 1 and `nop` scores 0. When it is ready, Launch it as a folder Harbor runs as-is.

Slipway is a community tool for Harbor. It is Harbor-compatible, not an official Harbor project.

## Status

Early. Everything runs in your browser and is saved locally; imported files are never uploaded, and the page's Content Security Policy makes sure of it.

- **Studio** builds, checks and launches tasks, or imports the task folders you already have.
- **Runs** imports a job folder from `harbor run` and lets you audit each trial's trajectory, with steps that can fake a reward flagged.

Running evaluations from Slipway comes next — see [docs/architecture.md](docs/architecture.md).

## Development

Requires Node 22 and pnpm 10.

```sh
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # unit tests
pnpm typecheck
pnpm lint
```

Slipway validates `task.toml` against the JSON Schema of a pinned Harbor release. To update it, bump the version in `scripts/sync-harbor-schema.sh` and `src/features/harbor/constants.ts`, then run `pnpm harbor:schema` (needs [uv](https://docs.astral.sh/uv/)).

## Contributing

Naming, copy and visual guidelines for contributors live in [`docs/brand/`](docs/brand/README.md).

## License

[Apache License 2.0](LICENSE)

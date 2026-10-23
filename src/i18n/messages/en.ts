/**
 * English UI copy. Every other locale is typed against this object, so a
 * missing or misspelled key fails `pnpm typecheck`.
 *
 * Harbor terms (task, environment, verifier, solution, oracle, nop, trial,
 * job, file names) stay in English in every locale; see docs/brand.
 */
import type { IssueCode } from "@/features/task/issues"
import type { TrajectoryProblemCode } from "@/features/runs/atif"
import type { SkipCode } from "@/lib/safe-files"

import { enBench } from "./en-bench"
import { enFlow } from "./en-flow"
import { enRuns } from "./en-runs"

type P = Record<string, string | number>

export const en = {
  meta: {
    description:
      "A web studio for authoring Harbor tasks — write the instruction, assemble the environment and verifier in the browser, then launch a ready-to-run task.",
    studio: "Studio",
    runs: "Runs",
    job: "Job",
    trial: "Trial",
  },

  common: {
    loading: "Loading…",
    cancel: "Cancel",
    delete: "Delete",
    copy: "Copy",
    copied: "Copied",
    copyCommand: "Copy command",
    notSet: "Not set",
    choose: "Choose…",
    close: "Close",
  },

  nav: {
    main: "Main",
    studio: "Studio",
    runs: "Runs",
    harborDocs: "Harbor docs",
    home: "Slipway home",
    language: "Language",
  },

  home: {
    tagline: "Build Harbor tasks visually. Launch them anywhere.",
    lede: "Slipway puts a whole Harbor task on one screen. Write the instruction, stack environment and verifier parts, watch every file update as you go, then Launch a folder that ",
    ledeEnd: " runs as-is.",
    getStarted: "Get started",
    howItWorks: "How it works",
    localNote: "Runs entirely in your browser. Nothing is uploaded.",
    demo: {
      label: "Interactive demo",
      hint: "Drag parts to reorder, or switch one off. The Dockerfile and checks follow.",
      replay: "Replay",
      generated: "environment/Dockerfile",
      on: (name: string) => `Use ${name}`,
      reorder: (name: string) => `Reorder ${name}`,
      parts: {
        base: { name: "Base image", detail: "python:3.12-slim" },
        apt: { name: "apt packages", detail: "jq, sqlite3" },
        pip: { name: "pip packages", detail: "pandas" },
        file: { name: "File", detail: "data.csv" },
      },
      sectionNote: "FROM stays first however you order parts.",
      ready: "Ready to Launch",
      noFrom: "environment/Dockerfile has no FROM line.",
    },
    features: {
      heading: "Everything a Harbor task needs, on one screen",
      compose: {
        title: "Compose with parts",
        folder: {
          config: "name, timeouts, network",
          instruction: "what the agent is asked",
          dockerfile: "stacked from parts",
          test: "writes the reward",
          solve: "run by oracle",
        },
        body: "Base images, packages, files, verifiers and solutions are parts. Stack them, set their parameters, and Slipway writes the Dockerfile, test script and task.toml.",
      },
      checks: {
        title: "Checks that cite Harbor",
        body: "Validated against Harbor's own task schema, plus the mistakes Harbor would make silently: a verifier that never writes a reward, a solution copied into the image.",
      },
      audit: {
        title: "Audit what agents did",
        body: "Import a job from harbor run and read each trial step by step. Moves that can fake a reward are flagged, so a passing score is not taken on trust.",
        flag: "Red flag",
      },
      local: {
        title: "Local by default",
        body: "Tasks and jobs stay in this browser. A content security policy blocks every outbound request, so your code and keys never leave the page.",
      },
    },
    how: {
      heading: "How it works",
      steps: [
        { title: "Start a task", body: "From the Hello, world starter, a blank scaffold, or an existing task folder." },
        { title: "Assemble it", body: "Write instruction.md, stack environment parts, pick a verifier and a solution." },
        { title: "Fix what checks find", body: "Every problem points at the part or file to change." },
        { title: "Launch and run", body: "Download the folder and run it with oracle and nop." },
      ],
      thenRun: "Then, in your terminal",
      expect1: "# expect 1",
      expect0: "# expect 0",
    },
    cta: {
      heading: "Build your first task in a few minutes",
      body: "Open the Hello, world starter and Launch it. It scores 1 with oracle and 0 with nop.",
    },
  },

  footer: {
    product: "Product",
    resources: "Resources",
    harborDocs: "Harbor docs",
    github: "GitHub",
    createdBy: "Created by",
    disclaimer: "A community tool for Harbor. Harbor-compatible, not an official Harbor project.",
  },

  taskList: {
    title: "Your tasks",
    lede: "Saved in this browser. Drop a task folder, a folder of tasks or a zip anywhere on this page; files are read locally and never uploaded.",
    importFolder: "Import folder",
    importZip: "Import .zip",
    newTask: "New task",
    newTaskTitle: "New task",
    newTaskLede: "Start from a working example or from what Harbor scaffolds.",
    loading: "Loading tasks…",
    emptyTitle: "No tasks yet",
    emptyBody: "Create one from a starter, or import a Harbor task folder from your machine.",
    noInstruction: "No instruction yet.",
    edited: (when: string) => `Edited ${when}`,
    deleteLabel: (name: string) => `Delete ${name}`,
    confirmDelete: (name: string) => `Delete ${name}? This cannot be undone.`,
    nothingImported: "No task could be imported.",
    imported: (n: number) => `Imported ${n} ${n === 1 ? "task" : "tasks"}`,
    dropHere: "Drop to import",
    columns: { task: "Task", description: "Description", edited: "Edited" },
    starters: {
      "hello-world": {
        name: "Hello, world",
        summary: "A complete task made of checks and steps: the agent writes one file, a check verifies it, the solution shows it works.",
      },
      blank: {
        name: "Blank",
        summary: "What `harbor task init` gives you: an Ubuntu image and empty verifier and solution scripts.",
      },
    } as Record<string, { name: string; summary: string } | undefined>,
  },

  studio: {
    loading: "Loading task…",
    notSaved: "This task is not saved in this browser.",
    backToTasks: "Back to your tasks",
    launch: "Launch",
    run: {
      title: "Run with an agent",
      lede: "Choose the agent harbor run should use on this task. Slipway writes the command; your API keys stay in your own shell.",
      agent: "Agent",
      groups: { cli: "Coding agents", harness: "Agent harnesses", reference: "Reference runs" } as Record<"cli" | "harness" | "reference", string>,
      referenceNote: "oracle runs your solution and nop does nothing; both check the task, not a model.",
      model: "Model",
      modelHelp: "provider/model, as Harbor expects. The provider decides which API key is read.",
      attempts: "Attempts",
      forceBuild: "Build from the Dockerfile instead of the prebuilt image",
      command: "Command, run next to the exported folder",
      keysNote: "Fill in the keys before running. Harbor passes them to the agent inside the container.",
      noKeys: "No API key needed.",
      afterLaunch: (zip: string) => `Launch saves ${zip}; unzip it, then run.`,
    },
    launched: (file: string) => `Launched ${file}`,
    launchedWithErrors: (file: string, n: number) =>
      `Launched ${file} with ${n} unresolved ${n === 1 ? "error" : "errors"}.`,
    panes: { files: "Files", edit: "Edit", checks: "Checks" },
    tree: {
      label: "Task folder",
      addFile: "New file",
      newFilePrompt: "Path of the new file, relative to the task root",
      newFileHint: "For example environment/data.csv. To upload, type a folder such as tests/ and pick files; images and other binary files are kept as they are.",
      upload: "Upload files",
      tooLarge: (name: string, mb: number) => `${name} is larger than ${mb} MB and was not added.`,
      create: "Create file",
      edited: "edited",
      yours: "yours",
      parts: (n: number) => `${n} ${n === 1 ? "part" : "parts"}`,
    },
    sections: {
      instruction: { label: "Instruction", hint: "What the agent is asked to do." },
      environment: {
        label: "Environment",
        hint: "The container the agent works in. Parts stack into environment/Dockerfile and the [environment] table of task.toml.",
      },
      verifier: {
        label: "Verifier",
        hint: "Runs after the agent and writes a reward to /logs/verifier/reward.txt.",
      },
      solution: { label: "Solution", hint: "Run by the oracle agent to show the task can be solved." },
      settings: { label: "Task settings", hint: "Name, metadata and timeouts." },
    },
    generated: "Generated",
    generatedEmpty: "This section writes no files yet.",
    preview: "Preview",
    file: {
      gone: (path: string) => `${path} is no longer part of this task.`,
      fromPart: (name: string) => `From the ${name} part`,
      writtenByYou: "Written by you",
      fromConfig: "Generated from task settings and parts",
      fromInstruction: "Written in Instruction",
      fromDockerfile: "Generated from environment parts",
      replaces: (what: string) => `Edited by you; replaces: ${what}`,
      executable: "executable",
      editIn: (where: string) => `Edit in ${where}`,
      openPart: "Open the part",
      revert: "Revert to generated",
      deleteFile: "Delete file",
      confirmDelete: (path: string) => `Delete ${path}?`,
      editByHand: "Edit by hand",
      open: "Open file",
      handEditNote: "Editing by hand stops parts from updating this file until you revert it.",
      binary: (kb: number) =>
        `Binary file, ${kb} KB. Slipway keeps it byte for byte and writes it unchanged when you Launch; edit it with your own tools and import again.`,
    },
    blocks: {
      empty: "No parts yet.",
      reorder: (name: string) => `Reorder ${name}`,
      more: (name: string) => `More for ${name}`,
      off: "off",
      turnOn: "Turn on",
      turnOff: "Turn off",
      remove: "Remove",
      addPart: "Add part",
    },
    picker: {
      title: (section: string) => `Add to ${section}`,
      library: "Parts",
      make: "Make a part",
      yours: "yours",
      roleTaken: (role: string) => `this task already has a ${role}`,
      deleteCustom: (name: string) => `Delete ${name} from your parts`,
      makeHelp:
        "A part is JSON: parameters plus the files, Dockerfile lines and task.toml values it contributes, written with {{param}} templates. It is saved in this browser and can be added to any task.",
      manifest: "Part manifest",
      notJson: (detail: string) => `Not valid JSON: ${detail}`,
      wrongSlot: (slot: string) => `This part is for ${slot}; open the picker from that section to add it.`,
      saved: (name: string) => `Saved ${name} to your parts`,
      resetExample: "Reset example",
      saveAndAdd: "Save and add",
    },
    params: {
      required: "(required)",
      onePerLine: "One per line",
      onePerLineSuffix: "(one per line)",
      mapPlaceholder: "KEY=value\n(one per line)",
    },
    settings: {
      name: "Name",
      nameHelp: '"org/name", the id Harbor and its registry use.',
      description: "Description",
      authors: "Authors",
      authorsHelp: "One per line, as Name <email>.",
      keywords: "Keywords",
      keywordsHelp: "Separated by commas.",
      difficulty: "Difficulty",
      category: "Category",
      tags: "Tags",
      tagsHelp: "Comma-separated, written to [metadata] tags.",
      expertTime: "Expert time (minutes)",
      juniorTime: "Junior time (minutes)",
      dockerImage: "Prebuilt image",
      dockerImageHelp: "Optional. Harbor pulls this image instead of building environment/Dockerfile, unless run with --force-build. Keep the Dockerfile so the image can be rebuilt.",
      timeouts: "Timeouts (seconds)",
      agent: "Agent",
      verifier: "Verifier",
      imageBuild: "Image build",
      harborDefault: "Harbor default",
    },
    checks: {
      title: "Checks",
      counts: (errors: number, warnings: number) =>
        `${errors} ${errors === 1 ? "error" : "errors"} · ${warnings} ${warnings === 1 ? "warning" : "warnings"}`,
      clean: "No problems found",
      error: "error",
      warning: "warning",
      showAll: "Show all",
      hide: "Hide",
      verify: "Verify with Harbor",
      verifyHelp:
        "Unzip the launched task and run both agents. A good task scores 1 with the solution and 0 without it.",
      expects1: "expects 1",
      expected0: "expected 0",
      unverified: "unverified",
    },
  },

  runs: enRuns,

  flow: enFlow,

  ...enBench,

  /** Lint and compose messages by issue code; `p` holds Issue.params with part and parameter names already translated. */
  issues: {
    "unknown-part": (p: P) => `Part ${p.partId} is not installed.`,
    "role-conflict": (p: P) => `Only one ${p.role} part can be used; ${p.holder} is already on this task.`,
    "missing-param": (p: P) => `${p.part}: ${p.param} is required.`,
    "bad-path": (p: P) => `${p.part} tried to write "${p.path}", which is not allowed.`,
    "file-conflict": (p: P) => `${p.part} and another part both write ${p.path}.`,
    "template-error": (p: P) => `${p.part}: ${p.detail}`,
    "flow-incomplete": (p: P) => `${p.part}: "${p.node}" ${p.detail}.`,
    schema: (p: P) => `task.toml ${p.path}: ${p.detail}.`,
    "task-name": () => 'Task name must be "org/name", e.g. "my-org/hello-world".',
    "empty-instruction": () => "instruction.md is empty; the agent would get no task.",
    "no-environment": () =>
      "No environment: add a base image, an environment/Dockerfile or [environment].docker_image.",
    "dockerfile-from": () => "environment/Dockerfile has no FROM line.",
    "solution-leak": () =>
      "The Dockerfile copies the solution into the image, so any agent can read it and nop may score above 0.",
    "tests-leak": () =>
      "The Dockerfile copies tests into the image; Harbor already copies tests/ to /tests after the agent finishes.",
    "pip-without-python": () =>
      "pip is used on a plain Ubuntu/Debian image, which has no pip. Use a python base image or install python3-pip.",
    "no-verifier": () => "No tests/test.sh: add a verifier so Harbor can score the task.",
    "missing-reward": () =>
      "tests/test.sh never writes /logs/verifier/reward.txt or reward.json, so every trial will fail to score.",
    "rewards-json": () => "Harbor reads /logs/verifier/reward.json (singular); rewards.json is ignored.",
    "verifier-offline": () =>
      "tests/test.sh downloads tools, but the verifier has no network, so every trial scores 0. Let the verifier reach the internet (Network policy) or install test tools in the image.",
    shebang: () => "tests/test.sh has no #! line.",
    "no-solution": () => "No solution/solve.sh: the oracle agent cannot show the task is solvable.",
    "empty-solution": () => "solution/solve.sh has no commands yet, so oracle will score 0.",
  } satisfies Record<IssueCode, (p: P) => string>,

  /** Translated schema failures by Ajv keyword; others show Ajv's own English detail. */
  schemaKeywords: {
    type: "has the wrong type",
    required: "is missing a required field",
    enum: "is not one of the allowed values",
    minimum: "is below the minimum",
    maximum: "is above the maximum",
    pattern: "has the wrong format",
    additionalProperties: "has a field Harbor does not know",
  } as Partial<Record<string, string>>,

  /** Problems reading trajectory.json, by code. */
  trajectoryProblems: {
    "invalid-json": (p: P) => `Not valid JSON: ${p.detail}`,
    "not-atif": () => "Not an ATIF trajectory: it needs an agent object and a steps array.",
    "unknown-version": (p: P) => `schema_version ${p.version} is newer than Slipway knows (ATIF-v1.8).`,
    "step-id": (p: P) => `step ${p.index} has step_id ${p.stepId}; ATIF requires 1, 2, 3, ...`,
    "unknown-call": (p: P) => `step ${p.stepId} has a result for unknown tool call ${p.callId}.`,
    inSubagent: (subagent: string, text: string) => `subagent ${subagent}: ${text}`,
  } satisfies Record<TrajectoryProblemCode, (p: P) => string> & Record<string, unknown>,

  /** Files left out of an import, grouped by reason. */
  skipped: {
    summary: (total: number, parts: string) => `Skipped ${total} ${total === 1 ? "file" : "files"}: ${parts}.`,
    join: ", ",
    "unsafe-path": (n: number) => `${n} with an unsafe path`,
    "too-large": (n: number, p: P) => `${n} larger than ${p.limitMB} MB`,
    "too-many-files": (n: number, p: P) => `${n} past the ${p.limit}-file limit`,
    "over-total": (n: number, p: P) => `${n} past the ${p.limitMB} MB total`,
    "size-mismatch": (n: number) => `${n} whose size did not match the archive`,
    "zip-too-large": (n: number, p: P) => `${n} zip larger than ${p.limitMB} MB`,
    "task-not-imported": (n: number, p: P) => `${n} task not imported (${p.detail})`,
  } satisfies Record<SkipCode, (n: number, p: P) => string> & Record<string, unknown>,

  /**
   * Translations of built-in parts, keyed by part id. English uses the
   * manifest's own text, so this stays empty here.
   */
  parts: {} as Record<
    string,
    | {
        name?: string
        summary?: string
        params?: Record<string, { label?: string; description?: string } | undefined>
      }
    | undefined
  >,
}

export type Messages = typeof en

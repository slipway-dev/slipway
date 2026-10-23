/**
 * English UI copy. Every other locale is typed against this object, so a
 * missing or misspelled key fails `pnpm typecheck`.
 *
 * Harbor terms (task, environment, verifier, solution, oracle, nop, trial,
 * job, file names) stay in English in every locale; see docs/brand.
 */
import { enRuns } from "./en-runs"

export const en = {
  meta: {
    title: "Slipway — a visual builder for Harbor tasks",
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
    lede: "Harbor tasks are just folders: an instruction, a Dockerfile, a test script and an optional solution. Slipway puts the whole folder on one screen. Stack environment and verifier parts, edit every file beside what it generates, and Launch a folder that ",
    ledeEnd: " takes as-is.",
    openStudio: "Open Studio",
    auditRuns: "Audit a job's trajectories",
    folderCaption: "What Launch writes",
    folderNotes: {
      config: "name, timeouts, network policy",
      instruction: "what the agent is asked to do",
      dockerfile: "stacked from environment parts",
      test: "writes /logs/verifier/reward.txt",
      solve: "run by oracle, so it scores 1",
    },
    thenRun: "Then, in your terminal",
    expect1: "# expect 1",
    expect0: "# expect 0",
    footer: "Slipway is a community tool for Harbor. Harbor-compatible, not an official Harbor project.",
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
        summary: "A complete task: the agent writes one file, the verifier checks it, the solution shows it works.",
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
    launched: (file: string) => `Launched ${file}`,
    launchedWithErrors: (file: string, n: number) =>
      `Launched ${file} with ${n} unresolved ${n === 1 ? "error" : "errors"}.`,
    panes: { files: "Files", edit: "Edit", checks: "Checks" },
    tree: {
      label: "Task folder",
      addFile: "New file",
      newFilePrompt: "Path of the new file, relative to the task root",
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

  /** Lint and compose messages by rule code. Rules not listed fall back to their English message. */
  issues: {
    "task-name": 'Task name must be "org/name", e.g. "my-org/hello-world".',
    "empty-instruction": "instruction.md is empty; the agent would get no task.",
    "no-environment": "No environment: add a base image, an environment/Dockerfile or [environment].docker_image.",
    "dockerfile-from": "environment/Dockerfile has no FROM line.",
    "solution-leak":
      "The Dockerfile copies the solution into the image, so any agent can read it and nop may score above 0.",
    "tests-leak":
      "The Dockerfile copies tests into the image; Harbor already copies tests/ to /tests after the agent finishes.",
    "pip-without-python":
      "pip is used on a plain Ubuntu/Debian image, which has no pip. Use a python base image or install python3-pip.",
    "no-verifier": "No tests/test.sh: add a verifier so Harbor can score the task.",
    "missing-reward":
      "tests/test.sh never writes /logs/verifier/reward.txt or reward.json, so every trial will fail to score.",
    "rewards-json": "Harbor reads /logs/verifier/reward.json (singular); rewards.json is ignored.",
    "verifier-offline":
      "tests/test.sh downloads tools, but the verifier has no network, so every trial scores 0. Let the verifier reach the internet (Network policy) or install test tools in the image.",
    shebang: "tests/test.sh has no #! line.",
    "no-solution": "No solution/solve.sh: the oracle agent cannot show the task is solvable.",
    "empty-solution": "solution/solve.sh has no commands yet, so oracle will score 0.",
  } as Record<string, string | undefined>,

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

import { PROBLEM_TEXT, type CheckKind, type StepKind } from "@/features/flow/types"

type Kinds = CheckKind | StepKind

/** English copy for checks and steps (features/flow) and their editors. Typed source for zh-flow.ts. */
export const enFlow = {
  kinds: {
    "file-exists": { name: "File exists", hint: "The file is there after the agent is done." },
    "dir-exists": { name: "Folder exists", hint: "The folder is there after the agent is done." },
    "file-absent": { name: "Nothing at path", hint: "The agent removed the file or folder, or never made it." },
    "file-equals": { name: "File content equals", hint: "The file holds exactly this text." },
    "file-contains": { name: "File contains text", hint: "A line of the file includes this text." },
    "command-succeeds": { name: "Command succeeds", hint: "A shell command exits with status 0. Needs a real run to check." },
    "command-output": { name: "Command prints", hint: "A shell command prints this text. Needs a real run to check." },
    "write-file": { name: "Write file", hint: "Create the file with this content, replacing any existing one." },
    "append-file": { name: "Append to file", hint: "Add this content to the end of the file." },
    "make-dir": { name: "Make folder", hint: "Create the folder and any missing parents." },
    delete: { name: "Delete", hint: "Remove the file, or the folder and everything in it." },
    "run-command": { name: "Run command", hint: "Run any shell command. Needs a real run to check." },
  } satisfies Record<Kinds, { name: string; hint: string }>,

  fields: {
    path: "path",
    expected: "expected text",
    text: "text to find",
    command: "command",
    content: "content",
    trim: "ignore trailing whitespace",
  } as Record<string, string>,

  /** What is wrong with a node, given the name of the field. */
  problems: PROBLEM_TEXT,
}

export type FlowMessages = typeof enFlow

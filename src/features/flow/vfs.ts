/**
 * A small virtual filesystem: just enough of POSIX for the checks and steps
 * in a flow. Each operation mirrors what the bash that compile.ts emits does,
 * including when it fails, and the differential tests compare the two.
 */

export interface VFS {
  files: Map<string, string>
  /** Directories that exist; "/" always does. Parents of files are added as they are written. */
  dirs: Set<string>
}

export function createVFS(): VFS {
  return { files: new Map(), dirs: new Set(["/"]) }
}

export function cloneVFS(vfs: VFS): VFS {
  return { files: new Map(vfs.files), dirs: new Set(vfs.dirs) }
}

/**
 * Lexically normalize an absolute path: collapse `//` and `.`, resolve `..`
 * (clamped at the root, like the kernel does). Undefined when the path is
 * not absolute or cannot exist.
 */
export function normalizePath(raw: string): string | undefined {
  if (!raw.startsWith("/") || raw.includes("\0")) return undefined
  const parts: string[] = []
  for (const segment of raw.split("/")) {
    if (segment === "" || segment === ".") continue
    if (segment === "..") parts.pop()
    else parts.push(segment)
  }
  return "/" + parts.join("/")
}

export function parentOf(path: string): string {
  const i = path.lastIndexOf("/")
  return i <= 0 ? "/" : path.slice(0, i)
}

export function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1)
}

/** "/a/b/c" → ["/a", "/a/b", "/a/b/c"] */
function chain(path: string): string[] {
  const out: string[] = []
  let current = ""
  for (const part of path.split("/").filter(Boolean)) {
    current += "/" + part
    out.push(current)
  }
  return out
}

export const isFile = (vfs: VFS, path: string) => vfs.files.has(path)
export const isDir = (vfs: VFS, path: string) => vfs.dirs.has(path)

/** `mkdir -p`: returns an error message where mkdir would fail. */
export function mkdirP(vfs: VFS, path: string): string | undefined {
  for (const p of chain(path)) {
    if (vfs.files.has(p)) return p === path ? "File exists" : "Not a directory"
  }
  for (const p of chain(path)) vfs.dirs.add(p)
  return undefined
}

/** What a heredoc writes: the text, each line newline-terminated; empty text writes nothing. */
export function heredocBody(text: string): string {
  if (text === "") return ""
  return text.endsWith("\n") ? text : text + "\n"
}

/** `mkdir -p "$(dirname path)"` then `cat > path` (or `>>`). */
export function writeFile(vfs: VFS, path: string, text: string, append: boolean): string | undefined {
  const failure = mkdirP(vfs, parentOf(path))
  if (failure) return failure
  if (vfs.dirs.has(path)) return "Is a directory"
  const body = heredocBody(text)
  vfs.files.set(path, append ? (vfs.files.get(path) ?? "") + body : body)
  return undefined
}

/** `rm -rf`: never fails; takes a directory's contents with it. The root stays. */
export function removeAll(vfs: VFS, path: string): void {
  if (path === "/") return
  const prefix = path + "/"
  for (const p of [...vfs.files.keys()]) if (p === path || p.startsWith(prefix)) vfs.files.delete(p)
  for (const p of [...vfs.dirs]) if (p === path || p.startsWith(prefix)) vfs.dirs.delete(p)
}

/**
 * Comparison used when a check or command output ignores trailing
 * whitespace: ASCII whitespace at the end of each line goes, then trailing
 * newlines, which is what `LC_ALL=C sed 's/[[:space:]]*$//'` inside `$(…)` does.
 */
export function trimLines(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t\r\v\f]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "")
}

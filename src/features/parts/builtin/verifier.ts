import type { PartManifest } from "../types"

const REWARD = "/logs/verifier/reward.txt"

export const pytestVerifier: PartManifest = {
  id: "slipway/pytest",
  version: "1.0.0",
  name: "pytest",
  summary: "Runs tests/test_outputs.py with pytest; reward 1 when every test passes.",
  slot: "verifier",
  role: "runner",
  params: [
    {
      key: "tests",
      label: "tests/test_outputs.py",
      type: "code",
      language: "python",
      required: true,
      default:
        '"""Tests that check what the agent left behind."""\n\n\ndef test_outputs():\n    pass\n',
    },
    {
      key: "packages",
      label: "Extra test dependencies",
      type: "list",
      default: [],
      placeholder: "requests==2.32.3",
      description: "Installed next to pytest when the verifier runs, not in the agent's image.",
    },
  ],
  contributes: {
    files: [
      {
        path: "tests/test.sh",
        executable: true,
        // Mirrors harbor's own pytest template (harbor task init).
        template: `#!/bin/bash

apt-get update
apt-get install -y curl

curl -LsSf https://astral.sh/uv/0.9.7/install.sh | sh

source $HOME/.local/bin/env

# CTRF produces a standard test report in JSON format which is useful for logging.
uvx \\
  --with pytest==8.4.1 \\
  --with pytest-json-ctrf==0.3.5 \\
{{#each packages}}  --with {{.}} \\
{{/each}}  pytest --ctrf /logs/verifier/ctrf.json /tests/test_outputs.py -rA

if [ $? -eq 0 ]; then
  echo 1 > ${REWARD}
else
  echo 0 > ${REWARD}
fi
`,
      },
      { path: "tests/test_outputs.py", template: "{{tests}}" },
    ],
  },
}

export const scriptVerifier: PartManifest = {
  id: "slipway/script-verifier",
  version: "1.0.0",
  name: "Shell script",
  summary: "Write tests/test.sh yourself. It must write a reward to /logs/verifier/reward.txt.",
  slot: "verifier",
  role: "runner",
  params: [
    {
      key: "script",
      label: "tests/test.sh",
      type: "code",
      language: "bash",
      required: true,
      default: `#!/bin/bash

# Check the agent's work, then write a reward between 0 and 1.
# For several named rewards, write JSON to /logs/verifier/reward.json instead.

echo 0 > ${REWARD}
`,
    },
  ],
  contributes: {
    files: [{ path: "tests/test.sh", template: "{{script}}", executable: true }],
  },
}

export const commandVerifier: PartManifest = {
  id: "slipway/command-verifier",
  version: "1.0.0",
  name: "Command exit code",
  summary: "Reward 1 when a command exits 0.",
  slot: "verifier",
  role: "runner",
  params: [
    {
      key: "command",
      label: "Command",
      type: "string",
      default: "test -f /app/done",
      required: true,
    },
  ],
  contributes: {
    files: [
      {
        path: "tests/test.sh",
        executable: true,
        template: `#!/bin/bash

if bash -c {{command|quote}}; then
  echo 1 > ${REWARD}
else
  echo 0 > ${REWARD}
fi
`,
      },
    ],
  },
}

export const fileMatchVerifier: PartManifest = {
  id: "slipway/file-match",
  version: "1.0.0",
  name: "File matches",
  summary: "Reward 1 when a file the agent writes matches the expected content.",
  slot: "verifier",
  role: "runner",
  params: [
    { key: "path", label: "File", type: "string", default: "/app/output.txt", required: true },
    { key: "expected", label: "Expected content", type: "text", default: "", required: true },
    {
      key: "trim",
      label: "Ignore trailing whitespace",
      type: "boolean",
      default: true,
    },
  ],
  contributes: {
    files: [
      { path: "tests/expected.txt", template: "{{expected}}" },
      {
        path: "tests/test.sh",
        executable: true,
        template: `#!/bin/bash

actual={{path|quote}}
expected=/tests/expected.txt

if [ ! -f "$actual" ]; then
  echo "missing $actual"
  echo 0 > ${REWARD}
  exit 0
fi

{{#if trim}}if [ "$(sed -e 's/[[:space:]]*$//' "$actual")" = "$(sed -e 's/[[:space:]]*$//' "$expected")" ]; then{{else}}if cmp -s "$actual" "$expected"; then{{/if}}
  echo 1 > ${REWARD}
else
  diff "$expected" "$actual"
  echo 0 > ${REWARD}
fi
`,
      },
    ],
  },
}

export const checksVerifier: PartManifest = {
  id: "slipway/checks",
  version: "1.0.0",
  name: "Checks",
  summary:
    "A list of checks on files and commands. Slipway writes the verifier script and can run the checks against the solution here, without Docker.",
  slot: "verifier",
  role: "runner",
  params: [
    {
      key: "flow",
      label: "Checks",
      type: "flow",
      flow: "checks",
      required: true,
      default: { nodes: [], reward: "all" },
    },
  ],
  contributes: {
    files: [{ path: "tests/test.sh", executable: true, template: "{{flow|checks-script}}" }],
  },
}

export const verifierEnv: PartManifest = {
  id: "slipway/verifier-env",
  version: "1.0.0",
  name: "Verifier variables",
  summary: "Environment variables only the verifier sees, through [verifier].env.",
  slot: "verifier",
  params: [{ key: "vars", label: "Variables", type: "map", default: {}, required: true }],
  contributes: { config: { verifier: { env: "{{vars}}" } } },
}

export const verifierParts = [
  checksVerifier,
  pytestVerifier,
  scriptVerifier,
  commandVerifier,
  fileMatchVerifier,
  verifierEnv,
]

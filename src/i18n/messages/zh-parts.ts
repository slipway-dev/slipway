import type { Messages } from "./en"

/** 内置部件的中文名称、简介和参数说明，按部件 id 索引。 */
export const zhParts: Messages["parts"] = {
  "slipway/base-image": {
    name: "基础镜像",
    summary: "每个 environment 都从这里开始：FROM 行和工作目录。",
    params: {
      image: { label: "镜像" },
      workdir: { label: "工作目录", description: "agent 启动时所在的目录。留空则沿用镜像的默认值。" },
    },
  },
  "slipway/apt-packages": {
    name: "apt 软件包",
    summary: "在 Debian 和 Ubuntu 镜像上用 apt-get 安装的系统软件包。",
    params: { packages: { label: "软件包" } },
  },
  "slipway/pip-packages": {
    name: "pip 软件包",
    summary: "用 pip 安装的 Python 包。请配合 python 基础镜像使用。",
    params: { packages: { label: "软件包" } },
  },
  "slipway/npm-packages": {
    name: "npm 软件包",
    summary: "全局安装的 npm 包。请配合 node 基础镜像使用。",
    params: { packages: { label: "软件包" } },
  },
  "slipway/environment-file": {
    name: "文件",
    summary: "放在 environment/ 中并复制进镜像的文件。",
    params: {
      path: { label: "environment/ 中的路径" },
      destination: { label: "复制到", description: "容器内的绝对路径。以 / 结尾时保留原文件名。" },
      content: { label: "内容" },
    },
  },
  "slipway/run-commands": {
    name: "初始化脚本",
    summary: "构建镜像时运行的 shell 命令。需要 BuildKit（Docker 23 起默认开启）。",
    params: { script: { label: "脚本" } },
  },
  "slipway/environment-variables": {
    name: "环境变量",
    summary: "通过 [environment].env 在 task environment 中设置的变量。",
    params: { vars: { label: "变量" } },
  },
  "slipway/resources": {
    name: "资源",
    summary: "容器的 CPU、内存、存储和 GPU 限制。",
    params: {
      cpus: { label: "CPU 数" },
      memory_mb: { label: "内存（MB）" },
      storage_mb: { label: "存储（MB）" },
      gpus: { label: "GPU 数" },
    },
  },
  "slipway/network": {
    name: "网络策略",
    summary: "agent 和 verifier 能否访问互联网。",
    params: {
      mode: { label: "模式" },
      allowed_hosts: { label: "允许的主机", description: "仅在 allowlist 模式下使用，例如 pypi.org。" },
      verifier_online: {
        label: "verifier 可以访问互联网",
        description: "Harbor 对 verifier 也应用此策略。需要下载测试工具（如 pytest）的 verifier 在离线时会得 0 分。",
      },
    },
  },
  "slipway/mcp-server": {
    name: "MCP server",
    summary: "agent 在 task 中可以使用的 MCP server。",
    params: {
      name: { label: "名称" },
      transport: { label: "传输方式" },
      url: { label: "URL", description: "用于 sse 和 streamable-http。" },
      command: { label: "命令", description: "用于 stdio。" },
      args: { label: "参数" },
    },
  },
  "slipway/pytest": {
    name: "pytest",
    summary: "用 pytest 运行 tests/test_outputs.py；全部测试通过时 reward 为 1。",
    params: {
      packages: {
        label: "额外的测试依赖",
        description: "在 verifier 运行时与 pytest 一起安装，不会进入 agent 的镜像。",
      },
    },
  },
  "slipway/script-verifier": {
    name: "Shell 脚本",
    summary: "自己编写 tests/test.sh。它必须把 reward 写入 /logs/verifier/reward.txt。",
  },
  "slipway/command-verifier": {
    name: "命令退出码",
    summary: "命令以 0 退出时 reward 为 1。",
    params: { command: { label: "命令" } },
  },
  "slipway/file-match": {
    name: "文件匹配",
    summary: "agent 写出的文件与预期内容一致时 reward 为 1。",
    params: {
      path: { label: "文件" },
      expected: { label: "预期内容" },
      trim: { label: "忽略行尾空白" },
    },
  },
  "slipway/verifier-env": {
    name: "Verifier 变量",
    summary: "通过 [verifier].env 设置、只有 verifier 能看到的环境变量。",
    params: { vars: { label: "变量" } },
  },
  "slipway/shell-solution": {
    name: "Solve 脚本",
    summary: "由 oracle agent 运行的 solution/solve.sh。oracle 能得 1 分的 task 才是可解的。",
  },
  "slipway/solution-file": {
    name: "Solution 文件",
    summary: "放在 solve.sh 旁边的辅助文件，在容器中位于 /solution。",
    params: {
      path: { label: "solution/ 中的路径" },
      content: { label: "内容" },
    },
  },
}

import type { FlowMessages } from "./en-flow"

/** 检查与步骤（features/flow）及其编辑器的中文文案。 */
export const zhFlow: FlowMessages = {
  kinds: {
    "file-exists": { name: "文件存在", hint: "agent 做完之后，这个文件在那里。" },
    "dir-exists": { name: "文件夹存在", hint: "agent 做完之后，这个文件夹在那里。" },
    "file-absent": { name: "路径下没有东西", hint: "agent 删除了文件或文件夹，或者从未创建它。" },
    "file-equals": { name: "文件内容等于", hint: "文件内容与这段文字完全一致。" },
    "file-contains": { name: "文件包含文本", hint: "文件中有一行包含这段文字。" },
    "command-succeeds": { name: "命令成功", hint: "shell 命令以状态 0 退出。需要真实运行才能判断。" },
    "command-output": { name: "命令输出等于", hint: "shell 命令输出这段文字。需要真实运行才能判断。" },
    "write-file": { name: "写入文件", hint: "用这段内容创建文件，已有的文件会被替换。" },
    "append-file": { name: "追加到文件", hint: "把这段内容加到文件末尾。" },
    "make-dir": { name: "创建文件夹", hint: "创建文件夹以及缺少的上级目录。" },
    delete: { name: "删除", hint: "删除文件，或文件夹及其中的所有内容。" },
    "run-command": { name: "运行命令", hint: "运行任意 shell 命令。需要真实运行才能判断。" },
  },

  fields: {
    path: "路径",
    expected: "期望文本",
    text: "要查找的文本",
    command: "命令",
    content: "内容",
    trim: "忽略行尾空白",
  },

  problems: {
    "unknown-kind": () => "不是 Slipway 认识的类型",
    required: (field) => `需要填写${field}`,
    "not-absolute": (field) => `${field}必须是以 / 开头的绝对路径`,
    root: (field) => `${field}不能是根目录`,
    multiline: (field) => `${field}只能是一行`,
  },
}

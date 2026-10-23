# Slipway 品牌规范

给项目开发者看的内部规范：命名、文案、视觉、logo 和图标。写界面、文案和文档前先读一遍。

Slipway 是一个在浏览器里可视化制作 Harbor task 的 web studio。Slipway（船台）是造船厂里船被造好、然后顺着斜坡滑进港口（Harbor）的地方——产品做的就是这件事：在这里把 task 造出来，再送进 Harbor 去跑。

## 命名体系

产品名永远写作 **Slipway**，首字母大写，不加空格、不全大写、不写成 SlipWay。中文语境直接用英文名，需要解释时说“Slipway（船台）”。

- **Slipway Studio**：在线编辑器，短期主体。写 instruction、拼 environment、编 verifier，全部在浏览器里完成。
- **Launch**：唯一的主操作动词。导出为可直接 `harbor run` 的 task 目录（.zip）即是 Launch。按钮文案写 “Launch”，不写 “Export”“Download”。
- **Slipway Yard**：长期的 community，大家在这里分享、fork 和评审 task。上线前不在公开文案里出现。
- Harbor 自己的概念一律保持原名，不做隐喻替换：task、dataset、`task.toml`、`instruction.md`、environment、verifier、solution、`oracle`、`nop`、trial、job。隐喻只用于 Slipway 自己的产品层（Studio、Launch、Yard），绝不改写 Harbor 的术语。
- 署名：Slipway 是社区工具，文案中写 “for Harbor” 或 “Harbor-compatible”，不写 “Harbor Slipway”“official”，不使用 Harbor 的 logo。

## 文案

### 定位语

- 主 tagline（英）：**Build Harbor tasks visually. Launch them anywhere.**
- 主 tagline（中）：**可视化构建 Harbor task，随处运行。**
- 备选：“From seed to verified task, in the browser.” / “The slipway for your agent evals.”

### 描述（按长度取用）

- 一句话（≤ 80 字符，用于 `<title>`、OG title）：Slipway — a visual builder for Harbor tasks.
- 短描述（≤ 160 字符，用于 GitHub About、Vercel 项目、meta description）：A web studio for authoring Harbor tasks — write the instruction, assemble the environment and verifier in the browser, then launch a ready-to-run task.
- 中文短描述：在浏览器里编写 instruction、拼装 environment 与 verifier，把一个 seed 做成可直接 `harbor run` 的 Harbor task。
- 长描述（README 首段、Product Hunt）：Harbor tasks are just folders — an instruction, a Dockerfile, a test script and an optional solution — but getting them right means bouncing between an editor, a terminal and the docs. Slipway puts the whole task on one canvas: drag in environment and verifier blocks, edit every file side by side, and see at a glance whether `oracle` scores 1 and `nop` scores 0. When it is ready, Launch it as a folder Harbor runs as-is.

### 语气

- 工程师对工程师：短句、动词开头、给出确切命令和文件名。好：“Add a test that writes `reward.txt`.” 不好：“Supercharge your eval workflow!”
- 句首大写（sentence case），按钮和标题都是：“Launch task”，不是 “Launch Task”。
- 用 “you” 称呼用户，产品自称 “Slipway”，不用 “we” 做营销腔。
- 不用 emoji，不用感叹号，不用 “AI-powered”“seamless”“revolutionary”。
- 文件名、命令、Harbor 关键字一律用 `code` 样式。
- 航海隐喻点到为止：一个页面最多一处（通常就是 Launch）。

## 视觉基础

### 颜色

- 整体是现代的黑白灰：页面底色 `paper`（近白，oklch(99.5% 0 0)），面板 `surface`（纯白），文件树、侧栏和页脚 `surface-sunken`（浅灰）。正文 `ink`（近黑），次要信息 `ink-muted`（中灰）。中性色不带色相，不用米黄、纸张色。
- `signal`（品牌橙）少用但要用得醒目：每个视图最多一个 `signal` 填充按钮（Launch、首页的 Get started），外加少量需要吸引注意的高亮。其余主按钮用 `ink` 黑底白字。填充 `signal` 时文字用 `on-signal`。
- `tide`（低饱和蓝）只用于指向 Harbor 原生对象的引用和 `nop` 的“expected 0”，不做装饰。
- `hull` 是深色块：代码面板、生成文件、终端命令，在亮暗两套主题里都是深色，文字用 `hull-ink`。
- 状态色永远带图形和文字：`pass`、`fail`、`warn`，图标用 lucide 的 CircleCheck / CircleX / TriangleAlert，不用 ✓ ✕ ! 字符。
- Slipway 特有的校验语义：`oracle` = 1 显示为 `pass`；`nop` = 0 是**预期结果**，显示为 “expected 0”，不能用 `fail`；`nop` > 0（任务泄题）才用 `fail`。
- 禁用：渐变、霓虹色、彩色左边框卡片、全大写小标签。

### 字体

- 界面与标题用 Geist，代码、命令、文件名用 Geist Mono，均由 next/font 自托管。
- 中文依次回退到 PingFang SC、Hiragino Sans GB、Microsoft YaHei（系统常用字体），只有都没有时才加载 Noto Sans SC。
- 字号层级：`display-xl` 只用于首页主视觉，`display` 用于区块标题，`title` 用于面板标题，正文 `body`，元信息 `body-sm`，小标签 `label`（句首大写、中等字重，不全大写），所有代码 `code`。标题字距收紧（display 约 -0.03em）。

### 间距、圆角、边框

- 基础栅格 4px。留白要足：面板内边距 20–32px，页面区块之间 96px，移动端左右留白 16px。
- 圆角偏大：小标签 `radius-sm`（6px），按钮和输入框 10px，task block、列表、对话框 `radius-lg`（16px）及以上，首页大卡片 22px。
- 主要靠边框和底色分层：控件边框 `line-strong`，分割线 `line`。阴影只有两种：拖拽时的 `shadow-drag`，以及首页演示卡片、对话框这类浮层用的 `shadow-float`。
- 焦点环：2px 实线 `ink`，外偏移 2px。

### 版式

- Studio 工作台：左侧是 Launch 出的真实文件夹树，中间左半部分是结构化编辑、右半部分是生成的文件，底部是常驻的检查栏。窄屏时折叠为“文件 / 编辑 / 检查”三个标签页，不出现横向滚动。
- 首页：主标题 + 可拖动的交互演示，下面依次是功能展示、工作原理和结尾的号召区；所有非工作台页面都带统一的页脚。
- 页面标题一律是 “Slipway Studio”，中英文相同。

### 动效

- 只为状态服务：拖拽时的 `shadow-drag` 抬起、首页演示里部件依次出现和 Dockerfile 行依次写入（约 300–400ms，指数缓出）。尊重 `prefers-reduced-motion`，此时一律无动效。

## Logo

- 标志由三部分组成：一条斜向的船台（`ink`）、一块落在上面的 task 方块（`signal`）、两道水线（`tide`）。斜角固定为 32.7°，任何地方复用这个角度都要保持一致。
- 浅色底用 [`slipway-mark.svg`](slipway-mark.svg)，深色底用 [`slipway-mark-reverse.svg`](slipway-mark-reverse.svg)。
- 字标：Slipway 用 sans 家族 700 字重排版，放在标志右侧，标志高度等于字标的大写字母高度的 1.6 倍，间距 `space-2`。目前没有单独的字标文件，直接用文字排版。
- 最小尺寸 16px（favicon），四周留白至少为方块的边长。不旋转、不描边、不换色、不加阴影。

## 图标

- 界面图标统一用线性图标，1.5px 描边、圆角端点、24px 网格，颜色继承文字色。推荐 Lucide（需自行引入，本系统未打包图标文件）。
- Harbor 的四类文件各有固定图标：instruction → 文档，environment → 方块/容器，tests（verifier）→ 对勾盾牌，solution → 钥匙。在文件树、块标题、Launch 清单里保持一致。
- 不使用 emoji 作为图标。

## Design tokens

上文提到的颜色、字号、间距、圆角和阴影 token（亮/暗两套主题）的确切取值见 [`tokens.json`](tokens.json)。

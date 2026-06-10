# AI Website Test Automation Skill

[English](README.md) | [中文](README.zh-CN.md)

[![Validate](https://github.com/leosssvip-dot/AI-website-test-automation-skill/actions/workflows/validate.yml/badge.svg)](https://github.com/leosssvip-dot/AI-website-test-automation-skill/actions/workflows/validate.yml)
![version](https://img.shields.io/badge/version-v0.1.0-blue)
![tests](https://img.shields.io/badge/tests-39%20passing-brightgreen)
![readiness](https://img.shields.io/badge/readiness-83%2F100%20calibrated-0ea5e9)
![scope](https://img.shields.io/badge/scope-web%20%26%20service%20QA-7c3aed)
![license](https://img.shields.io/badge/license-MIT-green)

面向网站和 Web App 的通用 AI Agent 测试用例设计、覆盖分析和自动化落地 Skill。

仓库：`leosssvip-dot/AI-website-test-automation-skill`

## 能做什么

| 能力 | Agent 可以产出什么 |
| --- | --- |
| 产品和仓库理解 | 基于 PRD、计划文档、源码、路由、API、已有测试、报告、截图、Storybook、Figma、design tokens 和设计材料建立产品模型。 |
| 有来源证据的测试用例 | 生成 P0/P1/P2 用例，包含来源证据、风险、优先级、前置条件、步骤、期望结果、数据需求、负向用例、假设和未知项。 |
| 测试设计方法 | 系统化用例推导：等价类划分、边界值分析、判定表、状态迁移、pairwise 组合和错误猜测。 |
| 黑盒 / 仅 URL 测试 | 无源码权限时的 QA 流程：基于文档和浏览器观察证据建模，受限的自动化建议，以及权限升级清单。 |
| 覆盖分析 | 按 workflow、risk、source status、automation layer、当前覆盖、缺口和下一步生成覆盖矩阵。 |
| 自动化策略 | 推荐 API、组件、浏览器 smoke、稳定 E2E、视觉、可访问性、性能 smoke、安全 smoke、manual/live 或 exploratory 覆盖方式。 |
| 测试落地 | 尽量使用目标项目已有 runner 落地测试：Playwright、Cypress、Selenium、WebdriverIO、Vitest、Testing Library、route tests 或项目自定义脚本。 |
| 测试基础设施 | 稳定套件的地基：auth/session 复用、测试数据生命周期、选择器/test-id 策略、环境引导和套件架构。 |
| API、契约与服务测试 | 对 web 产品背后的路由、API、任务、CLI 和共享库做契约和状态验证：状态码/响应结构/错误契约、鉴权/IDOR、幂等、持久化状态回读和向后兼容检查。 |
| 测试质量评审 | 基于断言强度和变异思维的评审，识别同义反复、过度 mock 或天生 flaky 的测试，把覆盖率当作地图而非分数。 |
| AI 原生能力 | Agent 驱动的探索式爬取转用例、自愈选择器、AI 作为 oracle 做主观/视觉/文案/可访问性判断、AI 失败归因，并带 confidence 和不可信输入护栏。 |
| 浏览器证据 | 通过 browser-agent 做 smoke 检查，输出截图、console/network 发现、viewport 覆盖、移动端溢出检查和 scoped skip reason。 |
| CI 和 flaky 分析 | 汇总失败（Playwright 风格 JSON 和 JUnit XML）、retry 信号和 artifact，判断 flaky 原因，并给出稳定化动作。 |
| 探索式测试 | 带 charter 和 timebox 的探索式测试会话，记录过程并在 debrief 中转化为用例、缺陷和覆盖矩阵行。 |
| 缺陷报告 | 可复现的缺陷报告：严重程度/优先级判定、生命周期和回归规则、脱敏证据。 |
| Provider/live 治理 | 为付费 provider 和 live integration 设计安全测试计划，包含 cost cap、test account、stop condition、代表性完成证据、callback/polling、存储证据和脱敏规则。 |
| 专项质量检查 | 提供视觉、可访问性、性能、安全 smoke 和 design mismatch 检查清单。 |
| 成熟度评分 | 输出八个维度的成熟度评分、明确缺口和下一批推荐测试。 |
| 测试用例校验 | 对生成的用例做 schema 校验：必填字段、合法枚举、P0/P1 来源证据,以及弱用例警告。 |
| 测试用例导出 | 导出 CSV（TestRail/Xray/禅道风格的用例管理导入列）或 Markdown 评审表格。 |

## 快速安装

直接交给 AI coding agent 安装：

```text
请把这个 skill 安装：https://github.com/leosssvip-dot/AI-website-test-automation-skill
```

手动 clone：

```bash
git clone https://github.com/leosssvip-dot/AI-website-test-automation-skill.git
cd AI-website-test-automation-skill
```

如果你的 agent 能直接读取文件，把它指向 `website-test-automation/SKILL.md` 即可。

如果你的 agent 支持 `SKILL.md` 风格的本地 skill 自动发现，把这个目录复制到对应的 skill 目录。Codex-compatible 本地 skill 示例：

```bash
mkdir -p ~/.codex/skills
rsync -a --delete website-test-automation/ ~/.codex/skills/website-test-automation/
```

Claude Code 本地 skill 示例（个人级安装）：

```bash
mkdir -p ~/.claude/skills
rsync -a --delete website-test-automation/ ~/.claude/skills/website-test-automation/
```

项目级 Claude Code 安装：把整个目录复制到目标仓库的 `.claude/skills/website-test-automation/`。

## 更新方法

直接交给 AI coding agent：`请更新这个 skill：https://github.com/leosssvip-dot/AI-website-test-automation-skill`

手动更新已 clone 的仓库和本地 skill 安装：

```bash
cd AI-website-test-automation-skill
git pull --ff-only
rsync -a --delete website-test-automation/ ~/.codex/skills/website-test-automation/   # Codex
rsync -a --delete website-test-automation/ ~/.claude/skills/website-test-automation/  # Claude Code
```

## Agent 兼容性

这是一个可迁移的文件型 agent package：`SKILL.md` 定义核心流程，`references/`、`assets/` 和 `scripts/` 提供辅助材料。能读取仓库或文件的 coding agent 都可以直接使用它。是否能原生自动发现，取决于该 agent 是否支持 `SKILL.md` 风格的 skill 包；不支持时，直接让 agent 读取这个仓库或 `website-test-automation/` 目录即可。

## 快速使用

让你的 coding agent 使用这个能力包：

```text
使用 website-test-automation skill package 检查这个项目，生成有来源证据的覆盖矩阵和 P0/P1 测试用例，选择自动化分层，并落地最高价值的测试和验证证据。
```

常用提示词：

```text
使用 website-test-automation skill package 检查当前网站测试覆盖，找出缺口，并推荐下一批要自动化的测试。
```

```text
使用 website-test-automation skill package 基于 PRD、路由、API、UI 代码、已有测试和设计材料生成有来源证据的 P0/P1/P2 测试用例。返回覆盖矩阵，并标出假设和 mismatch。
```

```text
使用 website-test-automation skill package 在这个项目已有测试 runner 中落地最优先的测试。保持 diff 聚焦，并报告命令、结果和证据。
```

```text
使用 website-test-automation skill package 对主要用户流程做一次浏览器 smoke。记录截图、console/network 发现、响应式 viewport 结果，以及任何 scoped skip。
```

```text
使用 website-test-automation skill package 分析这些失败的浏览器测试，并基于证据判断 flaky 原因。
```

```text
使用 website-test-automation skill package 规划安全的 provider/live 测试，包含 cost cap、test account、stop condition、代表性完成证据和脱敏规则。
```

```text
使用 website-test-automation skill package 为最高风险页面补充视觉、可访问性、性能 smoke 和安全 smoke 检查。
```

```text
使用 website-test-automation skill package 对 <URL> 做黑盒测试，需求以这份 PRD 为准。基于文档和浏览器观察证据建立产品模型，生成 observed/inferred 用例，执行带 charter 的探索式测试，并输出缺陷报告和权限升级清单。
```

```text
使用 website-test-automation skill package 把生成的测试用例导出为 CSV，供我们的用例管理工具导入。
```

## 成熟度评估

当前 `website-test-automation` 公开 README 口径评分：

| 维度 | 分数 | 说明 |
| --- | ---: | --- |
| 产品理解 | 88 | 产品模型流程较完整；还需要更多公开项目案例增强可信度。 |
| 有来源证据的测试用例 | 90 | schema 和证据规则较强；仍需要更多真实项目样例。 |
| 覆盖矩阵 | 86 | 覆盖模型清晰；还需要更多非 Next.js 项目的公开验证。 |
| 自动化实现指导 | 82 | 覆盖主流 runner 模板；落地时仍需适配目标项目。 |
| 浏览器 smoke 证据 | 78 | 证据契约明确；但不是托管式浏览器基础设施。 |
| CI / flaky 报告治理 | 80 | 有 triage 模型和报告摘要脚本；不是完整可观测性产品。 |
| Provider / 付费 / Live 测试治理 | 84 | 安全门控较强；真实付费/live completion 仍需显式人工授权。 |
| 视觉 / A11y / 性能 / 安全专项 | 76 | 覆盖 smoke 层级；不是完整专项测试平台。 |

校准总分：`83/100`

成熟度区间：`80-90 mature readiness candidate`

内部 helper 会分别输出原始 `contractScore` 和按证据校准后的 `overallScore`。README 使用更保守的公开成熟度评分，避免在缺少多个公开真实项目案例前过度宣传。

## 辅助脚本

```bash
node website-test-automation/scripts/detect-web-test-stack.mjs <repo>
node website-test-automation/scripts/route-inventory.mjs <repo>
node website-test-automation/scripts/score-test-readiness.mjs <repo-or-skill>
node website-test-automation/scripts/summarize-test-report.mjs <report>
node website-test-automation/scripts/validate-testcases.mjs <file-or-dir>
node website-test-automation/scripts/export-testcases.mjs <file-or-dir> --format csv|md
node website-test-automation/scripts/validate-skill.mjs website-test-automation
```

## 验证

```bash
npm run validate
node website-test-automation/scripts/score-test-readiness.mjs website-test-automation
```

## 范围

这个 skill 以网站和 Web App 的 QA 自动化为核心，同时覆盖这些产品依赖的 API、后端服务、任务/队列、CLI 和共享库——用例、覆盖、测试质量和归因模型与具体形态无关，只有浏览器适配器是 Web 专属的。它不是原生移动端、桌面端、硬件测试、压测、深度安全测试、设备云调度或完整视觉基线管理平台。

## 安全边界

只测试你拥有或被授权测试的系统。提示词、报告、日志、截图和 PR 中必须隐藏 secrets、tokens、cookies、PII、客户数据、一次性 ID、原始 provider payload 和敏感网络响应。

## 贡献与安全

欢迎提交 issue 和 pull request。贡献范围见 [CONTRIBUTING.md](CONTRIBUTING.md)，负责任披露和测试边界见 [SECURITY.md](SECURITY.md)。

## 许可

MIT。详见 [LICENSE](LICENSE)。

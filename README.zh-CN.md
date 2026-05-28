# AI Website Test Automation Skill

[English](README.md) | [中文](README.zh-CN.md)

[![Validate](https://github.com/leosssvip-dot/AI-website-test-automation-skill/actions/workflows/validate.yml/badge.svg)](https://github.com/leosssvip-dot/AI-website-test-automation-skill/actions/workflows/validate.yml)
![version](https://img.shields.io/badge/version-v0.1.0-blue)
![tests](https://img.shields.io/badge/tests-21%20passing-brightgreen)
![readiness](https://img.shields.io/badge/readiness-83%2F100-0ea5e9)
![scope](https://img.shields.io/badge/scope-website%20QA%20automation-7c3aed)
![license](https://img.shields.io/badge/license-MIT-green)

面向网站和 Web App 的通用 AI Agent 测试用例设计、覆盖分析和自动化落地 Skill。

仓库：`leosssvip-dot/AI-website-test-automation-skill`

## 能做什么

- 从 PRD、计划文档、源码、路由、API、已有测试、报告、截图和设计材料建立产品模型。
- 生成有来源证据的测试用例，包含风险、优先级、证据、前置条件、步骤、期望结果和自动化目标。
- 生成覆盖矩阵，并保留 documented、inferred、observed、mismatch 等证据状态。
- 选择合适的自动化分层：API、组件、浏览器 smoke、稳定 E2E、视觉、可访问性、性能 smoke、安全 smoke、manual/live 或 exploratory。
- 尽量基于目标项目已有测试栈落地自动化测试。
- 规划浏览器证据、CI/flaky 分析和 provider/live 测试门控。

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

## Agent 兼容性

这是一个可迁移的文件型 agent package：`SKILL.md` 定义核心流程，`references/`、`assets/` 和 `scripts/` 提供辅助材料。能读取仓库或文件的 coding agent 都可以直接使用它。是否能原生自动发现，取决于该 agent 是否支持 `SKILL.md` 风格的 skill 包；不支持时，直接让 agent 读取这个仓库或 `website-test-automation/` 目录即可。

## 快速使用

让你的 coding agent 使用这个能力包：

```text
使用 website-test-automation skill package 检查这个项目，生成有来源证据的覆盖矩阵和 P0/P1 测试用例，选择自动化分层，并落地最高价值的测试和验证证据。
```

更简洁的提示词：

```text
使用 website-test-automation skill package 检查当前网站测试覆盖，找出缺口，并推荐下一批要自动化的测试。
```

```text
使用 website-test-automation skill package 分析这些失败的浏览器测试，并基于证据判断 flaky 原因。
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

内部 helper 对 skill 包完整性可以给出更高分。README 使用更保守的公开成熟度评分，避免在缺少多个公开真实项目案例前过度宣传。

## 辅助脚本

```bash
node website-test-automation/scripts/detect-web-test-stack.mjs <repo>
node website-test-automation/scripts/route-inventory.mjs <repo>
node website-test-automation/scripts/score-test-readiness.mjs <repo-or-skill>
node website-test-automation/scripts/summarize-test-report.mjs <report>
node website-test-automation/scripts/validate-skill.mjs website-test-automation
```

## 验证

```bash
npm run validate
node website-test-automation/scripts/score-test-readiness.mjs website-test-automation
```

## 范围

这个 skill 聚焦网站和 Web App 的 QA 自动化。它不是原生移动端、桌面端、硬件测试、压测、深度安全测试、设备云调度或完整视觉基线管理平台。

## 安全边界

只测试你拥有或被授权测试的系统。提示词、报告、日志、截图和 PR 中必须隐藏 secrets、tokens、cookies、PII、客户数据、一次性 ID、原始 provider payload 和敏感网络响应。

## 贡献与安全

欢迎提交 issue 和 pull request。贡献范围见 [CONTRIBUTING.md](CONTRIBUTING.md)，负责任披露和测试边界见 [SECURITY.md](SECURITY.md)。

## 许可

MIT。详见 [LICENSE](LICENSE)。

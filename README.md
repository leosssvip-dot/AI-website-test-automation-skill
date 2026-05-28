# AI Website Test Automation Skill

Product-grounded QA automation planning and implementation for websites and web apps.

面向网站和 Web App 的产品驱动测试用例设计、覆盖分析和自动化落地 Skill。

Repository: `leosssvip-dot/AI-website-test-automation-skill`

## What It Does / 能做什么

- Build a Product Model from PRDs, planning docs, source code, routes, APIs, existing tests, reports, screenshots, and design artifacts.
- Generate source-backed test cases with risk, priority, evidence, preconditions, steps, expected results, and automation targets.
- Build coverage matrices that preserve documented, inferred, observed, and mismatch evidence.
- Choose the right automation layer: API, component, browser smoke, durable E2E, visual, accessibility, performance smoke, security smoke, manual/live, or exploratory.
- Implement selected tests using the target repo's existing runner whenever possible.
- Plan browser-agent evidence, CI/flaky triage, and provider/live testing gates.

- 从 PRD、计划文档、源码、路由、API、已有测试、报告、截图和设计材料建立产品模型。
- 生成有来源证据的测试用例，包含风险、优先级、证据、前置条件、步骤、期望结果和自动化目标。
- 生成覆盖矩阵，并保留 documented、inferred、observed、mismatch 等证据状态。
- 选择合适的自动化分层：API、组件、浏览器 smoke、稳定 E2E、视觉、可访问性、性能 smoke、安全 smoke、manual/live 或 exploratory。
- 尽量基于目标项目已有测试栈落地自动化测试。
- 规划浏览器证据、CI/flaky 分析和 provider/live 测试门控。

## Quick Install / 快速安装

```bash
git clone https://github.com/leosssvip-dot/AI-website-test-automation-skill.git
cd AI-website-test-automation-skill
mkdir -p ~/.codex/skills
rsync -a --delete website-test-automation/ ~/.codex/skills/website-test-automation/
```

## Quick Usage / 快速使用

In Codex, ask for the skill by name:

在 Codex 中直接点名这个 skill：

```text
Use $website-test-automation to inspect this repo, build a source-backed coverage matrix, generate P0/P1 test cases, choose automation layers, and implement the highest-value tests with evidence.
```

```text
使用 $website-test-automation 检查这个项目，生成有来源证据的覆盖矩阵和 P0/P1 测试用例，选择自动化分层，并落地最高价值的测试和验证证据。
```

More concise prompts:

更简洁的提示词：

```text
Use $website-test-automation to review current website test coverage and recommend the next automated tests.
```

```text
Use $website-test-automation to triage these failing browser tests and identify flaky causes with evidence.
```

```text
使用 $website-test-automation 为这个 Web App 生成测试用例、覆盖矩阵和自动化落地方案。
```

## Readiness Score / 成熟度评分

Current self-score for `website-test-automation`:

当前 `website-test-automation` 自评分：

| Dimension | 中文 | Score |
| --- | --- | ---: |
| Product understanding | 产品理解 | 100 |
| Source-backed cases | 有来源证据的测试用例 | 100 |
| Coverage matrix | 覆盖矩阵 | 100 |
| Automation implementation | 自动化实现指导 | 100 |
| Browser-smoke evidence | 浏览器 smoke 证据 | 100 |
| CI/flaky reporting | CI / flaky 报告治理 | 100 |
| Provider/live governance | Provider / 付费 / Live 测试治理 | 100 |
| Specialized quality | 视觉 / A11y / 性能 / 安全专项 | 100 |

Overall score: `100`

Readiness band: `80-90 mature readiness candidate`

The band is intentionally conservative: `90+ proven maturity` should require multiple public real-project case studies, not only a strong self-score.

评分区间是刻意保守的：`90+ proven maturity` 应该依赖多个公开真实项目案例，而不只是 skill 自评分。

## Helper Scripts / 辅助脚本

```bash
node website-test-automation/scripts/detect-web-test-stack.mjs <repo>
node website-test-automation/scripts/route-inventory.mjs <repo>
node website-test-automation/scripts/score-test-readiness.mjs <repo-or-skill>
node website-test-automation/scripts/summarize-test-report.mjs <report>
node website-test-automation/scripts/validate-skill.mjs website-test-automation
```

## Validate / 验证

```bash
npm run validate
node website-test-automation/scripts/score-test-readiness.mjs website-test-automation
```

## Scope / 范围

This skill focuses on website and web app QA automation. It is not a complete platform for native mobile, desktop apps, hardware testing, load testing, intrusive security testing, device-cloud orchestration, or full visual baseline management.

这个 skill 聚焦网站和 Web App 的 QA 自动化。它不是原生移动端、桌面端、硬件测试、压测、深度安全测试、设备云调度或完整视觉基线管理平台。

## Safety / 安全边界

Only test systems you own or are authorized to test. Redact secrets, tokens, cookies, PII, customer data, one-time IDs, raw provider payloads, and sensitive network responses from prompts, reports, logs, screenshots, and PRs.

只测试你拥有或被授权测试的系统。提示词、报告、日志、截图和 PR 中必须隐藏 secrets、tokens、cookies、PII、客户数据、一次性 ID、原始 provider payload 和敏感网络响应。

## License / 许可

No license has been selected yet. Add a `LICENSE` file before making the repository public.

当前还没有选择开源许可证。正式公开前请先添加 `LICENSE` 文件。

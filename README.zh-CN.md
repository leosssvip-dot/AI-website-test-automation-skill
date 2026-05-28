# AI Website Test Automation Skill

[English](README.md) | [中文](README.zh-CN.md)

[![Validate](https://github.com/leosssvip-dot/AI-website-test-automation-skill/actions/workflows/validate.yml/badge.svg)](https://github.com/leosssvip-dot/AI-website-test-automation-skill/actions/workflows/validate.yml)
![version](https://img.shields.io/badge/version-v0.1.0-blue)
![tests](https://img.shields.io/badge/tests-21%20passing-brightgreen)
![readiness](https://img.shields.io/badge/readiness-80--90%20mature%20candidate-0ea5e9)
![scope](https://img.shields.io/badge/scope-website%20QA%20automation-7c3aed)
![license](https://img.shields.io/badge/license-pending-lightgrey)

面向网站和 Web App 的产品驱动测试用例设计、覆盖分析和自动化落地 Skill。

仓库：`leosssvip-dot/AI-website-test-automation-skill`

## 能做什么

- 从 PRD、计划文档、源码、路由、API、已有测试、报告、截图和设计材料建立产品模型。
- 生成有来源证据的测试用例，包含风险、优先级、证据、前置条件、步骤、期望结果和自动化目标。
- 生成覆盖矩阵，并保留 documented、inferred、observed、mismatch 等证据状态。
- 选择合适的自动化分层：API、组件、浏览器 smoke、稳定 E2E、视觉、可访问性、性能 smoke、安全 smoke、manual/live 或 exploratory。
- 尽量基于目标项目已有测试栈落地自动化测试。
- 规划浏览器证据、CI/flaky 分析和 provider/live 测试门控。

## 快速安装

```bash
git clone https://github.com/leosssvip-dot/AI-website-test-automation-skill.git
cd AI-website-test-automation-skill
mkdir -p ~/.codex/skills
rsync -a --delete website-test-automation/ ~/.codex/skills/website-test-automation/
```

## 快速使用

在 Codex 中直接点名这个 skill：

```text
使用 $website-test-automation 检查这个项目，生成有来源证据的覆盖矩阵和 P0/P1 测试用例，选择自动化分层，并落地最高价值的测试和验证证据。
```

更简洁的提示词：

```text
使用 $website-test-automation 检查当前网站测试覆盖，找出缺口，并推荐下一批要自动化的测试。
```

```text
使用 $website-test-automation 分析这些失败的浏览器测试，并基于证据判断 flaky 原因。
```

## 成熟度评分

当前 `website-test-automation` 自评分：

| 维度 | 分数 |
| --- | ---: |
| 产品理解 | 100 |
| 有来源证据的测试用例 | 100 |
| 覆盖矩阵 | 100 |
| 自动化实现指导 | 100 |
| 浏览器 smoke 证据 | 100 |
| CI / flaky 报告治理 | 100 |
| Provider / 付费 / Live 测试治理 | 100 |
| 视觉 / A11y / 性能 / 安全专项 | 100 |

总分：`100`

成熟度区间：`80-90 mature readiness candidate`

这个区间是刻意保守的：`90+ proven maturity` 应该依赖多个公开真实项目案例，而不只是 skill 自评分。

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

## 许可

当前还没有选择开源许可证。正式公开前请先添加 `LICENSE` 文件。

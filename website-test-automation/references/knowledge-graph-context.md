# Knowledge Graph Context

Use graph context when ordinary file inspection is not enough to understand product-to-code relationships.

## Tool Choice

| Need | Preferred path |
| --- | --- |
| Mixed PRD, architecture docs, code, SQL, screenshots, diagrams, media | Graphify |
| Code symbols, routes, imports, calls, handlers, impact radius | CodeGraph |
| Small repo or obvious file path | `rg`, file reads, repo-native commands |

## Graph-To-Test Workflows

- Feature map to coverage matrix.
- Route/API map to test cases.
- Business entity map to data lifecycle cases.
- Impact analysis to regression selection.
- Cross-document mismatch to risk notes.

## Evidence Rules

Graph output is orientation evidence, not final truth. Verify important claims against source files before turning them into test cases or automation.

Record only safe summaries: node names, source file paths, relationship type, and confidence. Redact secrets, payloads, and customer data.


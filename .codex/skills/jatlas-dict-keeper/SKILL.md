---
name: jatlas-dict-keeper
description: Use when working in JATLAS and the task involves Chinese project records for requirements, feature changes, implementation decisions, handoff notes, or periodic conversation summaries.
---

# JATLAS Dict Keeper

JATLAS uses Markdown records in `dict/` to make project thinking visible to both people and future AI agents. Use this skill to preserve requirements, changes, decisions, and handoff context as clear Chinese project records.

`dict/` is a local-only project memory folder and is intentionally ignored by Git.

## Language Rule

Write `dict/` records in Chinese by default.

Use English only when it is part of code, command names, file paths, package names, API names, error messages, commit/branch names, or exact UI copy that must stay English.

Do not generate English section templates such as `Background`, `Scope`, or `Next Steps` for normal JATLAS records. Use natural Chinese headings and Chinese prose so a person can quickly understand what happened without reading the chat history.

## Project Record Path

Write project records under the project-local `dict/` folder.

Use the structured subdirectories for new files:

- `requirements/`
- `changes/`
- `decisions/`
- `sessions/`
- `handoff/`
- `_templates/`

Existing top-level `dict/*.md` files can remain where they are unless the user asks to reorganize them.

## Workflow

1. Before substantial work, inspect relevant existing records in `dict/`.
2. During the task, identify decisions or conclusions that should survive beyond chat history.
3. Create or update a Chinese Markdown record when the work introduces a requirement, change, decision, handoff, or useful session summary.
4. Before final response, verify whether the session produced durable context. If yes, save it in `dict/`.
5. In the final response, mention the exact record file created or updated.

## When to Create a Record

Create or update a record for:

- Version requirements and feature specifications.
- Behavior changes, refactors, migrations, and fixes with future relevance.
- Architecture, product, data, security, packaging, or workflow decisions.
- Periodic conversation conclusions and next steps.
- Agent handoff context.

Do not create records for trivial command outputs, purely mechanical formatting, or one-off notes with no future value.

## Filename Pattern

Use:

`YYYY-MM-DD_<type>_<short-topic>.md`

Allowed types:

- `requirement`
- `change`
- `decision`
- `session`
- `handoff`

Use lowercase hyphenated topics.

## Record Shape

Prefer this shape, deleting sections that do not apply:

```md
# 标题

## 背景

## 当前结论或需求

## 适用范围

## 执行说明

## 验收或验证

## 未决问题

## 后续动作
```

Keep records concise, factual, and useful to a future person or AI agent reading the repository without chat history.

## Writing Style

- Prefer direct Chinese descriptions over translated template language.
- Explain why the decision matters, not only what file changed.
- Preserve enough context for a future reader to recover the reasoning.
- Keep commands, paths, filenames, and code identifiers exact.
- If the user discussed the topic in Chinese, summarize the conclusion in Chinese instead of translating it into English.

---
name: jatlas-dict-keeper
description: Use when working in JATLAS and the task involves requirements, feature changes, implementation decisions, handoff notes, or periodic conversation summaries.
---

# JATLAS Dict Keeper

JATLAS preserves important project thinking as Markdown in `dict/`. Use this skill to keep requirements, changes, decisions, and handoff context explicit and durable.

`dict/` is a local-only project memory folder and is intentionally ignored by Git.

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
3. Create or update a Markdown record when the work introduces a requirement, change, decision, handoff, or useful session summary.
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
# Title

## Background

## Current Decision or Requirement

## Scope

## Implementation Notes

## Acceptance Criteria or Verification

## Open Questions

## Next Steps
```

Keep records concise, factual, and useful to a future agent reading the repository without chat history.

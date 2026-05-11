# JATLAS Project Instructions

## Persistent Project Records

This project preserves important requirements, decisions, implementation notes, and handoff context as Markdown files under the project-local `dict/` folder.

Treat `dict/` as the project memory layer. Do not rely on chat history alone for information that should survive across sessions.

`dict/` is local-only and intentionally ignored by Git. Do not assume records in this folder will be pushed to GitHub.

## When to Write to `dict/`

Create or update a Markdown record when work introduces any of the following:

- A version requirement or feature requirement.
- A behavior change, refactor, migration, or fix with future relevance.
- A product, architecture, data, security, packaging, or workflow decision.
- A periodic conversation summary that captures conclusions or next steps.
- A handoff note for the next agent or future project work.

Before substantial work, inspect relevant existing files in `dict/` so decisions build on the current project record.

Before finishing substantial work, check whether the session produced information that should be persisted. If yes, write or update the relevant Markdown file and mention it in the final response.

## Directory Layout

Use this layout for new records:

- `dict/requirements/` for version requirements and feature specs.
- `dict/changes/` for implementation changes, refactors, fixes, and migrations.
- `dict/decisions/` for architecture, product, workflow, and process decisions.
- `dict/sessions/` for periodic conversation summaries.
- `dict/handoff/` for agent handoff notes.
- `dict/_templates/` for reusable document templates.

Existing top-level `dict/*.md` files may remain in place. Prefer the structured subdirectories for new records.

## Naming

Use sortable filenames:

`YYYY-MM-DD_<type>_<short-topic>.md`

Allowed types:

- `requirement`
- `change`
- `decision`
- `session`
- `handoff`

Keep the short topic lowercase, concise, and hyphenated.

## Record Content

A useful record should usually include:

- Background
- Current Decision or Requirement
- Scope
- Implementation Notes
- Acceptance Criteria or Verification
- Open Questions
- Next Steps

Skip sections that do not apply, but do not skip the decision or requirement itself.

## Skill

For this project, use the project-local skill at:

`.codex/skills/jatlas-dict-keeper/SKILL.md`

Use it when work involves requirements, feature changes, implementation decisions, handoffs, or session summaries.

# Orbit Monitor — instructions for Claude

Read [`context/project.md`](context/project.md) and [`context/README.md`](context/README.md) before working. Requirements live in [`docs/`](../docs/).

## Living context (mandatory)
`.claude/context/` holds **one Markdown file per screen** (`screens/<screen>.md`) and **one per feature** (`features/<ID>-<slug>.md`). Keep them true:

- **Changing or adding a feature or screen → update its context file in the same commit.** Update `status`, `updated`, the `Code` and `Tests` lists, `Decisions and notes`, and append a `Changelog` line (`- YYYY-MM-DD — what changed`).
- **New feature** → create `features/<ID>-<slug>.md` from the existing template and add a row to `context/README.md`. New IDs continue the sequence (`FE-51`, `BE-51`, `CORE-21`).
- **New screen** → create `screens/<screen>.md` and add it to the index.
- Keep the status in `context/README.md` in sync with each file's frontmatter.
- Status flow: `planned` → `tests-pending` → `in-progress` → `done`.
- Write in English, factual and short. Never put secrets, real customer data or card numbers in these files.

## Rules
- Product shape: local-first, **no login**, **no Orbit database** (only SELECTs on monitored DBs), configuration in one `orbit.<feature>.json` per feature (`docs/06-configuration-files.md`). Never commit those files or `master.key`; never write real config, secrets or card numbers into the repo.
- TDD; pending-test convention in `docs/05-extended-features.md` §3.
- English in the repository; i18n en + pt-BR in the product.
- LGPD / PCI DSS controls in `docs/04-data-protection.md` are mandatory.
- Commit on `developer` only and `git push origin developer` after each commit; `main` holds the base; no other branches for now. Repository is public: https://github.com/MatheusChiodi/orbit-monitor. Conventional Commits, stage explicit paths only; never switch branches, stash or reset in the shared working tree.

## Commit authorship (mandatory)
- The repository owner is the **sole author** of every commit. Use the local `git config user.name` / `user.email` as-is; never change them.
- **Never** add `Co-Authored-By`, `Claude-Session`, "Generated with Claude Code" or any other AI/assistant attribution to commit messages, PR descriptions, code comments or docs.
- Commit messages contain only the Conventional Commit subject and, when useful, a plain body.

## Shared working tree (mandatory)
Several agents work in this checkout at the same time. Commit only with an explicit pathspec (`git add <paths> && git commit -m "..." -- <paths>`); never `git add .`, `git add -A` or a bare `git commit`, so nobody sweeps in another agent's staged files.

## Specialist agents
Project specialists live in `.claude/agents/` (orbit-backend, orbit-frontend, orbit-fx, orbit-history, orbit-themes, orbit-customization, orbit-dataviz, orbit-privacy, orbit-qa, orbit-docs). Each loads its best skills, researches current best practices before coding and records the decision in the feature's context file.

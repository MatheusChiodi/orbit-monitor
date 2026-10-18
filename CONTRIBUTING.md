# Contributing to Orbit Monitor

Thanks for your interest. A few rules keep the project healthy.

## Workflow

1. Open an issue describing the problem or proposal before large changes.
2. Fork the repository and create a branch from `main` (`feat/my-feature`, `fix/my-bug`).
3. Open a small, focused pull request describing what changed and how to test it.

## TDD is the rule

- Write the **test first**, watch it fail, then implement.
- Every new piece of code needs unit tests.
- Backend: JUnit 5 (`cd backend && ./mvnw test`).
- Frontend: Vitest + Testing Library (`cd frontend && npm test`) and `npx tsc --noEmit` with no errors.
- Pull requests with failing tests are not accepted.

## Language

- Code, identifiers, comments, commit messages and documentation are in **English**.
- User-facing text must go through i18n: add keys for both `en` and `pt-BR`. Never hard-code UI strings.

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(monitor): add numeric condition evaluator
fix(wall): fix matrix ordering
docs: update README
```

## Style

- Files up to ~400 lines; one component per folder on the frontend.
- Strict TypeScript, no `any`.
- Follow the tokens and principles in [docs/03-design.md](docs/03-design.md).

## Security

Never commit credentials, keys (`master.key`, `.env`) or local databases (`*.mv.db`). For vulnerabilities, see [SECURITY.md](SECURITY.md).

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE) and that you follow the [Code of Conduct](CODE_OF_CONDUCT.md).

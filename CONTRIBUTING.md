# Contributing

Thanks for your interest in contributing! This document describes how to get set up, the workflow for proposing changes, and the conventions used in this repository.

## Code of conduct

Be respectful, constructive, and kind. Assume good intent and offer feedback in a way you would want to receive it.

## Getting set up

Follow the [Quick start](./README.md#quick-start) in the README to get the backend, frontend, and PostgreSQL running locally.

## Workflow

1. **Fork** the repository and clone your fork.
2. **Create a feature branch** off `main`:
   ```bash
   git checkout -b feat/<short-description>
   ```
3. **Make your changes** in small, focused commits.
4. **Verify everything builds** (see [Verification](#verification) below).
5. **Push** your branch and open a pull request against `main`.

## Branch naming

Use a short prefix that reflects the type of change:

| Prefix      | Use for                                       |
| ----------- | --------------------------------------------- |
| `feat/`     | New features                                  |
| `fix/`      | Bug fixes                                     |
| `refactor/` | Code restructuring without behavior change    |
| `docs/`     | Documentation-only changes                    |
| `chore/`    | Tooling, dependency bumps, housekeeping       |
| `test/`     | Adding or updating tests                      |

## Commit messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) style:

```
<type>: <short summary>

<optional body explaining *why*, not *what*>
```

Examples:

- `feat: add product search to storefront`
- `fix: correct price formatting for cents below 10`
- `refactor: extract category list into component`

Keep the summary under ~72 characters and write in the imperative mood.

## Coding standards

### Rust (`backend/`)

- Run `cargo fmt` before committing.
- Run `cargo clippy --all-targets -- -D warnings` and resolve lints.
- Keep handlers thin — push domain logic into modules, not `main.rs`.
- Prefer `anyhow::Result` in application code and typed errors at API boundaries.

### TypeScript / React (`frontend/`)

- Run `npm run build` to ensure TypeScript compiles cleanly.
- Use functional components and hooks — no class components.
- Keep components small and co-locate types in `types.ts` or next to the component.
- Avoid adding a component library unless the PR discusses it first.

### SQL (`backend/migrations/`)

- New migrations go in a new file named `NNNN_<description>.sql` — never edit an applied migration.
- Include both schema and seed data when relevant.
- Prefer `CREATE TABLE IF NOT EXISTS` for idempotency during local development.

## Verification

Before opening a PR, please run:

```bash
# backend
cd backend
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo build

# frontend
cd frontend
npm run build
```

If your change affects the storefront or admin UI, please also exercise the flow in the browser and mention what you tested in the PR description.

## Pull requests

A good PR has:

- A short description of **what** the change does and **why**.
- Screenshots for UI changes.
- Notes on manual testing performed.
- A link to any related issue.

PRs should be focused — prefer several small PRs over one large one.

## Reporting bugs

Open an issue with:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Environment (OS, Rust version, Node version)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

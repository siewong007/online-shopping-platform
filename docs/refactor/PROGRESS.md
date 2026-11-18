# Refactor Progress Log

## Current Status
- [x] Phase 0: Understand the project & Audit
- [x] Phase 1: Tooling and standards
- [ ] Phase 2: Structure and naming
- [ ] Phase 3: Code quality
- [ ] Phase 4: Security, privacy and performance
- [ ] Phase 5: Fill the gaps
- [ ] Phase 6: Final check

## Log
- 2026-11-18: Initialised project audit, stashed pre-existing working-tree edits (`stash@{0}`), created `refactor/standards` branch, and added `.editorconfig`.
- 2026-11-18: Completed comprehensive Phase 0 repository audit in `docs/refactor/AUDIT.md` covering full Ekoway Hardware stack, 50+ API routes, frontend screens/drawers, 39 SQL migrations, background workers, findings by severity, Phase 5 gap checklist, and Phase 1–6 refactor roadmap.
- 2026-11-18: Completed Phase 1 (Tooling & Standards):
  - Upgraded frontend stack (`react` 19.3.1, `react-dom` 19.3.1, `@types/react` 19.3.0, `@types/react-dom` 19.3.0, `vite` 8.3.8, `@vitejs/plugin-react` 6.3.0) while keeping `typescript` 7.0.2 native `tsc` builds and syncing `REACT_TARGET` in `backend/src/modules/health/controller.rs`.
  - Added ESLint 10 + `typescript-eslint` + `eslint-plugin-react-hooks` v7 + `eslint-plugin-react-refresh` + `eslint-config-prettier` (`frontend/eslint.config.js`), bridged to `@typescript/typescript6` via `node:module` hooks.
  - Enabled `"strict": true` across `tsconfig.node.json` and new `tsconfig.test.json`, resolving all 27 strict test-suite type errors via `frontend/tests/helpers/mockFetch.ts` and updated `CheckoutQuote` fixtures.
  - Resolved all 57 React 19 / TypeScript ESLint errors across 18 frontend files using idiomatic React 19 state derivation, `useEffectEvent`, and effect-only ref synchronization (zero `@ts-ignore`, zero `eslint-disable`, zero `any`).
  - Formatted the entire frontend with Prettier, pinned `.nvmrc` (`22`) and `.bun-version` (`1.3.14`), updated `.gitignore`, unified `Makefile` + root `package.json` scripts (`lint`, `format`, `typecheck`, `test`, `build`), and configured Husky + `lint-staged` pre-commit hooks.

## Decisions Made
- Keep `typescript@^7.0.2` (native Go compiler) for `tsc` and upgrade frontend packages (`react` 19.3.1, `vite` 8.3.8, `@vitejs/plugin-react` 6.3.0), bridging `typescript-eslint` to Microsoft's `@typescript/typescript6` inside `eslint.config.js` via `node:module` hooks so neither tool requires a downgrade.
- Defer self-service customer account deletion (`DELETE /api/account/me`) to owner decision because Malaysian tax/e-Invoice retention rules (7 years) vs PDPA erasure require schema/auth policy confirmation.

## Open Questions
- Confirm desired retention/anonymization rules if automated in-app customer account deletion is wanted alongside the existing Privacy Officer workflow in `/legal/privacy`.

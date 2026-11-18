# Changelog

All notable changes to the Online Shopping Platform (Ekoway Hardware) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Code Quality & Verification Gates**:
  - Prettier formatting with automated check (`bun run format:check`).
  - ESLint 10 with `typescript-eslint`, `eslint-plugin-react-hooks` v7, and `eslint-plugin-react-refresh` enforcing 0 warnings in CI.
  - Strict TypeScript typechecking (`node ./node_modules/typescript/bin/tsc -b`) guarding both application and test code.
  - Husky + `lint-staged` pre-commit hooks for automated formatting and lint checks on staged files.
  - Characterization unit tests for storefront state synchronization and cart inventory clamping (`frontend/tests/storefront/storefrontSync.test.ts`).
  - Strict `mockFetch` helper providing compliant DOM `preconnect` semantics under Bun 1.3 test runner.
  - Environment configuration templates (`backend/.env.example`, `frontend/.env.example`) documenting all operational variables (`ADMIN_SEED_PASSWORD`, `RATE_LIMIT_PER_MINUTE`, `TRUST_PROXY`, `RUST_LOG`, `VITE_API_URL`).
  - Multi-environment runtime deployment guide (`docs/environments.md`).

### Changed
- **Dependencies & Frameworks**:
  - Upgraded frontend runtime to React 19.3.1 and React DOM 19.3.1.
  - Upgraded build toolchain to Vite 8.3.8 and `@vitejs/plugin-react` 6.3.0.
  - Upgraded TypeScript to 7.0.2 with native compiler build support.
  - Synchronized backend health check `REACT_TARGET` to `19.3.1`.
- **Refactoring & Modularity**:
  - Extracted storefront catalog mutations and cart inventory clamping logic into `frontend/src/app/storefrontSync.ts`.
  - Extracted shared storefront helpers (`PRICE_PRESETS`, `productStockState`, `isGenericPlaceholderImage`) into `frontend/src/modules/storefront/helpers.ts`.
  - Extracted modal form validation helpers into `frontend/src/shared/components/recordFormValidation.ts`.
  - Reconciled `frontend/src/lib/api.ts` public exports with domain modules.
  - Converted synchronous `useEffect` state updates to idiomatic React 19 render-time derivations and `useEffectEvent`.
  - Safely handled CSV column index lookups in `backend/src/db/catalogue_import.rs` with error results instead of panicking unwrap calls.
  - Enhanced GitHub Actions CI pipeline to execute format checks, linting, and typechecking in the frontend test matrix.

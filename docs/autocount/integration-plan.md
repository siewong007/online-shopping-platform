# AutoCount Integration Plan

Goal: get this platform's sales data (invoices, customers, payments) into AutoCount
so accounting and Malaysian MyInvois e-invoicing happen there, without double entry.
Facts and sources: [research.md](research.md) (researched 2026-07-04; re-verify before building).

## Decision summary (made 2026-07-04, revisit at Phase 0)

1. **Never write directly to AutoCount's SQL Server tables.** GL posting, tax logic,
   document numbering, and e-invoice state live above the raw tables; no official support
   for direct writes (research.md §4). This is a hard rule for all sessions.
2. **Phase by integration surface, cheapest first**: file export → then automation
   matched to the user's actual AutoCount edition. Do not start with a .NET bridge.
3. **E-invoice compliance stays inside AutoCount.** We push accounting documents to
   AutoCount; AutoCount (via its AIP intermediary) talks to LHDN MyInvois. This platform
   must still *carry* the fields MyInvois needs (buyer TIN, SST codes, UOM) so they
   survive the hop. UNVERIFIED whether API/Excel-imported invoices auto-enter the
   e-invoice flow — confirm in Phase 0 (research.md UNVERIFIED #6).

## Phase 0 — Discovery (blockers; mostly TBD-user-to-fill (待使用者填寫))

| Question | Why it matters | Answer |
|---|---|---|
| AutoCount edition + version (on-premise Accounting 2.x? Cloud Accounting? OneSales?) | Chooses the entire Phase 2 architecture | TBD-user-to-fill (待使用者填寫) |
| Annual turnover band | Which MyInvois phase applies (RM1–5M live since 2026-01-01) | TBD-user-to-fill (待使用者填寫) |
| Who operates AutoCount (in-house accountant? external firm?) | Manual-import MVP viability | TBD-user-to-fill (待使用者填寫) |
| Objects to sync: invoices only, or also debtors / stock items / payments? | Scope of mapping work | TBD-user-to-fill (待使用者填寫) |
| Sync direction: push-only, or read back payment/e-invoice status? | Phase 3 scope | TBD-user-to-fill (待使用者填寫) |
| Does Excel/API import auto-trigger e-invoice submission in their setup? | Compliance workflow | TBD-user-to-fill (待使用者填寫) (test with AutoCount reseller) |

## Phase 1 — Export MVP (works for every edition; no new backend deps expected)

Build an admin-console export: "Download AutoCount import file" for a date range.

- Backend: endpoint under `/api/admin/` producing AutoCount-importable files for
  **AR Invoice** and **Debtor** (research.md §3: Excel/CSV/TXT/XML accepted). Start with
  CSV/XML from the standard library; only consider a spreadsheet crate if AutoCount's
  template import truly requires .xlsx (then rubric R3: ask before adding a dependency).
- Exact column layout must be taken from the user's AutoCount version via
  its own "Import from Excel" template export — do not guess columns. TBD-user-to-fill (待使用者填寫)
  (attach the template file to docs/autocount/ when obtained).
- Mark exported invoices (`exported_to_autocount_at` timestamp column, new migration)
  so re-exports don't double-post.
- Acceptance: a real file imports cleanly into the user's AutoCount with zero manual
  column fixes; re-running the export excludes already-exported invoices.

## Phase 2 — Automation (pick ONE branch after Phase 0)

- **Branch A — AutoCount Cloud Accounting**: call its REST Integration API from the Rust
  backend (auth: `API-Key` + `Key-ID` headers, keys from Settings → API Keys). Store keys
  in `backend/.env` (gitignored). Retry queue table for failed pushes.
- **Branch B — On-premise Accounting 2.x**: two sub-options, decide with the user:
  - B1: **Integrator Plugin, File Drop mode** — we write files to a watched folder/FTP;
    no .NET code on our side. Cheapest automation; licensing UNVERIFIED (research.md UNVERIFIED #1).
  - B2: **.NET bridge sidecar** — small C# service using AutoCount's NuGet/DLL plugin API,
    exposing a private HTTP endpoint our backend calls. Most capable, most moving parts;
    requires a Windows/.NET 4.8 host next to AutoCount. Only if B1 can't cover the need.
- Either branch keeps Phase 1's export as the fallback path (same spirit as the
  frontend fallback-data rule: the business must survive the integration being down).

## Phase 3 — Read-back and reconciliation (optional, after Phase 2 is stable)

- Pull payment/knock-off status and e-invoice (MyInvois) status back to show on the
  platform's invoice screen.
- Weekly reconciliation report: platform invoices vs. AutoCount documents by doc number
  and totals; mismatches listed, not auto-fixed.

## Data mapping skeleton (fill exact fields in Phase 1 from the real template)

| Platform | AutoCount | Notes |
|---|---|---|
| invoice number | AR Invoice DocNo | AutoCount has its own numbering formats (e.g. `INV{@yyMM}-<0000>`); decide single source of numbering truth in Phase 0 — recommend: platform number goes to a reference field, AutoCount assigns DocNo, unless accountant wants ours |
| customer | Debtor (DebtorCode) + Tax Entity/TIN | TIN needed for MyInvois |
| line items | Item lines: ItemCode, Qty, UOM, UnitPrice | UOM must map to LHDN UOM codes |
| tax | SST tax code per line (e.g. `S-10`, `SV-8`) | verify current rates/codes at build time |
| payments | AR Payment / Official Receipt | Phase 2+ only |

## Implications for current work (branch feat/finish-sales-invoices-settings)

While finishing invoices/settings, keep AutoCount in mind NOW to avoid rework:
- Customer records should have room for TIN + registration/SST numbers (add when the
  invoice work touches customers anyway — new migration, don't retrofit later).
- Invoice line items need a stable UOM concept and a per-line tax treatment, even if
  the UI hardcodes defaults today.
- Keep invoice numbers immutable once issued — reconciliation depends on it.

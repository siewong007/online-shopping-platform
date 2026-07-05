# AutoCount Integration Research (as of 2026-07-04)

Scope: options for syncing e-commerce sales invoices/debtors/stock/payments from this
Rust/Axum platform into AutoCount accounting products.

## 1. Relevant AutoCount editions

- **AutoCount Accounting (on-premise, 2.x)** — desktop app on .NET Framework, data in
  local/network SQL Server. Has a native .NET API for plugins.
  [Integration Methods](https://wiki.autocountsoft.com/wiki/Integration_Methods),
  [AutoCount Accounting 2.1 API](https://wiki.autocountsoft.com/wiki/AutoCount_Accounting_2.1_API)
- **AutoCount Cloud Accounting** — web app with an official REST "Integration API" and
  Swagger docs, intended for cloud-to-cloud integration.
  [Getting Started – Cloud Accounting Integration API](https://accounting-api.autocountcloud.com/documentation/),
  [Swagger UI](https://accounting-api.autocountcloud.com/swagger/index.html)
- **AutoCount OneSales / POS (Cloud)** — retail/F&B POS, syncs to AutoCount Cloud
  Accounting in real time; has its own Web API for third-party integration (e-commerce,
  CRM, ERP). [AutoCount API Integration](https://autocountsystem.com/autocount-api/),
  [AutoCount OneSales](https://www.autocountsoft.com/pro-onesales.html)
- All three product lines expose *some* integration surface; on-premise Accounting's
  surface is a .NET API (not a network REST API), Cloud Accounting/OneSales expose REST.

## 2. Official APIs

- **AutoCount Accounting API (.NET, on-premise)**: a set of assemblies (DLLs) shipped
  with the desktop install (default path `C:\Program Files\AutoCount\Accounting\`), also
  installable via NuGet (`autocount2.MainEntry`). Requires a Windows + .NET Framework
  4.8 project (2.1 API); runs as an attached "Plug-In" process on the same machine as
  AutoCount Accounting, not a network service. Reads/writes master data and documents
  in-process. [Integration Methods](https://wiki.autocountsoft.com/wiki/Integration_Methods),
  [AutoCount Accounting 2.1 API](https://wiki.autocountsoft.com/wiki/AutoCount_Accounting_2.1_API).
  A Rust backend cannot call this directly — it is an in-process .NET plugin model, so a
  Windows-hosted .NET bridge service would be required. UNVERIFIED: exact licensing
  cost/module SKU required to unlock the API (third-party reseller pages reference an
  "API (Optional Module)" as a paid add-on — [ipohonline.biz listing](https://www.ipohonline.biz/brand-autocount/AC-V2-OM-API) —
  but no price/terms confirmed from an autocountsoft.com source).
- **AutoCount Cloud Accounting Integration API (REST)**: confirmed to exist, with public
  Swagger docs. Access: in the Cloud Accounting web app, go to Settings → API Keys →
  "Create API Key", which generates a Key ID + API Key string. Auth: two required HTTP
  headers, `API-Key` and `Key-ID`; JSON bodies need `Content-Type: application/json`.
  Permissions are assignable per key (user account binding, method-level scopes, or
  partner-app presets). [Getting Started](https://accounting-api.autocountcloud.com/documentation/),
  [API References](https://accounting-api.autocountcloud.com/documentation/category/api-references/)
- **AOTG API**: described as "designed and developed for online developers to integrate
  with AutoCount Accounting via RESTful API," providing web methods to create/update/
  delete/get data. [Introduction to AOTG API](https://wiki.autocountsoft.com/wiki/Introduction_to_AOTG_API)
  (403'd on direct fetch; from search snippet only). UNVERIFIED whether AOTG fronts
  on-premise AutoCount Accounting over HTTP or is a Cloud-only alias.
- **No confirmed official plain on-premise REST API** independent of AOTG (UNVERIFIED).

## 3. Non-API integration: Excel/CSV import

- AutoCount Accounting has built-in Excel import covering: Stock Item, Stock Item Price
  Book, Cash Book Entry, Journal Entry, AR/AP Invoice, AR/AP Debit Note, AR/AP Credit
  Note, AR/AP Payment, Debtor/Creditor, and Member.
  [Import From Excel](https://wiki.autocountsoft.com/wiki/Import_From_Excel) (search
  snippet only, page 403'd directly)
- Supported formats per AutoCount's own marketing copy: "Excel, CSV, TXT, and more,"
  plus XML and real-time API. Field mapping is configurable and reusable as templates.
  [AutoCount Import Data](https://autocountsystem.com/autocount-import-data/)
- **Integrator Plugin** (add-on) offers three modes: Direct Method (writes to a staging
  table), API Method, and File Drop Method (watched local/FTP folder, no coding).
  [AutoCount Integrator Plugin](https://autocountsystem.com/autocount-plugins/integrator-plugin/),
  [Universal Import Plugin](https://autocountsystem.com/knowledge-base/autocount-plugins/universal-import-plugin/)

## 4. Direct MS SQL Server writes

- Confirmed: on-premise AutoCount Accounting stores its account book in Microsoft SQL
  Server (setup docs reference manual SQL Server 2008 Express installs and per-account-
  book databases). [Account Book and Database](https://www.autocountsoft.com/products/ac_accounting/helpfile/account_book_and_database.htm),
  [Install manually MSSQL Server 2008 Express](https://www.autocountsoft.com/products/ac_accounting/helpfile/install_manually_mssql_server2.htm)
- UNVERIFIED: no explicit official AutoCount statement endorsing or prohibiting direct
  third-party writes to the underlying SQL Server DB was found. Inference only: the
  sanctioned .NET API, the Integrator Plugin's "Direct Method" (writes to a *staging*
  table, not core tables), and Excel import all suggest AutoCount expects data to enter
  through its own business-logic layer (numbering, GL posting, tax calc, e-invoice
  hooks). Treat raw DB writes as unsupported/risky by default; schema is undocumented
  publicly and could break silently across version upgrades.

## 5. LHDN MyInvois e-invoicing mandate (status mid-2026)

- Phased rollout by FY2022 annual turnover (per LHDN):
  >RM100M → 1 Aug 2024; RM25–100M → 1 Jan 2025; RM5–25M → 1 Jul 2025; up to RM5M (down to
  the RM1M exemption threshold) → 1 Jan 2026; **<RM1M currently exempt** (threshold raised
  from RM500k to RM1M effective 1 Jan 2026).
  [LHDN e-Invoice Implementation Timeline](https://www.hasil.gov.my/en/e-invoice/implementation-of-e-invoicing-in-malaysia/e-invoice-implementation-timeline/)
  (updated 7 Dec 2025)
- As of 2026-07-04: the RM1–5M band phase (1 Jan 2026) is live and past its 6-month
  relaxation window (relaxation periods give penalty immunity and allow consolidated
  e-invoices during the grace window per phase).
  [ClearTax phases summary](https://www.cleartax.com/my/en/different-phases-implementation-timelines-einvoicing-malaysia)
  UNVERIFIED: exact end-date of the RM1-5M band's relaxation period was not directly
  confirmed from hasil.gov.my in this pass (third-party sources state "6 months" but the
  precise calendar date wasn't pulled from an LHDN page).
- Next phase: RM1M-and-under-but-above-exemption / remaining taxpayers → 1 Jan 2027 per
  search snippet. UNVERIFIED against a direct LHDN citation (only surfaced via search
  summary, not fetched page text).
- **AutoCount support**: AutoCount Accounting/Cloud/POS generate Standard, Consolidated,
  and Self-Billed e-invoices, then submit through AutoCount's own "e-Invoice Platform
  (AIP)" intermediary to LHDN MyInvois, using Intermediary permissions + a Secret
  ID/Secret Key issued via MyTax. [AutoCount e-Invoice Solution](https://www.autocountsoft.com/autocount-einvoice-solution-malaysia.html),
  [How to submit e-Invoice](https://help.accounting.autocountcloud.com/support/solutions/articles/69000858873-how-to-submit-e-invoice-and-print-e-invoice-with-qr-code),
  [MyTax Portal Setup for AutoCount](https://myone.com.my/how-to-set-up-mytax-portal-for-e-invoice-integration-with-autocount/)
- **Does integrating via AutoCount give compliance "for free"?** Only if invoices are
  actually created *inside* AutoCount (Accounting/Cloud/POS) using its e-invoice
  workflow — compliance is built into AutoCount's own document generation + AIP
  submission path, not into "having data in AutoCount's database" generically. If this
  platform instead pushes invoices via the Cloud Accounting Integration API or Excel
  import, it still needs to confirm those created records flow through AutoCount's
  e-invoice module (customer mapped to Tax Entity, product mapped to Classification
  Code) — UNVERIFIED whether API-created or Excel-imported invoices are automatically
  picked up by the AIP submission flow with no extra step; sources only describe the
  UI-driven flow explicitly.

## 6. Data objects to sync (Malaysia specifics)

- **Sales invoice (A/R Invoice)** — core object; numbering via AutoCount's Document
  Numbering Format Maintenance, e.g. pattern `INV{@yyMM}-<0000>` → `INV2409-0001`.
  [Document Numbering Format](https://autocountsystem.com/knowledge-base/autocount-accounting-features/autocount-accounting-basic-feature/document-numbering-format/)
- **Debtor (Customer)** — importable via Excel; for e-invoice must be mapped to a Tax
  Entity/TIN. [AutoCount Import Data](https://autocountsystem.com/autocount-import-data/),
  [e-Invoice Solution](https://www.autocountsoft.com/autocount-einvoice-solution-malaysia.html)
- **Stock item** — importable via Excel; supports Basic/Advanced Multi-UOM modules for
  unit conversions (e.g., 1 carton = 12 bottles).
  [AutoCount Basic Multi-UOM](https://autocountsystem.com/knowledge-base/autocount-modules/autocount-basic-multi-uom-module/)
  For e-invoice, each item's UOM should be mapped to LHDN's official UOM code list (not
  strictly mandatory but recommended for compliance/accuracy).
  [Update UOM for E-Invoice](https://autocountsystem.com/knowledge-base/autocount-einvoice/e-invoice-set-up-in-autocount/e-invoice-how-to-update-unit-of-measurement-code/)
- **Payment/Receipt** — AR Payment is an Excel-importable document type alongside AR
  Invoice/Debit/Credit Note. [AutoCount Import Data](https://autocountsystem.com/autocount-import-data/)
- **Tax codes (SST)** — enabled under Tools > Options > Country and Tax; current codes
  include Sales Tax `S-10` (10%) and Service Tax `SV-6`/`SVI-6`/etc. (6%) plus newer 8%
  service-tax codes (`SV-8`, `SVI-8`, etc., effective 1 March 2024).
  [AutoCount Sales and Service Tax](https://autocountsystem.com/knowledge-base/autocount-accounting-features/autocount-accounting-basic-feature/sales-and-service-tax/)

## Summary of UNVERIFIED items

1. Exact licensing/cost of the on-premise "API (Optional Module)" for AutoCount
   Accounting 2.x (only third-party reseller listing found, not autocountsoft.com pricing).
2. Whether AOTG API fronts on-premise AutoCount Accounting over the network or is a
   Cloud-only alias/module (wiki page 403'd on direct fetch; only a search snippet).
3. Whether there is any officially sanctioned/supported way to write directly to the
   on-premise SQL Server database — no explicit official statement found either way.
4. Precise end-date of the RM1–5M turnover band's 6-month e-invoice relaxation period
   (stated as "6 months" by secondary sources, not pulled from a dated hasil.gov.my page).
5. Exact 2027 phase details (threshold/date) for the remaining taxpayer band — only seen
   via search snippet, not confirmed on a fetched hasil.gov.my page in this session.
6. Whether invoices created via the Cloud Accounting Integration API or via Excel import
   are automatically routed through AutoCount's e-invoice/AIP submission flow without
   additional manual steps.

# Letter to Future Sessions

From the one Fable 5 session (2026-07-04) that set up docs/agents/. You are probably
Sonnet, Opus, or Haiku. That's fine — this system was built assuming you are.

## Three things the user didn't ask me, but you should know

1. **AutoCount shapes the invoice work you're doing NOW.** The user's real goal is
   feeding sales invoices into AutoCount (and through it, Malaysian MyInvois e-invoicing).
   The branch `feat/finish-sales-invoices-settings` is upstream of that. Before you
   "finish" invoices, read [../autocount/integration-plan.md](../autocount/integration-plan.md)
   §"Implications for current work" — TIN fields, per-line tax treatment, immutable
   invoice numbers. Adding these while the files are already open is cheap; retrofitting
   after the schema settles is a migration and a data backfill.
2. **The economics of this setup are unverified.** The dispatch rules assume delegating
   to haiku/sonnet is cheaper than the main conversation doing everything. That held in
   this session (~27k tokens for a full repo audit vs. reading files into main context),
   but nobody has checked the billing dashboard. Also UNVERIFIED (未確認): whether
   requests auto-routed to Opus 4.8 consume the main window's quota. Ask the user to check the usage dashboard
   once, then record the answer in model-dispatch.md.
3. **AGENTS.md must stay a thin pointer.** It used to duplicate CLAUDE.md verbatim and
   drifted (said `backend/src/db.rs` long after it became `db/`). On 2026-07-05, with the
   user's approval, it was rewritten to point at CLAUDE.md plus four damage-preventing
   non-negotiables. If you're ever tempted to add content there: add it to CLAUDE.md or
   docs/agents/ instead, and keep AGENTS.md a pointer.

## How this system will most likely degrade, and the prevention

- **Staleness**: paths/models/tools in these files rot as the repo and harness change.
  Prevention is already a rule (maintenance.md "Staleness review": fix facts on sight,
  system reminder beats this file) — the failure mode is *not reading* these files.
  That's why CLAUDE.md's index table has trigger phrasing; keep it there.
- **Rule dilution**: each session appends "one more rule" until nobody reads any of it.
  Prevention: maintenance.md compaction triggers (200 lines / 15 lessons). Honor them.
- **Cargo-cult delegation**: filling task-templates with vague acceptance criteria
  ("make sure it works") turns the whole dispatch system into overhead with no benefit.
  If you can't write a checkable criterion, you don't understand the task —
  that line in model-dispatch.md Rule 2 is the load-bearing sentence of this system.

## Honest confidence report on what I produced

- **Lowest confidence — docs/autocount/research.md details**: web-researched by a
  subagent, 6 items explicitly UNVERIFIED (API licensing, AOTG scope, e-invoice
  auto-submission behavior). Also everything depends on the user's actual AutoCount
  edition, which is unknown (Phase 0 TBD-user-to-fill). Treat SST codes and column formats
  as placeholders until checked against the user's real installation.
- **Medium confidence — diagnosis.md top-3 ranking**: based on one session's observation
  plus stored memories, not on measurement across sessions. The three failure modes are
  real; whether they're the *top* three is a judgment call. Reorder if lessons.md says otherwise.
- **Medium confidence — the escalation ladder thresholds** (1 fail → sonnet,
  2 fails → opus, 2-round cap): reasonable defaults, not tuned. Adjust from experience,
  but change the numbers in model-dispatch.md rather than ignoring them silently.
- **High confidence — concurrent-editing rules, gate commands, repo paths**: verified
  against the live repo and user-confirmed memories this session.

## Unfinished / handed off

- Phase 0 discovery answers for AutoCount (all TBD-user-to-fill items in integration-plan.md).
- The usage-dashboard quota question (above).

## Addendum — 2026-07-07, a second Fable 5 session

Re-audited this whole system against the live harness after two days of use. It held
up; nothing was rebuilt. What changed:

- **model-dispatch.md Verified-facts block refreshed** (dated 2026-07-07): subagents
  now run in the background by default (`run_in_background: false` when you need the
  result before continuing); `SendMessage` continues a spawned agent in-context;
  effort is settable only via `.claude/agents/*.md` frontmatter (repo has none); and
  the harness's "don't spawn agents unless asked" default is explicitly overridden for
  this repo by the user's standing authorization — that precedence note exists so a
  weaker model doesn't deadlock between the harness and Rule 1.
- **Codex collaboration is file-based by design.** Codex reads AGENTS.md → CLAUDE.md →
  docs/agents/, and a coordination bullet was added to AGENTS.md (shared lessons.md,
  git as the channel). A Codex app window was open during this session, but no tool in
  this harness can see or drive another desktop app — if a future session is asked to
  "collab with Codex", the honest answer is: shared files and git, not live control.
- **Lowest confidence in this addendum**: the standing-authorization precedence note.
  It encodes what the user directed on 2026-07-07; if a future harness hardens that
  default or the user's intent changes, the harness/user wins — ask once, then update
  the note rather than silently ignoring it.
- Everything in "Unfinished / handed off" above remains open. The Opus 4.8 quota
  question is still: unconfirmed; test through the usage dashboard.

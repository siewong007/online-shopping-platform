# Model Dispatch Rules (指揮官守則)

For the main-conversation model of any session in this repo. Goal: spend expensive
context only on judgment; push volume work to cheap subagents.

## Verified facts (checked 2026-07-07 — re-verify against your session's system reminder)

- Agent tool `model` accepts: `haiku` | `sonnet` | `opus` | `fable`. Omitted = inherit
  the parent model. `fable` only resolves when a Fable session is active — do NOT depend on it.
- Model IDs (for direct API use only): claude-fable-5, claude-opus-4-8, claude-sonnet-5,
  claude-haiku-4-5-20251001.
- Subagents run IN THE BACKGROUND by default (changed since 2026-07-04): you are
  notified when one completes. Pass `run_in_background: false` when your next step
  depends on the result. Silence right after spawning is normal, not a failure.
- `SendMessage` continues an already-spawned agent with its context intact — use it for
  follow-ups or a retry on the SAME model instead of re-explaining in a cold spawn.
  Escalating to a DIFFERENT model still needs a new Agent call with the failure trail attached.
- The Agent tool has NO per-call `effort` parameter (re-verified against the live tool
  schema 2026-07-07). Per-agent model/effort defaults can only be set in
  `.claude/agents/<name>.md` frontmatter — this repo currently defines none. Effort
  levels inside skills (e.g. /code-review low|…|max) are unrelated. Never invent an
  effort field in an Agent call.
- Precedence, so you don't deadlock: the harness's default note says "do not spawn
  agents unless the user asks." The user's standing authorization for delegation in
  this repo lives in CLAUDE.md (see its "Read this first" bullet, added 2026-07-07) —
  and per the harness's own preamble, CLAUDE.md instructions override default behavior.
  Scope guard: this authorizes VOLUME work only (Rule 1's list); surgical edits stay in
  the main conversation. If your session's system reminder forbids spawning in stronger
  terms than quoted here, or the user objects even once, stop delegating and ask the
  user to re-confirm — then update this note and CLAUDE.md with the answer.
- Agent types available in this environment: Explore (read-only search), Plan
  (implementation planning), general-purpose (full tools), claude (catch-all),
  claude-code-guide (questions about Claude Code / Claude API), statusline-setup
  (status-line config only — ignore). The authoritative list is printed in each
  session's system reminder — trust that over this file.
- UNVERIFIED (未確認 — user to check on the usage dashboard): whether requests
  auto-routed to Opus 4.8 consume the current window's quota. Also unmeasured: the
  actual cost saving of delegation itself (see letter-to-future-sessions.md). Follow
  these rules until dashboard data says otherwise, then update this file.

## Rule 1 — The commander does not do grunt work

The main conversation spends tokens only on: decomposing tasks, making decisions,
integrating subagent results, and surgical edits (< ~30 lines across ≤ 2 files).
Everything else is delegated: repo-wide scans, bulk reading beyond the budget in
diagnosis.md §1 (max 3 Reads of >150-line files per task — that budget is the single
authoritative number), web research, batch mechanical edits, and verification.

## Rule 2 — Every delegation is a three-part task packet

1. **Goal + why** — one paragraph, including constraints and repo quirks
   (quoted path with trailing space; concurrent-edit warning; relevant CLAUDE.md rules).
2. **Acceptance criteria** — mechanically checkable ("cargo build passes",
   "every match reported as file:line", "file ≤ 150 lines").
3. **Report format** — structure + max lines.

If you cannot write the acceptance criteria, you do not understand the task yet —
decompose further before delegating. Templates: see [task-templates.md](task-templates.md).

## Rule 3 — Model selection table

| Task shape                                        | Agent type      | model  |
|---------------------------------------------------|-----------------|--------|
| Locate / inventory / grep-shaped questions        | Explore         | haiku  |
| Batch mechanical edits from an exact spec         | general-purpose | sonnet |
| Web research + summarize with citations           | general-purpose | sonnet |
| Implementation needing local judgment             | general-purpose | sonnet |
| Design, cross-cutting refactor, subtle bug hunt   | Plan / general-purpose | opus |
| Unsure                                            | general-purpose | sonnet |

## Rule 4 — Report contract

Subagents return conclusions + `file:line` references only. Long artifacts are written
to a file; the reply carries the path + a ≤ 10-line summary. A subagent reply longer
than ~60 lines means YOUR report-format spec was too loose — tighten it next time.

## Rule 5 — Escalation / de-escalation ladder

- haiku fails a subtask once → resend to sonnet WITH the failure attached.
- sonnet fails the SAME subtask twice → send to opus with the full failure trail
  (what was tried, exact errors, files touched) — never a fresh cold prompt.
- opus finds the pattern → de-escalate: sonnet/haiku applies it to remaining cases in batch.
- Hard cap: 2 retry rounds per approach across all models. A third failure means the
  approach is wrong → apply judgment-rubrics.md R4 (change route), don't retry harder.

## Rule 6 — Verification is never self-verification

- The agent that made a change never certifies it done.
- Files/docs: a fresh-context agent does read-back (exists? complete? matches spec?).
- Code: gates from CLAUDE.md "Verifying changes" run fresh, plus one behavior
  demonstration (test / curl / preview snapshot).
- High-risk judgment (auth, money math, schema design, data migration): second opinion —
  spawn a second agent with the same question independently; if answers disagree,
  escalate to opus for adjudication or to the user.

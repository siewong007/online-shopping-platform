# Maintenance Protocol for docs/agents/

## Who may edit what

Edit WITHOUT asking the user (any model):
- [lessons.md](lessons.md) — append entries in the format below.
- [../autocount/research.md](../autocount/research.md) — update facts, with source URLs.
- Pure fact corrections anywhere in docs/agents/ (a path moved, a version changed,
  a tool disappeared): fix in place the moment you verify the new fact, and log the
  correction in lessons.md.
- Memory files under the session memory directory, per the memory instructions.

Scope limit: the grants above apply ONLY to docs/agents/, docs/autocount/, and the
memory directory. For every other file in the repo, judgment-rubrics.md R3 governs —
this section grants no permissions there.

ASK the user FIRST:
- CLAUDE.md (any change).
- The RULES in [model-dispatch.md](model-dispatch.md) and [judgment-rubrics.md](judgment-rubrics.md)
  — you may append a clarifying example without asking; you may not weaken, delete,
  or add a rule without asking.
- Deleting or renaming any file in docs/agents/.
- Migrations, dependency manifests (Cargo.toml deps, package.json deps) — see rubric R3.

## Lessons format (lessons.md, newest entry at top)

```
## YYYY-MM-DD — {one-line symptom}
- Wrong path taken: {what was tried that wasted time}
- Rule that would have prevented it: {one sentence, imperative}
- Written back to: {which file got updated, or "lessons only"}
```

One entry per incident. No essays. If the same lesson appears twice, that is the signal
to promote it into a rubric example (ask first, per above).

## Compaction

- Trigger: any file in docs/agents/ exceeds 200 lines, or lessons.md exceeds 15 entries.
- Action: merge duplicate lessons into rubric examples, delete superseded entries,
  tighten prose. For ask-first files, propose the diff to the user before applying.

## Staleness review

- Any session that reads these files and finds a stale fact fixes it immediately
  (allowed without asking for pure facts) — do not leave "TODO: outdated".
- The "Verified facts" block in model-dispatch.md is dated. If your session's system
  reminder disagrees with it (different agent types, different model list), the system
  reminder wins — update the block and the date.

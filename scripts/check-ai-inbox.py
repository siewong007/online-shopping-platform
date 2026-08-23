#!/usr/bin/env python3
"""Validate AI inbox CSVs. Does not publish images or enable buying."""

from __future__ import annotations

import csv
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INBOX = ROOT / "catalogue" / "ai-inbox"
REPORT = INBOX / "LAST-CHECK.md"

DEEPSEEK_COLS = [
    "item_code",
    "uom",
    "display_name",
    "category",
    "official_product_page",
    "official_image_url",
    "match_confidence",
    "finish_exact",
    "model_exact",
    "uom_assessment",
    "rights_status",
    "decision",
    "reason",
    "human_action",
]
GEMINI_COLS_EXISTING = [
    "item_code",
    "uom",
    "source_file",
    "prior_status",
    "gemini_decision",
    "agree",
    "finish_exact",
    "model_exact",
    "rights_status",
    "reason",
    "human_action",
]
GEMINI_COLS_DEEPSEEK = [
    "item_code",
    "uom",
    "deepseek_decision",
    "gemini_decision",
    "agree",
    "finish_exact",
    "model_exact",
    "rights_status",
    "reason",
    "human_action",
]
MANUS_P300_COLS = DEEPSEEK_COLS
FORBIDDEN_RIGHTS = {"manufacturer-approved", "supplier-approved", "approved"}
CONFIDENCE = {"A", "B", "C", "R"}
MANUS_IMAGES = INBOX / "manus-images"
MANUS_INVESTIGATE_COLS = [
    "source_position",
    "item_code",
    "uom",
    "display_name",
    "brand_guess",
    "model_guess",
    "search_queries",
    "pages_opened",
    "official_page_url",
    "image_url",
    "model_exact",
    "finish_exact",
    "first_pass_status",
    "why_pending",
    "rights_status",
    "reason",
]
OPENCODE_VERIFY_COLS = [
    "source_position",
    "item_code",
    "uom",
    "display_name",
    "prior_status",
    "opencode_decision",
    "finish_exact",
    "model_exact",
    "url_live",
    "source_ok",
    "official_product_page",
    "official_image_url",
    "local_asset_path",
    "rights_status",
    "reason",
    "human_action",
]
WHY_PENDING = {
    "found_page_no_exact_image",
    "colour_unproven",
    "sibling_model",
    "dead_url",
    "searched_not_found",
    "no_model_token",
    "generic_unbranded",
}
EXACT_FLAGS = {"yes", "no", "unresolved"}
YES_NO = {"yes", "no"}
OPENCODE_RECOVER_COLS = MANUS_P300_COLS


def latest_csv(folder: Path) -> Path | None:
    files = sorted(folder.glob("*.csv"), key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0] if files else None


def check_priority300_schema(path: Path, label: str) -> list[str]:
    errors: list[str] = []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != MANUS_P300_COLS:
            errors.append(f"{label} header mismatch in {path.name}")
            return errors
        for i, row in enumerate(reader, start=2):
            if row.get("match_confidence") not in CONFIDENCE:
                errors.append(f"{path.name}:{i} bad match_confidence")
            if (row.get("rights_status") or "").lower() in FORBIDDEN_RIGHTS:
                errors.append(f"{path.name}:{i} invented approval")
            if row.get("decision") not in {"candidate", "pending", "reject"}:
                errors.append(f"{path.name}:{i} bad decision")
    return errors


def check_deepseek(path: Path) -> list[str]:
    return check_priority300_schema(path, "DeepSeek")


def latest_manus_priority300() -> Path | None:
    combined = MANUS_IMAGES / "priority-300-pass1.csv"
    if combined.exists():
        return combined
    shards = sorted(MANUS_IMAGES.glob("priority-300-shard-*.csv"), key=lambda p: p.stat().st_mtime, reverse=True)
    return shards[0] if shards else None


def check_gemini(path: Path) -> list[str]:
    errors: list[str] = []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames not in (GEMINI_COLS_EXISTING, GEMINI_COLS_DEEPSEEK):
            errors.append(f"Gemini header mismatch in {path.name}")
            return errors
        for i, row in enumerate(reader, start=2):
            if row.get("agree") not in {"yes", "no"}:
                errors.append(f"{path.name}:{i} agree must be yes/no")
            if (row.get("rights_status") or "").lower() in FORBIDDEN_RIGHTS:
                errors.append(f"{path.name}:{i} invented approval")
            if row.get("agree") == "no" and not (row.get("reason") or "").strip():
                errors.append(f"{path.name}:{i} disagreement needs reason")
    return errors


def check_manus_investigate(path: Path) -> list[str]:
    errors: list[str] = []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != MANUS_INVESTIGATE_COLS:
            errors.append(f"Manus investigate header mismatch in {path.name}")
            return errors
        for i, row in enumerate(reader, start=2):
            if (row.get("rights_status") or "").lower() in FORBIDDEN_RIGHTS:
                errors.append(f"{path.name}:{i} invented approval")
            if row.get("first_pass_status") not in {"VERIFIED_CANDIDATE", "PENDING", "REJECT"}:
                errors.append(f"{path.name}:{i} bad first_pass_status")
            if row.get("model_exact") not in EXACT_FLAGS:
                errors.append(f"{path.name}:{i} bad model_exact")
            if row.get("finish_exact") not in EXACT_FLAGS:
                errors.append(f"{path.name}:{i} bad finish_exact")
            status = row.get("first_pass_status")
            if status == "PENDING":
                why = (row.get("why_pending") or "").strip()
                queries = (row.get("search_queries") or "").strip()
                if why not in WHY_PENDING:
                    errors.append(f"{path.name}:{i} bad why_pending")
                if not queries:
                    errors.append(f"{path.name}:{i} PENDING needs search_queries")
            if status == "VERIFIED_CANDIDATE":
                if row.get("model_exact") != "yes" or row.get("finish_exact") != "yes":
                    errors.append(f"{path.name}:{i} candidate needs model_exact=yes and finish_exact=yes")
                if not (row.get("image_url") or "").strip():
                    errors.append(f"{path.name}:{i} candidate needs image_url")
    return errors


def check_opencode_verify(path: Path) -> list[str]:
    errors: list[str] = []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != OPENCODE_VERIFY_COLS:
            errors.append(f"OpenCode verify header mismatch in {path.name}")
            return errors
        for i, row in enumerate(reader, start=2):
            if row.get("opencode_decision") not in {"pass", "fail"}:
                errors.append(f"{path.name}:{i} opencode_decision must be pass/fail")
            if row.get("url_live") not in YES_NO:
                errors.append(f"{path.name}:{i} url_live must be yes/no")
            if row.get("source_ok") not in YES_NO:
                errors.append(f"{path.name}:{i} source_ok must be yes/no")
            if row.get("finish_exact") not in EXACT_FLAGS:
                errors.append(f"{path.name}:{i} bad finish_exact")
            if row.get("model_exact") not in EXACT_FLAGS:
                errors.append(f"{path.name}:{i} bad model_exact")
            if (row.get("rights_status") or "").lower() in FORBIDDEN_RIGHTS:
                errors.append(f"{path.name}:{i} invented approval")
            if row.get("opencode_decision") == "pass":
                if row.get("model_exact") != "yes" or row.get("finish_exact") != "yes":
                    errors.append(f"{path.name}:{i} pass needs model_exact=yes and finish_exact=yes")
                if not (row.get("official_image_url") or "").strip():
                    errors.append(f"{path.name}:{i} pass needs official_image_url")
            if row.get("opencode_decision") == "fail" and not (row.get("reason") or "").strip():
                errors.append(f"{path.name}:{i} fail needs reason")
    return errors


def check_opencode_recover(path: Path) -> list[str]:
    return check_priority300_schema(path, "OpenCode recover")


def latest_manus_investigate() -> Path | None:
    combined_dir = MANUS_IMAGES / "retry-pass2"
    if not combined_dir.exists():
        return None
    shards = sorted(
        (
            p
            for p in combined_dir.glob("shard-*.csv")
            if "-assets" not in p.name and "-validation" not in p.name
        ),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return shards[0] if shards else None


def latest_opencode_verify() -> Path | None:
    path = INBOX / "opencode-verify" / "pass-queue-unreviewed-2501-plus-verified.csv"
    return path if path.exists() else None


def latest_opencode_recover() -> Path | None:
    folder = INBOX / "opencode-recover"
    combined = folder / "recover-pass1.csv"
    if combined.exists():
        return combined
    shards = sorted(folder.glob("recover-shard-*.csv"), key=lambda p: p.stat().st_mtime, reverse=True)
    return shards[0] if shards else None


def main() -> int:
    INBOX.mkdir(parents=True, exist_ok=True)
    lines = [
        f"# AI inbox check — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        "Pickup cart is on. Card pay stays off. Do not import images yet.",
        "",
    ]
    guide: list[str] = []
    failed = 0

    lines.append("- DeepSeek: **retired**. Do not paste `deepseek-image-verify.md`.")
    lines.append("- Closed sitting: Manus priority-300 + Gemini 1–2500 / p300 reverify. Do not re-paste those prompts.")
    lines.append("- New sitting: OpenCode full remaining catalogue (Manus retired). Gemini last, after OpenCode COMPLETE.")

    mp = latest_manus_priority300()
    if mp is None:
        lines.append("- Manus priority-300: **missing closed file**. Do not start a new p300 pass.")
    else:
        errors = check_priority300_schema(mp, "Manus priority-300")
        if errors:
            failed += 1
            lines.append(f"- Manus priority-300 `{mp.name}`: **fail** ({len(errors)})")
            lines.extend(f"  - {e}" for e in errors[:20])
        else:
            lines.append(f"- Manus priority-300 `{mp.name}`: **pass schema** (closed sitting).")

    mi = latest_manus_investigate()
    if mi is None:
        lines.append(
            "- Manus investigate 2559+: **no shard yet**. Paste `docs/ai-prompts/manus-investigate-remaining.md`."
        )
        guide.append(
            "Manus: no retry-pass2 shard yet. Paste docs/ai-prompts/manus-investigate-remaining.md. "
            "Write catalogue/ai-inbox/manus-images/retry-pass2/shard-2559-2608.csv first."
        )
    else:
        errors = check_manus_investigate(mi)
        if errors:
            failed += 1
            lines.append(f"- Manus investigate `{mi.name}`: **fail** ({len(errors)})")
            lines.extend(f"  - {e}" for e in errors[:20])
            guide.append(
                "Manus: last investigate shard failed: "
                + "; ".join(errors[:8])
                + ". PENDING needs search_queries; VERIFIED_CANDIDATE needs image_url + model/finish yes."
            )
        else:
            lines.append(
                f"- Manus investigate `{mi.name}`: **pass schema**. Manus retired — do not paste another Manus shard."
            )

    ov = latest_opencode_verify()
    if ov is None:
        lines.append(
            "- OpenCode verify 2501+: **no file yet**. Paste `docs/ai-prompts/opencode-verify-and-recover.md` Job 1."
        )
        guide.append(
            "OpenCode: Job 1 first. Write catalogue/ai-inbox/opencode-verify/pass-queue-unreviewed-2501-plus-verified.csv. "
            "Gemini must not start until opencode_decision=pass rows exist."
        )
    else:
        errors = check_opencode_verify(ov)
        if errors:
            failed += 1
            lines.append(f"- OpenCode verify `{ov.name}`: **fail** ({len(errors)})")
            lines.extend(f"  - {e}" for e in errors[:20])
            guide.append(
                "OpenCode verify failed: "
                + "; ".join(errors[:8])
                + ". pass requires live official image + model_exact=yes + finish_exact=yes."
            )
        else:
            lines.append(
                f"- OpenCode verify `{ov.name}`: **pass schema**. 20 pass rows are in Gemini `pass-queue-waiting.csv`."
            )

    oc = latest_opencode_recover()
    if oc is None:
        lines.append(
            "- OpenCode recover: **no shard yet**. After Job 1, deep-research `opencode-recover/fail-queue.csv`."
        )
    else:
        errors = check_opencode_recover(oc)
        if errors:
            failed += 1
            lines.append(f"- OpenCode recover `{oc.name}`: **fail** ({len(errors)})")
            lines.extend(f"  - {e}" for e in errors[:20])
            guide.append(
                "OpenCode recover failed: "
                + "; ".join(errors[:8])
                + ". Same header as priority-300. candidate only if model and finish are yes."
            )
        else:
            lines.append(
                f"- OpenCode recover `{oc.name}`: **pass schema**. 121 candidates are in Gemini `pass-queue-waiting.csv`."
            )
            guide.append(
                "OpenCode: Job 1–2 closed. Re-paste docs/ai-prompts/opencode-full-catalogue.md (max quality+speed, ignore tokens). "
                "Do not overwrite recover-pass1.csv. Gemini waits for FULL CATALOGUE COMPLETE."
            )

    gemini_dir = INBOX / "gemini-image-reverify"
    gemini_closed = {"existing-1-2500-pass2.csv", "manus-priority-300-pass2.csv"}
    gemini_files = sorted(
        p for p in gemini_dir.glob("*.csv") if p.name in gemini_closed or p.name == "pass-images-only.csv"
    )
    if not gemini_files:
        lines.append("- Gemini: **no CSV yet**. Closed 1–2500/p300 files are missing.")
    else:
        for gm in gemini_files:
            errors = check_gemini(gm)
            if errors:
                failed += 1
                lines.append(f"- Gemini `{gm.name}`: **fail** ({len(errors)})")
                lines.extend(f"  - {e}" for e in errors[:20])
                guide.append(
                    "Gemini: CSV failed: "
                    + "; ".join(errors[:8])
                    + ". Re-open the official image. Colour/finish mismatches must be agree=no with a reason."
                )
            elif gm.name in gemini_closed:
                lines.append(f"- Gemini `{gm.name}`: **pass schema** (closed sitting).")
            else:
                lines.append(
                    f"- Gemini `{gm.name}`: **pass schema**. Grok queues only agree=yes candidates. "
                    "Gemini must not review pending rows."
                )
        if not (gemini_dir / "pass-images-only.csv").exists():
            lines.append(
                "- Gemini last verify: **waiting**. Do not paste until OpenCode says FULL CATALOGUE COMPLETE."
            )

    claude = sorted((INBOX / "claude-review").glob("*.md"))
    if claude:
        lines.append(f"- Claude review: found `{claude[-1].name}` (read manually).")
    else:
        lines.append("- Claude review: **no file yet**.")

    lines += ["", "## Guide-back snippets", ""]
    if not guide:
        lines.append("No automatic guide-back. Read disagreements.md if Gemini wrote one.")
    else:
        for item in guide:
            lines.append(f"- {item}")

    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(REPORT)
    print(f"failed={failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

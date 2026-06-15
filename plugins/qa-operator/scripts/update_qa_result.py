#!/usr/bin/env python3
"""Update a qa-operator run result incrementally."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from qa_operator_runtime import (
    CYCLE_KEYS,
    STATUSES,
    append_line,
    append_unique,
    claim_item,
    ensure_can_write,
    get_item,
    normalize_evidence_path,
    now_iso,
    parse_key_value,
    release_claim,
    resolve_run_context,
    RunStore,
)


REPAIR_STATUSES = [
    "not-started",
    "proposed",
    "in-progress",
    "fixed",
    "retested",
    "needs-product-decision",
    "blocked",
]

EVIDENCE_ARGS = [
    ("browser", "browser"),
    ("commands", "command"),
    ("code", "code"),
    ("screenshots", "screenshot"),
    ("traces", "trace"),
    ("logs", "log"),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Incrementally update qa-results.json.")
    parser.add_argument("audit_root", help="Path to artifacts/qa-operator/<slug>")
    parser.add_argument("--run-id", help="Run id. Defaults to manifest.latestRun")
    parser.add_argument("--item", required=True, help="QA item id")
    parser.add_argument("--status", choices=STATUSES)
    parser.add_argument("--phase", help="Current item phase, e.g. run, triage, repair, retest")
    parser.add_argument("--owner", help="Agent/lane owner for locked item updates")
    parser.add_argument("--claim", help="Claim this item for an agent/lane owner")
    parser.add_argument("--claim-phase", help="Phase to store with --claim")
    parser.add_argument("--claim-ttl-minutes", type=int, default=30)
    parser.add_argument("--release-claim", action="store_true")
    parser.add_argument("--force-release", action="store_true")
    parser.add_argument("--repair-status", choices=REPAIR_STATUSES)
    parser.add_argument("--data-isolation", action="append", default=[], help="Set data isolation key=value")
    parser.add_argument("--confidence", type=float)
    parser.add_argument("--cycle", action="append", default=[], help="Cycle update, e.g. server=PASS")
    parser.add_argument("--browser", action="append", default=[], help="Browser evidence note")
    parser.add_argument("--command", action="append", default=[], help="Command evidence")
    parser.add_argument("--code", action="append", default=[], help="Code evidence file:line")
    parser.add_argument("--screenshot", action="append", default=[], help="Screenshot path relative to audit root or run root")
    parser.add_argument("--trace", action="append", default=[], help="Trace path")
    parser.add_argument("--log", action="append", default=[], help="Log path")
    parser.add_argument("--issue", action="append", default=[], help="Issue summary")
    parser.add_argument("--ux-risk", action="append", default=[], help="UX risk JSON or plain summary")
    parser.add_argument("--note", action="append", default=[], help="Append item note")
    parser.add_argument("--console-error", action="append", default=[], help="Append to browser-console.log")
    parser.add_argument("--network-error", action="append", default=[], help="Append to network-errors.log")
    return parser.parse_args()


def apply_claim_action(item: dict[str, Any], args: argparse.Namespace) -> None:
    owner = args.claim or args.owner
    if args.claim:
        claim_item(item, args.claim, args.claim_phase or args.phase, args.claim_ttl_minutes)
    elif args.release_claim:
        release_claim(item, args.owner, args.force_release)
    else:
        ensure_can_write(item, owner)

    if owner and not args.release_claim:
        item["owner"] = owner


def apply_basic_fields(item: dict[str, Any], args: argparse.Namespace) -> None:
    if args.status:
        item["status"] = args.status
    if args.phase:
        item["phase"] = args.phase
    if args.repair_status:
        item["repairStatus"] = args.repair_status
    if args.confidence is not None:
        item["confidence"] = max(0, min(1, args.confidence))


def apply_data_isolation(item: dict[str, Any], updates: list[str]) -> None:
    data_isolation = item.setdefault("dataIsolation", {})
    for raw in updates:
        key, value = parse_key_value(raw)
        data_isolation[key] = value


def apply_cycle_updates(item: dict[str, Any], updates: list[str]) -> None:
    cycle = item.setdefault("cycle", {})
    for raw in updates:
        key, value = parse_key_value(raw)
        if key not in CYCLE_KEYS:
            raise SystemExit(f"unknown cycle key {key!r}; expected one of {', '.join(CYCLE_KEYS)}")
        if value not in STATUSES:
            raise SystemExit(f"unknown status {value!r}; expected one of {', '.join(STATUSES)}")
        cycle[key] = value


def apply_evidence(item: dict[str, Any], args: argparse.Namespace, audit_root: Path, run_id: str) -> None:
    evidence = item.setdefault("evidence", {})
    for field, arg_name in EVIDENCE_ARGS:
        bucket = evidence.setdefault(field, [])
        for value in getattr(args, arg_name):
            if field in {"screenshots", "traces", "logs"}:
                value = normalize_evidence_path(value, audit_root, run_id)
            append_unique(bucket, value)


def append_findings(item: dict[str, Any], args: argparse.Namespace) -> None:
    for issue in args.issue:
        item.setdefault("issues", []).append({"summary": issue, "createdAt": now_iso()})

    for raw in args.ux_risk:
        try:
            risk = json.loads(raw)
            if not isinstance(risk, dict):
                risk = {"summary": raw}
        except json.JSONDecodeError:
            risk = {"summary": raw}
        risk.setdefault("createdAt", now_iso())
        item.setdefault("uxRisks", []).append(risk)


def append_note(item: dict[str, Any], notes: list[str]) -> None:
    if not notes:
        return
    existing = item.get("notes", "")
    addition = "\n".join(notes)
    item["notes"] = (existing + "\n" + addition).strip() if existing else addition


def append_logs(run_dir: Path, args: argparse.Namespace) -> None:
    for line in args.command:
        append_line(run_dir / "commands.log", line)
    for line in args.console_error:
        append_line(run_dir / "browser-console.log", line)
    for line in args.network_error:
        append_line(run_dir / "network-errors.log", line)


def update_item(item: dict[str, Any], args: argparse.Namespace, audit_root: Path, run_id: str) -> None:
    apply_claim_action(item, args)
    apply_basic_fields(item, args)
    apply_data_isolation(item, args.data_isolation)
    apply_cycle_updates(item, args.cycle)
    apply_evidence(item, args, audit_root, run_id)
    append_findings(item, args)
    append_note(item, args.note)
    item["updatedAt"] = now_iso()


def response_for(results_path: Path, args: argparse.Namespace, item: dict[str, Any]) -> dict[str, Any]:
    return {
        "updated": str(results_path),
        "item": args.item,
        "status": item.get("status"),
        "phase": item.get("phase"),
        "owner": item.get("owner"),
        "lock": item.get("lock"),
    }


def main() -> None:
    args = parse_args()
    store = RunStore(resolve_run_context(Path(args.audit_root), args.run_id))
    context = store.context

    def mutate(results: dict[str, Any]) -> dict[str, Any]:
        item = get_item(results, str(args.item))
        update_item(item, args, context.audit_root, context.run_id)
        append_logs(context.run_dir, args)
        return response_for(context.results_path, args, item)

    print(json.dumps(store.update_results(mutate), ensure_ascii=False))


if __name__ == "__main__":
    main()

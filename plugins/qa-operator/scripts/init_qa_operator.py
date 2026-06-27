#!/usr/bin/env python3
"""Initialize a qa-operator audit folder."""

from __future__ import annotations

import argparse
import copy
import json
import shutil
from pathlib import Path
from typing import Any

from qa_operator_runtime import (
    CYCLE_KEYS,
    DEFAULT_DATA_ISOLATION,
    default_run_id,
    make_results,
    now_iso,
    read_json,
    write_json,
    write_summary,
)


def normalize_items(raw_items: Any) -> list[dict[str, Any]]:
    if isinstance(raw_items, dict):
        raw_items = raw_items.get("items", [])
    if not isinstance(raw_items, list):
        raise SystemExit("items JSON must be a list or an object with an items array")

    items: list[dict[str, Any]] = []
    for index, raw in enumerate(raw_items, start=1):
        item = normalize_item(raw, index)
        items.append(item)
    return items


def normalize_item(raw: Any, index: int) -> dict[str, Any]:
    if isinstance(raw, str):
        item = {"id": str(index), "title": raw, "requirement": raw}
    elif isinstance(raw, dict):
        item = dict(raw)
    else:
        raise SystemExit(f"unsupported item at index {index}: {raw!r}")

    item_id = item.get("id") or item.get("item") or item.get("no") or item.get("number") or index
    title = item.get("title") or item.get("summary") or item.get("requirement") or f"QA item {item_id}"
    item["id"] = str(item_id)
    item["title"] = str(title)
    item.setdefault("requirement", str(title))
    item.setdefault("area", "")
    item["actors"] = normalize_string_list(item.get("actors", []))
    item.setdefault("viewports", [])
    item["acceptance"] = normalize_string_list(item.get("acceptance", []))
    item.setdefault("dataIsolation", copy.deepcopy(DEFAULT_DATA_ISOLATION))
    item.setdefault("screenshotPoints", ["server", "login", "feature", "validation", "ux"])
    item.setdefault("uxHeuristics", ["discoverability", "state feedback", "responsive layout", "data safety", "error recovery"])
    item["testCases"], item["caseController"] = plan_test_cases(item)
    return item


def normalize_string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    text = str(value).strip()
    return [text] if text else []


def plan_test_cases(item: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    explicit_cases = item.get("testCases") or item.get("test_cases") or item.get("cases") or item.get("scenarios")
    if explicit_cases:
        cases = normalize_test_cases(explicit_cases, item["id"], source="explicit")
        return cases, {
            "strategy": "explicit",
            "reason": "item supplied explicit testCases/cases/scenarios",
            "caseCount": len(cases),
        }

    requested_strategy = normalize_requested_case_strategy(item)
    if requested_strategy == "single":
        cases = [make_single_test_case(item)]
        return cases, {
            "strategy": "single",
            "reason": "item requested a single case",
            "caseCount": len(cases),
        }

    acceptance = item.get("acceptance", [])
    if len(acceptance) > 1:
        cases = [
            normalize_test_case(
                {
                    "id": f"{item['id']}-C{index:02d}",
                    "title": criterion,
                    "expected": criterion,
                    "acceptanceIndex": index - 1,
                },
                item["id"],
                index,
                source="acceptance",
            )
            for index, criterion in enumerate(acceptance, start=1)
        ]
        return cases, {
            "strategy": "split-by-acceptance",
            "reason": "multiple acceptance criteria should be validated separately",
            "caseCount": len(cases),
        }

    cases = [make_single_test_case(item)]
    return cases, {
        "strategy": "single",
        "reason": "single or unspecified acceptance criterion",
        "caseCount": len(cases),
    }


def normalize_requested_case_strategy(item: dict[str, Any]) -> str:
    controller = item.get("caseController") if isinstance(item.get("caseController"), dict) else {}
    raw = item.get("caseStrategy") or item.get("caseMode") or controller.get("strategy") or controller.get("mode") or ""
    value = str(raw).strip().lower()
    if value in {"single", "one", "one-case"}:
        return "single"
    return value


def normalize_test_cases(raw_cases: Any, item_id: str, source: str) -> list[dict[str, Any]]:
    if isinstance(raw_cases, dict):
        raw_cases = raw_cases.get("items") or raw_cases.get("cases") or raw_cases.get("testCases") or []
    if not isinstance(raw_cases, list):
        raw_cases = [raw_cases]
    return [
        normalize_test_case(raw_case, item_id, index, source=source)
        for index, raw_case in enumerate(raw_cases, start=1)
    ]


def normalize_test_case(raw_case: Any, item_id: str, index: int, source: str) -> dict[str, Any]:
    if isinstance(raw_case, str):
        case = {"title": raw_case, "expected": raw_case}
    elif isinstance(raw_case, dict):
        case = dict(raw_case)
    else:
        case = {"title": str(raw_case), "expected": str(raw_case)}

    case_id = case.get("id") or case.get("caseId") or f"{item_id}-C{index:02d}"
    title = case.get("title") or case.get("summary") or case.get("expected") or f"Test case {index}"
    expected = case.get("expected") or case.get("expectedBehavior") or title
    case["id"] = str(case_id)
    case["title"] = str(title)
    case["expected"] = str(expected)
    case.setdefault("source", source)
    return case


def make_single_test_case(item: dict[str, Any]) -> dict[str, Any]:
    acceptance = item.get("acceptance", [])
    expected = item.get("expected") or item.get("expectedBehavior") or (acceptance[0] if acceptance else item.get("requirement") or item["title"])
    return normalize_test_case(
        {
            "id": f"{item['id']}-C01",
            "title": item["title"],
            "expected": expected,
        },
        item["id"],
        1,
        source="single",
    )


def load_items(path: str | None) -> list[dict[str, Any]]:
    if not path:
        return []
    return normalize_items(read_json(Path(path)))


def make_plan(args: argparse.Namespace, items: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "slug": args.slug,
        "title": args.title or args.slug,
        "source": args.source or "",
        "range": args.range or "",
        "target": args.target or "current repo",
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
        "defaults": {
            "repairMode": args.repair_mode,
            "monitor": True,
            "uxRiskScan": True,
            "screenshots": "required",
            "environment": args.environment,
            "cycle": CYCLE_KEYS,
            "parallel": {
                "enabled": True,
                "claimTtlMinutes": 30,
                "monitorReadOnly": True,
                "repairRequiresTriage": True,
                "targetedRetestRequired": True,
                "dataCollisionPolicy": "separate fixtures/accounts per parallel lane",
            },
        },
        "items": items,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Initialize a qa-operator audit folder.")
    parser.add_argument("--slug", required=True, help="Audit slug, e.g. profilepro-a31-a43")
    parser.add_argument("--output", default="artifacts/qa-operator", help="Output parent directory")
    parser.add_argument("--items", help="JSON file containing requirement items")
    parser.add_argument("--source", help="Requirement source URL or path")
    parser.add_argument("--range", help="Requirement range, e.g. 번호 31-43")
    parser.add_argument("--target", help="Target project or URL")
    parser.add_argument("--title", help="Human-readable audit title")
    parser.add_argument("--run-id", default=default_run_id())
    parser.add_argument("--environment", default="local")
    parser.add_argument("--repair-mode", default="propose-only", choices=["off", "propose-only", "auto-local"])
    parser.add_argument("--force-run", action="store_true", help="Overwrite an existing run folder's qa-results.json")
    parser.add_argument("--force-plan", action="store_true", help="Overwrite existing qa-plan.json")
    parser.add_argument("--force-index", action="store_true", help="Overwrite existing index.html")
    return parser.parse_args()


def prepare_run_dir(run_dir: Path, reset: bool = False) -> None:
    if reset and run_dir.exists():
        shutil.rmtree(run_dir)
    run_dir.mkdir(parents=True, exist_ok=True)
    for subdir in ["screenshots", "traces", "issues"]:
        (run_dir / subdir).mkdir(parents=True, exist_ok=True)
    for log_name in ["commands.log", "browser-console.log", "network-errors.log", "repair-log.md"]:
        (run_dir / log_name).touch(exist_ok=True)


def write_manifest(qa_root: Path, args: argparse.Namespace, plan: dict[str, Any]) -> None:
    manifest = {
        "schemaVersion": 1,
        "plugin": "qa-operator",
        "slug": args.slug,
        "title": plan.get("title", args.slug),
        "source": plan.get("source", ""),
        "range": plan.get("range", ""),
        "createdAt": plan.get("createdAt", now_iso()),
        "updatedAt": now_iso(),
        "latestRun": args.run_id,
        "planPath": "qa-plan.json",
        "resultsPath": f"runs/{args.run_id}/qa-results.json",
    }
    write_json(qa_root / "manifest.json", manifest)


def update_latest_symlink(runs_dir: Path, run_id: str) -> None:
    latest = runs_dir / "latest"
    target = Path(run_id)
    try:
        if latest.is_symlink() or latest.exists():
            if latest.is_dir() and not latest.is_symlink():
                return
            latest.unlink()
        latest.symlink_to(target, target_is_directory=True)
    except OSError:
        return


def main() -> None:
    args = parse_args()
    plugin_root = Path(__file__).resolve().parents[1]
    template_path = plugin_root / "assets" / "dashboard-template.html"
    qa_root = Path(args.output) / args.slug
    runs_dir = qa_root / "runs"
    run_dir = runs_dir / args.run_id
    results_path = run_dir / "qa-results.json"

    qa_root.mkdir(parents=True, exist_ok=True)
    if results_path.exists() and not args.force_run:
        raise SystemExit(f"run {args.run_id!r} already exists under {qa_root}; pass --force-run to overwrite it")
    prepare_run_dir(run_dir, reset=args.force_run)

    plan_path = qa_root / "qa-plan.json"
    plan = make_plan(args, load_items(args.items))
    if args.force_plan or not plan_path.exists():
        write_json(plan_path, plan)
    else:
        plan = read_json(plan_path)

    results = make_results(plan, args.run_id)
    write_json(results_path, results)
    write_summary(run_dir / "qa-summary.md", plan, results)
    write_manifest(qa_root, args, plan)
    update_latest_symlink(runs_dir, args.run_id)

    index_path = qa_root / "index.html"
    if args.force_index or not index_path.exists():
        shutil.copyfile(template_path, index_path)

    print(json.dumps({"auditRoot": str(qa_root), "runId": args.run_id, "dashboard": str(index_path)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

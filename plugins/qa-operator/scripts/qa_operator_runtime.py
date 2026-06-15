"""Shared runtime helpers for qa-operator scripts."""

from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
import copy
import datetime as dt
import json
import os
from pathlib import Path
import tempfile
import time
from typing import Any, Callable, Iterator, TypeVar
from urllib.parse import urlparse

try:
    import fcntl
except ImportError:  # pragma: no cover - Windows fallback.
    fcntl = None  # type: ignore[assignment]


STATUSES = ["PENDING", "PASS", "PARTIAL", "FAIL", "BLOCKED", "N/A"]
CYCLE_KEYS = ["server", "login", "feature", "validation", "ux"]
RUN_ROOT_PATH_PREFIXES = ("screenshots/", "traces/", "issues/")
CLAIM_PHASES = {"claimed", "run", "triage", "repair", "retest"}
DEFAULT_DATA_ISOLATION = {
    "strategy": "dedicated-fixture-or-account-per-parallel-lane",
    "notes": "Do not let parallel run agents mutate the same account, student, DB row, or external resource.",
}
LOCK_WAIT_SECONDS = 60.0
STALE_DIRECTORY_LOCK_SECONDS = 3600.0

T = TypeVar("T")


@dataclass(frozen=True)
class RunContext:
    audit_root: Path
    run_id: str
    run_dir: Path
    results_path: Path
    summary_path: Path
    plan_path: Path
    lock_path: Path


@dataclass(frozen=True)
class RunStore:
    """Repository-style access to a single qa-operator run."""

    context: RunContext

    @classmethod
    def open(cls, audit_root: Path, run_id: str | None = None) -> "RunStore":
        return cls(resolve_run_context(audit_root, run_id))

    def update_results(self, mutator: Callable[[dict[str, Any]], T]) -> T:
        with exclusive_lock(self.context.lock_path):
            results = read_json(self.context.results_path)
            outcome = mutator(results)
            self.persist_results(results)
            return outcome

    def persist_results(self, results: dict[str, Any]) -> None:
        refresh_summary(results)
        write_json(self.context.results_path, results)
        plan = read_json(self.context.plan_path) if self.context.plan_path.exists() else {"slug": results.get("slug", "")}
        write_summary(self.context.summary_path, plan, results)


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def default_run_id() -> str:
    return dt.datetime.now().strftime("%Y%m%d-%H%M%S")


def parse_iso(value: str) -> dt.datetime:
    return dt.datetime.fromisoformat(value.replace("Z", "+00:00"))


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: Any) -> None:
    write_text_atomic(path, json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def write_text_atomic(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(text)
        os.replace(tmp_name, path)
    finally:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)


def append_line(path: Path, line: str | None) -> None:
    if not line:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(line.rstrip() + "\n")


def latest_run_id(audit_root: Path) -> str:
    return read_json(audit_root / "manifest.json")["latestRun"]


def resolve_run_context(audit_root: Path, run_id: str | None = None) -> RunContext:
    audit_root = audit_root.resolve()
    run_id = run_id or latest_run_id(audit_root)
    run_dir = audit_root / "runs" / run_id
    return RunContext(
        audit_root=audit_root,
        run_id=run_id,
        run_dir=run_dir,
        results_path=run_dir / "qa-results.json",
        summary_path=run_dir / "qa-summary.md",
        plan_path=audit_root / "qa-plan.json",
        lock_path=run_dir / ".qa-results.lock",
    )


@contextmanager
def exclusive_lock(path: Path, timeout_seconds: float = LOCK_WAIT_SECONDS) -> Iterator[None]:
    path.parent.mkdir(parents=True, exist_ok=True)
    if fcntl is None:
        with directory_lock(path.with_name(f"{path.name}.d"), timeout_seconds, STALE_DIRECTORY_LOCK_SECONDS):
            yield
        return

    with path.open("a+", encoding="utf-8") as handle:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


@contextmanager
def directory_lock(path: Path, timeout_seconds: float, stale_seconds: float) -> Iterator[None]:
    deadline = time.monotonic() + timeout_seconds
    while True:
        try:
            path.mkdir()
            break
        except FileExistsError:
            if lock_is_stale(path, stale_seconds):
                try:
                    path.rmdir()
                    continue
                except OSError:
                    pass
            if time.monotonic() >= deadline:
                raise TimeoutError(f"timed out waiting for lock {path}")
            time.sleep(0.1)
    try:
        yield
    finally:
        path.rmdir()


def lock_is_stale(path: Path, stale_seconds: float) -> bool:
    try:
        age = time.time() - path.stat().st_mtime
    except FileNotFoundError:
        return False
    return age > stale_seconds


def make_result_item(plan_item: dict[str, Any]) -> dict[str, Any]:
    item_id = str(plan_item.get("id"))
    return {
        "id": item_id,
        "title": plan_item.get("title", f"QA item {item_id}"),
        "status": "PENDING",
        "phase": "planned",
        "owner": None,
        "lock": None,
        "repairStatus": "not-started",
        "dataIsolation": copy.deepcopy(plan_item.get("dataIsolation", DEFAULT_DATA_ISOLATION)),
        "confidence": 0,
        "cycle": {key: "PENDING" for key in CYCLE_KEYS},
        "evidence": {
            "browser": [],
            "commands": [],
            "code": [],
            "screenshots": [],
            "traces": [],
            "logs": [],
        },
        "issues": [],
        "uxRisks": [],
        "notes": "",
        "updatedAt": now_iso(),
    }


def make_results(plan: dict[str, Any], run_id: str) -> dict[str, Any]:
    results = {
        "schemaVersion": 1,
        "runId": run_id,
        "slug": plan["slug"],
        "startedAt": now_iso(),
        "updatedAt": now_iso(),
        "summary": {status: 0 for status in STATUSES},
        "items": [make_result_item(item) for item in plan.get("items", [])],
    }
    refresh_summary(results)
    return results


def get_item(results: dict[str, Any], item_id: str) -> dict[str, Any]:
    for item in results.setdefault("items", []):
        if str(item.get("id")) == item_id:
            return item

    item = make_result_item({"id": item_id, "title": f"QA item {item_id}", "dataIsolation": {}})
    results["items"].append(item)
    return item


def refresh_summary(results: dict[str, Any]) -> None:
    summary = {status: 0 for status in STATUSES}
    for item in results.get("items", []):
        status = item.get("status", "PENDING")
        summary[status] = summary.get(status, 0) + 1
    results["summary"] = summary
    results["updatedAt"] = now_iso()


def write_summary(path: Path, plan: dict[str, Any], results: dict[str, Any]) -> None:
    title = plan.get("title") or plan.get("slug") or results.get("slug", "QA run")
    lines = [
        f"# QA Summary: {title}",
        "",
        f"- **Run:** {results['runId']}",
        f"- **Updated:** {results['updatedAt']}",
        f"- **Source:** {plan.get('source', '')}",
        f"- **Range:** {plan.get('range', '')}",
        "",
        "## Status Counts",
        "",
    ]
    lines.extend(f"- {status}: {results.get('summary', {}).get(status, 0)}" for status in STATUSES)
    lines.extend(["", "## Notes", "", "This summary is generated from qa-results.json.", ""])
    write_text_atomic(path, "\n".join(lines))


def parse_key_value(raw: str) -> tuple[str, str]:
    if "=" not in raw:
        raise SystemExit(f"expected key=value, got {raw!r}")
    key, value = raw.split("=", 1)
    return key.strip(), value.strip()


def append_unique(values: list[Any], value: Any) -> None:
    if value not in values:
        values.append(value)


def normalize_evidence_path(value: str, audit_root: Path, run_id: str) -> str:
    value = value.strip()
    if not value:
        return value
    scheme = evidence_path_scheme(value)
    if scheme:
        if scheme in {"http", "https", "file"} or value.startswith("data:image/"):
            return value
        raise SystemExit(f"unsupported evidence path scheme {scheme!r}")

    path = Path(value)
    if path.is_absolute():
        try:
            return path.relative_to(audit_root).as_posix()
        except ValueError:
            raise SystemExit(f"evidence path must be under audit root: {value}")

    normalized = path.as_posix()
    if normalized.startswith("runs/"):
        return normalized
    if normalized.startswith(RUN_ROOT_PATH_PREFIXES):
        return f"runs/{run_id}/{normalized}"
    return normalized


def evidence_path_scheme(value: str) -> str:
    parsed = urlparse(value)
    scheme = parsed.scheme.lower()
    if len(scheme) == 1 and value[1:3] in {":\\", ":/"}:
        return ""
    return scheme


def lock_is_active(lock: dict[str, Any] | None) -> bool:
    if not lock:
        return False
    expires_at = lock.get("expiresAt")
    if not expires_at:
        return True
    try:
        return parse_iso(expires_at) > dt.datetime.now(dt.timezone.utc)
    except ValueError:
        return True


def ensure_can_write(item: dict[str, Any], owner: str | None) -> None:
    lock = item.get("lock")
    if not lock_is_active(lock):
        return
    lock_owner = lock.get("owner")
    if owner != lock_owner:
        raise SystemExit(f"item {item.get('id')} is locked by {lock_owner}; pass --owner {lock_owner} or wait for expiry")


def claim_item(item: dict[str, Any], owner: str, phase: str | None, ttl_minutes: int) -> None:
    ensure_can_write(item, owner)
    claimed_at = dt.datetime.now(dt.timezone.utc)
    expires_at = claimed_at + dt.timedelta(minutes=ttl_minutes)
    item["owner"] = owner
    item["phase"] = phase or item.get("phase") or "claimed"
    item["lock"] = {
        "owner": owner,
        "phase": item["phase"],
        "claimedAt": claimed_at.isoformat(),
        "expiresAt": expires_at.isoformat(),
    }


def release_claim(item: dict[str, Any], owner: str | None, force: bool) -> None:
    lock = item.get("lock")
    if lock and not force and owner != lock.get("owner"):
        raise SystemExit(f"item {item.get('id')} is locked by {lock.get('owner')}; pass --owner or --force-release")
    item["lock"] = None
    item["owner"] = None
    if item.get("phase") in CLAIM_PHASES:
        item["phase"] = "released"

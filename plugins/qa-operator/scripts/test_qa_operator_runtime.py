#!/usr/bin/env python3
"""Focused smoke tests for qa-operator runtime scripts."""

from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[3]
INIT = ROOT / "plugins" / "qa-operator" / "scripts" / "init_qa_operator.py"
UPDATE = ROOT / "plugins" / "qa-operator" / "scripts" / "update_qa_result.py"
DASHBOARD_TEMPLATE = ROOT / "plugins" / "qa-operator" / "assets" / "dashboard-template.html"


class QaOperatorRuntimeTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp())
        self.items_path = self.tmp / "items.json"
        self.items_path.write_text(
            json.dumps(
                {
                    "items": [
                        {
                            "id": "1",
                            "title": "Item 1",
                            "requirement": "Ticket QA-1",
                            "expected": "Expected behavior remains literal",
                            "area": "student dashboard",
                            "actors": ["student"],
                            "acceptance": ["Requirement appears in reports", "Expected text is not rewritten"],
                        }
                    ]
                }
            ),
            encoding="utf-8",
        )

    def run_cmd(self, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, *args],
            cwd=ROOT,
            check=check,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

    def init_run(self, slug: str = "qa", run_id: str = "run", *extra: str) -> Path:
        self.run_cmd(
            str(INIT),
            "--slug",
            slug,
            "--output",
            str(self.tmp),
            "--items",
            str(self.items_path),
            "--run-id",
            run_id,
            *extra,
        )
        return self.tmp / slug / "runs" / run_id

    def test_force_run_resets_previous_evidence(self) -> None:
        run_dir = self.init_run("force", "same")
        (run_dir / "commands.log").write_text("old command\n", encoding="utf-8")
        screenshot = run_dir / "screenshots" / "1" / "old.png"
        screenshot.parent.mkdir(parents=True, exist_ok=True)
        screenshot.write_text("not really png", encoding="utf-8")

        self.init_run("force", "same", "--force-run")

        self.assertEqual("", (run_dir / "commands.log").read_text(encoding="utf-8"))
        self.assertFalse(screenshot.exists())

    def test_update_syncs_summary_and_normalizes_run_paths(self) -> None:
        run_dir = self.init_run("sync", "run")
        self.run_cmd(
            str(UPDATE),
            str(self.tmp / "sync"),
            "--run-id",
            "run",
            "--item",
            "1",
            "--status",
            "PASS",
            "--cycle",
            "server=PASS",
            "--screenshot",
            "screenshots/1/server.png",
        )

        results = json.loads((run_dir / "qa-results.json").read_text(encoding="utf-8"))
        summary = (run_dir / "qa-summary.md").read_text(encoding="utf-8")
        self.assertEqual(1, results["summary"]["PASS"])
        self.assertEqual(["runs/run/screenshots/1/server.png"], results["items"][0]["evidence"]["screenshots"])
        self.assertIn("- PASS: 1", summary)
        self.assertIn("## Items", summary)
        self.assertIn("- **Requirement:** Ticket QA-1", summary)
        self.assertIn("- **Expected:** Expected behavior remains literal", summary)
        self.assertIn("  - Requirement appears in reports", summary)
        self.assertIn("- **Case Controller:** split-by-acceptance", summary)
        self.assertIn("- **Test Cases:**", summary)
        self.assertIn("  - 1-C01: Requirement appears in reports", summary)

    def test_case_controller_splits_multiple_acceptance_items(self) -> None:
        run_dir = self.init_run("cases", "run")
        plan = json.loads((self.tmp / "cases" / "qa-plan.json").read_text(encoding="utf-8"))
        results = json.loads((run_dir / "qa-results.json").read_text(encoding="utf-8"))

        item = plan["items"][0]
        result_item = results["items"][0]
        self.assertEqual("split-by-acceptance", item["caseController"]["strategy"])
        self.assertEqual(2, item["caseController"]["caseCount"])
        self.assertEqual(["1-C01", "1-C02"], [case["id"] for case in item["testCases"]])
        self.assertEqual("Requirement appears in reports", item["testCases"][0]["expected"])
        self.assertEqual(item["testCases"], result_item["testCases"])

    def test_case_controller_preserves_explicit_cases(self) -> None:
        self.items_path.write_text(
            json.dumps(
                {
                    "items": [
                        {
                            "id": "AI",
                            "title": "AI generation",
                            "requirement": "AI output should reflect current input",
                            "acceptance": ["AI output is valid"],
                            "testCases": [
                                {
                                    "id": "AI-C01",
                                    "title": "latest context",
                                    "expected": "Generated text reflects the latest context",
                                },
                                {
                                    "id": "AI-C02",
                                    "title": "guardrail",
                                    "expected": "Generated text avoids forbidden phrases",
                                },
                            ],
                        }
                    ]
                }
            ),
            encoding="utf-8",
        )
        self.init_run("explicit-cases", "run")
        plan = json.loads((self.tmp / "explicit-cases" / "qa-plan.json").read_text(encoding="utf-8"))

        item = plan["items"][0]
        self.assertEqual("explicit", item["caseController"]["strategy"])
        self.assertEqual(["AI-C01", "AI-C02"], [case["id"] for case in item["testCases"]])
        self.assertEqual("Generated text avoids forbidden phrases", item["testCases"][1]["expected"])

    def test_rejects_unsafe_and_outside_evidence_paths(self) -> None:
        self.init_run("paths", "run")
        unsafe = self.run_cmd(str(UPDATE), str(self.tmp / "paths"), "--run-id", "run", "--item", "1", "--screenshot", "javascript:alert(1)", check=False)
        outside = self.run_cmd(str(UPDATE), str(self.tmp / "paths"), "--run-id", "run", "--item", "1", "--screenshot", "/tmp/outside.png", check=False)
        self.assertNotEqual(0, unsafe.returncode)
        self.assertNotEqual(0, outside.returncode)

    def test_dashboard_screenshots_have_preview_viewer(self) -> None:
        template = DASHBOARD_TEMPLATE.read_text(encoding="utf-8")
        self.assertIn('id="shot-viewer"', template)
        self.assertIn('aria-modal="true"', template)
        self.assertIn("openShotViewer", template)
        self.assertIn("Actual size", template)
        self.assertIn("Open original", template)

    def test_dashboard_renders_requirement_metadata(self) -> None:
        template = DASHBOARD_TEMPLATE.read_text(encoding="utf-8")
        self.assertIn("renderPlanRequirements", template)
        self.assertIn("requirement-block", template)
        self.assertIn("plan.expected || plan.expectedBehavior", template)
        self.assertIn("plan.acceptance", template)
        self.assertIn("Planned test cases", template)
        self.assertIn("normalizeCaseList", template)

    def test_parallel_updates_do_not_drop_results(self) -> None:
        items = {"items": [{"id": str(index), "title": f"Item {index}"} for index in range(1, 21)]}
        self.items_path.write_text(json.dumps(items), encoding="utf-8")
        run_dir = self.init_run("parallel", "run")
        processes = [
            subprocess.Popen(
                [
                    sys.executable,
                    str(UPDATE),
                    str(self.tmp / "parallel"),
                    "--run-id",
                    "run",
                    "--item",
                    str(index),
                    "--status",
                    "PASS",
                    "--cycle",
                    "feature=PASS",
                ],
                cwd=ROOT,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            for index in range(1, 21)
        ]
        for process in processes:
            stdout, stderr = process.communicate(timeout=20)
            self.assertEqual(0, process.returncode, stdout + stderr)

        results = json.loads((run_dir / "qa-results.json").read_text(encoding="utf-8"))
        self.assertEqual(20, results["summary"]["PASS"])
        self.assertEqual(20, sum(1 for item in results["items"] if item["status"] == "PASS"))


if __name__ == "__main__":
    unittest.main()

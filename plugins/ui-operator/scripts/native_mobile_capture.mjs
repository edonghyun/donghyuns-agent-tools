#!/usr/bin/env node
/**
 * UI Operator native mobile capture adapter.
 *
 * Runs project-provided commands for baseline/current mobile states and expects
 * each command to write a screenshot to UI_OPERATOR_SCREENSHOT_PATH.
 *
 * This intentionally avoids choosing one mobile stack. Commands can wrap
 * Maestro, Appium, Detox, XCTest, Gradle, Flutter, xcrun simctl, adb, or a
 * manual screenshot export workflow.
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const CLI_SPEC = {
    plan: { type: "string", required: true },
    out: { type: "string", required: true },
    "baseline-command": { type: "string" },
    "current-command": { type: "string" },
    command: { type: "string" },
    "side": { type: "array" },
    "dry-run": { type: "boolean", defaultValue: false },
    help: { type: "boolean", defaultValue: false },
};

function usage() {
    return `Usage:
  node native_mobile_capture.mjs --plan artifacts/ui-operator/mobile/capture-plan.json --out artifacts/ui-operator/mobile

Options:
  --plan PATH                 Required. Native mobile capture plan JSON
  --out PATH                  Required. Artifact root
  --command CMD               Default command for both sides
  --baseline-command CMD      Default baseline command
  --current-command CMD       Default current command
  --side baseline             Repeatable. Limit to baseline/current
  --dry-run                   Print planned command records without running
  --help                      Show this help

Command contract:
  The command receives these environment variables:
    UI_OPERATOR_SIDE
    UI_OPERATOR_DEVICE
    UI_OPERATOR_DEVICE_PLATFORM
    UI_OPERATOR_SCREEN_ID
    UI_OPERATOR_SCREEN_LABEL
    UI_OPERATOR_STATE_ID
    UI_OPERATOR_STATE_LABEL
    UI_OPERATOR_SCREENSHOT_PATH
    UI_OPERATOR_ARTIFACT_ROOT

  The command must write a PNG/JPEG/WebP screenshot to UI_OPERATOR_SCREENSHOT_PATH.

Plan shape:
  {
    "platform": "native-mobile",
    "slug": "mobile-home-ui",
    "devices": [{"name":"ios-simulator","platform":"ios"}],
    "screens": [{
      "id": "home",
      "label": "Home",
      "states": [{
        "id": "initial",
        "label": "Initial",
        "command": "npm run ui:open-home && xcrun simctl io booted screenshot \\"$UI_OPERATOR_SCREENSHOT_PATH\\""
      }]
    }]
  }
`;
}

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith("--")) {
            throw new Error(`Unexpected positional argument: ${token}`);
        }
        const [rawKey, inlineValue] = token.slice(2).split("=", 2);
        const spec = CLI_SPEC[rawKey];
        if (!spec) {
            throw new Error(`Unknown option: --${rawKey}`);
        }
        if (spec.type === "boolean") {
            args[rawKey] = true;
            continue;
        }
        const value = inlineValue ?? argv[++i];
        if (value === undefined) {
            throw new Error(`Missing value for --${rawKey}`);
        }
        if (spec.type === "array") {
            args[rawKey] = [...(args[rawKey] ?? []), value];
        } else {
            args[rawKey] = value;
        }
    }

    if (args.help) {
        return { help: true };
    }

    for (const [key, spec] of Object.entries(CLI_SPEC)) {
        if (args[key] === undefined && spec.defaultValue !== undefined) {
            args[key] = spec.defaultValue;
        }
        if (spec.required && args[key] === undefined) {
            throw new Error(`Missing required option: --${key}`);
        }
    }

    return args;
}

async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function slugify(value, fallback = "item") {
    const slug = String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return slug || fallback;
}

function normalizePlan(rawPlan, args) {
    const screens = rawPlan.screens || rawPlan.routes || [];
    const devices = rawPlan.devices?.length
        ? rawPlan.devices
        : [{ name: rawPlan.device || "mobile-device", platform: rawPlan.platform || "native-mobile" }];

    return {
        schemaVersion: rawPlan.schemaVersion ?? 1,
        plugin: "ui-operator",
        platform: rawPlan.platform || "native-mobile",
        slug: rawPlan.slug || slugify(path.basename(args.out), "mobile-ui"),
        title: rawPlan.title || rawPlan.slug || path.basename(args.out),
        createdAt: rawPlan.createdAt || new Date().toISOString(),
        devices: devices.map((device, index) => ({
            name: slugify(device.name || `device-${index + 1}`, `device-${index + 1}`),
            label: device.label || device.name || `Device ${index + 1}`,
            platform: device.platform || rawPlan.platform || "native-mobile",
            notes: device.notes || [],
        })),
        screens: screens.map((screen, index) => ({
            id: slugify(screen.id || screen.path || screen.label || `screen-${index + 1}`, `screen-${index + 1}`),
            label: screen.label || screen.title || screen.path || `Screen ${index + 1}`,
            notes: screen.notes || [],
            states: (screen.states?.length ? screen.states : [{ id: "initial", label: "Initial" }]).map((state, stateIndex) => ({
                id: slugify(state.id || state.label || `state-${stateIndex + 1}`, `state-${stateIndex + 1}`),
                label: state.label || state.title || state.id || `State ${stateIndex + 1}`,
                command: state.command || "",
                baselineCommand: state.baselineCommand || "",
                currentCommand: state.currentCommand || "",
                notes: state.notes || [],
            })),
        })),
    };
}

function expandTemplate(command, values) {
    return command.replace(/\{([a-zA-Z0-9_-]+)\}/g, (match, key) => {
        if (values[key] === undefined) {
            return match;
        }
        return String(values[key]);
    });
}

function chooseCommand({ args, side, state }) {
    if (side === "baseline") {
        return state.baselineCommand || state.command || args["baseline-command"] || args.command || "";
    }
    return state.currentCommand || state.command || args["current-command"] || args.command || "";
}

function runShell(command, env) {
    return new Promise((resolve) => {
        const child = spawn(command, {
            shell: true,
            env: { ...process.env, ...env },
            stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });
        child.on("error", (error) => {
            resolve({ code: 1, stdout, stderr: `${stderr}${error.message}` });
        });
        child.on("close", (code) => {
            resolve({ code: code ?? 0, stdout, stderr });
        });
    });
}

async function exists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

function relative(outDir, filePath) {
    return path.relative(outDir, filePath).split(path.sep).join("/");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
    return escapeHtml(value).replace(/\n/g, " ");
}

async function captureOne({ args, outDir, plan, side, device, screen, state }) {
    const screenshotPath = path.join(
        outDir,
        "screenshots",
        side,
        device.name,
        `${screen.id}__${state.id}.png`
    );
    const logPath = path.join(
        outDir,
        "logs",
        side,
        device.name,
        `${screen.id}__${state.id}.log`
    );
    await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
    await fs.mkdir(path.dirname(logPath), { recursive: true });

    const values = {
        side,
        device: device.name,
        platform: device.platform,
        screenId: screen.id,
        stateId: state.id,
        screenshot: screenshotPath,
        out: outDir,
    };
    const rawCommand = chooseCommand({ args, side, state });
    const command = rawCommand ? expandTemplate(rawCommand, values) : "";
    const result = {
        side,
        status: "pending",
        device,
        screenId: screen.id,
        screenLabel: screen.label,
        stateId: state.id,
        stateLabel: state.label,
        command,
        screenshot: "",
        log: relative(outDir, logPath),
        stdout: "",
        stderr: "",
        exitCode: null,
        error: "",
    };

    if (!command) {
        result.status = "blocked";
        result.error = "No command provided for this side/state";
        await fs.writeFile(logPath, `${result.error}\n`);
        return result;
    }

    if (args["dry-run"]) {
        result.status = "dry-run";
        result.screenshot = relative(outDir, screenshotPath);
        await fs.writeFile(logPath, `DRY RUN\n${command}\n`);
        return result;
    }

    const env = {
        UI_OPERATOR_SIDE: side,
        UI_OPERATOR_DEVICE: device.name,
        UI_OPERATOR_DEVICE_PLATFORM: device.platform,
        UI_OPERATOR_SCREEN_ID: screen.id,
        UI_OPERATOR_SCREEN_LABEL: screen.label,
        UI_OPERATOR_STATE_ID: state.id,
        UI_OPERATOR_STATE_LABEL: state.label,
        UI_OPERATOR_SCREENSHOT_PATH: screenshotPath,
        UI_OPERATOR_ARTIFACT_ROOT: outDir,
        UI_OPERATOR_PLAN_SLUG: plan.slug,
    };
    const shellResult = await runShell(command, env);
    result.stdout = shellResult.stdout;
    result.stderr = shellResult.stderr;
    result.exitCode = shellResult.code;
    await fs.writeFile(
        logPath,
        [
            `$ ${command}`,
            "",
            `exitCode=${shellResult.code}`,
            "",
            "stdout:",
            shellResult.stdout,
            "",
            "stderr:",
            shellResult.stderr,
        ].join("\n")
    );

    if (shellResult.code !== 0) {
        result.status = "blocked";
        result.error = `Command exited with code ${shellResult.code}`;
        return result;
    }

    if (!(await exists(screenshotPath))) {
        result.status = "blocked";
        result.error = "Command completed but did not write UI_OPERATOR_SCREENSHOT_PATH";
        return result;
    }

    result.status = "captured";
    result.screenshot = relative(outDir, screenshotPath);
    return result;
}

function classifyPair(pair) {
    if (pair.baseline?.status === "captured" && pair.current?.status === "captured") {
        return "compared";
    }
    if (pair.current?.status === "captured" && !pair.baseline) {
        return "current-only";
    }
    if (pair.baseline?.status === "captured" && !pair.current) {
        return "baseline-only";
    }
    if (pair.baseline?.status === "blocked" || pair.current?.status === "blocked") {
        return "blocked";
    }
    return "partial";
}

function summarize(comparisons) {
    const counts = {};
    for (const comparison of comparisons) {
        counts[comparison.status] = (counts[comparison.status] || 0) + 1;
    }
    return {
        total: comparisons.length,
        counts,
        compared: counts.compared || 0,
        blocked: counts.blocked || 0,
    };
}

function renderReport(data) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(data.title)} - Native Mobile UI Report</title>
  <style>
    :root { --bg:#f8faf9; --ink:#15201c; --muted:#65736e; --line:#d8e1dd; --card:#fff; --accent:#2f6f5e; --bad:#a02a2a; --warn:#9b5b00; }
    body { margin:0; font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color:var(--ink); background:var(--bg); }
    header { padding:28px 32px 20px; background:#fff; border-bottom:1px solid var(--line); }
    h1 { margin:0 0 8px; font-size:24px; letter-spacing:0; }
    main { padding:24px 32px 48px; display:grid; gap:22px; }
    section { background:var(--card); border:1px solid var(--line); border-radius:8px; overflow:hidden; }
    .head { padding:14px 16px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; gap:12px; }
    h2 { margin:0; font-size:16px; letter-spacing:0; }
    .small { color:var(--muted); font-size:12px; }
    .status { font-weight:700; color:var(--accent); }
    .status.blocked { color:var(--bad); }
    .status.partial,.status.current-only,.status.baseline-only,.status.dry-run { color:var(--warn); }
    .shots { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1px; background:var(--line); }
    figure { margin:0; background:#fff; min-width:0; }
    figcaption { padding:10px 12px; font-weight:700; border-bottom:1px solid var(--line); }
    img { display:block; max-height:760px; max-width:100%; margin:auto; background:#f2f4f3; }
    .empty { min-height:180px; display:flex; align-items:center; justify-content:center; text-align:center; color:var(--muted); padding:20px; }
    pre { margin:0; padding:12px 16px 16px; white-space:pre-wrap; overflow-wrap:anywhere; background:#f4f6f5; border-top:1px solid var(--line); font-size:12px; }
    @media (max-width:900px){ header,main{padding-left:16px;padding-right:16px}.shots{grid-template-columns:1fr} }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(data.title)}</h1>
    <div class="small">Generated ${escapeHtml(data.generatedAt)} · platform ${escapeHtml(data.platform)} · total ${data.summary.total}</div>
  </header>
  <main>
    ${data.comparisons.map(renderComparison).join("\n")}
  </main>
</body>
</html>
`;
}

function renderComparison(item) {
    const errors = [item.baseline, item.current]
        .filter(Boolean)
        .map((capture) => capture.error ? `${capture.side}: ${capture.error}\nlog: ${capture.log}` : "")
        .filter(Boolean)
        .join("\n\n");
    return `<section>
  <div class="head">
    <div>
      <h2>${escapeHtml(item.screenLabel)} / ${escapeHtml(item.stateLabel)}</h2>
      <div class="small">${escapeHtml(item.device.label)} · ${escapeHtml(item.device.platform)}</div>
    </div>
    <div class="status ${escapeAttr(item.status)}">${escapeHtml(item.status)}</div>
  </div>
  <div class="shots">
    ${renderShot("Baseline", item.baseline)}
    ${renderShot("Current", item.current)}
  </div>
  ${errors ? `<pre>${escapeHtml(errors)}</pre>` : ""}
</section>`;
}

function renderShot(label, capture) {
    if (!capture) {
        return `<figure><figcaption>${escapeHtml(label)}</figcaption><div class="empty">Not captured</div></figure>`;
    }
    const image = capture.screenshot
        ? `<img src="${escapeAttr(capture.screenshot)}" alt="${escapeAttr(`${label} ${capture.screenId} ${capture.stateId}`)}">`
        : `<div class="empty">${escapeHtml(capture.error || "No screenshot")}</div>`;
    return `<figure><figcaption>${escapeHtml(label)} · ${escapeHtml(capture.status)}</figcaption>${image}</figure>`;
}

async function run(args) {
    const outDir = path.resolve(args.out);
    const plan = normalizePlan(await readJson(args.plan), args);
    const sides = args.side?.length ? args.side : ["baseline", "current"];
    const comparisons = [];
    const captures = [];

    await fs.mkdir(outDir, { recursive: true });

    for (const device of plan.devices) {
        for (const screen of plan.screens) {
            for (const state of screen.states) {
                const pair = {};
                for (const side of sides) {
                    const capture = await captureOne({ args, outDir, plan, side, device, screen, state });
                    captures.push(capture);
                    pair[side] = capture;
                }
                comparisons.push({
                    device,
                    screenId: screen.id,
                    screenLabel: screen.label,
                    stateId: state.id,
                    stateLabel: state.label,
                    status: classifyPair(pair),
                    baseline: pair.baseline || null,
                    current: pair.current || null,
                });
            }
        }
    }

    const data = {
        schemaVersion: 1,
        plugin: "ui-operator",
        adapter: "native-mobile-command",
        platform: plan.platform,
        generatedAt: new Date().toISOString(),
        slug: plan.slug,
        title: plan.title,
        plan,
        captures,
        comparisons,
        summary: summarize(comparisons),
    };

    await writeJson(path.join(outDir, "capture-plan.json"), plan);
    await writeJson(path.join(outDir, "comparison-data.json"), data);
    await fs.writeFile(path.join(outDir, "report.html"), renderReport(data));
    return data;
}

async function main() {
    try {
        const args = parseArgs(process.argv.slice(2));
        if (args.help) {
            console.log(usage());
            return;
        }
        const data = await run(args);
        console.log(JSON.stringify({
            out: path.resolve(args.out),
            report: path.resolve(args.out, "report.html"),
            total: data.summary.total,
            counts: data.summary.counts,
        }, null, 2));
    } catch (error) {
        console.error(error?.stack || error?.message || String(error));
        process.exitCode = 1;
    }
}

await main();

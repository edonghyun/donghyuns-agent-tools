#!/usr/bin/env node
/**
 * UI Operator visual comparison runner.
 *
 * Captures the same route/state recipes against baseline and current URLs,
 * writes screenshots, comparison-data.json, and a side-by-side report.html.
 */

import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_VIEWPORT = { name: "desktop", width: 1440, height: 900 };
const DEFAULT_SETTLE_MS = 500;
const DEFAULT_NAV_TIMEOUT_MS = 25000;

const CLI_SPEC = {
    "baseline-url": { type: "string" },
    "current-url": { type: "string" },
    plan: { type: "string" },
    routes: { type: "array" },
    out: { type: "string", required: true },
    "setup-script": { type: "string" },
    "baseline-setup-script": { type: "string" },
    "current-setup-script": { type: "string" },
    "storage-state": { type: "string" },
    "baseline-storage-state": { type: "string" },
    "current-storage-state": { type: "string" },
    viewport: { type: "array" },
    "settle-ms": { type: "number", defaultValue: DEFAULT_SETTLE_MS },
    "nav-timeout-ms": { type: "number", defaultValue: DEFAULT_NAV_TIMEOUT_MS },
    "full-page": { type: "boolean", defaultValue: true },
    headed: { type: "boolean", defaultValue: false },
    "fail-on-console-error": { type: "boolean", defaultValue: false },
    help: { type: "boolean", defaultValue: false },
};

function usage() {
    return `Usage:
  node visual_compare_capture.mjs --baseline-url http://localhost:3002 --current-url http://localhost:3004 --plan artifacts/ui-operator/demo/capture-plan.json --out artifacts/ui-operator/demo
  node visual_compare_capture.mjs --current-url http://localhost:3004 --routes /admin,/admin/users --out artifacts/ui-operator/demo

Options:
  --baseline-url URL              Optional baseline origin
  --current-url URL               Current/candidate origin
  --plan PATH                     Capture plan JSON
  --routes LIST                   Comma-separated routes when no plan is given
  --out PATH                      Required artifact root
  --setup-script PATH             ESM module exporting setup({ page, context, baseURL, side, route, state, viewport, plan })
  --baseline-setup-script PATH    Baseline-specific setup module
  --current-setup-script PATH     Current-specific setup module
  --storage-state PATH            Shared Playwright storageState JSON
  --baseline-storage-state PATH   Baseline-specific storageState JSON
  --current-storage-state PATH    Current-specific storageState JSON
  --viewport WIDTHxHEIGHT         Repeatable. Defaults to 1440x900
  --settle-ms N                   Wait after route/action. Default ${DEFAULT_SETTLE_MS}
  --nav-timeout-ms N              Navigation timeout. Default ${DEFAULT_NAV_TIMEOUT_MS}
  --full-page                     Full-page screenshots. Default true
  --headed                        Run headed Chromium
  --fail-on-console-error         Exit non-zero if any console error is observed
  --help                          Show this help

Plan shape:
  {
    "slug": "admin-ui",
    "baselineUrl": "http://localhost:3002",
    "currentUrl": "http://localhost:3004",
    "viewports": [{"name":"desktop","width":1440,"height":900}],
    "routes": [
      {"id":"admin-lectures","path":"/admin/lectures","states":[
        {"id":"list","label":"List"},
        {"id":"detail-modal","actions":[
          {"type":"click","role":"button","name":"Detail"},
          {"type":"waitForSelector","selector":"[role='dialog']"}
        ]}
      ]}
    ]
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
        } else if (spec.type === "number") {
            args[rawKey] = Number(value);
            if (!Number.isFinite(args[rawKey])) {
                throw new Error(`--${rawKey} must be a number`);
            }
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

    if (!args["baseline-url"] && !args["current-url"] && !args.plan) {
        throw new Error("Provide --current-url and/or --baseline-url, or a --plan containing URLs");
    }

    return args;
}

async function loadPlaywright() {
    const require = createRequire(import.meta.url);
    const searchRoots = [
        process.cwd(),
        path.join(process.cwd(), "node_modules"),
        process.env.NODE_PATH,
        path.resolve(path.dirname(process.execPath), "..", "node_modules"),
    ]
        .filter(Boolean)
        .flatMap((entry) => String(entry).split(path.delimiter))
        .filter(Boolean);

    function tryRequire(packageName) {
        try {
            return require(packageName);
        } catch {
            // Keep looking below.
        }
        for (const root of searchRoots) {
            try {
                const scopedRequire = createRequire(path.join(root, "__ui_operator__.js"));
                return scopedRequire(packageName);
            } catch {
                // Keep looking.
            }
        }
        return null;
    }

    try {
        return await import("playwright");
    } catch (playwrightError) {
        try {
            return await import("@playwright/test");
        } catch {
            const playwright = tryRequire("playwright");
            if (playwright) {
                return playwright;
            }
            const playwrightTest = tryRequire("@playwright/test");
            if (playwrightTest) {
                return playwrightTest;
            }
            throw new Error(
                "Playwright is not installed. Install playwright in the target project or run through an environment that provides it.\n" +
                    `Original import error: ${playwrightError.message}`
            );
        }
    }
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

function parseViewport(value, index = 0) {
    if (typeof value === "object" && value) {
        return {
            name: value.name || `${value.width}x${value.height}`,
            width: Number(value.width),
            height: Number(value.height),
        };
    }
    const match = String(value).match(/^(\d+)x(\d+)(?::([a-zA-Z0-9_-]+))?$/);
    if (!match) {
        throw new Error(`Invalid viewport ${value}; expected WIDTHxHEIGHT or WIDTHxHEIGHT:name`);
    }
    const [, width, height, name] = match;
    return {
        name: name || (index === 0 ? "desktop" : `${width}x${height}`),
        width: Number(width),
        height: Number(height),
    };
}

function normalizeViewports(rawViewports, cliViewports) {
    const source = cliViewports?.length ? cliViewports : rawViewports;
    const viewports = source?.length ? source.map(parseViewport) : [DEFAULT_VIEWPORT];
    for (const viewport of viewports) {
        if (!Number.isFinite(viewport.width) || !Number.isFinite(viewport.height)) {
            throw new Error(`Invalid viewport dimensions: ${JSON.stringify(viewport)}`);
        }
    }
    return viewports;
}

function routeFromCli(value) {
    return String(value)
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((route, index) => ({
            id: slugify(route.replace(/^\//, ""), `route-${index + 1}`),
            path: route.startsWith("/") ? route : `/${route}`,
            label: route,
            states: [{ id: "page", label: "Page" }],
        }));
}

async function loadPlan(args) {
    const plan = args.plan ? await readJson(args.plan) : {};
    const cliRoutes = args.routes?.flatMap(routeFromCli) ?? [];
    const routes = normalizeRoutes(cliRoutes.length ? cliRoutes : plan.routes ?? []);
    if (!routes.length) {
        routes.push({
            id: "home",
            path: "/",
            label: "Home",
            states: [{ id: "page", label: "Page" }],
        });
    }

    const normalized = {
        schemaVersion: plan.schemaVersion ?? 1,
        plugin: "ui-operator",
        slug: plan.slug || slugify(path.basename(args.out), "ui-run"),
        title: plan.title || plan.slug || path.basename(args.out),
        source: plan.source || "",
        createdAt: plan.createdAt || new Date().toISOString(),
        baselineUrl: args["baseline-url"] || plan.baselineUrl || plan.baselineURL || "",
        currentUrl: args["current-url"] || plan.currentUrl || plan.currentURL || "",
        viewports: normalizeViewports(plan.viewports, args.viewport),
        routes,
        notes: plan.notes || [],
    };

    if (!normalized.baselineUrl && !normalized.currentUrl) {
        throw new Error("Plan must provide baselineUrl or currentUrl, or pass --baseline-url/--current-url");
    }
    return normalized;
}

function normalizeRoutes(routes) {
    return routes.map((route, index) => {
        const pathValue = route.path || route.route || route.url || "/";
        const states = route.states?.length
            ? route.states
            : [{ id: "page", label: "Page", actions: [] }];
        return {
            id: slugify(route.id || pathValue.replace(/^\//, ""), `route-${index + 1}`),
            path: pathValue.startsWith("/") ? pathValue : `/${pathValue}`,
            label: route.label || route.title || pathValue,
            confidence: route.confidence,
            notes: route.notes || [],
            states: states.map((state, stateIndex) => ({
                id: slugify(state.id || state.label || `state-${stateIndex + 1}`, `state-${stateIndex + 1}`),
                label: state.label || state.title || state.id || `State ${stateIndex + 1}`,
                actions: state.actions || [],
                pendingSelector: state.pendingSelector,
                confidence: state.confidence,
                notes: state.notes || [],
            })),
        };
    });
}

async function loadSetupModule(filePath) {
    if (!filePath) {
        return null;
    }
    const absolute = path.resolve(filePath);
    const module = await import(pathToFileURL(absolute).href);
    const setup = module.setup || module.default;
    if (setup && typeof setup !== "function") {
        throw new Error(`${filePath} must export setup() or default function`);
    }
    return setup || null;
}

function makeUrl(baseURL, routePath) {
    return new URL(routePath, baseURL).href;
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

function relativeFromReport(outDir, filePath) {
    return path.relative(outDir, filePath).split(path.sep).join("/");
}

async function settle(page, ms) {
    await page.waitForTimeout(ms);
}

function locatorForAction(page, action) {
    if (action.role) {
        const options = {};
        if (action.name !== undefined) {
            options.name = action.name;
            if (action.exact !== undefined) {
                options.exact = Boolean(action.exact);
            }
        }
        return page.getByRole(action.role, options).first();
    }
    if (action.label) {
        return page.getByLabel(action.label, { exact: Boolean(action.exact) }).first();
    }
    if (action.placeholder) {
        return page.getByPlaceholder(action.placeholder, { exact: Boolean(action.exact) }).first();
    }
    if (action.text) {
        return page.getByText(action.text, { exact: Boolean(action.exact) }).first();
    }
    if (action.testId) {
        return page.getByTestId(action.testId).first();
    }
    if (action.selector) {
        return page.locator(action.selector).first();
    }
    throw new Error(`Action ${action.type} needs selector, role/name, label, placeholder, text, or testId`);
}

async function runAction(page, action, settleMs) {
    const type = action.type || "click";
    if (type === "waitForTimeout") {
        await page.waitForTimeout(Number(action.ms ?? action.timeout ?? settleMs));
        return;
    }
    if (type === "waitForSelector") {
        await page.waitForSelector(action.selector, {
            state: action.state || "visible",
            timeout: Number(action.timeout ?? 5000),
        });
        return;
    }
    if (type === "waitForURL") {
        await page.waitForURL(action.url, { timeout: Number(action.timeout ?? 5000) });
        return;
    }
    if (type === "press") {
        await locatorForAction(page, action).press(action.key);
        await settle(page, Number(action.settleMs ?? settleMs));
        return;
    }
    if (type === "fill") {
        await locatorForAction(page, action).fill(String(action.value ?? ""));
        await settle(page, Number(action.settleMs ?? settleMs));
        return;
    }
    if (type === "selectOption" || type === "select") {
        await locatorForAction(page, action).selectOption(action.value ?? action.values);
        await settle(page, Number(action.settleMs ?? settleMs));
        return;
    }
    if (type === "check") {
        await locatorForAction(page, action).check();
        await settle(page, Number(action.settleMs ?? settleMs));
        return;
    }
    if (type === "uncheck") {
        await locatorForAction(page, action).uncheck();
        await settle(page, Number(action.settleMs ?? settleMs));
        return;
    }
    if (type === "hover") {
        await locatorForAction(page, action).hover();
        await settle(page, Number(action.settleMs ?? settleMs));
        return;
    }
    if (type === "scroll") {
        if (action.selector || action.role || action.text || action.label || action.testId) {
            await locatorForAction(page, action).scrollIntoViewIfNeeded();
        } else {
            await page.mouse.wheel(Number(action.x ?? 0), Number(action.y ?? 600));
        }
        await settle(page, Number(action.settleMs ?? settleMs));
        return;
    }
    if (type === "assertVisible") {
        await locatorForAction(page, action).waitFor({
            state: "visible",
            timeout: Number(action.timeout ?? 5000),
        });
        return;
    }
    if (type === "click") {
        await locatorForAction(page, action).click({
            timeout: Number(action.timeout ?? 5000),
            force: Boolean(action.force),
        });
        await settle(page, Number(action.settleMs ?? settleMs));
        return;
    }
    throw new Error(`Unsupported action type: ${type}`);
}

async function collectMetrics(page) {
    return page.evaluate(() => {
        const visible = (el) => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
        };
        const visibleCount = (selector) => Array.from(document.querySelectorAll(selector)).filter(visible).length;
        const headings = Array.from(document.querySelectorAll("h1,h2,h3"))
            .filter(visible)
            .slice(0, 8)
            .map((el) => el.textContent.trim())
            .filter(Boolean);
        const overflow = Array.from(document.querySelectorAll("body *"))
            .filter((el) => visible(el) && (el.scrollWidth - el.clientWidth > 2 || el.scrollHeight - el.clientHeight > 2))
            .slice(0, 25)
            .map((el) => ({
                tag: el.tagName.toLowerCase(),
                id: el.id || "",
                className: typeof el.className === "string" ? el.className.slice(0, 120) : "",
                text: (el.textContent || "").trim().slice(0, 80),
            }));
        return {
            url: window.location.href,
            title: document.title,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            bodyTextLength: document.body?.innerText?.trim().length ?? 0,
            headings,
            buttons: visibleCount("button,[role='button']"),
            links: visibleCount("a[href]"),
            inputs: visibleCount("input,textarea,select,[contenteditable='true']"),
            dialogs: visibleCount("dialog,[role='dialog'],[aria-modal='true']"),
            overflowCount: overflow.length,
            overflow,
        };
    });
}

function summarizeDelta(baseline, current) {
    if (!baseline || !current) {
        return {};
    }
    const before = baseline.metrics || {};
    const after = current.metrics || {};
    return {
        titleChanged: before.title !== after.title,
        finalUrlChanged: before.url !== after.url,
        textLengthDelta: (after.bodyTextLength ?? 0) - (before.bodyTextLength ?? 0),
        buttonsDelta: (after.buttons ?? 0) - (before.buttons ?? 0),
        linksDelta: (after.links ?? 0) - (before.links ?? 0),
        inputsDelta: (after.inputs ?? 0) - (before.inputs ?? 0),
        dialogsDelta: (after.dialogs ?? 0) - (before.dialogs ?? 0),
        overflowDelta: (after.overflowCount ?? 0) - (before.overflowCount ?? 0),
        consoleErrorsDelta: (current.consoleErrors?.length ?? 0) - (baseline.consoleErrors?.length ?? 0),
        networkErrorsDelta: (current.networkErrors?.length ?? 0) - (baseline.networkErrors?.length ?? 0),
    };
}

async function captureSide({ browser, plan, side, baseURL, setup, storageState, viewport, route, state, args, outDir }) {
    const result = {
        side,
        status: "pending",
        routeId: route.id,
        routePath: route.path,
        stateId: state.id,
        stateLabel: state.label,
        viewport: { name: viewport.name, width: viewport.width, height: viewport.height },
        actions: state.actions || [],
        screenshot: "",
        finalUrl: "",
        metrics: null,
        consoleErrors: [],
        networkErrors: [],
        pageErrors: [],
        error: "",
    };

    const contextOptions = {
        viewport: { width: viewport.width, height: viewport.height },
    };
    if (storageState) {
        contextOptions.storageState = storageState;
    }
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    page.setDefaultTimeout(args["nav-timeout-ms"]);
    page.setDefaultNavigationTimeout(args["nav-timeout-ms"]);

    page.on("console", (message) => {
        if (message.type() === "error") {
            result.consoleErrors.push(message.text());
        }
    });
    page.on("pageerror", (error) => {
        result.pageErrors.push(error.message);
    });
    page.on("requestfailed", (request) => {
        result.networkErrors.push({
            url: request.url(),
            method: request.method(),
            failure: request.failure()?.errorText || "request failed",
        });
    });
    page.on("response", (response) => {
        if (response.status() >= 400) {
            result.networkErrors.push({
                url: response.url(),
                method: response.request().method(),
                status: response.status(),
            });
        }
    });

    try {
        if (setup) {
            await setup({ page, context, baseURL, side, route, state, viewport, plan });
            await settle(page, args["settle-ms"]);
        }
        await page.goto(makeUrl(baseURL, route.path), {
            waitUntil: "domcontentloaded",
            timeout: args["nav-timeout-ms"],
        });
        await settle(page, args["settle-ms"]);
        for (const action of state.actions || []) {
            await runAction(page, action, args["settle-ms"]);
        }
        result.finalUrl = page.url();
        result.metrics = await collectMetrics(page);
        const shotPath = path.join(
            outDir,
            "screenshots",
            side,
            slugify(viewport.name, "viewport"),
            `${route.id}__${state.id}.png`
        );
        await fs.mkdir(path.dirname(shotPath), { recursive: true });
        await page.screenshot({ path: shotPath, fullPage: Boolean(args["full-page"]) });
        result.screenshot = relativeFromReport(outDir, shotPath);
        result.status = "captured";
    } catch (error) {
        result.status = "blocked";
        result.error = error?.stack || error?.message || String(error);
        try {
            const shotPath = path.join(
                outDir,
                "screenshots",
                side,
                slugify(viewport.name, "viewport"),
                `${route.id}__${state.id}__blocked.png`
            );
            await fs.mkdir(path.dirname(shotPath), { recursive: true });
            await page.screenshot({ path: shotPath, fullPage: Boolean(args["full-page"]) });
            result.screenshot = relativeFromReport(outDir, shotPath);
            result.finalUrl = page.url();
            result.metrics = await collectMetrics(page).catch(() => null);
        } catch {
            // A blocked navigation may leave no page to screenshot.
        }
    } finally {
        await context.close();
    }

    return result;
}

async function runCapture(args) {
    const plan = await loadPlan(args);
    const outDir = path.resolve(args.out);
    const { chromium } = await loadPlaywright();
    const sharedSetup = await loadSetupModule(args["setup-script"]);
    const baselineSetup = await loadSetupModule(args["baseline-setup-script"]) || sharedSetup;
    const currentSetup = await loadSetupModule(args["current-setup-script"]) || sharedSetup;
    const baselineStorageState = args["baseline-storage-state"] || args["storage-state"];
    const currentStorageState = args["current-storage-state"] || args["storage-state"];

    await fs.mkdir(outDir, { recursive: true });
    const browser = await chromium.launch({ headless: !args.headed });
    const captures = [];
    const comparisons = [];
    const sides = [
        plan.baselineUrl ? { side: "baseline", baseURL: plan.baselineUrl, setup: baselineSetup, storageState: baselineStorageState } : null,
        plan.currentUrl ? { side: "current", baseURL: plan.currentUrl, setup: currentSetup, storageState: currentStorageState } : null,
    ].filter(Boolean);

    try {
        for (const viewport of plan.viewports) {
            for (const route of plan.routes) {
                for (const state of route.states) {
                    const pair = {};
                    for (const sideConfig of sides) {
                        const capture = await captureSide({
                            browser,
                            plan,
                            side: sideConfig.side,
                            baseURL: sideConfig.baseURL,
                            setup: sideConfig.setup,
                            storageState: sideConfig.storageState,
                            viewport,
                            route,
                            state,
                            args,
                            outDir,
                        });
                        captures.push(capture);
                        pair[sideConfig.side] = capture;
                    }
                    comparisons.push({
                        routeId: route.id,
                        routePath: route.path,
                        routeLabel: route.label,
                        stateId: state.id,
                        stateLabel: state.label,
                        viewport: { name: viewport.name, width: viewport.width, height: viewport.height },
                        status: classifyPair(pair),
                        baseline: pair.baseline || null,
                        current: pair.current || null,
                        delta: summarizeDelta(pair.baseline, pair.current),
                    });
                }
            }
        }
    } finally {
        await browser.close();
    }

    const data = {
        schemaVersion: 1,
        plugin: "ui-operator",
        generatedAt: new Date().toISOString(),
        slug: plan.slug,
        title: plan.title,
        baselineUrl: plan.baselineUrl,
        currentUrl: plan.currentUrl,
        viewports: plan.viewports,
        plan,
        captures,
        comparisons,
        summary: summarizeRun(comparisons),
    };

    await writeJson(path.join(outDir, "capture-plan.json"), plan);
    await writeJson(path.join(outDir, "comparison-data.json"), data);
    await fs.writeFile(path.join(outDir, "report.html"), renderReport(data, outDir));

    if (args["fail-on-console-error"]) {
        const hasConsoleErrors = captures.some((capture) => capture.consoleErrors.length || capture.pageErrors.length);
        if (hasConsoleErrors) {
            process.exitCode = 2;
        }
    }

    return data;
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

function summarizeRun(comparisons) {
    const counts = {};
    for (const item of comparisons) {
        counts[item.status] = (counts[item.status] || 0) + 1;
    }
    return {
        total: comparisons.length,
        counts,
        blocked: comparisons.filter((item) => item.status === "blocked").length,
        compared: comparisons.filter((item) => item.status === "compared").length,
    };
}

function renderReport(data, outDir) {
    const rows = data.comparisons.map((item) => renderComparison(item)).join("\n");
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(data.title)} - UI Operator Report</title>
  <style>
    :root { color-scheme: light; --bg:#f8faf9; --ink:#15201c; --muted:#63706b; --line:#d8e1dd; --card:#ffffff; --accent:#2f6f5e; --warn:#9b5b00; --bad:#a02a2a; }
    body { margin: 0; font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--ink); background: var(--bg); }
    header { padding: 28px 32px 20px; border-bottom: 1px solid var(--line); background: #fff; }
    h1 { margin: 0 0 8px; font-size: 24px; letter-spacing: 0; }
    .meta, .small { color: var(--muted); font-size: 12px; }
    .summary { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
    .pill { border: 1px solid var(--line); border-radius: 999px; padding: 5px 10px; background: #fff; }
    main { padding: 24px 32px 48px; display: grid; gap: 22px; }
    section { background: var(--card); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
    .section-head { padding: 14px 16px; border-bottom: 1px solid var(--line); display:flex; gap:12px; justify-content:space-between; align-items:flex-start; }
    h2 { margin: 0; font-size: 16px; letter-spacing: 0; }
    .status { font-weight: 700; color: var(--accent); }
    .status.blocked { color: var(--bad); }
    .status.partial, .status.current-only, .status.baseline-only { color: var(--warn); }
    .shots { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; background: var(--line); }
    figure { margin: 0; background: #fff; min-width: 0; }
    figcaption { padding: 10px 12px; font-weight: 700; border-bottom: 1px solid var(--line); }
    img { width: 100%; display: block; background: #f2f4f3; }
    .empty { min-height: 160px; display:flex; align-items:center; justify-content:center; color:var(--muted); padding:20px; text-align:center; }
    .details { padding: 12px 16px 16px; display:grid; gap:10px; }
    pre { white-space: pre-wrap; overflow-wrap:anywhere; background:#f4f6f5; border:1px solid var(--line); border-radius:6px; padding:10px; margin:0; font-size:12px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid var(--line); padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f4f6f5; }
    @media (max-width: 900px) { .shots { grid-template-columns: 1fr; } header, main { padding-left: 16px; padding-right: 16px; } }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(data.title)}</h1>
    <div class="meta">Generated ${escapeHtml(data.generatedAt)} · baseline ${escapeHtml(data.baselineUrl || "none")} · current ${escapeHtml(data.currentUrl || "none")}</div>
    <div class="summary">
      <span class="pill">total ${data.summary.total}</span>
      ${Object.entries(data.summary.counts).map(([key, value]) => `<span class="pill">${escapeHtml(key)} ${value}</span>`).join("\n      ")}
    </div>
  </header>
  <main>
    ${rows}
  </main>
</body>
</html>
`;
}

function renderComparison(item) {
    const baseline = renderShot("Baseline", item.baseline);
    const current = renderShot("Current", item.current);
    const deltaRows = Object.entries(item.delta || {})
        .map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(String(value))}</td></tr>`)
        .join("");
    const errors = [item.baseline, item.current]
        .filter(Boolean)
        .flatMap((capture) => [
            ...capture.consoleErrors.map((error) => `${capture.side} console: ${error}`),
            ...capture.pageErrors.map((error) => `${capture.side} page: ${error}`),
            ...capture.networkErrors.map((error) => `${capture.side} network: ${JSON.stringify(error)}`),
            capture.error ? `${capture.side} blocked: ${capture.error}` : "",
        ])
        .filter(Boolean);

    return `<section>
  <div class="section-head">
    <div>
      <h2>${escapeHtml(item.routeLabel)} / ${escapeHtml(item.stateLabel)}</h2>
      <div class="small">${escapeHtml(item.routePath)} · ${escapeHtml(item.viewport.name)} ${item.viewport.width}x${item.viewport.height}</div>
    </div>
    <div class="status ${escapeAttr(item.status)}">${escapeHtml(item.status)}</div>
  </div>
  <div class="shots">
    ${baseline}
    ${current}
  </div>
  <div class="details">
    ${deltaRows ? `<table><tbody>${deltaRows}</tbody></table>` : ""}
    ${errors.length ? `<pre>${escapeHtml(errors.join("\n"))}</pre>` : ""}
  </div>
</section>`;
}

function renderShot(label, capture) {
    if (!capture) {
        return `<figure><figcaption>${escapeHtml(label)}</figcaption><div class="empty">Not captured</div></figure>`;
    }
    const image = capture.screenshot
        ? `<img src="${escapeAttr(capture.screenshot)}" alt="${escapeAttr(`${label} ${capture.routeId} ${capture.stateId}`)}">`
        : `<div class="empty">No screenshot</div>`;
    const finalUrl = capture.finalUrl ? `<div class="small">${escapeHtml(capture.finalUrl)}</div>` : "";
    return `<figure><figcaption>${escapeHtml(label)} · ${escapeHtml(capture.status)}</figcaption>${image}${finalUrl}</figure>`;
}

async function main() {
    try {
        const args = parseArgs(process.argv.slice(2));
        if (args.help) {
            console.log(usage());
            return;
        }
        const data = await runCapture(args);
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

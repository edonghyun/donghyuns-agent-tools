#!/usr/bin/env node
/**
 * Feature Intake page walk capture runner.
 *
 * Walks routes, captures page screenshots, optionally discovers same-origin
 * links, then clicks visible controls on each page and records interaction,
 * modal, dialog, navigation, disabled, error, or blocker states.
 *
 * Default mode is mutation-safe: it skips likely submit/save/delete/send style
 * controls unless --allow-mutations is passed.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_VIEWPORT = { width: 1280, height: 720 };
const DEFAULT_MAX_TARGETS_PER_ROUTE = 40;
const DEFAULT_MAX_ROUTES = 80;
const DEFAULT_SETTLE_MS = 650;
const DEFAULT_CLICK_TIMEOUT_MS = 5000;

const STRONG_MUTATION_RE =
    /(삭제|저장|발송|전송|예약|차감|보상|연장|활성화|비활성화|승인|반려|결제|구매|탈퇴|해지|delete|remove|save|submit|send|schedule|deduct|compensate|extend|activate|deactivate|approve|reject|purchase|pay|checkout)/i;

const FORM_MUTATION_RE =
    /(생성|등록|추가|수정|완료|적용|create|register|add|edit|update|apply|done|confirm)/i;

const CLI_SPEC = {
    "base-url": { type: "string", required: true },
    routes: { type: "array", required: false },
    "route-file": { type: "string", required: false },
    out: { type: "string", required: true },
    "setup-script": { type: "string", required: false },
    "storage-state": { type: "string", required: false },
    "max-targets-per-route": {
        type: "number",
        defaultValue: DEFAULT_MAX_TARGETS_PER_ROUTE,
    },
    "crawl-depth": { type: "number", defaultValue: 0 },
    "max-routes": { type: "number", defaultValue: DEFAULT_MAX_ROUTES },
    "settle-ms": { type: "number", defaultValue: DEFAULT_SETTLE_MS },
    "click-timeout-ms": {
        type: "number",
        defaultValue: DEFAULT_CLICK_TIMEOUT_MS,
    },
    viewport: {
        type: "string",
        defaultValue: `${DEFAULT_VIEWPORT.width}x${DEFAULT_VIEWPORT.height}`,
    },
    headed: { type: "boolean", defaultValue: false },
    "allow-mutations": { type: "boolean", defaultValue: false },
    "dry-run": { type: "boolean", defaultValue: false },
    "same-origin-only": { type: "boolean", defaultValue: true },
    "allow-external-links": { type: "boolean", defaultValue: false },
    "include-text": { type: "array", required: false },
    "exclude-text": { type: "array", required: false },
    help: { type: "boolean", defaultValue: false },
};

function usage() {
    return `Usage:
  node page_walk_capture.mjs --base-url http://localhost:3000 --routes /admin,/admin/users --out docs/feature-intake/my-app/screenshots
  node page_walk_capture.mjs --base-url http://localhost:3000 --routes / --crawl-depth 2 --out docs/feature-intake/my-app/screenshots

Options:
  --base-url URL                 Required. App origin, e.g. http://localhost:3000
  --routes LIST                  Comma-separated seed routes. Defaults to /
  --route-file PATH              JSON array or newline route file
  --out PATH                     Required. Screenshot output root
  --setup-script PATH            Optional ESM module exporting setup({ page, context, baseURL })
  --storage-state PATH           Optional Playwright storageState JSON
  --max-targets-per-route N      Default ${DEFAULT_MAX_TARGETS_PER_ROUTE}
  --crawl-depth N                Discover same-origin links from seed routes. Default 0
  --max-routes N                 Route cap including discovered routes. Default ${DEFAULT_MAX_ROUTES}
  --settle-ms N                  Wait after click. Default ${DEFAULT_SETTLE_MS}
  --click-timeout-ms N           Default ${DEFAULT_CLICK_TIMEOUT_MS}
  --viewport WIDTHxHEIGHT        Default 1280x720
  --headed                       Run headed browser
  --allow-mutations              Click likely save/delete/send/submit controls
  --dry-run                      Discover targets but do not click
  --same-origin-only             Skip external links. Default true
  --allow-external-links         Allow clicking external links as interaction targets
  --include-text TEXT            Repeatable. Only include targets containing text
  --exclude-text TEXT            Repeatable. Exclude targets containing text
  --help                         Show this help

Safety:
  Default mode captures page states, route transitions, modal triggers, tabs,
  filters, navigation, validation guards, and non-mutating controls, but skips
  likely final mutations. Use --allow-mutations only on disposable data or a
  mocked/staging environment.
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
                const scopedRequire = createRequire(path.join(root, "__fi_sweep__.js"));
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
                "Playwright is not installed. Install playwright in the project or run through an environment that provides it.\n" +
                    `Original import error: ${playwrightError.message}`
            );
        }
    }
}

async function loadSeedRoutes(args) {
    const routes = [];

    if (args.routes) {
        for (const value of args.routes) {
            routes.push(
                ...value
                    .split(",")
                    .map((route) => route.trim())
                    .filter(Boolean)
            );
        }
    }

    if (args["route-file"]) {
        const content = await fs.readFile(args["route-file"], "utf8");
        const trimmed = content.trim();
        if (trimmed.startsWith("[")) {
            routes.push(...JSON.parse(trimmed));
        } else {
            routes.push(
                ...trimmed
                    .split(/\r?\n/)
                    .map((route) => route.trim())
                    .filter(Boolean)
                    .filter((route) => !route.startsWith("#"))
            );
        }
    }

    if (routes.length === 0) {
        routes.push("/");
    }

    return [...new Set(routes)].map((route) =>
        route.startsWith("/") ? route : `/${route}`
    );
}

function parseViewport(value) {
    const match = /^(\d+)x(\d+)$/i.exec(value);
    if (!match) {
        throw new Error(`Invalid --viewport value: ${value}`);
    }
    return { width: Number(match[1]), height: Number(match[2]) };
}

function absolutize(baseURL, routeOrUrl) {
    return new URL(routeOrUrl, baseURL).toString();
}

function toRoute(baseURL, routeOrUrl) {
    const base = new URL(baseURL);
    const url = new URL(routeOrUrl, baseURL);
    if (url.origin !== base.origin) {
        return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
}

function hashText(value) {
    return crypto.createHash("sha1").update(value).digest("hex").slice(0, 8);
}

function slugify(value, fallback = "target") {
    const ascii = String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
    return ascii || `${fallback}-${hashText(String(value))}`;
}

async function ensureDirs(outRoot) {
    await Promise.all(
        ["pages", "interactions", "dialogs", "edge-cases", "contact-sheets"].map(
            (dir) => fs.mkdir(path.join(outRoot, dir), { recursive: true })
        )
    );
}

async function maybeRunSetup(setupScript, payload) {
    if (!setupScript) {
        return;
    }
    const moduleUrl = pathToFileURL(path.resolve(setupScript)).href;
    const setupModule = await import(moduleUrl);
    const setup = setupModule.setup ?? setupModule.default;
    if (typeof setup !== "function") {
        throw new Error(
            `Setup script must export setup({ page, context, baseURL }) or default function: ${setupScript}`
        );
    }
    await setup(payload);
}

function targetMatchesFilters(target, args) {
    const haystack = [
        target.text,
        target.testId,
        target.ariaLabel,
        target.href,
        target.role,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    for (const include of args["include-text"] ?? []) {
        if (!haystack.includes(include.toLowerCase())) {
            return false;
        }
    }

    for (const exclude of args["exclude-text"] ?? []) {
        if (haystack.includes(exclude.toLowerCase())) {
            return false;
        }
    }

    return true;
}

function classifyTargetSafety(target, args) {
    if (args["allow-mutations"]) {
        return { click: true, reason: null };
    }

    const label = [
        target.text,
        target.ariaLabel,
        target.testId,
        target.href,
        target.type,
    ]
        .filter(Boolean)
        .join(" ");

    if (STRONG_MUTATION_RE.test(label)) {
        return {
            click: false,
            reason: "likely mutation or destructive action",
        };
    }

    if ((target.insideForm || target.insideDialog) && FORM_MUTATION_RE.test(label)) {
        return {
            click: false,
            reason: "likely final form/dialog mutation",
        };
    }

    if (target.tagName === "input" && target.type === "submit") {
        return {
            click: false,
            reason: "submit input skipped in mutation-safe mode",
        };
    }

    return { click: true, reason: null };
}

async function discoverTargets(page, args, baseURL) {
    const rawTargets = await page.evaluate(({ sameOriginOnly, baseURL: rawBaseURL }) => {
        const base = new URL(rawBaseURL);
        const selector = [
            "button",
            "a[href]",
            "[role='button']",
            "[role='tab']",
            "input[type='button']",
            "input[type='submit']",
            "input[type='reset']",
            "summary",
            "[data-testid]",
        ].join(",");

        function normalize(value) {
            return String(value ?? "").replace(/\s+/g, " ").trim();
        }

        function visible(el) {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return (
                rect.width > 0 &&
                rect.height > 0 &&
                style.visibility !== "hidden" &&
                style.display !== "none" &&
                Number(style.opacity || 1) > 0
            );
        }

        function interactable(el) {
            const tagName = el.tagName.toLowerCase();
            const role = normalize(el.getAttribute("role"));
            const type = normalize(el.getAttribute("type"));
            const style = window.getComputedStyle(el);
            const clickableTags = ["a", "button", "summary"];
            const clickableInputs = ["button", "submit", "reset", "checkbox", "radio"];
            const clickableRoles = [
                "button",
                "tab",
                "link",
                "menuitem",
                "checkbox",
                "switch",
                "option",
            ];

            return (
                clickableTags.includes(tagName) ||
                (tagName === "input" && clickableInputs.includes(type)) ||
                clickableRoles.includes(role) ||
                Boolean(el.onclick || el.getAttribute("onclick")) ||
                el.tabIndex >= 0 ||
                style.cursor === "pointer"
            );
        }

        function cssPath(el) {
            if (el.dataset.fiSweepId) {
                return `[data-fi-sweep-id="${el.dataset.fiSweepId}"]`;
            }
            if (el.id) {
                return `#${CSS.escape(el.id)}`;
            }
            if (el.dataset.testid) {
                return `[data-testid="${CSS.escape(el.dataset.testid)}"]`;
            }
            return null;
        }

        return Array.from(document.querySelectorAll(selector))
            .filter((el) => visible(el) && interactable(el))
            .map((el, index) => {
                const tagName = el.tagName.toLowerCase();
                const role = normalize(el.getAttribute("role"));
                const ariaLabel = normalize(el.getAttribute("aria-label"));
                const testId = normalize(el.getAttribute("data-testid"));
                const type = normalize(el.getAttribute("type"));
                const href = tagName === "a" ? el.href : "";
                const sameOrigin =
                    !href || new URL(href, document.location.href).origin === base.origin;
                const text = normalize(
                    ariaLabel ||
                        el.innerText ||
                        el.textContent ||
                        el.getAttribute("value") ||
                        el.getAttribute("title") ||
                        testId ||
                        href
                );
                const insideForm = Boolean(el.closest("form"));
                const insideDialog = Boolean(
                    el.closest("[role='dialog'], [aria-modal='true'], dialog")
                );
                const disabled =
                    Boolean(el.disabled) ||
                    el.getAttribute("aria-disabled") === "true" ||
                    Boolean(el.closest("[aria-disabled='true']"));
                const rect = el.getBoundingClientRect();
                const sweepId = `fi-sweep-${index}`;
                el.setAttribute("data-fi-sweep-id", sweepId);

                if (sameOriginOnly && href && !sameOrigin) {
                    return null;
                }

                return {
                    index,
                    sweepId,
                    selector: cssPath(el) || `[data-fi-sweep-id="${sweepId}"]`,
                    tagName,
                    role,
                    ariaLabel,
                    testId,
                    type,
                    href,
                    text,
                    insideForm,
                    insideDialog,
                    disabled,
                    sameOrigin,
                    rect: {
                        x: Math.round(rect.x),
                        y: Math.round(rect.y),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                    },
                };
            })
            .filter(Boolean);
    }, {
        sameOriginOnly:
            args["same-origin-only"] && !args["allow-external-links"],
        baseURL,
    });

    return rawTargets
        .filter((target) => targetMatchesFilters(target, args))
        .slice(0, args["max-targets-per-route"]);
}

async function discoverSameOriginLinks(page, baseURL) {
    return page.evaluate((rawBaseURL) => {
        const base = new URL(rawBaseURL);
        return Array.from(document.querySelectorAll("a[href]"))
            .map((link) => {
                const url = new URL(link.href, document.location.href);
                if (url.origin !== base.origin) {
                    return null;
                }
                const text = String(link.innerText || link.textContent || "")
                    .replace(/\s+/g, " ")
                    .trim();
                return {
                    route: `${url.pathname}${url.search}${url.hash}`,
                    href: url.toString(),
                    text,
                };
            })
            .filter(Boolean);
    }, baseURL);
}

async function modalSnapshot(page) {
    return page.evaluate(() => {
        const modals = Array.from(
            document.querySelectorAll("[role='dialog'], [aria-modal='true'], dialog[open]")
        ).filter((el) => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return (
                rect.width > 0 &&
                rect.height > 0 &&
                style.visibility !== "hidden" &&
                style.display !== "none"
            );
        });

        return modals.map((el) =>
            String(el.innerText || el.textContent || "")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 500)
        );
    });
}

async function saveScreenshot(page, filePath) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await page.screenshot({ path: filePath, fullPage: true });
}

function relativeToOut(outRoot, filePath) {
    return path.relative(outRoot, filePath).replaceAll(path.sep, "/");
}

async function captureRoutePage(page, outRoot, route, routeIndex) {
    const routeSlug = slugify(route, `route-${routeIndex + 1}`);
    const filePath = path.join(
        outRoot,
        "pages",
        `${String(routeIndex + 1).padStart(2, "0")}-${routeSlug}.png`
    );
    await saveScreenshot(page, filePath);
    return filePath;
}

async function clickTargetAndCapture({
    page,
    baseURL,
    route,
    routeIndex,
    target,
    targetIndex,
    outRoot,
    args,
}) {
    const routeSlug = slugify(route, `route-${routeIndex + 1}`);
    const targetLabel = target.text || target.ariaLabel || target.testId || target.href;
    const targetSlug = slugify(targetLabel, `target-${targetIndex + 1}`);
    const prefix = `${String(routeIndex + 1).padStart(2, "0")}-${routeSlug}-${String(
        targetIndex + 1
    ).padStart(2, "0")}-${targetSlug}`;
    const safety = classifyTargetSafety(target, args);

    const record = {
        route,
        urlBefore: page.url(),
        target,
        targetIndex,
        safety,
        status: "pending",
        reactionType: "unknown",
        screenshot: null,
        dialogs: [],
        modalTexts: [],
        urlAfter: null,
        error: null,
    };

    if (target.disabled) {
        const filePath = path.join(outRoot, "edge-cases", `${prefix}-disabled.png`);
        await saveScreenshot(page, filePath);
        return {
            ...record,
            status: "skipped",
            reactionType: "disabled",
            screenshot: relativeToOut(outRoot, filePath),
            error: "target is disabled",
        };
    }

    if (!safety.click) {
        const filePath = path.join(outRoot, "edge-cases", `${prefix}-skipped.png`);
        await saveScreenshot(page, filePath);
        return {
            ...record,
            status: "skipped",
            reactionType: "guard",
            screenshot: relativeToOut(outRoot, filePath),
            error: safety.reason,
        };
    }

    if (args["dry-run"]) {
        return {
            ...record,
            status: "dry-run",
            reactionType: "not-clicked",
        };
    }

    const dialogs = [];
    const onDialog = async (dialog) => {
        dialogs.push({ type: dialog.type(), message: dialog.message() });
        await dialog.dismiss();
    };
    page.on("dialog", onDialog);

    try {
        const locator = page.locator(`[data-fi-sweep-id="${target.sweepId}"]`);
        await locator.scrollIntoViewIfNeeded({ timeout: args["click-timeout-ms"] });
        await locator.click({ timeout: args["click-timeout-ms"] });
        await page.waitForLoadState("domcontentloaded", { timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(args["settle-ms"]);

        const urlAfter = page.url();
        const modalTexts = await modalSnapshot(page);
        const navigated = urlAfter !== record.urlBefore;
        const hasModal = modalTexts.length > 0;

        let family = "interactions";
        let reactionType = "interaction";
        if (dialogs.length > 0 || hasModal) {
            family = "dialogs";
            reactionType = dialogs.length > 0 ? "native-dialog" : "modal";
        } else if (navigated) {
            reactionType = "navigation";
        }

        const filePath = path.join(outRoot, family, `${prefix}-${reactionType}.png`);
        await saveScreenshot(page, filePath);

        return {
            ...record,
            status: "captured",
            reactionType,
            screenshot: relativeToOut(outRoot, filePath),
            dialogs,
            modalTexts,
            urlAfter,
        };
    } catch (error) {
        const filePath = path.join(outRoot, "edge-cases", `${prefix}-error.png`);
        await saveScreenshot(page, filePath).catch(() => {});
        return {
            ...record,
            status: "error",
            reactionType: "error",
            screenshot: relativeToOut(outRoot, filePath),
            dialogs,
            urlAfter: page.url(),
            error: error.message,
        };
    } finally {
        page.off("dialog", onDialog);
    }
}

async function writeIndex(outRoot, payload) {
    const lines = [
        "# Page Walk Capture",
        "",
        `- Base URL: ${payload.baseURL}`,
        `- Generated at: ${payload.generatedAt}`,
        `- Safe mode: ${payload.allowMutations ? "allow mutations" : "mutation-safe"}`,
        `- Crawl depth: ${payload.crawlDepth}`,
        `- Routes: ${payload.routes.length}`,
        `- Results JSON: page-walk-results.json`,
        "",
        "## Page Screenshots",
        "",
        "| Route | Screenshot |",
        "|---|---|",
        ...payload.routeResults.map(
            (route) => `| ${route.route} | ${route.pageScreenshot} |`
        ),
        "",
        "## Interaction Results",
        "",
        "| Route | Target | Status | Reaction | Evidence | Notes |",
        "|---|---|---|---|---|---|",
    ];

    for (const routeResult of payload.routeResults) {
        for (const result of routeResult.results) {
            const targetText =
                result.target.text ||
                result.target.ariaLabel ||
                result.target.testId ||
                result.target.href ||
                `#${result.targetIndex + 1}`;
            const evidence = result.screenshot ?? "";
            const notes = [
                result.error,
                result.dialogs?.map((d) => `${d.type}: ${d.message}`).join(" / "),
                result.urlAfter && result.urlAfter !== result.urlBefore
                    ? `navigated to ${result.urlAfter}`
                    : "",
            ]
                .filter(Boolean)
                .join(" ");
            lines.push(
                `| ${routeResult.route} | ${targetText.replaceAll("|", "\\|")} | ${
                    result.status
                } | ${result.reactionType} | ${evidence} | ${notes.replaceAll("|", "\\|")} |`
            );
        }
    }

    await fs.writeFile(path.join(outRoot, "page-walk-index.md"), `${lines.join("\n")}\n`);
}

async function run() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        console.log(usage());
        return;
    }

    const seedRoutes = await loadSeedRoutes(args);

    const baseURL = args["base-url"];
    const outRoot = path.resolve(args.out);
    await ensureDirs(outRoot);

    const { chromium } = await loadPlaywright();
    const browser = await chromium.launch({ headless: !args.headed });
    const contextOptions = { viewport: parseViewport(args.viewport) };
    if (args["storage-state"]) {
        contextOptions.storageState = args["storage-state"];
    }
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    await maybeRunSetup(args["setup-script"], { page, context, baseURL });

    const routeResults = [];
    const routes = [];
    const queued = seedRoutes.map((route) => ({ route, depth: 0, discoveredFrom: "seed" }));
    const seenRoutes = new Set();
    try {
        for (let routeIndex = 0; routeIndex < queued.length; routeIndex += 1) {
            if (routeResults.length >= args["max-routes"]) {
                break;
            }

            const queuedRoute = queued[routeIndex];
            const route = queuedRoute.route;
            if (seenRoutes.has(route)) {
                continue;
            }
            seenRoutes.add(route);
            routes.push(route);

            const url = absolutize(baseURL, route);
            await page.goto(url, { waitUntil: "domcontentloaded" });
            await page.waitForTimeout(args["settle-ms"]);
            const pageScreenshot = await captureRoutePage(page, outRoot, route, routeIndex);
            const targets = await discoverTargets(page, args, baseURL);
            const discoveredLinks = await discoverSameOriginLinks(page, baseURL);
            if (queuedRoute.depth < args["crawl-depth"]) {
                for (const link of discoveredLinks) {
                    const nextRoute = toRoute(baseURL, link.href);
                    if (
                        nextRoute &&
                        !seenRoutes.has(nextRoute) &&
                        !queued.some((entry) => entry.route === nextRoute) &&
                        queued.length < args["max-routes"]
                    ) {
                        queued.push({
                            route: nextRoute,
                            depth: queuedRoute.depth + 1,
                            discoveredFrom: route,
                            linkText: link.text,
                        });
                    }
                }
            }
            const results = [];

            for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
                await page.goto(url, { waitUntil: "domcontentloaded" });
                await page.waitForTimeout(args["settle-ms"]);
                const currentTargets = await discoverTargets(page, args, baseURL);
                const target = currentTargets[targetIndex];
                if (!target) {
                    results.push({
                        route,
                        targetIndex,
                        status: "blocked",
                        reactionType: "unreachable",
                        error: "target disappeared after route reload",
                        screenshot: null,
                    });
                    continue;
                }

                results.push(
                    await clickTargetAndCapture({
                        page,
                        baseURL,
                        route,
                        routeIndex,
                        target,
                        targetIndex,
                        outRoot,
                        args,
                    })
                );
            }

            routeResults.push({
                route,
                url,
                depth: queuedRoute.depth,
                discoveredFrom: queuedRoute.discoveredFrom,
                discoveredLinks,
                pageScreenshot: relativeToOut(outRoot, pageScreenshot),
                targets,
                results,
            });
        }
    } finally {
        await browser.close();
    }

    const payload = {
        generatedAt: new Date().toISOString(),
        baseURL,
        routes,
        seedRoutes,
        crawlDepth: args["crawl-depth"],
        allowMutations: args["allow-mutations"],
        dryRun: args["dry-run"],
        routeResults,
        summary: summarize(routeResults),
    };

    await fs.writeFile(
        path.join(outRoot, "page-walk-results.json"),
        `${JSON.stringify(payload, null, 2)}\n`
    );
    await writeIndex(outRoot, payload);

    console.log(JSON.stringify(payload.summary, null, 2));
}

function summarize(routeResults) {
    const summary = {
        routes: routeResults.length,
        targets: 0,
        captured: 0,
        skipped: 0,
        errors: 0,
        dialogs: 0,
        modals: 0,
        navigations: 0,
    };

    for (const routeResult of routeResults) {
        for (const result of routeResult.results) {
            summary.targets += 1;
            if (result.status === "captured") {
                summary.captured += 1;
            }
            if (result.status === "skipped" || result.status === "dry-run") {
                summary.skipped += 1;
            }
            if (result.status === "error" || result.status === "blocked") {
                summary.errors += 1;
            }
            if (result.reactionType === "native-dialog") {
                summary.dialogs += 1;
            }
            if (result.reactionType === "modal") {
                summary.modals += 1;
            }
            if (result.reactionType === "navigation") {
                summary.navigations += 1;
            }
        }
    }

    return summary;
}

run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});

#!/usr/bin/env node
/**
 * UI Operator local session surface mapper.
 *
 * Reads a local Codex session JSONL file and turns observed URLs, routes,
 * screenshots, and UI-state words into a draft ui-operator capture plan.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const CLI_SPEC = {
    "session-id": { type: "string" },
    "session-file": { type: "string" },
    "sessions-root": {
        type: "string",
        defaultValue: path.join(os.homedir(), ".codex", "sessions"),
    },
    out: { type: "string", required: true },
    slug: { type: "string" },
    title: { type: "string" },
    "baseline-url": { type: "string" },
    "current-url": { type: "string" },
    "max-routes": { type: "number", defaultValue: 50 },
    help: { type: "boolean", defaultValue: false },
};

const ROUTE_RE = /(?<![\w.-])(\/admin(?:\/[a-zA-Z0-9._~:@!$&'()*+,;=%-]+)*)/g;
const URL_RE = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):\d+(?:\/[^\s"'<>)]*)?/g;
const SCREENSHOT_RE = /(?:\/Users\/[^\s"'<>]+|\/tmp\/[^\s"'<>]+|[A-Za-z0-9._/-]+)\.(?:png|jpg|jpeg|webp)\b/g;

const DOMAIN_ROUTES = [
    { re: /(lecture|lectures|강의)/i, route: "/admin/lectures", label: "Admin lectures" },
    { re: /(consultant|consultants|컨설턴트|상담사)/i, route: "/admin/users/consultants", label: "Admin consultants" },
    { re: /(student|students|학생)/i, route: "/admin/users/students", label: "Admin students" },
    { re: /(lecture-profile|lecture-profiles|프로필)/i, route: "/admin/lecture-profiles", label: "Admin lecture profiles" },
    { re: /(notification|notifications|알림|문자|sms)/i, route: "/admin/notifications", label: "Admin notifications" },
    { re: /(reserved|예약)/i, route: "/admin/reserved-notifications", label: "Admin reserved notifications" },
    { re: /(sent|발송내역|발송)/i, route: "/admin/sent-notifications", label: "Admin sent notifications" },
    { re: /(solapi)/i, route: "/admin/solapi-dashboard", label: "Admin Solapi dashboard" },
    { re: /(timeline|타임라인)/i, route: "/admin/timeline", label: "Admin timeline" },
];

function usage() {
    return `Usage:
  node session_surface_mapper.mjs --session-id 019ed35e-a14b-7db3-82c6-eefcb9c37238 --out artifacts/ui-operator/libera-admin-ui/capture-plan.json
  node session_surface_mapper.mjs --session-file ~/.codex/sessions/2026/06/17/rollout-...jsonl --out artifacts/ui-operator/run/capture-plan.json

Options:
  --session-id ID          Local Codex session id to find under ~/.codex/sessions
  --session-file PATH      Explicit rollout JSONL path
  --sessions-root PATH     Defaults to ~/.codex/sessions
  --out PATH               Required capture-plan.json path
  --baseline-url URL       Override inferred baseline URL
  --current-url URL        Override inferred current URL
  --max-routes N           Default 50
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
        if (spec.type === "number") {
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
    if (!args["session-id"] && !args["session-file"]) {
        throw new Error("Pass --session-id or --session-file");
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

function slugify(value, fallback = "ui-session") {
    const slug = String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return slug || fallback;
}

async function findSessionFile(root, sessionId) {
    const stack = [path.resolve(root)];
    while (stack.length) {
        const dir = stack.pop();
        let entries = [];
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                stack.push(fullPath);
            } else if (entry.isFile() && entry.name.includes(sessionId) && entry.name.endsWith(".jsonl")) {
                return fullPath;
            }
        }
    }
    throw new Error(`Could not find session ${sessionId} under ${root}`);
}

function collectStrings(value, parts, depth = 0) {
    if (depth > 7 || value == null) {
        return;
    }
    if (typeof value === "string") {
        if (value.length < 200000) {
            parts.push(value);
        }
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            collectStrings(item, parts, depth + 1);
        }
        return;
    }
    if (typeof value === "object") {
        for (const [key, child] of Object.entries(value)) {
            if (key === "encrypted_content" || key === "base_instructions") {
                continue;
            }
            collectStrings(child, parts, depth + 1);
        }
    }
}

async function readSession(sessionFile) {
    const lines = (await fs.readFile(sessionFile, "utf8")).split(/\r?\n/).filter(Boolean);
    const strings = [];
    const meta = {};
    for (const line of lines) {
        let item;
        try {
            item = JSON.parse(line);
        } catch {
            continue;
        }
        if (item.type === "session_meta") {
            Object.assign(meta, {
                id: item.payload?.id,
                cwd: item.payload?.cwd,
                timestamp: item.payload?.timestamp,
                originator: item.payload?.originator,
            });
        }
        collectStrings(item, strings);
    }
    return { meta, text: strings.join("\n") };
}

function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

function cleanRoute(route) {
    return route
        .replace(/[),.;\]}]+$/g, "")
        .replace(/\/+$/g, "")
        .replace(/\/\./g, "/") || "/";
}

function extractUrls(text) {
    return unique([...text.matchAll(URL_RE)].map((match) => match[0].replace(/[),.;\]}]+$/g, "")));
}

function rootUrl(urlValue) {
    try {
        const url = new URL(urlValue);
        return url.origin;
    } catch {
        return "";
    }
}

function inferUrls(urls, text, args) {
    const origins = unique(urls.map(rootUrl));
    const labeled = { baselineUrl: "", currentUrl: "" };
    for (const origin of origins) {
        const port = new URL(origin).port;
        const window = text.slice(Math.max(0, text.indexOf(origin) - 120), text.indexOf(origin) + 120);
        if (/(baseline|before|main|기준|이전)/i.test(window)) {
            labeled.baselineUrl ||= origin;
        }
        if (/(current|after|branch|candidate|변경|현재)/i.test(window)) {
            labeled.currentUrl ||= origin;
        }
        if (port === "3002") {
            labeled.baselineUrl ||= origin;
        }
        if (port === "3004") {
            labeled.currentUrl ||= origin;
        }
    }

    return {
        baselineUrl: args["baseline-url"] || labeled.baselineUrl || origins[0] || "",
        currentUrl: args["current-url"] || labeled.currentUrl || origins.find((origin) => origin !== labeled.baselineUrl) || origins[0] || "",
    };
}

function extractScreenshots(text) {
    return unique([...text.matchAll(SCREENSHOT_RE)].map((match) => match[0].replace(/[),.;\]}]+$/g, "")));
}

function extractRoutes(text, screenshots, maxRoutes) {
    const routes = unique([...text.matchAll(ROUTE_RE)].map((match) => cleanRoute(match[1])));
    const haystack = `${text}\n${screenshots.join("\n")}`;
    for (const entry of DOMAIN_ROUTES) {
        if (entry.re.test(haystack)) {
            routes.push(entry.route);
        }
    }
    return unique(routes)
        .filter((route) => route !== "/admin")
        .slice(0, maxRoutes);
}

function labelFromRoute(route) {
    const domain = DOMAIN_ROUTES.find((entry) => entry.route === route);
    if (domain) {
        return domain.label;
    }
    return route
        .split("/")
        .filter(Boolean)
        .map((part) => part.replace(/^:/, ""))
        .join(" ")
        .replace(/\b\w/g, (char) => char.toUpperCase()) || "Home";
}

function stateFromName(name) {
    const lower = name.toLowerCase();
    if (/(modal|dialog|detail|상세)/.test(lower)) {
        return { id: "detail-modal", label: "Detail modal", pendingSelector: true };
    }
    if (/(dropdown|filter|select|grade|검색|필터)/.test(lower)) {
        return { id: "filter-dropdown", label: "Filter or dropdown", pendingSelector: true };
    }
    if (/(drawer|sheet|bottom)/.test(lower)) {
        return { id: "drawer-or-sheet", label: "Drawer or bottom sheet", pendingSelector: true };
    }
    return null;
}

function statesForRoute(route, screenshots, text) {
    const states = [{ id: "page", label: "Page" }];
    const routeKey = route.split("/").filter(Boolean).at(-1) || "";
    const related = screenshots.filter((shot) => shot.toLowerCase().includes(routeKey.toLowerCase()));
    for (const shot of related) {
        const state = stateFromName(path.basename(shot));
        if (state) {
            states.push({ ...state, sourceScreenshot: shot });
        }
    }
    if (/(modal|dialog|모달|상세)/i.test(text)) {
        states.push({ id: "modal", label: "Modal state", pendingSelector: true });
    }
    if (/(dropdown|filter|select|드롭다운|필터)/i.test(text)) {
        states.push({ id: "filter-dropdown", label: "Filter or dropdown", pendingSelector: true });
    }
    const seen = new Set();
    return states.filter((state) => {
        if (seen.has(state.id)) {
            return false;
        }
        seen.add(state.id);
        return true;
    });
}

function detectViewports(text, screenshots) {
    const haystack = `${text}\n${screenshots.join("\n")}`;
    const viewports = [{ name: "desktop", width: 1440, height: 900 }];
    if (/(mobile|390x|375x|아이폰|안드로이드|iOS|Android)/i.test(haystack)) {
        viewports.push({ name: "mobile", width: 390, height: 844 });
    }
    return viewports;
}

function makePlan({ args, sessionFile, meta, text }) {
    const urls = extractUrls(text);
    const screenshots = extractScreenshots(text);
    const routes = extractRoutes(text, screenshots, args["max-routes"]);
    const { baselineUrl, currentUrl } = inferUrls(urls, text, args);
    const outDir = path.dirname(path.resolve(args.out));
    const slug = args.slug || slugify(path.basename(outDir));

    return {
        schemaVersion: 1,
        plugin: "ui-operator",
        adapter: "local-codex-session",
        slug,
        title: args.title || `UI session capture plan ${meta.id || ""}`.trim(),
        createdAt: new Date().toISOString(),
        source: {
            sessionId: meta.id || args["session-id"] || "",
            sessionFile,
            cwd: meta.cwd || "",
            timestamp: meta.timestamp || "",
            observedUrls: urls,
            observedScreenshots: screenshots,
        },
        baselineUrl,
        currentUrl,
        viewports: detectViewports(text, screenshots),
        routes: (routes.length ? routes : ["/"]).map((route, index) => ({
            id: slugify(route.replace(/^\//, ""), `route-${index + 1}`),
            path: route,
            label: labelFromRoute(route),
            confidence: routes.length ? "observed-or-inferred-from-session" : "inference",
            states: statesForRoute(route, screenshots, text),
            notes: [
                "Drafted from local session evidence. Confirm selectors and route availability before capture.",
            ],
        })),
        notes: [
            "This plan was generated from local Codex session text and tool traces.",
            "Selectors for modal/dropdown states are intentionally pending until inspected in the running app.",
        ],
    };
}

async function writeManifest(plan, outPath) {
    const root = path.dirname(path.resolve(outPath));
    const manifest = {
        schemaVersion: 1,
        plugin: "ui-operator",
        slug: plan.slug,
        title: plan.title,
        createdAt: plan.createdAt,
        updatedAt: new Date().toISOString(),
        planPath: path.basename(outPath),
        artifactRoot: root,
        source: plan.source,
    };
    await fs.writeFile(path.join(root, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

async function main() {
    try {
        const args = parseArgs(process.argv.slice(2));
        if (args.help) {
            console.log(usage());
            return;
        }
        const sessionFile = args["session-file"]
            ? path.resolve(args["session-file"].replace(/^~/, os.homedir()))
            : await findSessionFile(args["sessions-root"], args["session-id"]);
        const session = await readSession(sessionFile);
        const plan = makePlan({ args, sessionFile, ...session });
        await fs.mkdir(path.dirname(path.resolve(args.out)), { recursive: true });
        await fs.writeFile(args.out, `${JSON.stringify(plan, null, 2)}\n`);
        await writeManifest(plan, args.out);
        console.log(JSON.stringify({
            out: path.resolve(args.out),
            sessionFile,
            routes: plan.routes.length,
            states: plan.routes.reduce((sum, route) => sum + route.states.length, 0),
            baselineUrl: plan.baselineUrl,
            currentUrl: plan.currentUrl,
        }, null, 2));
    } catch (error) {
        console.error(error?.stack || error?.message || String(error));
        process.exitCode = 1;
    }
}

await main();

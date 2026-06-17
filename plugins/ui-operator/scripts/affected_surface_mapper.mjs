#!/usr/bin/env node
/**
 * UI Operator affected surface mapper.
 *
 * Turns changed files and a task description into a draft capture-plan.json.
 * It is intentionally conservative: uncertain routes are marked as inference
 * and selector-dependent states are left with pendingSelector notes.
 */

import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_VIEWPORTS = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
];

const CLI_SPEC = {
    files: { type: "array" },
    "diff-name-only": { type: "string" },
    task: { type: "string", defaultValue: "" },
    slug: { type: "string" },
    title: { type: "string" },
    out: { type: "string", required: true },
    "baseline-url": { type: "string", defaultValue: "" },
    "current-url": { type: "string", defaultValue: "" },
    viewport: { type: "array" },
    help: { type: "boolean", defaultValue: false },
};

const DOMAIN_ROUTES = [
    { re: /(lecture|lectures|강의)/i, route: "/admin/lectures", label: "Admin lectures" },
    { re: /(consultant|consultants|컨설턴트|상담사)/i, route: "/admin/users/consultants", label: "Admin consultants" },
    { re: /(student|students|학생)/i, route: "/admin/users/students", label: "Admin students" },
    { re: /(lecture-profile|lecture-profiles|profile|프로필)/i, route: "/admin/lecture-profiles", label: "Admin lecture profiles" },
    { re: /(notification|notifications|alim|알림|문자|sms)/i, route: "/admin/notifications", label: "Admin notifications" },
    { re: /(reserved|예약)/i, route: "/admin/reserved-notifications", label: "Admin reserved notifications" },
    { re: /(sent|발송내역|발송)/i, route: "/admin/sent-notifications", label: "Admin sent notifications" },
    { re: /(solapi)/i, route: "/admin/solapi-dashboard", label: "Admin Solapi dashboard" },
    { re: /(timeline|타임라인)/i, route: "/admin/timeline", label: "Admin timeline" },
    { re: /(admin)/i, route: "/admin", label: "Admin" },
];

function usage() {
    return `Usage:
  node affected_surface_mapper.mjs --diff-name-only /tmp/files.txt --task "admin list toolbar consistency" --out artifacts/ui-operator/admin-list-ui/capture-plan.json
  node affected_surface_mapper.mjs --files src/app/admin/lectures/page.tsx,src/components/AdminToolbar.tsx --out artifacts/ui-operator/admin-list-ui/capture-plan.json

Options:
  --files LIST              Comma-separated changed files. Repeatable.
  --diff-name-only PATH     File containing git diff --name-only output
  --task TEXT               Task or PR summary
  --slug SLUG               Output slug. Defaults from --out parent folder
  --title TEXT              Human-readable title
  --baseline-url URL        Baseline origin
  --current-url URL         Current origin
  --viewport WIDTHxHEIGHT   Repeatable. Defaults to desktop and mobile
  --out PATH                Required capture-plan.json path
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

function slugify(value, fallback = "ui-run") {
    const slug = String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return slug || fallback;
}

function parseViewport(value) {
    const match = String(value).match(/^(\d+)x(\d+)(?::([a-zA-Z0-9_-]+))?$/);
    if (!match) {
        throw new Error(`Invalid viewport ${value}; expected WIDTHxHEIGHT or WIDTHxHEIGHT:name`);
    }
    const [, width, height, name] = match;
    return { name: name || `${width}x${height}`, width: Number(width), height: Number(height) };
}

async function loadFiles(args) {
    const files = [];
    for (const value of args.files || []) {
        files.push(...value.split(",").map((entry) => entry.trim()).filter(Boolean));
    }
    if (args["diff-name-only"]) {
        const content = await fs.readFile(args["diff-name-only"], "utf8");
        files.push(
            ...content
                .split(/\r?\n/)
                .map((entry) => entry.trim())
                .filter(Boolean)
                .filter((entry) => !entry.startsWith("#"))
        );
    }
    return [...new Set(files)];
}

function routeFromFrameworkPath(file) {
    const normalized = file.split(path.sep).join("/");

    const appMatch = normalized.match(/(?:^|\/)(?:src\/)?app\/(.+)$/);
    if (appMatch) {
        const parts = appMatch[1].split("/");
        const fileName = parts.at(-1) || "";
        if (/^(page|layout|template|loading|error|default)\.(t|j)sx?$/.test(fileName)) {
            parts.pop();
        }
        const routeParts = parts
            .filter((part) => !part.startsWith("(") && !part.endsWith(")"))
            .filter((part) => !part.startsWith("@"))
            .map((part) => part.replace(/^\[(.+)\]$/, ":$1"));
        if (routeParts.length) {
            return `/${routeParts.join("/")}`;
        }
    }

    const pagesMatch = normalized.match(/(?:^|\/)(?:src\/)?pages\/(.+)$/);
    if (pagesMatch) {
        let route = pagesMatch[1]
            .replace(/\.(t|j)sx?$/, "")
            .replace(/\/index$/, "")
            .replace(/^\[(.+)\]$/, ":$1")
            .replace(/\/\[(.+?)\]/g, "/:$1");
        if (route && !route.startsWith("_") && !route.startsWith("api/")) {
            return `/${route}`;
        }
    }

    const svelteMatch = normalized.match(/(?:^|\/)src\/routes\/(.+)\/\+page\.svelte$/);
    if (svelteMatch) {
        return `/${svelteMatch[1].replace(/\[(.+?)\]/g, ":$1")}`;
    }

    return "";
}

function routeFromDomainHints(file, task) {
    const haystack = `${file}\n${task}`;
    for (const entry of DOMAIN_ROUTES) {
        if (entry.re.test(haystack)) {
            return entry.route;
        }
    }
    return "";
}

function labelFromRoute(route) {
    return route
        .split("/")
        .filter(Boolean)
        .map((part) => part.replace(/^:/, ""))
        .join(" ")
        .replace(/\b\w/g, (char) => char.toUpperCase()) || "Home";
}

function statesFromHints(files, task) {
    const haystack = `${files.join("\n")}\n${task}`;
    const states = [{ id: "page", label: "Page" }];

    if (/(modal|dialog|drawer|sheet|상세|모달|다이얼로그|드로어)/i.test(haystack)) {
        states.push({
            id: "modal",
            label: "Modal or drawer state",
            pendingSelector: true,
            notes: ["Add the click action that opens the modal/drawer after inspecting the running UI."],
        });
    }
    if (/(dropdown|select|combobox|filter|search|필터|검색|드롭다운|셀렉트)/i.test(haystack)) {
        states.push({
            id: "filter-dropdown",
            label: "Filter or dropdown state",
            pendingSelector: true,
            notes: ["Add selector/action for the relevant filter or dropdown."],
        });
    }
    if (/(tab|tabs|탭)/i.test(haystack)) {
        states.push({
            id: "tab-state",
            label: "Tab state",
            pendingSelector: true,
            notes: ["Add the tab click action that reveals this state."],
        });
    }
    if (/(table|row|list|toolbar|action|테이블|목록|툴바|액션)/i.test(haystack)) {
        states.push({
            id: "row-actions",
            label: "Row actions or toolbar state",
            pendingSelector: true,
            notes: ["Capture the row action menu or toolbar variant if it is visible only after interaction."],
        });
    }
    if (/(empty|error|loading|skeleton|빈|오류|에러|로딩)/i.test(haystack)) {
        states.push({
            id: "edge-state",
            label: "Empty, loading, or error state",
            pendingSelector: true,
            notes: ["Requires data or network setup; mark blocked if not reproducible locally."],
        });
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

function groupFilesByRoute(files, task) {
    const groups = new Map();

    for (const file of files) {
        const frameworkRoute = routeFromFrameworkPath(file);
        const domainRoute = frameworkRoute || routeFromDomainHints(file, task);
        if (!domainRoute) {
            continue;
        }
        const key = domainRoute;
        const group = groups.get(key) || {
            route: key,
            files: [],
            confidence: frameworkRoute ? "confirmed-from-path" : "inference",
        };
        group.files.push(file);
        if (frameworkRoute) {
            group.confidence = "confirmed-from-path";
        }
        groups.set(key, group);
    }

    if (!groups.size) {
        const route = routeFromDomainHints("", task);
        if (route) {
            groups.set(route, {
                route,
                files: [],
                confidence: "inference",
            });
        }
    }

    return [...groups.values()];
}

function makePlan(args, files) {
    const outDir = path.dirname(path.resolve(args.out));
    const slug = args.slug || slugify(path.basename(outDir));
    const viewports = args.viewport?.length ? args.viewport.map(parseViewport) : DEFAULT_VIEWPORTS;
    const groups = groupFilesByRoute(files, args.task);
    const routes = groups.map((group, index) => ({
        id: slugify(group.route.replace(/^\//, ""), `route-${index + 1}`),
        path: group.route,
        label: labelFromRoute(group.route),
        confidence: group.confidence,
        sourceFiles: group.files,
        notes: group.confidence === "inference" ? ["Route inferred from file/task naming; confirm in browser."] : [],
        states: statesFromHints(group.files, args.task),
    }));

    if (!routes.length) {
        routes.push({
            id: "needs-route-confirmation",
            path: "/",
            label: "Route needs confirmation",
            confidence: "inference",
            sourceFiles: files,
            notes: ["No route could be inferred from changed files. Replace this with the real affected route before capture."],
            states: statesFromHints(files, args.task),
        });
    }

    return {
        schemaVersion: 1,
        plugin: "ui-operator",
        slug,
        title: args.title || args.task || slug,
        createdAt: new Date().toISOString(),
        source: {
            task: args.task,
            changedFiles: files,
        },
        baselineUrl: args["baseline-url"],
        currentUrl: args["current-url"],
        viewports,
        routes,
        notes: [
            "This plan is a draft. Confirm routes and fill pendingSelector actions before relying on modal/dropdown coverage.",
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
        const files = await loadFiles(args);
        const plan = makePlan(args, files);
        await fs.mkdir(path.dirname(path.resolve(args.out)), { recursive: true });
        await fs.writeFile(args.out, `${JSON.stringify(plan, null, 2)}\n`);
        await writeManifest(plan, args.out);
        console.log(JSON.stringify({
            out: path.resolve(args.out),
            routes: plan.routes.length,
            states: plan.routes.reduce((sum, route) => sum + route.states.length, 0),
            inferredRoutes: plan.routes.filter((route) => route.confidence === "inference").length,
        }, null, 2));
    } catch (error) {
        console.error(error?.stack || error?.message || String(error));
        process.exitCode = 1;
    }
}

await main();

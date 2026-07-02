#!/usr/bin/env node
/**
 * standup-composer reference implementation.
 *
 * Deterministic, no LLM. Walks GitHub REST to produce the same
 * Yesterday / Today / Blockers block the SKILL.md prompt teaches.
 *
 *   node standup.mjs --repos owner/name[,owner/name] --author login \
 *                    [--window 24h] [--mode compact]
 *
 * Reads GITHUB_TOKEN for authenticated rate.
 */

import { argv, exit, env } from "node:process";

const flags = {};
for (let i = 2; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const key = a.slice(2);
    const val = argv[i + 1]?.startsWith("--") ? "true" : argv[++i];
    flags[key] = val ?? "true";
  }
}

if (!flags.repos || !flags.author) {
  console.error(
    "usage: standup.mjs --repos owner/name[,owner/name] --author login [--window 24h] [--mode compact]",
  );
  exit(2);
}

const REPOS = flags.repos.split(",").map((s) => s.trim()).filter(Boolean);
const AUTHOR = flags.author;
const WINDOW = flags.window ?? "24h";
const MODE = flags.mode === "compact" ? "compact" : "full";
const TOKEN = env.GITHUB_TOKEN ?? env.GH_TOKEN ?? null;

function since(window) {
  const now = Date.now();
  const m = /^(\d+)([hd])$/.exec(window);
  if (!m) return new Date(now - 24 * 3600 * 1000).toISOString();
  const n = Number(m[1]);
  const unitMs = m[2] === "h" ? 3600 * 1000 : 24 * 3600 * 1000;
  return new Date(now - n * unitMs).toISOString();
}

const SINCE = since(WINDOW);

async function gh(path) {
  const url = path.startsWith("http") ? path : `https://api.github.com${path}`;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "standup-composer-reference",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(url, { headers });
  const remaining = res.headers.get("x-ratelimit-remaining");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${res.status} ${url}: ${body.slice(0, 200)}`);
  }
  return { data: await res.json(), remaining };
}

function scoreCommit(c, defaultBranch) {
  const msg = (c.commit?.message ?? "").split("\n")[0];
  let s = 0;
  if (c.parents?.length >= 2 && !msg) s -= 20;
  if (defaultBranch) s += 8;
  else s += 4;
  if (/^(chore|style|typo|fmt|lint|whitespace)/i.test(msg)) s -= 10;
  return s;
}

function scorePr(pr) {
  let s = 0;
  if (pr.pull_request?.merged_at) s += 30;
  else if (pr.draft) s += 10;
  else s += 25;
  if (pr.body && /(closes|fixes|resolves)\s+#\d+/i.test(pr.body)) s += 10;
  return s;
}

function scoreReview(r) {
  if (r.state === "APPROVED" || r.state === "CHANGES_REQUESTED") return 20;
  return 8;
}

function shortRepo(fullName, scope) {
  if (scope && scope.length === 1 && scope[0] === fullName) {
    return fullName.split("/")[1];
  }
  return fullName;
}

async function collectRepo(fullName) {
  const [owner, name] = fullName.split("/");
  const items = [];
  let rateNote = null;

  const commits = await gh(
    `/repos/${owner}/${name}/commits?author=${encodeURIComponent(AUTHOR)}&since=${encodeURIComponent(SINCE)}&per_page=50`,
  ).catch((e) => ({ data: [], error: e.message }));
  if (commits.error) rateNote = commits.error;
  const meta = await gh(`/repos/${owner}/${name}`).catch(() => ({ data: {} }));
  const defaultBranch = meta.data?.default_branch ?? "main";
  for (const c of commits.data) {
    items.push({
      kind: "commit",
      sha: c.sha,
      short: c.sha.slice(0, 7),
      msg: (c.commit?.message ?? "").split("\n")[0],
      url: c.html_url,
      repo: fullName,
      score: scoreCommit(c, defaultBranch),
    });
  }

  const opened = await gh(
    `/search/issues?q=${encodeURIComponent(
      `author:${AUTHOR} is:pr repo:${fullName} created:>=${SINCE}`,
    )}&per_page=30`,
  ).catch((e) => ({ data: { items: [] }, error: e.message }));
  for (const pr of opened.data.items ?? []) {
    items.push({
      kind: "pr-opened",
      num: pr.number,
      title: pr.title,
      url: pr.html_url,
      draft: pr.draft,
      repo: fullName,
      score: scorePr(pr),
    });
  }

  const merged = await gh(
    `/search/issues?q=${encodeURIComponent(
      `author:${AUTHOR} is:pr is:merged repo:${fullName} merged:>=${SINCE}`,
    )}&per_page=30`,
  ).catch(() => ({ data: { items: [] } }));
  for (const pr of merged.data.items ?? []) {
    items.push({
      kind: "pr-merged",
      num: pr.number,
      title: pr.title,
      url: pr.html_url,
      repo: fullName,
      score: scorePr({ ...pr, pull_request: { merged_at: pr.closed_at } }),
    });
  }

  const reviewed = await gh(
    `/search/issues?q=${encodeURIComponent(
      `reviewed-by:${AUTHOR} is:pr repo:${fullName} updated:>=${SINCE}`,
    )}&per_page=30`,
  ).catch(() => ({ data: { items: [] } }));
  for (const pr of reviewed.data.items ?? []) {
    if (pr.user?.login === AUTHOR) continue;
    items.push({
      kind: "pr-reviewed",
      num: pr.number,
      title: pr.title,
      url: pr.html_url,
      repo: fullName,
      score: scoreReview({ state: "APPROVED" }),
    });
  }

  return { items, rateNote };
}

function fold(items) {
  const seen = new Map();
  for (const it of items) {
    const key = `${it.kind}:${it.repo}:${it.num ?? it.short}`;
    if (!seen.has(key) || seen.get(key).score < it.score) seen.set(key, it);
  }
  return [...seen.values()].sort((a, b) => b.score - a.score);
}

function renderLine(it, scope) {
  const repo = shortRepo(it.repo, scope);
  switch (it.kind) {
    case "pr-merged":
      return `merged ${repo}#${it.num} — ${it.title}`;
    case "pr-opened":
      return `opened ${repo}#${it.num}${it.draft ? " (draft)" : ""} — ${it.title}`;
    case "pr-reviewed":
      return `reviewed ${repo}#${it.num} — ${it.title}`;
    case "commit":
      return `\`${it.short}\` ${it.msg} — ${repo}`;
  }
  return `${it.kind} ${it.title ?? it.msg}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function renderFull(items, scope) {
  const kept = items.filter((i) => i.score > 0).slice(0, 6);
  const yesterday = kept.length
    ? kept.map((i) => `• ${renderLine(i, scope)}`).join("\n")
    : "_no activity_";
  const blockers = "_none_";
  return [
    `*Standup — ${today()} — ${AUTHOR}*`,
    "",
    "*Yesterday*",
    yesterday,
    "",
    "*Today*",
    "• _fill in — reference impl does not infer_",
    "",
    "*Blockers*",
    blockers,
  ].join("\n");
}

function renderCompact(items, scope) {
  const kept = items.filter((i) => i.score > 0).slice(0, 3);
  const y = kept.length
    ? kept.map((i) => renderLine(i, scope)).join("; ")
    : "no activity";
  return `Yesterday: ${y}\nToday: (fill in)\nBlockers: none`;
}

async function main() {
  const all = [];
  const notes = [];
  for (const r of REPOS) {
    try {
      const { items, rateNote } = await collectRepo(r);
      all.push(...items);
      if (rateNote) notes.push(`${r}: ${rateNote}`);
    } catch (e) {
      notes.push(`${r}: ${e.message}`);
    }
  }
  const folded = fold(all);
  const out =
    MODE === "compact" ? renderCompact(folded, REPOS) : renderFull(folded, REPOS);
  if (notes.length) console.error(`# notes\n${notes.join("\n")}`);
  console.log(out);
}

main().catch((e) => {
  console.error(e.stack || e.message);
  exit(1);
});

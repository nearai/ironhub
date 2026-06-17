#!/usr/bin/env node
// Reference implementation for the `pr-triage-digest` skill.
//
// Usage:
//   node triage.mjs owner/repo [owner/other-repo ...]
//
// Auth: reads GITHUB_TOKEN or GH_TOKEN from env. Runs unauthenticated otherwise.
//
// This file mirrors the scoring, bucketing, and rendering rules in ../SKILL.md.
// The SKILL.md prompt is the source of truth; this script exists so partners
// can port the logic to a different runtime and so the digest is reproducible
// in CI without relying on an LLM.

const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const SINCE_DAYS = Number(process.env.TRIAGE_SINCE_DAYS || 30);
const NOW = new Date(process.env.TRIAGE_NOW || Date.now());

const GH = "https://api.github.com";

const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "ironhub-pr-triage-digest/1.0",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function gh(path) {
  const r = await fetch(`${GH}${path}`, { headers });
  if (!r.ok) {
    const e = new Error(`GitHub ${r.status} on ${path}`);
    e.status = r.status;
    throw e;
  }
  return r.json();
}

async function rateLimit() {
  try {
    const j = await gh("/rate_limit");
    return j.resources?.core ?? { remaining: TOKEN ? 5000 : 60 };
  } catch {
    return { remaining: TOKEN ? 5000 : 60 };
  }
}

async function listOpenPRs(owner, repo) {
  const out = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await gh(
      `/repos/${owner}/${repo}/pulls?state=open&per_page=100&page=${page}&sort=updated&direction=desc`
    );
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

async function enrich(owner, repo, number) {
  return gh(`/repos/${owner}/${repo}/pulls/${number}`);
}

async function checkRuns(owner, repo, sha) {
  try {
    const j = await gh(`/repos/${owner}/${repo}/commits/${sha}/check-runs?per_page=100`);
    return j.check_runs || [];
  } catch {
    return [];
  }
}

const firstContribCache = new Map();
async function isFirstContributor(owner, repo, author) {
  const key = `${owner}/${repo}::${author}`;
  if (firstContribCache.has(key)) return firstContribCache.get(key);
  try {
    const q = encodeURIComponent(`author:${author} repo:${owner}/${repo} type:pr is:merged`);
    const j = await gh(`/search/issues?q=${q}&per_page=1`);
    const isFirst = (j.total_count ?? 0) === 0;
    firstContribCache.set(key, isFirst);
    return isFirst;
  } catch {
    firstContribCache.set(key, false);
    return false;
  }
}

function days(dateStr) {
  const d = new Date(dateStr);
  return Math.max(0, Math.floor((NOW - d) / 86400000));
}

function ciStatus(runs) {
  if (!runs.length) return { score: 1, glyph: "—" };
  const states = runs.map(r => r.conclusion || r.status);
  const fail = states.some(s => s === "failure" || s === "cancelled" || s === "timed_out");
  const pending = states.some(s => s === "queued" || s === "in_progress" || s === null);
  const success = states.every(s => s === "success" || s === "neutral" || s === "skipped");
  if (fail) return { score: 4, glyph: "❌" };
  if (success) return { score: 0, glyph: "✅" };
  if (pending) return { score: 2, glyph: "⏳" };
  return { score: 3, glyph: "⚠️" };
}

function sizeScore(additions, deletions, changedFiles) {
  const loc = (additions || 0) + (deletions || 0);
  if (loc <= 50 && changedFiles <= 2) return 0;
  if (loc <= 200 && changedFiles <= 5) return 1;
  if (loc <= 500 && changedFiles <= 10) return 2;
  if (loc <= 2000 && changedFiles <= 30) return 3;
  return 4;
}

function stalenessScore(d) {
  if (d <= 2) return 0;
  if (d <= 7) return 1;
  if (d <= 14) return 2;
  if (d <= 30) return 3;
  return 4;
}

function mergeScore(mergeable) {
  if (mergeable === true) return 0;
  if (mergeable === false) return 4;
  return 1;
}

function reviewShort(pr) {
  const requested = (pr.requested_reviewers?.length || 0) + (pr.requested_teams?.length || 0);
  if (pr._reviewSummary === "changes_requested") return { score: 3, label: "changes-requested" };
  if (pr._reviewSummary === "approved") {
    const n = pr._approvals || 1;
    return { score: n >= 2 ? 0 : 1, label: n >= 2 ? `approved-${n}` : "approved-once" };
  }
  if (requested > 0) return { score: 2, label: "no-reviews" };
  return { score: 2, label: "no-reviews" };
}

async function summarizeReviews(owner, repo, number) {
  try {
    const reviews = await gh(`/repos/${owner}/${repo}/pulls/${number}/reviews?per_page=100`);
    const latestByUser = new Map();
    for (const r of reviews) {
      const k = r.user?.login;
      if (!k) continue;
      const cur = latestByUser.get(k);
      if (!cur || new Date(r.submitted_at) > new Date(cur.submitted_at)) latestByUser.set(k, r);
    }
    const states = [...latestByUser.values()].map(r => r.state);
    if (states.some(s => s === "CHANGES_REQUESTED")) return { summary: "changes_requested" };
    const approvals = states.filter(s => s === "APPROVED").length;
    if (approvals > 0) return { summary: "approved", approvals };
    return { summary: "none" };
  } catch {
    return { summary: "none" };
  }
}

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function compactAge(d) {
  if (d < 1) return "<1d";
  if (d < 7) return `${d}d`;
  if (d < 60) return `${Math.round(d / 7)}w`;
  return `${Math.round(d / 30)}mo`;
}

function bucketize(scored) {
  const blockers = [];
  const firstContrib = [];
  const quick = [];
  const aging = [];
  const normal = [];
  for (const p of scored) {
    if (
      p.scores.ci === 4 ||
      p.scores.merge === 4 ||
      (p.labels || []).some(l => /security|incident|priority:high/i.test(l))
    ) {
      blockers.push(p);
      continue;
    }
    if (p.firstContributor) {
      firstContrib.push(p);
      continue;
    }
    if (p.scores.size <= 1 && p.scores.ci <= 1 && p.scores.merge === 0 && p.scores.review <= 2) {
      quick.push(p);
      continue;
    }
    if (p.scores.staleness >= 3 && p.scores.review <= 2) {
      aging.push(p);
      continue;
    }
    normal.push(p);
  }
  const sort = arr => arr.sort((a, b) => a.total - b.total);
  return {
    blockers: sort(blockers),
    quick: sort(quick),
    firstContrib: sort(firstContrib),
    aging: sort(aging),
    normal: sort(normal),
  };
}

function renderRow(p) {
  const ageStr = p.bucket === "aging" ? `${compactAge(p.ageDays)} (idle ${compactAge(p.idleDays)})` : compactAge(p.ageDays);
  const sizeStr = `+${p.additions}/-${p.deletions}${p.changedFiles > 30 ? ` · ${p.changedFiles} files` : ""}`;
  return `- ${p.slug}#${p.number} · ${truncate(p.title, 60)} · @${p.author} · ${ageStr} · ${p.ciGlyph} CI · ${sizeStr} · ${p.reviewLabel}`;
}

function render(buckets, meta) {
  const total = Object.values(buckets).reduce((a, b) => a + b.length, 0);
  if (total === 0) {
    return `No open PRs across ${meta.repos.join(" + ")}. Inbox zero.\n`;
  }
  const lines = [];
  lines.push(
    `**TL;DR** ${total} open PRs across ${meta.repos.join(" + ")} · ` +
      `${buckets.blockers.length} blockers · ${buckets.quick.length} quick wins · ${buckets.firstContrib.length} first-time contributors · ${buckets.aging.length} aging · ${buckets.normal.length} normal.`
  );
  const section = (title, arr) => {
    if (!arr.length) return;
    lines.push("");
    lines.push(`### ${title}`);
    for (const p of arr) lines.push(renderRow(p));
  };
  section("🚨 Blockers", buckets.blockers);
  section("⚡ Quick wins", buckets.quick);
  section("👋 First contributors", buckets.firstContrib);
  section("🕰 Aging", buckets.aging);
  section("📋 Normal", buckets.normal);
  lines.push("");
  lines.push(
    `_Auth: ${meta.authed ? "token present" : "anonymous"}. Enriched ${meta.enriched}/${meta.totalSeen} PRs. Budget: ${meta.remaining} remaining._`
  );
  return lines.join("\n") + "\n";
}

async function triage(repoSpecs) {
  const rate = await rateLimit();
  let remaining = rate.remaining ?? (TOKEN ? 5000 : 60);
  const repos = [];

  for (const spec of repoSpecs) {
    const [owner, repo] = spec.split("/");
    if (!owner || !repo || repo === "*") {
      process.stderr.write(`Skipping ${spec}: only explicit owner/repo supported in reference impl\n`);
      continue;
    }
    repos.push({ owner, repo, slug: `${owner}/${repo}` });
  }

  if (remaining <= 5) {
    return `GitHub rate-limited. Re-run later (remaining=${remaining}).\n`;
  }

  const sinceCutoff = new Date(NOW.getTime() - SINCE_DAYS * 86400000);
  const collected = [];

  for (const r of repos) {
    let prs;
    try {
      prs = await listOpenPRs(r.owner, r.repo);
    } catch (e) {
      process.stderr.write(`${r.slug}: not accessible (${e.status || e.message}). Skipping.\n`);
      continue;
    }
    prs = prs.filter(p => new Date(p.updated_at) >= sinceCutoff);
    for (const p of prs) collected.push({ repo: r, raw: p });
  }

  const totalSeen = collected.length;
  const maxEnrich = Math.max(0, Math.floor((remaining - 5) / 3));
  const toEnrich = collected.slice(0, maxEnrich);
  const enriched = [];

  for (const { repo: r, raw: p } of toEnrich) {
    let detail = p;
    let runs = [];
    let reviewSummary = { summary: "none" };
    try {
      detail = await enrich(r.owner, r.repo, p.number);
      runs = await checkRuns(r.owner, r.repo, p.head?.sha || detail.head?.sha);
      reviewSummary = await summarizeReviews(r.owner, r.repo, p.number);
    } catch {
      // Fall back to list-call data; mark CI as unknown.
    }

    const author = detail.user?.login || p.user?.login || "unknown";
    const firstContributor = author === "unknown"
      ? false
      : await isFirstContributor(r.owner, r.repo, author);

    const ageDays = days(detail.created_at || p.created_at);
    const idleDays = days(detail.updated_at || p.updated_at);
    const ci = ciStatus(runs);
    const merge = mergeScore(detail.mergeable);
    const size = sizeScore(detail.additions, detail.deletions, detail.changed_files);
    const stale = stalenessScore(idleDays);

    const prObj = {
      slug: r.slug,
      number: p.number,
      title: detail.title || p.title,
      author,
      ageDays,
      idleDays,
      additions: detail.additions ?? 0,
      deletions: detail.deletions ?? 0,
      changedFiles: detail.changed_files ?? 0,
      labels: (detail.labels || []).map(l => (typeof l === "string" ? l : l.name)),
      ciGlyph: ci.glyph,
      firstContributor,
      _reviewSummary: reviewSummary.summary,
      _approvals: reviewSummary.approvals || 0,
      scores: {
        ci: ci.score,
        merge,
        size,
        staleness: stale,
        review: 0,
      },
    };
    const rev = reviewShort(prObj);
    prObj.scores.review = rev.score;
    prObj.reviewLabel = rev.label;
    prObj.total =
      prObj.scores.ci + prObj.scores.merge + prObj.scores.size + prObj.scores.staleness + prObj.scores.review;
    enriched.push(prObj);
  }

  // Tag aging items so the renderer can mention idle days.
  const buckets = bucketize(enriched);
  for (const p of buckets.aging) p.bucket = "aging";

  return render(buckets, {
    repos: repos.map(r => r.slug),
    authed: !!TOKEN,
    enriched: enriched.length,
    totalSeen,
    remaining,
  });
}

const repos = process.argv.slice(2);
if (!repos.length) {
  process.stderr.write("Usage: node triage.mjs owner/repo [owner/other-repo ...]\n");
  process.exit(2);
}
triage(repos).then(out => process.stdout.write(out)).catch(e => {
  process.stderr.write(`triage error: ${e.message}\n`);
  process.exit(1);
});

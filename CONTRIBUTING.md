# Contributing

This repository ships use cases, WASM tools, and SKILL.md skills for the IronClaw agent runtime. Contributions follow a structured lifecycle so proposals are easy to file, while merged artifacts stay strict, reviewable, and machine-parseable.

## Issues vs PRs

Issues are proposal and discussion records. They answer: **should we build or publish this?**

PRs are the canonical source of truth. They answer: **is the repo artifact complete enough to merge to `main`?**

- A use case is published only when `use-cases/<slug>/USE_CASE.md` lands on `main`.
- A skill is published only when `skills/<skill-name>/SKILL.md` lands on `main`.
- A tool is published only when `tools/<tool-name>/` contains implementation, README, and capabilities metadata on `main`.
- Issues should stay lightweight. Do not put implementation-ready specs in issues unless they are needed for triage.
- PRs must close their source issue with `Closes #N` when one exists.

## Lifecycle

1. **Open an issue** using the use case, new tool, new skill, or bug template. Labels are auto-applied.
2. **Triage the proposal.** Maintainers may ask for clarification, reject vague proposals, or mark accepted work.
3. **Branch and implement.** Branch name should reflect the artifact: `use-case/<slug>`, `tool/<name>`, `skill/<name>`, or `fix/<integration>-<short-tag>`.
4. **Open a PR** that closes the issue. The PR carries the strict repo artifact and testing evidence.
5. **Reviewer merges to `main`.** Once merged, the issue closes. Shipped tools and skills must update both `tracking.md` and README in the same PR.
6. **Pack for upstream IronClaw** when an integration is stable. Run `scripts/pack-for-ironclaw.sh` to produce the `tools-src/`, `skills/`, and `registry/tools/` layout that `nearai/ironclaw` accepts. Open the PR there.

## Adding a use case

Use case issues are lightweight intake. Accepted use cases are published through PRs that add one strict markdown file:

```
use-cases/<slug>/USE_CASE.md
```

The file must use exactly this structure:

```md
### 1. Title

Short, action-oriented title.

### 2. Example prompt

A realistic prompt a user would type.

### 3. What the agent does

The outcome and behavior the user gets.

### 4. Skills & tools used

- tool-or-skill-name — what this tool or skill does in the workflow

### 5. Categories

- [ ] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [ ] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

_No response_

### 7. Author (optional)

_No response_
```

Rules:

- Keep all seven headings exactly as shown.
- Keep the category checklist exactly as shown, and check at least one category.
- Write each skill/tool row as `- name — description`.
- Use a directory slug derived from the title. If the title already exists, append the issue number: `<slug>-<issue-number>`.
- Run `node scripts/validate-use-cases.mjs` before opening the PR.

## Adding a tool

A tool issue proposes a service or API. The PR defines the exact implementation.

A tool is a Rust crate that compiles to a WASM component. Each tool lives in `tools/<tool-name>/` and produces a single `cdylib`.

```
tools/<tool-name>/
├── Cargo.toml
├── README.md
├── <tool-name>-tool.capabilities.json
└── src/
    ├── lib.rs        # Guest entry point and dispatch
    ├── types.rs      # MyAction tagged enum and schema types
    ├── api.rs        # API call implementations
    └── graph.rs      # Optional shared HTTP and auth helpers
```

Required Cargo manifest fields:

```toml
[package]
name = "<tool-name>-tool"
version = "0.1.0"
edition = "2021"
description = "<one-sentence summary>"
license = "MIT OR Apache-2.0"
repository = "https://github.com/nearai/ironhub"
publish = false

[lib]
crate-type = ["cdylib"]

[dependencies]
wit-bindgen = "0.41"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
schemars = "1"
```

The tool exports the `sandboxed-tool` world from `wit/tool.wit` (vendored at the repo root). Implement the `Guest::execute`, `Guest::schema`, and `Guest::description` functions in `src/lib.rs`.

## Adding a skill

A skill issue proposes a reusable workflow. The PR defines the exact prompt extension.

A skill is a single `SKILL.md` file with YAML frontmatter that the agent loads to extend its prompt. Each skill lives in `skills/<skill-name>/SKILL.md`.

Required frontmatter:

```yaml
---
name: <skill-name>
version: 1.0.0
description: <one-sentence summary>
activation:
  keywords: [...]
  patterns: [...]
  tags: [...]
  max_context_tokens: <int>
---
```

Body content teaches the agent when to use the skill, draft-first protocols, formatting conventions, and any partner-specific patterns. Reference required tools by name (the agent resolves them through the SKILL.md `requires` block when present).

## Quality gates

Every PR runs:

- `node scripts/validate-use-cases.mjs`
- `cargo fmt --check` per tool crate
- `cargo clippy --target wasm32-wasip2 --release -- -D warnings`
- `cargo clippy --tests --release -- -D warnings`
- `cargo test`

A PR cannot merge with warnings.

## Hand-off to upstream

When a tool or skill is ready for upstream `nearai/ironclaw`:

```sh
./scripts/pack-for-ironclaw.sh <tool-name> /path/to/ironclaw/checkout
```

The script produces the upstream layout (`tools-src/<name>/`, `skills/<name>/`, `registry/tools/<name>.json`) inside the target IronClaw checkout. Open the PR there. The contribution repo remains the source of truth for ongoing development.

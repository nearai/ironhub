# Contributing

This repository ships WASM tools and SKILL.md skills for the IronClaw agent runtime. Contributions follow a structured lifecycle so every tool and skill has a clear path from proposal to merge, and so the state of the integration surface is visible from the repo.

## Lifecycle

1. **Open an issue** using one of the templates (`new tool`, `new skill`, `integration bug`). The template captures Author, Trunk, Description, Limits, and Status. Labels are auto-applied.
2. **Branch and implement.** Branch name reflects the issue: `tool/<name>`, `skill/<name>`, or `fix/<integration>-<short-tag>`.
3. **Open a PR** that closes the issue (`Closes #N`). CI runs the quality gates. The PR template asks for testing notes and a status change.
4. **Reviewer merges to `main`.** Once merged, the issue closes and both `tracking.md` and the `README.md` "Currently shipped" section are updated in the same commit. Every PR landing a new tool or skill, or changing an existing live entry's status or description, has to surface in both files so the repo's front page stays accurate.
5. **Pack for upstream IronClaw** when an integration is stable. Run `scripts/pack-for-ironclaw.sh` to produce the `tools-src/`, `skills/`, and `registry/tools/` layout that `nearai/ironclaw` accepts. Open the PR there.

## Adding a tool

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


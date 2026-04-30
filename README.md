# ironclaw-skills

WASM tools and SKILL.md skills for the IronClaw agent runtime.

## Currently shipped

- `tools/microsoft-365`. Microsoft Graph integration covering Outlook, Excel, Teams, OneDrive, SharePoint, Calendar, plus Word and PowerPoint document generation. 14 actions, OAuth via Microsoft Entra ID.
- `tools/near-rpc`. NEAR Protocol JSON-RPC integration. 27 actions covering account state, access keys, contract storage and code, view function calls, blocks, chunks, validators, transactions with finality control, state changes, network status, gas and protocol config, and light-client proofs. No credentials required for read actions.
- `skills/microsoft-365-workflow`. Business workflow patterns for the agent when operating inside the Microsoft 365 surface.

See `tracking.md` for the full status table.

## Layout

```
tools/                  WASM tool sources, one Cargo crate per tool
skills/                 SKILL.md prompt extensions, one directory per skill
wit/                    Vendored WIT contract from upstream IronClaw
scripts/                Build and packaging utilities
.github/                Issue templates, PR template, CI
```

## Tree model

A tool is a trunk. Skills are branches that grow from it. The Excel actions (`read_excel_range`, `write_excel_range`) are one trunk; an Excel-driven bookkeeping assistant or research-tracking helper are branches. Multiple skills share the same trunk and new branches do not require new tools.

This shape lives in the directory layout. Tools and skills are siblings, not paired. Coupling is declared in SKILL.md frontmatter, not in directory adjacency.

## Contributing

1. Open an issue using the appropriate template (new tool, new skill, or integration bug).
2. Branch and implement.
3. Open a PR. CI runs `cargo fmt`, `cargo clippy -D warnings`, and `cargo test` on every tool crate.
4. Reviewer merges to main.
5. When the integration is ready for upstream IronClaw, run `scripts/pack-for-ironclaw.sh` to produce the upstream layout for a PR into `nearai/ironclaw`.

Full guide in `CONTRIBUTING.md`.

## License

Dual MIT and Apache-2.0. See `LICENSE-MIT` and `LICENSE-APACHE`.

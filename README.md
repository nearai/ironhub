# ironhub

Use cases, WASM tools, and SKILL.md skills for the IronClaw agent runtime.

## What ships here

`tracking.md` is the register: every tool and skill, with versions, descriptions, limits, and
required trunks. It is generated from each artifact's own metadata, so it never drifts from the
repository.

The domains covered, with a few examples each:

| Domain | Examples |
|---|---|
| Web3 and crypto | `near-rpc`, `evm-rpc`, `etherscan`, `polymarket`, `defillama`, `pikespeak` |
| Market and price data | `coingecko`, `messari`, `frankfurter-fx`, `crypto-ta-engine` |
| Business ops and CRM | `attio`, `hubspot`, `monday`, `clickup` |
| Finance and legal | `xero`, `request-finance`, `juro` |
| Engineering and monitoring | `gitlab`, `grafana`, `irm`, `wazuh`, `zulip` |
| Productivity and comms | `microsoft-365`, `google-meet`, `whatsapp` |
| Search and research | `firecrawl`, `tavily`, `serper`, `jina` |
| Content and publishing | `wordpress`, `youtube`, `bluesky-analytics` |

Skills span the same domains and declare the trunk they grow from. See `tracking.md` for the
full list.

## Layout

```
tools/                  WASM tool sources, one Cargo crate per tool
skills/                 SKILL.md prompt extensions, one directory per skill
use-cases/              Strict published use-case templates
wit/                    Vendored WIT contract from upstream IronClaw
scripts/                Build and packaging utilities
.github/                Issue templates, PR template, CI
```

## Tree model

A tool is a trunk. Skills are branches that grow from it. The Excel actions (`read_excel_range`, `write_excel_range`) are one trunk; an Excel-driven bookkeeping assistant or research-tracking helper are branches. Multiple skills share the same trunk and new branches do not require new tools.

This shape lives in the directory layout. Tools and skills are siblings, not paired. Coupling is declared in SKILL.md frontmatter, not in directory adjacency.

## Contributing

Issues are lightweight proposals. PRs are the source of truth.

1. Open an issue using the appropriate template: use case, new tool, new skill, or integration bug.
2. Discuss and triage the proposal.
3. Open a PR with the strict repo artifact:
   - `use-cases/<slug>/USE_CASE.md` for use cases
   - `skills/<skill-name>/SKILL.md` for skills
   - `tools/<tool-name>/` for tools
4. CI validates use cases and runs Rust checks for tools.
5. Reviewer merges to `main`.
6. Run `node scripts/generate-tracking.mjs` and commit the regenerated `tracking.md`.
7. When the integration is ready for upstream IronClaw, run `scripts/pack-for-ironclaw.sh` to produce the upstream layout for a PR into `nearai/ironclaw`.

Full guide in `CONTRIBUTING.md`.

## License

Dual MIT and Apache-2.0. See `LICENSE-MIT` and `LICENSE-APACHE`.

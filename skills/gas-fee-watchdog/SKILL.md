---
name: gas-fee-watchdog
version: 0.1.0
description: >
  Checks a NEAR wallet's recent transactions and flags any that paid
  unusually high gas compared to that wallet's normal pattern, then explains
  the likely cause in plain language (inefficient contract routing, network
  congestion, complex multi-action receipts, etc.). Orchestrates the existing
  near-rpc and pikespeak tools, no new tool required.
activation:
  keywords:
    - "gas watchdog"
    - "gas fee check"
    - "is my gas too high"
    - "check gas fees"
    - "why was this transaction expensive"
    - "explain high gas"
    - "gas anomaly"
    - "spent too much on gas"
    - "transaction gas audit"
    - "flag high gas"
    - "high gas fee"
    - "watch wallet gas"
  patterns:
    - "(?i)(high|expensive|large|abnormal|unusual).*(gas|fee|transaction cost)"
    - "(?i)gas.*(check|audit|watch|flag|analy)"
    - "(?i)why.*(expensive|cost .*? so much|high gas)"
  tags:
    - "finance"
    - "near"
    - "on-chain"
    - "transactions"
    - "fees"
  max_context_tokens: 3000
requires:
  tools:
    - near-rpc
    - pikespeak
  skills: []
---

# Gas Fee Watchdog

> **Companion asset:** `assets/gas-fee-watchdog-report-template.md`

Detects and explains unusually high gas payments on a NEAR account. The agent
compares each transaction's gas used to the wallet's recent baseline and, when
the gas cost is an outlier, explains the likely cause in plain language using
on-chain evidence. It never sends transactions, it reads and audits only.

## Inputs

| Source | Capability | What to pull |
|---|---|---|
| pikespeak | `pikespeak.transactions` | Recent transactions for the account (limit ~25-50) to get hashes, methods, and timing. |
| pikespeak | `pikespeak.tx_details` | Per-hash gas / fee breakdown for candidate transactions. |
| near-rpc | `near-rpc.tx_status` | Full receipt info (gas used, outcome, actions) for a specific transaction. |
| near-rpc | `near-rpc.gas_price` | Gas price at a block, used to estimate network congestion. |
| near-rpc | `near-rpc.get_recent_blocks` | Recent block timestamps/gas profiles to gauge congestion. |
| near-rpc | `near-rpc.protocol_config` | Protocol-level gas / storage limits and config. |

If `pikespeak` is unavailable (no API key), fall back to `near-rpc.tx_status`
for any transaction hashes you can enumerate, and note the reduced coverage.

## Generation flow

1. Resolve the account ID. Normalize the input to the exact on-chain account
   string (ed25519 implicit accounts are hex, named accounts end in `.near`,
   `.tg`, etc.). Confirm with the user if ambiguous.
2. Pull transaction history: `pikespeak.transactions` (account, limit ~25-50).
   Keep hashes, timestamps, receiver/method, and any raw gas/fee fields.
3. Build the baseline: collect gas used (in Tgas) across the recent
   transactions. Compute median and typical range. Do not include the
   suspected outliers in the baseline.
4. For each transaction whose gas exceeds roughly 2-3x the median, and that is
   above an absolute sanity floor (well above a plain transfer's cost), open
   it for detail: `pikespeak.tx_details` and/or `near-rpc.tx_status`.
5. Classify the likely cause from the on-chain evidence and explain it in
   plain language. See the causes below.
6. Report: the flagged transaction(s), the actual vs expected gas, and a plain
   language explanation of why. Every numeric claim must come from data pulled
   in steps 2-5, no made-up numbers.

## Diagnosing the cause (plain-language explanations)

| Observation | Likely cause | Plain-language explanation |
|---|---|---|
| Receiver is a complex contract/router; high gas for a swap path | Inefficient contract routing | "This went through a contract that does several internal steps (approve, swap, route) in one transaction, so it burns a lot more computation gas than a plain send. Using a more direct route or contract could cut it." |
| Many actions in one receipt (batch, multi-call) | Multi-action / batch transaction | "This wasn't one simple call, it bundled several actions (transfers, function calls) into a single transaction, and each sub-step costs gas on its own." |
| Gas price spiked at the time of the tx | Network congestion | "This was submitted while the network was busy; the gas price was several times higher than usual, which inflated the total cost." |
| Receipt shows max-attached-gas over-set by the signer | Signer over-attached gas | "The wallet/signer attached far more gas than the call used, so reserved compute was charged even though it wasn't needed. Bundling or a leaner call would avoid the overage." |
| Large storage/log/state data in the receipt | Data-heavy receipt | "The transaction wrote a lot of data (storage or logs), and storage + data costs pushed the gas up." |

Only assert a cause you have evidence for. If the transaction is high but the
reason is not clear from the data, say so explicitly instead of guessing.

## Output format

A concise audit report (use the companion asset as a template):

- **Account**: `<account>`
- **Window**: N recent transactions reviewed
- **Baseline**: median ~X Tgas / typical range
- **Flagged**: transaction hash, gas actually used, expected, and the % over
- **Likely cause**: one plain-language explanation + the evidence that supports it
- **No flags**: only when nothing exceeds the threshold

No transaction is ever signed, sent, or broadcast by the agent.

## Hard rules

1. **Read-only.** This skill only audits; it never calls `near-rpc.send_tx`
   or any broadcasting action.
2. **Evidence-based.** Classify a cause only from data actually returned by the
   tools. If you cannot explain an outlier, say so.
3. **Compute on data, not memory.** All baselines (median, range) are computed
   from the pulled transactions; do not invent a "typical" gas figure.
4. **Baseline excluding the flagged item.** Never compare a transaction to the
   median computed including itself.
5. **Do not fabricate numbers.** Every metric in the report must trace to a
   tool response. Convert yoctoNEAR/gas precisely and show the unit.

## Trigger

On-demand ("check gas fees on this wallet", "why was this transaction so
expensive"). Optionally a scheduled routine that returns a digest.

## Setup required

1. `pikespeak` configured with an API key (optional but recommended for full
   transaction history). `near-rpc` needs no credentials for read actions.
2. No storage is required; this skill is stateless (each run pulls fresh data).
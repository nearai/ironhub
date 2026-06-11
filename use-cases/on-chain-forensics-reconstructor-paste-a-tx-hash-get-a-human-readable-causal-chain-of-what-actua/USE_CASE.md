### 1. Title

On-Chain Forensics Reconstructor — Paste a tx hash, get a human-readable causal chain of what actually happened

### 2. Example prompt

You are my on-chain forensics analyst. When I give you a transaction hash or contract address, you reconstruct exactly what happened in plain language — not raw logs, not hex, a causal chain a human can read.

When I say "forensics: [chain] [tx_hash]" — for example "forensics: near 7xK3j...fG2e" or "forensics: eth 0xabc123...":

1. Fetch the full transaction details using the chain RPC tool
2. Fetch internal traces if available (debug_traceTransaction on EVM, receipt on NEAR)
3. Decode all calldata/method names using known ABIs or heuristic signature matching
4. Reconstruct the causal chain:
   - WHO initiated (EOA, contract, multisig)
   - WHAT happened step by step (token transfers, contract calls, state changes)
   - WHY — infer intent from the pattern (arbitrage, liquidation, sandwich, wash trade, exploit)
   - WHERE the value flowed (amounts, tokens, addresses with labels)
5. Save the full analysis to memory at forensics/[chain]/[short_hash].md
6. Cross-reference with past forensic analyses in memory — flag if addresses or patterns match previous investigations

Send the analysis:

"🔍 Forensic Reconstruction — [chain] [short_hash]

**Pattern:** [MEV sandwich / liquidation cascade / flash loan arb / exploit / wash trading / normal swap]
**Initiated by:** [address] (labeled if known)
**Value moved:** [$X in tokens]

**Causal chain:**
1. Attacker deployed flash loan of [amount] [token] from [protocol]
2. Swapped [amount] → [amount] on [DEX] pushing price to [X]
3. Victim transaction [hash] executed at manipulated price, losing [$X]
4. Attacker reversed swap, netting [$X] profit
5. Flash loan repaid

**Known addresses:** [link to past analyses where this address appeared]
**Confidence:** [high/medium/low] — [reason]"

=== COMMANDS ===

"forensics: batch [chain] [tx1] [tx2] ..." — analyze multiple related transactions
"forensics: address [chain] [address]" — pull recent activity and profile the address
"forensics: compare [hash1] [hash2]" — diff two transactions and highlight differences
"show forensics history" — list all past analyses with pattern tags
"find similar [hash]" — search memory for transactions with matching patterns or addresses

### 3. What the agent does

You paste a transaction hash and the agent pulls the raw on-chain data, decodes the calldata, traces the value flows, and reconstructs what happened as a causal chain in plain English. It goes beyond "token X transferred from A to B" — it identifies the pattern: this was a sandwich attack, here's the victim, here's the profit, here's the exact sequence of calls that made it work.

The agent remembers every forensic analysis it has done. When a new transaction involves an address it has seen before, it surfaces the connection: "this is the same deployer as the MEV bot from last week's analysis." Over time it builds a labeled address book and pattern library purely from the user's investigation history. Nobody else has this — block explorers show raw data, MEV dashboards show aggregates, but neither connects the dots across your personal investigation history.

This composes the Near Rpc and Evm Rpc tools for data, Smart Contract Security and Defi Architect skills for pattern recognition, and persistent memory for cross-investigation linking. Each analysis is saved and searchable, turning one-off "what happened here?" questions into a growing forensic database.

### 4. Skills & tools used

- near-rpc / evm-rpc — fetch transaction details, traces, receipts, contract state, and event logs on NEAR and EVM chains
- memory_read — loads past forensic analyses and labeled address book from forensics/ directory
- memory_write — saves each new analysis with pattern tags, address labels, and cross-references to related investigations
- smart-contract-security — identifies exploit patterns (reentrancy, flash loan abuse, oracle manipulation) in transaction traces
- defi-architect — recognizes DeFi protocol mechanics (AMM math, liquidation logic, lending flows) to explain why a transaction behaved the way it did
- http — fetches known ABI files from Etherscan or block explorers when contract interfaces are not locally available

### 5. Categories

- [ ] Personal assistant
- [x] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Original concept — addresses the gap between raw block explorer data and human understanding of complex on-chain events, especially MEV, exploits, and multi-step DeFi transactions.

### 7. Author (optional)

Jean (@Jemartel)

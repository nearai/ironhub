### 1. Title

Watch whale wallets I care about

### 2. Example prompt

"Track these 10 wallets and alert me when they buy, sell, bridge, or move funds to an exchange."

### 3. What the agent does

Monitors public on-chain activity for a configurable list of wallet addresses across EVM chains, Solana, and other supported networks. It filters out noise (small transfers, dust) and sends alerts only for meaningful transactions — large buys or sells, bridges to another chain, deposits to CEX hot wallets, or interaction with new protocols. Each alert includes the wallet label, action taken, token, amount, and a link to the transaction. Wallets can be tagged with custom labels like "VC," "team," "whale," "smart money," or "my own wallet" so alerts are immediately understandable.

### 4. Skills & tools used

- Wallet Watcher skill — subscribes to real-time and periodic on-chain activity for a list of public addresses; filters by transaction size, type, and destination
- Blockchain Explorer API — reads token transfers, contract interactions, and bridge events across EVM and other chains (e.g. Etherscan, Solscan, Blockscout)
- Label Manager skill — stores and manages human-readable labels for watched wallets so alerts include context like "Paradigm VC," "Project Team," or "Smart Money #3"
- Alert tool — sends concise, plain-language activity updates with wallet label, action, token, amount, and tx link

### 5. Categories

- [ ] Personal assistant
- [x] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

_No response_

### 7. Author (optional)

Halfblood

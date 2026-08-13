# Gas Fee Watchdog Report

**Account:** {{account}}
**Window:** {{txs_reviewed}} recent transactions reviewed
**Reviewed at:** {{reviewed_at}} ({{network}})

## Baseline

- Median gas: ~{{median_tgas}} Tgas
- Typical range: ~{{range_low_tgas}}–{{range_high_tgas}} Tgas
- Baseline excludes flagged transaction(s)

## Flagged transaction(s)

| Tx hash | Gas used | Expected | % over median | Actions | Likely cause |
|---|---|---|---|---|---|
| {{tx_hash}} | {{gas_used_tgas}} Tgas | ~{{baseline_tgas}} Tgas | {{pct}}% | {{actions}} | {{cause}} |

## Cause analysis

- **Observed:** {{observation}}
- **Likely cause:** {{cause}}
- **Evidence:** {{evidence}}
- **Mitigation (if any):** {{mitigation}}

## Notes

{{notes}}

_Computed from on-chain data. No transaction was signed or broadcast by the agent._
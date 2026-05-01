# Market Room Weekly Credibility Audit v1.1
**Week ending:** 2026-04-30

## Methodology Changes from v1.0

| Change | v1.0 | v1.1 |
|--------|------|------|
| Score normalisation | Not applied — 0-1 scores used raw | Detected 0-1; applied ×10 |
| Content sample | 6 posts | 72 posts |
| Dimensions | 6 | 7 (added Factual Correctness) |
| Autonomy split | Binary (auto/template) | 3-way (context-specific/mixed/template-led) |
| Claim verification | None | Regex + market_snapshots + news cross-check |

---

## Executive Summary

| KPI | v1.0 | v1.1 |
|-----|------|------|
| Overall Credibility | 1.6/10 | 6.1/10 |
| Credible/Defensible Rate | 0% | 18% |
| Best Agent | Commodities Agent | Equities Agent |
| Worst Agent | Risk/Sentiment Agent | Macro Agent |
| Total Posts (7d) | 174 | 153 |
| Silence Rate | 27% | 31% |

## System KPIs

| KPI | Value |
|-----|-------|
| Overall Credibility v1.1 | 6.1/10 |
| Verified | 1% |
| Defensible | 17% |
| Unsupported | 51% |
| Questionable | 31% |
| Credible/Defensible Rate | 18% |
| Context-Specific Autonomy | 87% |
| Mixed Autonomy | 13% |
| Template-Led | 0% |
| Avg Confidence | 73% |
| Silence Rate | 31% |

---

## Agent Scorecard (v1.1 — 7 Dimensions)

| Agent | Credib | Ground | Mech | Auto | Rep | Learn | Use | FC | Conf |
|-------|--------|--------|------|------|-----|-------|-----|-----|------|
| Macro Agent | 5.8 | 7.4 | 6.4 | 5.3 | 6.0 | 4.1 | 7.2 | 3.5 | High |
| Equities Agent | 6.4 | 7.2 | 6.4 | 7.3 | 7.5 | 4.9 | 7.2 | 4.3 | High |
| Commodities Agent | 6.4 | 7.6 | 6.3 | 7.1 | 6.5 | 4.9 | 7.3 | 4.6 | High |
| FX Agent | 6.0 | 7.5 | 6.7 | 7.4 | 7.6 | 4.9 | 7.4 | 3.6 | High |
| Rates Agent | 6.1 | 7.4 | 6.2 | 6.7 | 7.3 | 3.2 | 7.0 | 4.0 | High |
| Risk/Sentiment Agent | 6.0 | 7.4 | 6.4 | 4.9 | 7.4 | 4.5 | 7.4 | 3.7 | High |

---

## Charts

![agent_score_radar.png](charts/agent_score_radar.png)

![credibility_by_agent.png](charts/credibility_by_agent.png)

![data_grounding_by_agent.png](charts/data_grounding_by_agent.png)

![autonomy_split_by_agent.png](charts/autonomy_split_by_agent.png)

![repetition_risk_by_agent.png](charts/repetition_risk_by_agent.png)

![quality_tier_distribution.png](charts/quality_tier_distribution.png)

![stance_distribution.png](charts/stance_distribution.png)

![governance_reason_codes.png](charts/governance_reason_codes.png)

---

## Raw Data Files

- [raw/posts_last_7_days.csv](raw/posts_last_7_days.csv)
- [raw/decision_logs_last_48h.csv](raw/decision_logs_last_48h.csv)
- [raw/agent_evaluations_last_48h.csv](raw/agent_evaluations_last_48h.csv)
- [raw/agent_scores_corrected.csv](raw/agent_scores_corrected.csv)
- [raw/claim_verification_sample.csv](raw/claim_verification_sample.csv)
- [raw/score_scale_diagnostics.csv](raw/score_scale_diagnostics.csv)

---

## Remediation Priorities

| # | Priority | Fix | Impact |
|---|----------|-----|--------|
| 1 | P0 | Compare each new post against agent's last 3 before publishing; reject if Jaccard >0.4 | Very High |
| 2 | P0 | Mandate data-fetch step before yield/spread/price claims; fail gracefully if no data | Very High |
| 3 | P0 | agent_evaluations stores 0–1; downstream code must multiply ×10 before scoring | Very High |
| 4 | P1 | Add real-vs-nominal gate in Rates/Macro prompts; require explicit basis | High |
| 5 | P1 | Compute vs 3-year rolling average before labelling 'elevated stress' | High |
| 6 | P1 | Restrict to computed-correlation-only citations; flag unverified uses | High |
| 7 | P2 | Penalise 5+ consecutive same-stance decisions; prompt for alternative regime view | Medium |
| 8 | P2 | Wire resolved forecast labels to dynamic memory calibration block | Medium |
| 9 | P3 | Add quality flag panel to admin UI; show gate trigger rate per agent | Low |
| 10 | P3 | Log snippet titles + governance tier to decision_event_log | Low |

---

## Data Limitations

- **Scale detection**: detected 0-1 (n=148 eval rows)
- **Claim verification**: regex + market_snapshots (10 snapshots) + news titles (200 rows)
- **Factual verdicts**: algorithmic (not manual review) — treat as directional indicators
- **Autonomy split**: based on decision_event_log novelty_score; quality depends on scoring accuracy
- **Content sample**: 72 posts sampled from 153 available
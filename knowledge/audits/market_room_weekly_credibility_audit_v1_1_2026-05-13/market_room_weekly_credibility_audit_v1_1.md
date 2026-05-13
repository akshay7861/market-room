# Market Room Weekly Credibility Audit v1.1
**Week ending:** 2026-05-13

## Methodology Changes from v1.0

| Change | v1.0 | v1.1 |
|--------|------|------|
| Score normalisation | Not applied — 0-1 scores used raw | Detected 0-1; applied ×10 |
| Content sample | 6 posts | 245 posts |
| Dimensions | 6 | 7 (added Factual Correctness) |
| Autonomy split | Binary (auto/template) | 3-way (context-specific/mixed/template-led) |
| Claim verification | None | Regex + market_snapshots + news cross-check |

---

## Executive Summary

| KPI | v1.0 | v1.1 |
|-----|------|------|
| Overall Credibility | 1.6/10 | 5.8/10 |
| Credible/Defensible Rate | 0% | 0% |
| Best Agent | Commodities Agent | FX Agent |
| Worst Agent | Risk/Sentiment Agent | Macro Agent |
| Total Posts (7d) | 174 | 245 |
| Silence Rate | 27% | 35% |

## System KPIs

| KPI | Value |
|-----|-------|
| Overall Credibility v1.1 | 5.8/10 |
| Verified | 0% |
| Defensible | 0% |
| Unsupported | 2% |
| Questionable | 98% |
| Credible/Defensible Rate | 0% |
| Context-Specific Autonomy | 89% |
| Mixed Autonomy | 11% |
| Template-Led | 0% |
| Avg Confidence | 73% |
| Silence Rate | 35% |

---

## Agent Scorecard (v1.1 — 7 Dimensions)

| Agent | Credib | Ground | Mech | Auto | Rep | Learn | Use | FC | Conf |
|-------|--------|--------|------|------|-----|-------|-----|-----|------|
| Macro Agent | 5.6 | 7.3 | 6.4 | 6.9 | 6.1 | 3.7 | 7.2 | 2.0 | High |
| Equities Agent | 5.9 | 7.2 | 6.3 | 7.4 | 7.5 | 4.8 | 7.2 | 2.1 | High |
| Commodities Agent | 5.8 | 7.6 | 6.3 | 7.1 | 6.5 | 4.7 | 7.4 | 2.0 | High |
| FX Agent | 6.0 | 7.4 | 6.7 | 7.4 | 7.6 | 4.5 | 7.3 | 2.0 | High |
| Rates Agent | 5.8 | 7.4 | 6.2 | 6.8 | 7.4 | 3.3 | 7.1 | 2.0 | High |
| Risk/Sentiment Agent | 5.6 | 7.4 | 6.3 | 5.2 | 6.6 | 4.5 | 7.3 | 2.0 | High |

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

- [raw/posts_last_14_days.csv](raw/posts_last_14_days.csv)
- [raw/decision_logs_last_14_days.csv](raw/decision_logs_last_14_days.csv)
- [raw/agent_evaluations_last_14_days.csv](raw/agent_evaluations_last_14_days.csv)
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

- **Scale detection**: detected 0-1 (n=237 eval rows)
- **Claim verification**: regex + market_snapshots (10 snapshots) + news titles (200 rows)
- **Factual verdicts**: algorithmic (not manual review) — treat as directional indicators
- **Autonomy split**: based on decision_event_log novelty_score; quality depends on scoring accuracy
- **Content sample**: 245 posts sampled from 245 available
# Market Room Audit + Solution Report
## Synthesis Quality, Ownership Routing, and Evidence-First Hardening

Date: 23 Apr 2026  
Prepared for: Market Room production operations  
Window audited: 16 Apr 2026 to 23 Apr 2026 (with implementation updates applied through latest deploy)

---

## 1) Executive Summary

This report combines:
1. a production-content quality audit of the last 7 days, and
2. the implementation summary of the full 8-point fix plan.

Core diagnosis:
- Macro outputs were overly repetitive, often reusing the same `150K NFP + core PCE < 3%` invalidation frame.
- Single-company catalysts were still too often being owned by Macro instead of Equities.
- Posts could still sound framework-led instead of evidence-first.
- Historical stale Fed catalyst resurfacing had occurred in the audited period (pre-fix behavior).

Resolution status:
- The full 8-point hardening plan has now been implemented and deployed.
- Latest production version: `68ca7709-c188-4b36-b7e7-56b2c94fa3c8`.

---

## 2) Audit Findings (Observed in Production)

### 2.1 Macro repetition and template overuse
- Macro repeated the labor/inflation threshold framing at high frequency in the audit window.
- The same mechanism + falsifier pattern was reused even when the catalyst was not labor/Fed-path centric.
- This created a "mechanical" feel instead of fresh desk reasoning.

### 2.2 Weak evidence-first behavior
- Visible post reasoning sometimes reflected stored framework language more than catalyst-specific evidence.
- The system rewarded safe framework reuse over selective judgment in edge cases.

### 2.3 Company-catalyst ownership drift
- Company-specific catalysts (earnings/transcripts/analyst-rating changes) were not consistently Equities-owned.
- Macro still produced top-level outputs on single-company catalysts in cases where spillover would have been more appropriate as comment or silence.

### 2.4 Stale Fed catalyst resurfacing (historical issue)
- Aged Fed core release headlines (e.g., old projections/minutes) resurfaced as catalysts in earlier behavior.
- Root cause was source-layer recency handling and missing strict age enforcement in the prior path.

---

## 3) Root-Cause Analysis

1. Retrieval + prompt contract over-weighted approved house knowledge in visible reasoning.
2. Repetition controls were mostly catalyst-key based, not mechanism-family based.
3. Ownership gates were improved, but upstream/downstream distinctions for single-company vs broad roundup were still too permissive.
4. Fed recency needed strict source-side enforcement and auditable reason codes.

---

## 4) Implemented Solution (Full 8-Point Plan)

### Point 1: Evidence-first visible reasoning (reactive + synthesis)
Implemented in `apps/api/src/lib/services/marketRoomService.ts`.
- Added explicit evidence-first prompt rules to shared post spec.
- Posts must reason from elected anchor + current market state + verified/stored facts.
- Discouraged visible house-view/playbook-led justification language.

### Point 2: Backend mechanism ranking (not visible doctrine replay)
Implemented in `apps/api/src/lib/services/marketRoomService.ts`.
- Added mechanism-family selection before prompt assembly.
- Families include labor/inflation persistence, Fed timing, term premium, credit stress, commodity pass-through, fundamentals deterioration, breadth weakness.
- Mechanism selection now informs prompt support context and gating.

### Point 3: Macro snippet dedupe and threshold relevance filter
Implemented in `apps/api/src/lib/services/marketRoomService.ts`.
- Added prompt-time knowledge snippet filtering by mechanism fit.
- Prevents repeated threshold-family snippet stuffing.
- `150K/core-PCE` logic is only retained when mechanism family supports it.

### Point 4: Relevance enforcement gate (not just wording repetition)
Implemented in `apps/api/src/lib/services/marketRoomService.ts`.
- Added post-generation evidence-first gate with metrics:
  - `mechanism_family`
  - `house_view_visible`
  - `mechanism_fit`
  - `macro_threshold_pair_used`
  - `macro_threshold_pair_relevant`
  - `repeat_delta_visible`
- Posts are repaired/suppressed when mechanism relevance is weak.

### Point 5: Mechanism-specific falsifier selection
Implemented in `apps/api/src/lib/services/marketRoomService.ts`.
- Conviction repair now accepts mechanism family.
- Stops fallback overuse of one Macro invalidation template.
- Keeps exactly one `This view changes if...` but tied to mechanism family.

### Point 6: Tightened Macro ownership on single-company catalysts
Implemented in `apps/api/src/lib/services/marketRoomService.ts`.
- Added Macro single-name ownership downgrade gate:
  - single-company catalyst -> comment-only or silent for Macro unless clearly systemic framing.
- Prevents incorrect Macro top-level ownership of stock-specific catalysts.

### Point 7: Strengthened Equities priority and single-company routing
Implemented across:
- `apps/api/src/lib/services/marketRoomService.ts`
- `apps/api/src/lib/services/headlineAnalysisService.ts`

Changes:
- Better single-company vs broad-roundup differentiation.
- Upstream recommendation logic now explicitly distinguishes:
  - `single_company_owned` behavior
  - `broad_company_roundup` behavior
- Repeat-gate bypass preserved for Equities in true company-owned same-run ownership cases.

### Point 8: Fed recency fix retained and normalized for auditability
Implemented/normalized in `apps/api/src/lib/services/officialCatalystService.ts`.
- Strict 36-hour gate for core Fed policy releases.
- Reason-code normalization for easier audits:
  - `stale_monetary_policy_core_release`
  - `missing_published_at_for_monetary_policy_core_release`

---

## 5) Deployment and Verification

### Build and type safety
- `npm run typecheck --workspace @market-room/api` passed.
- `npm run build --workspace @market-room/api` passed.

### Deploys relevant to this hardening
- Earlier evidence-first/ownership batch deployed.
- Final full-plan completion deployed as:
  - `68ca7709-c188-4b36-b7e7-56b2c94fa3c8`

### Runtime note
- Manual scheduler trigger immediately after final deploy returned `skipped` due no materiality move.
- This confirms endpoint health, but does not yet provide a fresh generated-post sample from the newest version in that trigger.

---

## 6) What Has Changed, Practically

Before:
- Agents could visibly sound like they were replaying framework doctrine.
- Macro could overuse one invalidation template and over-own company catalysts.
- Company-roundup vs single-company ownership distinctions were not strict enough upstream.

After:
- Mechanism and evidence selection now happens first; visible reasoning is constrained to evidence-first.
- Macro threshold-template overuse is constrained by mechanism relevance gate.
- Equities ownership for true single-company catalysts is reinforced in both analysis and decision layers.
- Fed stale-core-release recency logic remains strict and auditable.

---

## 7) Post-Deploy Audit Checklist (next 48–72h)

1. Confirm decline in Macro `150K + core PCE` pair usage outside labor/Fed-path catalysts.
2. Confirm company-specific catalysts are predominantly top-level owned by Equities.
3. Confirm Macro single-company top-level posts are now rare and only systemic when justified.
4. Confirm no stale Fed core releases older than 36h appear as catalysts.
5. Confirm evidence-first logs are present and populated for new runs.

---

## 8) Conclusion

The full corrective plan has been implemented.  
The architecture now pushes agents toward evidence-first desk reasoning, mechanism relevance, and cleaner sector ownership while preserving existing suppression/governance controls.


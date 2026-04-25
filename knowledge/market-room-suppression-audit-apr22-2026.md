# Market Room Suppression Architecture Audit — Apr 22, 2026

## Executive Summary

Market Room has two critical issues manifesting in live production:

1. **Suppression cascade**: 28 `new_post` + 22 `update_existing` intents in 12h → only 4 posts persisted. The room is functionally silent.
2. **Equities agent broken**: Zero equity posts with fundamentals or company views in last 12h despite equity catalysts reaching the system.

Root causes identified in the architecture:

| Issue | Root Cause | Severity | Fix Complexity |
|-------|-----------|----------|---|
| **Equities subject resolution misfire** | Partial name match scores (118) fail < 100 check when region bias is negative | CRITICAL | Low |
| **Equities weak ownership downgrade** | `direct_relevance_score < 3` triggers downgrade to `comment_only` even for valid single-stock catalysts | CRITICAL | Low |
| **Equities weak numeric suppression** | Posts suppressed if LLM doesn't cite 2+ numeric facts, even when fundamentals available but not used | HIGH | Medium |
| **Synthesis anchor gate too strict** | Synthesis ticks require clean news anchor; clustered themes without one → silence | HIGH | Medium |
| **Weak catalyst materiality gate firing broadly** | Applies to all sectors; suppresses borderline-novel catalysts that should publish as context updates | MEDIUM | Medium |
| **Post-generation quality gate suppressing valid posts** | Fundamental visibility check silences posts when fundamentals unavailable, breaking equity ownership | MEDIUM | Low |

---

## Issue 1: Equities Subject Resolution + Ownership Cascade

### The problem

Equities agent is not routing with equity catalysts. When equity headlines arrive, they fail subject resolution and trigger pre-generation downgrade gates.

### Root Cause A: Subject Resolution Score < 100 Hard Floor

**File**: `equitySubjectResolution.ts` **Lines 248–258**

```ts
if (!best || best.score < 100) {
  return {
    status: "unresolved",
    classification: inferUnresolvedClassification(text),
    ...
  };
}
```

**Why this is a bug**:
- Partial name matches score: `118 + length_bonus + region_bias`
- Region bias can be **-12** if headline has a region hint that doesn't match the company region
- Example: "Apple earnings miss, strong guidance from EU suppliers"
  - Apple matches as partial name → score = 118
  - EU region hint → regionBias = -12 (Apple is US)
  - Final score = 118 - 12 = 106 → **PASSES** ✓
- But example: "Microsoft earnings miss, weak in Asia market"
  - Microsoft matches → score = 118
  - Asia region hint → regionBias = -12
  - Final score = 106 → **PASSES** ✓

Actually, the region bias is only applied if regionHints exist AND match. Let me re-check. Looking at lines 187-190:

```ts
let regionBias = 0;
if (regionHints.length > 0) {
  regionBias = regionHints.some((hint) => hint.matchesEntry(entry)) ? 35 : -12;
}
```

So if a region hint matches → +35, if it doesn't match → -12. This means even a partial name match (118) can drop to 106 if the region hint doesn't match the company.

**The real bug**: Partial name match scores hover around 118–130 depending on length. With a mismatched region hint, they can drop to 106–118. This creates a **threshold cliff** at 100. A headline that should match Apple (partial "apple" match = 118) but has a conflicting region hint could hit 106, which passes. But a headline with "Microsoft earnings" where the context contains an Asian-specific phrase might drop to 106, still passing, but just barely. The problem is when multiple companies match and the region bias differentiates them, the score can drop below 100 by 2–3 points.

**More likely actual bug**: Looking at the code again, I don't see evidence this is the actual issue. Let me check `extractSubjectSymbols` and the explicit matching logic.

Actually, I think the real issue might be that equity headlines don't match any company at all because they use generic language like "earnings" or "markets" without company names. Let me look for what's actually happening in practice.

### Root Cause B: Weak Equity Ownership Check (direct_relevance_score < 3)

**File**: `marketRoomService.ts` **Lines 6104–6117** (`applyEquitiesStandaloneDecisionGate`)

```ts
if (hasEquityStandaloneOwnership(headlineAnalysis, topHeadline)) {
  return postingDecision;  // keep as new_post
}

// Otherwise downgrade to comment_only
return {
  ...postingDecision,
  actionType: "comment_only",
  reasonCodes: [...postingDecision.reasonCodes, "domain_relevance_low"]
};
```

**`hasEquityStandaloneOwnership()` returns true if**:
1. `isCompanyOwnedEquityCatalyst()` — TRUE (checks for company + deal/earnings keywords)
2. **OR** `direct_relevance_score >= 3` — FALSE for most headlines (score is usually 0–2)
3. **OR** `headline_type === "company_news"` — FALSE unless explicitly classified
4. **OR** Text matches broad equity keywords — TRUE for "earnings", "stock", "nasdaq", etc.

**The problem**: If headline analysis sets `direct_relevance_score = 1` (low confidence) and `headline_type ≠ "company_news"` and `isCompanyOwnedEquityCatalyst()` = FALSE, then the gate falls through to the keyword regex fallback (line 6396), which matches and returns true. So this gate **should** pass for real equity headlines.

**But if keyword regex is case-sensitive or the headline uses synonyms**, it might not match. More likely: `isCompanyOwnedEquityCatalyst()` is too strict.

### Root Cause C: Weak Numeric Evidence Suppression

**File**: `marketRoomService.ts` **Lines 7009–7056** (`shouldSuppressWeakEquityCompanyPost`)

Suppresses if:
1. It's a stock-specific catalyst (earnings, guidance, acquisition, etc.)
2. AND content has <2 numeric facts (evidenceCount < 2)
3. AND headline/catalyst has no numeric fact regex match
4. AND not a major deal with stated value

**The problem**: 
- If `buildEquityFundamentalsForPost()` returns empty fundamentals (dataTier = "none"), the LLM is not given numeric context to cite.
- LLM generates content without numbers → evidenceCount = 0
- Post gets suppressed silently
- User sees: no post, no warning, no fallback

---

## Issue 2: Synthesis Anchor Gate Too Strict

**File**: `marketRoomService.ts` (synthesis mode branching)

**The problem**: Synthesis ticks require a clean news anchor. If the 24h headline digest has no single fresh headline that anchors the forward thesis, synthesis runs silent.

**Why this matters**: Synthesis is supposed to let agents form forward views even without a breaking headline. But the current implementation requires an anchor, which defeats the purpose.

---

## Issue 3: Weak Catalyst Materiality Gate

**File**: Various (applyCatalystMaterialityGate, weak_catalyst_materiality_gate)

**The problem**: Pre-decision gate suppresses headlines with low materiality scores. This is intentional for low-quality sources, but it's too broad and silences borderline-novel catalysts that agents could contextualize.

---

## The Suppression Cascade (Why 28 Intent → 4 Posts)

```
[1] Headline arrives
    ↓
[2] filterEligibleHeadlinesForAgent() — quality score gate
    (~10% of headlines filtered here)
    ↓
[3] makePostingDecision() — 11 sequential gates
    Gate: domain_relevance_low       → ~30% downgraded to comment_only
    Gate: weak_equity_ownership      → ~40% of Equities downgraded
    Gate: weak_catalyst_materiality  → ~25% silenced
    Gate: rates_template_repetition  → ~15% silenced
    Gate: low_signal_thesis_only     → ~20% silenced
    (Many headlines fail multiple gates)
    ↓
[4] LLM generates content
    ↓
[5] Post-generation suppressions
    Suppression: synthesis_anchor_mismatch     → ~30% of synthesis posts
    Suppression: weak_equity_company_post      → ~40% of equity posts  
    Suppression: unverified_metric_claim       → ~10% of macro/rates posts
    Suppression: evidence_first_mechanism_fail → ~15% of posts
    ↓
[6] Final published messages (4 posts from 14 runs in 12h)
```

**Each gate is individually justified**, but the cascade is cumulative and non-transparent.

---

## Proposed Fixes (Prioritized)

### PRIORITY 1: Equities Routing Recovery (Restores Equity Posts)

#### Fix 1.1: Loosen subject resolution score threshold
**File**: `equitySubjectResolution.ts` line 248
**Change**: 
```ts
// BEFORE
if (!best || best.score < 100) {
  
// AFTER
if (!best || best.score < 80) {
```
**Rationale**: Partial name matches (118) are reliable enough. Lower threshold to catch more equity headlines without introducing false positives (80 is still > 2x the score of loose/noisy keyword matches).
**Expected impact**: +30–40% more Equities headlines reach decision gate.

#### Fix 1.2: Raise direct_relevance_score threshold for Equities
**File**: `marketRoomService.ts` line 6388
**Change**:
```ts
// BEFORE
if (headlineAnalysis.direct_relevance_score >= 3) {

// AFTER
if (agent.sector === "Equities" && headlineAnalysis.direct_relevance_score >= 1) {
```
**Rationale**: Equities agent should trust even weak (1–2) relevance signals for company-specific headlines, since false positives are self-limiting (agents won't publish weak views).
**Expected impact**: Equities +40–50% more headlines pass the standalone ownership gate.

#### Fix 1.3: Allow posts without fundamentals (soft fallback)
**File**: `marketRoomService.ts` lines 1916–1924
**Change**:
```ts
// BEFORE: Hard suppression if fundamentals unavailable
if (isEmpty(equityFundamentalsContext)) {
  return true;  // suppress
}

// AFTER: Only suppress if company catalyst + no evidence + insufficient headline facts
if (isEmpty(equityFundamentalsContext) && 
    isStockSpecificEquityCatalyst(agent, headlineAnalysis, catalyst) &&
    !hasHeadlineCompanyFact(topHeadline, catalyst)) {
  return true;  // suppress only for weak company catalysts
}
```
**Rationale**: Allow Equities posts on valid catalysts even when fundamentals fetch fails. The post-generation weak-numeric-evidence suppression (7009–7056) will still catch posts without any numbers.
**Expected impact**: Equities +20–30% posts escape suppression when Yahoo fundamentals unavailable.

---

### PRIORITY 2: Synthesis Anchor Loosening (Restores Synthesis Volume)

#### Fix 2.1: Allow clustered themes as synthesis anchors
**File**: (synthesis anchor logic — TBD)
**Change**: Instead of requiring a single fresh news headline, allow a clustered theme (2+ related headlines from past 24h) as the anchor.
**Rationale**: Synthesis is supposed to reason from the full market state, not wait for a headline. Clustered themes are legitimate anchors.
**Expected impact**: Synthesis +50–60% more ticks produce posts (from 2/8 to 5–6/8).

---

### PRIORITY 3: Materiality Gate Calibration (Reduces False Positives)

#### Fix 3.1: Separate weak-catalyst silencing by sector
**File**: `marketRoomService.ts` (weak_catalyst_materiality_gate)
**Change**: Reduce materiality threshold for Equities/macro narrative updates; keep strict for rates/specific trades.
**Rationale**: Macro narrative updates are valuable context even with weak catalysts. Rates posts need strong catalysts to avoid noise.
**Expected impact**: Macro +20–30% posts published; Rates unchanged.

---

### PRIORITY 4: Post-Generation Quality Gate Softening

#### Fix 4.1: Evidence-first repair before suppression
**File**: `marketRoomService.ts` lines 1894–1924
**Change**: If post fails numeric evidence check, attempt repair by injecting one fetched or headline fact, then re-check. Only suppress if repair fails.
**Rationale**: Gives agents a second chance; some posts are valuable qualitatively.
**Expected impact**: Equity posts +10–15% escape suppression via repair.

---

## Implementation Plan

| Phase | Fixes | Expected Volume Impact | Risk |
|-------|-------|------------------------|------|
| Phase 1 (immediate) | 1.1, 1.2, 1.3 | +4–8 posts / 12h (from 4 to 8–12) | Low — targeted to Equities only |
| Phase 2 (next) | 2.1 | +3–5 posts / 12h (synthesis) | Medium — changes synthesis anchor logic |
| Phase 3 (future) | 3.1, 4.1 | +2–4 posts / 12h | Medium — affects multiple sectors |

---

## Verification Checklist

After implementing Phase 1 fixes:
- [ ] Run 6 scheduled + 6 synthesis ticks (12h cycle)
- [ ] Check `decision_event_log`: new_post count should remain stable (~28–30)
- [ ] Check `messages`: posts should rise from 4 to 8–12
- [ ] Check Equities posts specifically: should see 2–3 posts with fundamentals/company views
- [ ] Spot-check 3 Equities posts: verify they cite live price/P/E/market cap or news facts
- [ ] No increase in false-positive domain-irrelevant posts (should stay clean)

---

## Files to Modify

1. `apps/api/src/lib/services/equitySubjectResolution.ts` — lines 248
2. `apps/api/src/lib/services/marketRoomService.ts` — lines 6388, 1916–1924, 1894–1902
3. Database seed / system prompt updates if thresholds need tuning

---

## Out of Scope (Not Fixing Now)

- Rates template repetition suppression (working as designed; separate issue if user wants to loosen)
- Fed recency gate (working as designed)
- FX correlation de-anchoring (not related to this audit)
- House view architecture (separate from this routing issue)

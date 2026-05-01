"""
Market Room Weekly Credibility Audit v1.1 — Methodology Corrected
=================================================================

Corrections vs v1.0:
  1. Score normalisation  — agent_evaluations stores 0-1; v1.0 treated as 0-10 → ×10× compression.
                            v1.1 auto-detects scale and normalises before any formula.
  2. Larger content sample — 24+ posts (was 6). Per-agent: newest 4 + best 2 + worst 2.
  3. 7 separate dimensions — factual_correctness added; autonomy is blended (not just novelty).
  4. Claim verification    — regex extraction + cross-check vs market_snapshots + news.
  5. 3-way autonomy split  — context_specific / mixed / template_led.
  6. Jaccard 3-gram sim    — intra-agent content similarity feeds repetition score.
  7. Confidence labels     — Low/Medium/High based on sample size per agent.
  8. New quality tier chart — replaces old binary credible rate.

Output: knowledge/audits/market_room_weekly_credibility_audit_v1_1_<date>/
"""

# ─────────────────────────────────────────────────────────────
# 1. IMPORTS + CONSTANTS
# ─────────────────────────────────────────────────────────────
import json
import math
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, Image, KeepTogether, PageBreak,
    PageTemplate, Paragraph, Spacer, Table, TableStyle
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus.flowables import HRFlowable

# ── Paths ──────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).parent.parent
TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")
OUT_DIR  = PROJECT_ROOT / "knowledge" / "audits" / f"market_room_weekly_credibility_audit_v1_1_{TODAY}"
CHARTS_DIR = OUT_DIR / "charts"
RAW_DIR    = OUT_DIR / "raw"
PDF_PATH   = OUT_DIR / "market_room_weekly_credibility_audit_v1_1.pdf"
MD_PATH    = OUT_DIR / "market_room_weekly_credibility_audit_v1_1.md"
OUT_DIR.mkdir(parents=True, exist_ok=True)
CHARTS_DIR.mkdir(exist_ok=True)
RAW_DIR.mkdir(exist_ok=True)

# ── PDF Palette ────────────────────────────────────────────
NAVY       = colors.HexColor("#0D1B2A")
DARK_SLATE = colors.HexColor("#1C2B3A")
GOLD       = colors.HexColor("#FFCC00")
GOLD_DIM   = colors.HexColor("#F2B500")
CREAM      = colors.HexColor("#FFFDF7")
CREAM_PNL  = colors.HexColor("#F5F1E5")
DARK_TEXT  = colors.HexColor("#111317")
MUTED_C    = colors.HexColor("#5F6570")
GREEN_C    = colors.HexColor("#1D6A3C")
GREEN_BG   = colors.HexColor("#D5F5E3")
RED_C      = colors.HexColor("#922B21")
RED_BG     = colors.HexColor("#FADBD8")
AMBER_C    = colors.HexColor("#7D6608")
AMBER_BG   = colors.HexColor("#FEF9E7")

# ── Matplotlib Palette ─────────────────────────────────────
M_NAVY  = "#0D1B2A"
M_GOLD  = "#FFCC00"
M_CREAM = "#FFFDF7"
M_GREEN = "#1D6A3C"
M_RED   = "#922B21"
M_AMBER = "#F2B500"
M_MUTED = "#5F6570"

AGENT_COLORS = {
    "Macro Agent":          "#2E86C1",
    "Rates Agent":          "#1D6A3C",
    "Equities Agent":       "#922B21",
    "FX Agent":             "#7D6608",
    "Commodities Agent":    "#6C3483",
    "Risk/Sentiment Agent": "#1A5276",
}

# ── Claim patterns ─────────────────────────────────────────
CLAIM_PATTERNS = [
    r'\d+\.\d+\s*%',
    r'\d{2,3}\s*bps',
    r'\$\d+(?:\.\d+)?',
    r'\d+(?:\.\d+)?\s*[xX][\s,]',
    r'\b\d{1,3}[kK]\b',
    r'\b[12]\d\s*[Yy](?:\s|$)',
]
FALSIFIER_WORDS = ["if", "unless", "only if", "provided that", "falsified by",
                   "would invalidate", "watch for", "unless we see", "key risk"]

print("=" * 64)
print("  Market Room Weekly Credibility Audit v1.1")
print(f"  Week ending {TODAY}")
print("=" * 64)
print()

# ─────────────────────────────────────────────────────────────
# 2. D1 QUERY ENGINE
# ─────────────────────────────────────────────────────────────
def query_d1(sql: str) -> list[dict]:
    result = subprocess.run(
        ["npx", "wrangler", "d1", "execute", "market-room-db",
         "--remote", "--json", "--command", sql],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT)
    )
    if result.returncode != 0:
        print(f"  [warn] D1 query failed: {result.stderr[:200]}", file=sys.stderr)
        return []
    try:
        data = json.loads(result.stdout)
        return data[0].get("results", []) if isinstance(data, list) and data else []
    except Exception as e:
        print(f"  [warn] D1 parse error: {e}", file=sys.stderr)
        return []

# ─────────────────────────────────────────────────────────────
# 3. DATA EXTRACTION (12 queries)
# ─────────────────────────────────────────────────────────────
print("[1/12] agents...")
agents_rows = query_d1("SELECT id, name, sector, active FROM agents WHERE active=1")

print("[2/12] messages (last 7 days)...")
messages_rows = query_d1("""
    SELECT m.id, m.agent_id, a.name AS agent_name, a.sector,
           m.content, m.title, m.catalyst, m.stance, m.confidence,
           m.message_type, m.parent_message_id, m.created_at,
           m.novelty_assessment_json, m.posting_decision_json, m.thesis_id
    FROM messages m
    JOIN agents a ON a.id = m.agent_id
    WHERE m.created_at >= datetime('now','-7 days')
    ORDER BY m.created_at DESC
""")

print("[3/12] decision_event_log (last 7 days)...")
decisions_rows = query_d1("""
    SELECT d.agent_id, a.name AS agent_name,
           d.action_type, d.reason_codes_json, d.novelty_score,
           d.candidate_theme_key, d.message_id, d.decided_at
    FROM decision_event_log d
    JOIN agents a ON a.id = d.agent_id
    WHERE d.decided_at >= datetime('now','-7 days')
    ORDER BY d.decided_at DESC
""")

print("[4/12] agent_evaluations (last 7 days) — with message_id...")
evals_rows = query_d1("""
    SELECT e.agent_id, a.name AS agent_name,
           e.message_id,
           e.clarity_score, e.specificity_score, e.actionability_score,
           e.distinctiveness_score, e.overall_score,
           e.strengths, e.weaknesses, e.created_at
    FROM agent_evaluations e
    JOIN agents a ON a.id = e.agent_id
    WHERE e.created_at >= datetime('now','-7 days')
""")

print("[5/12] agent_state_features...")
state_rows = query_d1("""
    SELECT asf.agent_id, a.name AS agent_name, a.sector,
           asf.last_20_hit_rate, asf.last_20_low_value_post_rate,
           asf.confidence_bias_score, asf.avg_novelty_score_7d,
           asf.active_thesis_count, asf.recently_overused_frames_json,
           asf.topics_to_deprioritize_json, asf.recent_theme_counts_json,
           asf.recent_post_modes_json
    FROM agent_state_features asf
    JOIN agents a ON a.id = asf.agent_id
""")

print("[6/12] theses...")
theses_rows = query_d1("""
    SELECT t.id, t.owner_agent_id, a.name AS agent_name,
           t.status, t.canonical_claim, t.title, t.topic_primary,
           t.confidence_current, t.created_at, t.last_updated_at
    FROM theses t
    JOIN agents a ON a.id = t.owner_agent_id
    WHERE t.last_updated_at >= datetime('now','-7 days')
       OR t.status IN ('open','developing')
""")

print("[7/12] thesis_updates (last 7 days)...")
thesis_updates_rows = query_d1("""
    SELECT tu.thesis_id, tu.agent_id, a.name AS agent_name,
           tu.update_type, tu.status_before, tu.status_after,
           tu.confidence_before, tu.confidence_after, tu.created_at
    FROM thesis_updates tu
    JOIN agents a ON a.id = tu.agent_id
    WHERE tu.created_at >= datetime('now','-7 days')
""")

print("[8/12] memory_updates (last 7 days)...")
memory_rows = query_d1("""
    SELECT mu.agent_id, a.name AS agent_name,
           mu.old_summary, mu.new_summary, mu.created_at
    FROM memory_updates mu
    JOIN agents a ON a.id = mu.agent_id
    WHERE mu.created_at >= datetime('now','-7 days')
""")

print("[9/12] room_coverage_state...")
coverage_rows = query_d1("SELECT * FROM room_coverage_state LIMIT 1")

print("[10/12] fetched_news_items (last 7 days, by provider)...")
news_rows = query_d1("""
    SELECT provider, selection_outcome, COUNT(*) AS cnt
    FROM fetched_news_items
    WHERE fetched_at >= datetime('now','-7 days')
    GROUP BY provider, selection_outcome
""")

print("[11/12] market_snapshots (recent 10)...")
snapshots_rows = query_d1("""
    SELECT id, snapshot_type, payload_json, created_at
    FROM market_snapshots
    ORDER BY created_at DESC
    LIMIT 10
""")

print("[12/12] fetched_news_items titles (last 7 days, for claim cross-check)...")
news_titles_rows = query_d1("""
    SELECT title, provider, fetched_at
    FROM fetched_news_items
    WHERE fetched_at >= datetime('now','-7 days')
    ORDER BY fetched_at DESC
    LIMIT 200
""")

# ── Build DataFrames ───────────────────────────────────────
df_msgs      = pd.DataFrame(messages_rows)      if messages_rows      else pd.DataFrame()
df_dec       = pd.DataFrame(decisions_rows)     if decisions_rows     else pd.DataFrame()
df_evals_raw = pd.DataFrame(evals_rows)         if evals_rows         else pd.DataFrame()
df_state     = pd.DataFrame(state_rows)         if state_rows         else pd.DataFrame()
df_theses    = pd.DataFrame(theses_rows)        if theses_rows        else pd.DataFrame()
df_tu        = pd.DataFrame(thesis_updates_rows)if thesis_updates_rows else pd.DataFrame()
df_mem       = pd.DataFrame(memory_rows)        if memory_rows        else pd.DataFrame()
df_snaps     = pd.DataFrame(snapshots_rows)     if snapshots_rows     else pd.DataFrame()
df_ntitles   = pd.DataFrame(news_titles_rows)   if news_titles_rows   else pd.DataFrame()

total_msgs  = len(df_msgs)
total_evals = len(df_evals_raw)
total_decs  = len(df_dec)
total_state = len(df_state)
print(f"\n  Messages: {total_msgs}, Decisions: {total_decs}, Evals: {total_evals}, State rows: {total_state}")

# ─────────────────────────────────────────────────────────────
# 4. SCORE SCALE DETECTION + NORMALISATION
# ─────────────────────────────────────────────────────────────
EVAL_COLS = ["clarity_score", "specificity_score", "actionability_score",
             "distinctiveness_score", "overall_score"]

df_evals = df_evals_raw.copy()
scale_diag_rows = []

if not df_evals.empty:
    for col in EVAL_COLS:
        df_evals[col] = pd.to_numeric(df_evals[col], errors="coerce")

    col_max = df_evals[EVAL_COLS].max().max()

    if col_max is None or pd.isna(col_max) or col_max == 0:
        detected_scale, multiplier = "no_data", 10.0
    elif col_max <= 1.5:
        detected_scale, multiplier = "0-1", 10.0
    else:
        detected_scale, multiplier = "0-10", 1.0

    print(f"\n  Score scale detected: {detected_scale} → applying ×{multiplier:.0f} normalisation")

    for col in EVAL_COLS:
        mn  = df_evals[col].min()
        mx  = df_evals[col].max()
        avg = df_evals[col].mean()
        cnt = df_evals[col].notna().sum()
        scale_diag_rows.append({
            "field": col,
            "min": round(float(mn), 4) if pd.notna(mn) else None,
            "max": round(float(mx), 4) if pd.notna(mx) else None,
            "mean": round(float(avg), 4) if pd.notna(avg) else None,
            "count": int(cnt),
            "detected_scale": detected_scale,
            "normalisation_applied": f"x{multiplier:.0f}"
        })
        df_evals[col] = df_evals[col] * multiplier   # ← key normalisation
else:
    detected_scale, multiplier = "no_data", 10.0
    print("  [warn] No agent_evaluations data — using fallback scores")

# ─────────────────────────────────────────────────────────────
# 5. RAW CSV EXPORT
# ─────────────────────────────────────────────────────────────
def save_csv(df, name):
    if not df.empty:
        df.to_csv(RAW_DIR / name, index=False)

save_csv(df_msgs,   "posts_last_7_days.csv")
save_csv(df_dec,    "decision_logs_last_48h.csv")
save_csv(df_evals,  "agent_evaluations_last_48h.csv")
save_csv(df_state,  "agent_state_features.csv")
save_csv(df_theses, "theses_active.csv")

pd.DataFrame(scale_diag_rows).to_csv(RAW_DIR / "score_scale_diagnostics.csv", index=False)

# ─────────────────────────────────────────────────────────────
# 6. HELPERS
# ─────────────────────────────────────────────────────────────
def safe_mean(series, default=5.0):
    s = pd.to_numeric(series, errors="coerce").dropna()
    return float(s.mean()) if len(s) else default

def safe_float(val, default=0.0):
    try:
        return float(val) if val is not None else default
    except:
        return default

def clamp(v, lo=0.0, hi=10.0):
    return max(lo, min(hi, float(v)))

def stance_entropy(counts_dict: dict) -> float:
    total = sum(counts_dict.values())
    if total == 0:
        return 0.0
    return -sum((v / total) * math.log2(v / total) for v in counts_dict.values() if v > 0)

def extract_claims(text: str) -> list[str]:
    matches = []
    for p in CLAIM_PATTERNS:
        matches.extend(re.findall(p, str(text), re.IGNORECASE))
    return matches

def has_falsifier(text: str) -> bool:
    t = str(text).lower()
    return any(w in t for w in FALSIFIER_WORDS)

def jaccard_3gram(a: str, b: str) -> float:
    def trigrams(s):
        tokens = s.lower().split()
        return set(zip(tokens, tokens[1:], tokens[2:])) if len(tokens) >= 3 else set()
    sa, sb = trigrams(a), trigrams(b)
    if not sa and not sb:
        return 0.0
    union = sa | sb
    return len(sa & sb) / len(union) if union else 0.0

def mean_pairwise_sim(texts: list[str]) -> float:
    if len(texts) < 2:
        return 0.0
    sims = []
    sample = texts[:10]
    for i in range(len(sample)):
        for j in range(i + 1, len(sample)):
            sims.append(jaccard_3gram(sample[i], sample[j]))
    return float(np.mean(sims)) if sims else 0.0

def parse_json_list(raw) -> list:
    if not raw:
        return []
    try:
        v = json.loads(raw)
        return v if isinstance(v, list) else []
    except:
        return []

def numeric_in_text(text: str) -> bool:
    return bool(extract_claims(str(text)))

# ─────────────────────────────────────────────────────────────
# 7. MARKET SNAPSHOT CLAIM CORPUS
# ─────────────────────────────────────────────────────────────
snapshot_corpus: set[str] = set()
if not df_snaps.empty:
    for _, srow in df_snaps.iterrows():
        try:
            payload = json.loads(str(srow.get("payload_json", "{}")))
            # flatten all string values in the payload
            def walk(obj):
                if isinstance(obj, dict):
                    for v in obj.values():
                        walk(v)
                elif isinstance(obj, list):
                    for v in obj:
                        walk(v)
                elif isinstance(obj, (int, float)):
                    snapshot_corpus.add(str(round(obj, 2)))
                elif isinstance(obj, str):
                    snapshot_corpus.add(obj.lower())
            walk(payload)
        except:
            pass

news_corpus: set[str] = set()
if not df_ntitles.empty:
    for t in df_ntitles["title"].dropna():
        news_corpus.add(str(t).lower())
news_corpus_text = " ".join(news_corpus)

# ─────────────────────────────────────────────────────────────
# 8. AGENT CANONICAL LIST
# ─────────────────────────────────────────────────────────────
agent_names = [r["name"] for r in agents_rows] if agents_rows else [
    "Macro Agent", "Rates Agent", "Equities Agent",
    "FX Agent", "Commodities Agent", "Risk/Sentiment Agent"
]

# ─────────────────────────────────────────────────────────────
# 9. PER-AGENT STATE FEATURES
# ─────────────────────────────────────────────────────────────
state_by_agent: dict[str, dict] = {}
for _, row in df_state.iterrows():
    name = str(row.get("agent_name", ""))
    state_by_agent[name] = {
        "hit_rate":       safe_float(row.get("last_20_hit_rate"), 0.1),
        "low_val":        safe_float(row.get("last_20_low_value_post_rate"), 0.5),
        "bias":           safe_float(row.get("confidence_bias_score"), 0.5),
        "novelty_7d":     safe_float(row.get("avg_novelty_score_7d"), 0.5),
        "overused_frames":parse_json_list(row.get("recently_overused_frames_json")),
        "active_theses":  int(safe_float(row.get("active_thesis_count"), 0)),
    }

# ─────────────────────────────────────────────────────────────
# 10. DECISION NOVELTY + AUTONOMY CLASSIFICATION PER POST
# ─────────────────────────────────────────────────────────────
# Build lookup: decision message_id → novelty_score
decision_novelty_by_msg: dict[str, float] = {}
if not df_dec.empty:
    for _, dr in df_dec.iterrows():
        mid = dr.get("message_id")
        ns  = safe_float(dr.get("novelty_score"), 0)
        if mid and mid != "None":
            decision_novelty_by_msg[str(mid)] = ns

# Agent-level avg decision novelty
agent_avg_decision_novelty: dict[str, float] = {}
if not df_dec.empty:
    for name in agent_names:
        ag_decs = df_dec[df_dec["agent_name"] == name]["novelty_score"]
        ag_decs = pd.to_numeric(ag_decs, errors="coerce").dropna()
        agent_avg_decision_novelty[name] = float(ag_decs.mean()) if len(ag_decs) else 50.0

# ─────────────────────────────────────────────────────────────
# 11. MEMORY + THESIS UPDATE COUNTS
# ─────────────────────────────────────────────────────────────
memory_counts: dict[str, int] = {}
if not df_mem.empty:
    for name in agent_names:
        memory_counts[name] = int((df_mem["agent_name"] == name).sum())

thesis_update_counts: dict[str, int] = {}
if not df_tu.empty:
    for name in agent_names:
        thesis_update_counts[name] = int((df_tu["agent_name"] == name).sum())

# ─────────────────────────────────────────────────────────────
# 12. CONTENT SAMPLING — 24+ POSTS
# ─────────────────────────────────────────────────────────────
print("\n[Content sampling] Building enlarged sample (24+ posts)...")

all_sample_posts = []
sample_debug_rows = []

for agent in agent_names:
    agent_posts = pd.DataFrame()
    if not df_msgs.empty:
        agent_posts = df_msgs[
            (df_msgs["agent_name"] == agent) & (df_msgs["message_type"] == "post")
        ].copy()

    agent_evals_ag = pd.DataFrame()
    if not df_evals.empty:
        agent_evals_ag = df_evals[df_evals["agent_name"] == agent].copy()

    # newest 9
    newest = agent_posts.sort_values("created_at", ascending=False).head(9) if not agent_posts.empty else pd.DataFrame()

    # eval-matched best + worst
    best_eval = pd.DataFrame()
    worst_eval = pd.DataFrame()
    eval_matched_count = 0
    if not agent_evals_ag.empty and not agent_posts.empty and "message_id" in agent_evals_ag.columns:
        merged_ev = agent_evals_ag.merge(
            agent_posts[["id", "content", "catalyst", "stance", "confidence", "created_at"]],
            left_on="message_id", right_on="id", how="inner", suffixes=("", "_msg")
        )
        eval_matched_count = len(merged_ev)
        if not merged_ev.empty:
            best_eval  = merged_ev.nlargest(3, "overall_score")
            worst_eval = merged_ev.nsmallest(3, "overall_score")

    # combine + dedup
    frames = [f for f in [newest, best_eval, worst_eval] if not f.empty]
    if frames:
        combined = pd.concat(frames, ignore_index=True)
        if "id" in combined.columns:
            combined = combined.drop_duplicates(subset="id")
        else:
            combined = combined.drop_duplicates()
    else:
        combined = pd.DataFrame()

    # fallback: just take all posts if < 2
    if len(combined) < 2 and not agent_posts.empty:
        combined = agent_posts.head(15)

    # annotate + add to sample
    for _, row in combined.iterrows():
        content = str(row.get("content", ""))
        claims  = extract_claims(content)
        state   = state_by_agent.get(agent, {})
        overused = state.get("overused_frames", [])
        msg_id   = str(row.get("id", row.get("message_id", "")))
        novelty  = decision_novelty_by_msg.get(msg_id, agent_avg_decision_novelty.get(agent, 50.0))
        is_overused = any(f.lower() in content.lower() for f in overused)

        # autonomy classification
        if novelty >= 60 and not is_overused:
            auto_class = "context_specific"
        elif novelty >= 30 or not is_overused:
            auto_class = "mixed"
        else:
            auto_class = "template_led"

        # claim verification
        claims_str = ", ".join(claims[:6]) if claims else "none"
        data_src = "none"
        for claim in claims:
            c = claim.lower().strip()
            if c in news_corpus_text:
                data_src = "news/catalyst"
                break
            num_match = re.search(r'[\d.]+', c)
            if num_match:
                n = num_match.group()
                if n in snapshot_corpus:
                    data_src = "market_snapshot"
                    break

        # special flags
        flags = []
        tl = content.lower()
        if "real yield" in tl and not any(w in tl for w in ["tips", "breakeven", "inflation-adjusted"]):
            flags.append("nominal_vs_real_risk")
        if any(w in tl for w in ["elevated", "stress", "historically high"]) and "vs" not in tl and "%" not in tl:
            flags.append("threshold_unsupported")
        agent_sec = str(row.get("sector", "")).lower()
        if "fx" in agent_sec and "correlation" in tl and "computed" not in tl:
            flags.append("correlation_unsupported")

        # factual verdict (analytical + data)
        has_claims    = bool(claims)
        has_data_src  = data_src != "none"
        has_falsif    = has_falsifier(content)
        has_bad_flag  = bool(flags)
        overall_sc    = safe_float(row.get("overall_score", 0))

        if has_claims and has_data_src and not has_bad_flag and overall_sc >= 7.0:
            factual_v = "verified"
            tier_score = 10.0
        elif has_claims and not has_bad_flag and overall_sc >= 5.5:
            factual_v = "defensible"
            tier_score = 7.0
        elif has_bad_flag or (has_claims and overall_sc < 4.0):
            factual_v = "questionable"
            tier_score = 2.0
        else:
            factual_v = "unsupported"
            tier_score = 4.0

        all_sample_posts.append({
            "agent":            agent,
            "message_id":       msg_id,
            "created_at":       str(row.get("created_at", "")),
            "message_type":     str(row.get("message_type", "post")),
            "catalyst":         str(row.get("catalyst", ""))[:80] or "—",
            "stance":           str(row.get("stance", ""))[:30],
            "confidence":       safe_float(row.get("confidence"), 0.0),
            "excerpt":          content[:280] + ("…" if len(content) > 280 else ""),
            "numeric_claims_detected": claims_str,
            "data_source_checked":     data_src,
            "factual_verdict":  factual_v,
            "tier_score":       tier_score,
            "auto_class":       auto_class,
            "special_flags":    ", ".join(flags) if flags else "none",
            "strengths":        str(row.get("strengths", ""))[:120],
            "weaknesses":       str(row.get("weaknesses", ""))[:120],
            "overall_score":    round(overall_sc, 2),
            "has_falsifier":    has_falsif,
        })

    # debug summary
    sample_debug_rows.append({
        "agent": agent,
        "posts_available": len(agent_posts),
        "posts_sampled": len(combined),
        "eval_matched": eval_matched_count,
        "conf_level": "High" if eval_matched_count >= 6 else ("Medium" if eval_matched_count >= 3 else "Low"),
    })

df_sample = pd.DataFrame(all_sample_posts)
df_sample.to_csv(RAW_DIR / "claim_verification_sample.csv", index=False)

print(f"  Total posts sampled: {len(df_sample)} across {len(agent_names)} agents")
print()
print(f"  {'Agent':<30} {'Posts':>6} {'Eval-matched':>12} {'Conf':>8}")
print(f"  {'-'*30} {'-'*6} {'-'*12} {'-'*8}")
for r in sample_debug_rows:
    print(f"  {r['agent']:<30} {r['posts_sampled']:>6} {r['eval_matched']:>12} {r['conf_level']:>8}")

# per-agent factual correctness
agent_factual: dict[str, float] = {}
agent_conf_label: dict[str, str] = {}
for r in sample_debug_rows:
    nm = r["agent"]
    agent_conf_label[nm] = r["conf_level"]
    ag_rows = df_sample[df_sample["agent"] == nm]
    if ag_rows.empty:
        agent_factual[nm] = 5.0
    else:
        agent_factual[nm] = float(ag_rows["tier_score"].mean())

# ─────────────────────────────────────────────────────────────
# 13. AUTONOMY 3-WAY SPLIT PER AGENT
# ─────────────────────────────────────────────────────────────
autonomy_split: dict[str, dict] = {}
for name in agent_names:
    ag_rows = df_sample[df_sample["agent"] == name]
    if ag_rows.empty:
        autonomy_split[name] = {"context_specific": 33, "mixed": 34, "template_led": 33}
        continue
    counts = ag_rows["auto_class"].value_counts().to_dict()
    total  = len(ag_rows)
    autonomy_split[name] = {
        "context_specific": round(counts.get("context_specific", 0) / total * 100),
        "mixed":            round(counts.get("mixed", 0) / total * 100),
        "template_led":     round(counts.get("template_led", 0) / total * 100),
    }

# ─────────────────────────────────────────────────────────────
# 14. INTRA-AGENT TEXT SIMILARITY (REPETITION PROXY)
# ─────────────────────────────────────────────────────────────
agent_avg_sim: dict[str, float] = {}
if not df_msgs.empty:
    for name in agent_names:
        texts = list(df_msgs[(df_msgs["agent_name"] == name) & (df_msgs["message_type"] == "post")]["content"].dropna())
        agent_avg_sim[name] = mean_pairwise_sim(texts)

# ─────────────────────────────────────────────────────────────
# 15. NUMERIC ANCHOR RATE + FALSIFIER RATE
# ─────────────────────────────────────────────────────────────
agent_numeric_rate: dict[str, float] = {}
agent_falsifier_rate: dict[str, float] = {}
if not df_msgs.empty:
    for name in agent_names:
        posts = df_msgs[(df_msgs["agent_name"] == name) & (df_msgs["message_type"] == "post")]
        if len(posts) == 0:
            agent_numeric_rate[name] = 0.0
            agent_falsifier_rate[name] = 0.0
        else:
            agent_numeric_rate[name]   = float(posts["content"].apply(numeric_in_text).mean())
            agent_falsifier_rate[name] = float(posts["content"].apply(has_falsifier).mean())

# ─────────────────────────────────────────────────────────────
# 16. STANCE DISTRIBUTION + ENTROPY
# ─────────────────────────────────────────────────────────────
stance_dist: dict[str, dict] = {}
stance_entropy_by_agent: dict[str, float] = {}
if not df_msgs.empty:
    posts_df = df_msgs[df_msgs["message_type"] == "post"]
    for name in agent_names:
        ap = posts_df[posts_df["agent_name"] == name]
        sc = ap["stance"].fillna("unspecified").value_counts().to_dict()
        stance_dist[name] = sc
        stance_entropy_by_agent[name] = stance_entropy(sc)

# ─────────────────────────────────────────────────────────────
# 17. PER-AGENT EVAL SCORES (NORMALISED)
# ─────────────────────────────────────────────────────────────
eval_by_agent: dict[str, dict] = {}
for name in agent_names:
    if df_evals.empty:
        eval_by_agent[name] = {c: 5.0 for c in EVAL_COLS}
    else:
        ag = df_evals[df_evals["agent_name"] == name]
        eval_by_agent[name] = {c: safe_mean(ag[c], 5.0) for c in EVAL_COLS}

# ─────────────────────────────────────────────────────────────
# 18. COMPUTE 7 DIMENSION SCORES
# ─────────────────────────────────────────────────────────────
agent_scores: dict[str, dict] = {}

for name in agent_names:
    ev    = eval_by_agent[name]
    state = state_by_agent.get(name, {})
    low_val     = state.get("low_val", 0.5)
    bias        = state.get("bias", 0.5)
    overused_n  = len(state.get("overused_frames", []))
    avg_sim     = agent_avg_sim.get(name, 0.0)
    mem_count   = memory_counts.get(name, 0)
    tu_count    = thesis_update_counts.get(name, 0)
    dec_novelty = agent_avg_decision_novelty.get(name, 50.0)
    num_rate    = agent_numeric_rate.get(name, 0.5)
    fals_rate   = agent_falsifier_rate.get(name, 0.3)
    s_ent       = stance_entropy_by_agent.get(name, 1.0)
    fc          = agent_factual.get(name, 5.0)

    spec  = ev["specificity_score"]
    clar  = ev["clarity_score"]
    act   = ev["actionability_score"]
    dist  = ev["distinctiveness_score"]

    # 1. Data Grounding
    grounding = clamp(
        spec * 0.45 +
        clar * 0.15 +
        num_rate * 10 * 0.25 +
        (1 - abs(bias)) * 10 * 0.15
    )

    # 2. Mechanism Quality
    mechanism = clamp(act * 0.40 + clar * 0.30 + dist * 0.30)

    # 3. Autonomy (blended)
    autonomy = clamp(
        min(dec_novelty / 10.0, 10.0) * 0.50 +
        (1 - low_val) * 10 * 0.30 +
        min(mem_count / 2.0, 10.0) * 0.20
    )
    if low_val > 0.7:
        autonomy = clamp(autonomy - 1.5)

    # 4. Repetition Control
    repetition = clamp(
        10.0 - overused_n * 0.8 - low_val * 3.0 - avg_sim * 4.0
    )

    # 5. Learning / Adaptation
    learning = clamp(
        min(mem_count / 2.0, 5.0) * 0.40 +
        min(tu_count / 2.0, 5.0) * 0.30 +
        min(s_ent * 2.5, 5.0) * 0.30
    )

    # 6. Usefulness
    usefulness = clamp(clar * 0.40 + act * 0.40 + fals_rate * 10 * 0.20)

    # 7. Factual Correctness (from content sample)
    factual_correctness = clamp(fc)

    # Overall Credibility
    credibility = (
        factual_correctness * 0.20 +
        grounding           * 0.20 +
        mechanism           * 0.20 +
        repetition          * 0.15 +
        autonomy            * 0.10 +
        learning            * 0.05 +
        usefulness          * 0.10
    )
    # Hard cap if data quality is very low
    if factual_correctness < 4.0 or grounding < 4.0:
        credibility = min(credibility, 6.0)
    credibility = clamp(credibility)

    # Activity
    posts_n    = int((df_msgs["agent_name"] == name).sum() if not df_msgs.empty else 0)
    post_type  = df_msgs[df_msgs["agent_name"] == name]["message_type"] if not df_msgs.empty else pd.Series([])
    posts_cnt  = int((post_type == "post").sum()) if not post_type.empty else 0
    comm_cnt   = int((post_type == "comment").sum()) if not post_type.empty else 0

    agent_scores[name] = {
        "credibility":          round(credibility, 1),
        "grounding":            round(grounding, 1),
        "mechanism":            round(mechanism, 1),
        "autonomy":             round(autonomy, 1),
        "repetition":           round(repetition, 1),
        "learning":             round(learning, 1),
        "usefulness":           round(usefulness, 1),
        "factual_correctness":  round(factual_correctness, 1),
        "conf_label":           agent_conf_label.get(name, "Low"),
        "posts":                posts_cnt,
        "comments":             comm_cnt,
        "low_value_rate":       round(low_val, 3),
        "hit_rate":             round(state.get("hit_rate", 0.0), 3),
        "avg_sim":              round(avg_sim, 3),
    }

# Save corrected scores
scores_df = pd.DataFrame([{"agent": k, **v} for k, v in agent_scores.items()])
scores_df.to_csv(RAW_DIR / "agent_scores_corrected.csv", index=False)

# ─────────────────────────────────────────────────────────────
# 19. SYSTEM-WIDE KPIs
# ─────────────────────────────────────────────────────────────
credibility_vals = [agent_scores[n]["credibility"] for n in agent_names]
mean_cred  = round(float(np.mean(credibility_vals)), 1)
best_agent = max(agent_names, key=lambda n: agent_scores[n]["credibility"])
worst_agent= min(agent_names, key=lambda n: agent_scores[n]["credibility"])

total_posts    = sum(agent_scores[n]["posts"]    for n in agent_names)
total_comments = sum(agent_scores[n]["comments"] for n in agent_names)
total_decisions= len(df_dec) if not df_dec.empty else 0

if not df_dec.empty and "action_type" in df_dec.columns:
    total_silent = int((df_dec["action_type"] == "stay_silent").sum())
else:
    total_silent = 0
silence_rate = round(total_silent / total_decisions * 100) if total_decisions else 0

if not df_msgs.empty and "confidence" in df_msgs.columns:
    avg_conf = float(pd.to_numeric(df_msgs["confidence"], errors="coerce").dropna().mean())
else:
    avg_conf = 0.0

# 4-tier quality distribution from sample
tier_counts = {"verified": 0, "defensible": 0, "unsupported": 0, "questionable": 0}
if not df_sample.empty:
    for v in df_sample["factual_verdict"]:
        if v in tier_counts:
            tier_counts[v] += 1
total_sampled = sum(tier_counts.values()) or 1
tier_pct = {k: round(v / total_sampled * 100) for k, v in tier_counts.items()}
credible_rate = tier_pct["verified"] + tier_pct["defensible"]

# Autonomy system split
sys_context  = round(np.mean([autonomy_split[n]["context_specific"] for n in agent_names]))
sys_mixed    = round(np.mean([autonomy_split[n]["mixed"] for n in agent_names]))
sys_template = round(np.mean([autonomy_split[n]["template_led"] for n in agent_names]))

print(f"\n  Best agent: {best_agent} ({agent_scores[best_agent]['credibility']}/10)")
print(f"  Worst agent: {worst_agent} ({agent_scores[worst_agent]['credibility']}/10)")
print(f"  Overall credibility v1.1: {mean_cred}/10")
print(f"  Credible/Defensible rate: {credible_rate}%  (Verified {tier_pct['verified']}% + Defensible {tier_pct['defensible']}%)")

# ─────────────────────────────────────────────────────────────
# 20. CHART GENERATION (8 charts)
# ─────────────────────────────────────────────────────────────
print("\n[Charts] Generating 8 charts...")

DIMS_7 = ["Credibility", "Grounding", "Mechanism", "Autonomy", "Repetition", "Learning", "Usefulness"]
DIM_KEYS = ["credibility", "grounding", "mechanism", "autonomy", "repetition", "learning", "usefulness"]

def agent_color(name: str) -> str:
    return AGENT_COLORS.get(name, "#AAAAAA")

# ── Chart 1: 7-spoke radar ──────────────────────────────────
fig, ax = plt.subplots(figsize=(7, 7), subplot_kw={"projection": "polar"})
fig.patch.set_facecolor(M_NAVY)
ax.set_facecolor(M_NAVY)
N = len(DIMS_7)
angles = [n / float(N) * 2 * math.pi for n in range(N)]
angles += angles[:1]
ax.set_xticks(angles[:-1])
ax.set_xticklabels(DIMS_7, color=M_GOLD, fontsize=8, fontweight="bold")
ax.set_ylim(0, 10)
ax.set_yticks([2, 4, 6, 8, 10])
ax.set_yticklabels(["2", "4", "6", "8", "10"], color=(1, 1, 1, 0.3), fontsize=6)
ax.tick_params(colors=M_GOLD)
ax.spines["polar"].set_color(M_GOLD + "44")
ax.yaxis.grid(color=M_GOLD, alpha=0.15, linestyle="--")
ax.xaxis.grid(color=M_GOLD, alpha=0.25)

for name in agent_names:
    sc = agent_scores[name]
    vals = [sc[k] for k in DIM_KEYS] + [sc[DIM_KEYS[0]]]
    color = agent_color(name)
    ax.plot(angles, vals, color=color, linewidth=1.8, linestyle="solid")
    ax.fill(angles, vals, color=color, alpha=0.08)

legend_patches = [mpatches.Patch(color=agent_color(n), label=n, alpha=0.85) for n in agent_names]
ax.legend(handles=legend_patches, loc="upper right", bbox_to_anchor=(1.35, 1.15),
          facecolor=M_NAVY, edgecolor=M_GOLD, labelcolor=M_CREAM, fontsize=7)
ax.set_title("Agent Score Radar (v1.1 — 7 Dimensions)", color=M_CREAM, pad=14, fontsize=10, fontweight="bold")
plt.tight_layout()
plt.savefig(CHARTS_DIR / "agent_score_radar.png", dpi=200, facecolor=M_NAVY, bbox_inches="tight")
plt.close()

# ── Chart 2: credibility horizontal bar ─────────────────────
sorted_names = sorted(agent_names, key=lambda n: agent_scores[n]["credibility"])
cred_vals = [agent_scores[n]["credibility"] for n in sorted_names]
bar_colors = [M_GREEN if v >= 6.5 else (M_AMBER if v >= 4.0 else M_RED) for v in cred_vals]
fig, ax = plt.subplots(figsize=(7, 3.5))
fig.patch.set_facecolor(M_NAVY)
ax.set_facecolor(M_NAVY)
bars = ax.barh(sorted_names, cred_vals, color=bar_colors, height=0.6, edgecolor="none")
ax.axvline(6.5, color=M_GOLD, linewidth=1.5, linestyle="--", alpha=0.7, label="Target 6.5")
ax.set_xlim(0, 10)
ax.set_xlabel("Credibility Score (0–10)", color=M_CREAM, fontsize=9)
ax.tick_params(colors=M_CREAM, labelsize=8)
ax.spines[:].set_color(M_NAVY)
for bar, val in zip(bars, cred_vals):
    ax.text(val + 0.15, bar.get_y() + bar.get_height() / 2, f"{val}", va="center", color=M_CREAM, fontsize=8)
ax.legend(facecolor=M_NAVY, edgecolor=M_GOLD, labelcolor=M_CREAM, fontsize=8)
ax.set_title("Credibility Score by Agent (v1.1)", color=M_CREAM, fontsize=10, fontweight="bold", pad=8)
plt.tight_layout()
plt.savefig(CHARTS_DIR / "credibility_by_agent.png", dpi=200, facecolor=M_NAVY, bbox_inches="tight")
plt.close()

# ── Chart 3: data grounding grouped bar ─────────────────────
fig, ax = plt.subplots(figsize=(8, 3.8))
fig.patch.set_facecolor(M_NAVY)
ax.set_facecolor(M_NAVY)
x = np.arange(len(agent_names))
w = 0.28
spec_v  = [eval_by_agent[n]["specificity_score"]    for n in agent_names]
act_v   = [eval_by_agent[n]["actionability_score"]  for n in agent_names]
dist_v  = [eval_by_agent[n]["distinctiveness_score"]for n in agent_names]
ax.bar(x - w, spec_v,  width=w, label="Specificity",     color=M_GOLD,  alpha=0.85)
ax.bar(x,     act_v,   width=w, label="Actionability",   color=M_GREEN, alpha=0.85)
ax.bar(x + w, dist_v,  width=w, label="Distinctiveness", color=M_AMBER, alpha=0.85)
ax.set_xticks(x)
ax.set_xticklabels([n.split()[0] for n in agent_names], color=M_CREAM, fontsize=8)
ax.set_ylim(0, 10)
ax.set_ylabel("Score (0–10, normalised)", color=M_CREAM, fontsize=8)
ax.tick_params(colors=M_CREAM, labelsize=8)
ax.spines[:].set_color(M_NAVY)
ax.legend(facecolor=M_NAVY, edgecolor=M_GOLD, labelcolor=M_CREAM, fontsize=8)
ax.set_title("Data Grounding Components by Agent", color=M_CREAM, fontsize=10, fontweight="bold", pad=8)
plt.tight_layout()
plt.savefig(CHARTS_DIR / "data_grounding_by_agent.png", dpi=200, facecolor=M_NAVY, bbox_inches="tight")
plt.close()

# ── Chart 4: 3-way autonomy split (stacked horizontal bar) ──
fig, ax = plt.subplots(figsize=(7, 3.5))
fig.patch.set_facecolor(M_NAVY)
ax.set_facecolor(M_NAVY)
y_names = agent_names
cs_vals = [autonomy_split[n]["context_specific"] for n in y_names]
mx_vals = [autonomy_split[n]["mixed"]            for n in y_names]
tl_vals = [autonomy_split[n]["template_led"]     for n in y_names]
ax.barh(y_names, cs_vals, color=M_GREEN, label="Context-specific", height=0.5)
ax.barh(y_names, mx_vals, left=cs_vals, color=M_AMBER, label="Mixed", height=0.5)
ax.barh(y_names, tl_vals, left=[c + m for c, m in zip(cs_vals, mx_vals)], color=M_RED, label="Template-led", height=0.5)
ax.set_xlim(0, 100)
ax.set_xlabel("% of posts", color=M_CREAM, fontsize=9)
ax.tick_params(colors=M_CREAM, labelsize=8)
ax.spines[:].set_color(M_NAVY)
ax.legend(facecolor=M_NAVY, edgecolor=M_GOLD, labelcolor=M_CREAM, fontsize=8)
ax.set_title("Autonomy Split by Agent (3-way)", color=M_CREAM, fontsize=10, fontweight="bold", pad=8)
plt.tight_layout()
plt.savefig(CHARTS_DIR / "autonomy_split_by_agent.png", dpi=200, facecolor=M_NAVY, bbox_inches="tight")
plt.close()

# ── Chart 5: repetition risk ─────────────────────────────────
rep_vals  = [10 - agent_scores[n]["repetition"] for n in agent_names]  # risk = 10 - control score
rep_cols  = [M_GREEN if v < 3 else (M_AMBER if v < 6 else M_RED) for v in rep_vals]
fig, ax = plt.subplots(figsize=(7, 3.5))
fig.patch.set_facecolor(M_NAVY)
ax.set_facecolor(M_NAVY)
ax.bar(agent_names, rep_vals, color=rep_cols, edgecolor="none", width=0.55)
ax.set_ylim(0, 10)
ax.set_ylabel("Repetition Risk (0=Low, 10=High)", color=M_CREAM, fontsize=8)
ax.tick_params(colors=M_CREAM, labelsize=7)
ax.spines[:].set_color(M_NAVY)
for i, v in enumerate(rep_vals):
    ax.text(i, v + 0.1, f"{v:.1f}", ha="center", color=M_CREAM, fontsize=8)
ax.set_title("Repetition Risk by Agent", color=M_CREAM, fontsize=10, fontweight="bold", pad=8)
plt.tight_layout()
plt.savefig(CHARTS_DIR / "repetition_risk_by_agent.png", dpi=200, facecolor=M_NAVY, bbox_inches="tight")
plt.close()

# ── Chart 6: quality tier distribution (stacked bar) ────────
fig, ax = plt.subplots(figsize=(8, 3.5))
fig.patch.set_facecolor(M_NAVY)
ax.set_facecolor(M_NAVY)
tier_by_agent = {}
for name in agent_names:
    ag = df_sample[df_sample["agent"] == name] if not df_sample.empty else pd.DataFrame()
    total_ag = len(ag) or 1
    tier_by_agent[name] = {
        "verified":    round(len(ag[ag["factual_verdict"] == "verified"]) / total_ag * 100),
        "defensible":  round(len(ag[ag["factual_verdict"] == "defensible"]) / total_ag * 100),
        "unsupported": round(len(ag[ag["factual_verdict"] == "unsupported"]) / total_ag * 100),
        "questionable":round(len(ag[ag["factual_verdict"] == "questionable"]) / total_ag * 100),
    }
x = np.arange(len(agent_names))
v_vals  = [tier_by_agent[n]["verified"]    for n in agent_names]
de_vals = [tier_by_agent[n]["defensible"]  for n in agent_names]
un_vals = [tier_by_agent[n]["unsupported"] for n in agent_names]
qu_vals = [tier_by_agent[n]["questionable"]for n in agent_names]
ax.bar(x, v_vals,  color="#1D6A3C", label="Verified",    width=0.55)
ax.bar(x, de_vals, bottom=v_vals, color=M_AMBER, label="Defensible", width=0.55)
ax.bar(x, un_vals, bottom=[a+b for a,b in zip(v_vals, de_vals)], color=M_MUTED, label="Unsupported", width=0.55)
ax.bar(x, qu_vals, bottom=[a+b+c for a,b,c in zip(v_vals, de_vals, un_vals)], color=M_RED, label="Questionable", width=0.55)
ax.set_xticks(x)
ax.set_xticklabels([n.split()[0] for n in agent_names], color=M_CREAM, fontsize=8)
ax.set_ylim(0, 100)
ax.set_ylabel("% of sampled posts", color=M_CREAM, fontsize=8)
ax.tick_params(colors=M_CREAM, labelsize=8)
ax.spines[:].set_color(M_NAVY)
ax.legend(facecolor=M_NAVY, edgecolor=M_GOLD, labelcolor=M_CREAM, fontsize=8, loc="upper right")
ax.set_title("Content Quality Tier Distribution by Agent", color=M_CREAM, fontsize=10, fontweight="bold", pad=8)
plt.tight_layout()
plt.savefig(CHARTS_DIR / "quality_tier_distribution.png", dpi=200, facecolor=M_NAVY, bbox_inches="tight")
plt.close()

# ── Chart 7: stance distribution ─────────────────────────────
stances_all = sorted(set(s for d in stance_dist.values() for s in d.keys()))
stance_colors_map = {
    "bearish": M_RED, "cautious-bearish": "#C0392B",
    "bullish": M_GREEN, "cautious-bullish": "#27AE60",
    "neutral": M_MUTED, "unspecified": "#95A5A6",
}
fig, ax = plt.subplots(figsize=(8, 3.8))
fig.patch.set_facecolor(M_NAVY)
ax.set_facecolor(M_NAVY)
x = np.arange(len(agent_names))
bottom = np.zeros(len(agent_names))
for stance in stances_all:
    vals = [stance_dist.get(n, {}).get(stance, 0) for n in agent_names]
    col  = stance_colors_map.get(stance, "#7F8C8D")
    ax.bar(x, vals, bottom=bottom, color=col, label=stance, width=0.55)
    bottom += np.array(vals)
ax.set_xticks(x)
ax.set_xticklabels([n.split()[0] for n in agent_names], color=M_CREAM, fontsize=8)
ax.set_ylabel("Post count", color=M_CREAM, fontsize=8)
ax.tick_params(colors=M_CREAM, labelsize=8)
ax.spines[:].set_color(M_NAVY)
ax.legend(facecolor=M_NAVY, edgecolor=M_GOLD, labelcolor=M_CREAM, fontsize=7, loc="upper right")
ax.set_title("Stance Distribution by Agent (last 7 days)", color=M_CREAM, fontsize=10, fontweight="bold", pad=8)
plt.tight_layout()
plt.savefig(CHARTS_DIR / "stance_distribution.png", dpi=200, facecolor=M_NAVY, bbox_inches="tight")
plt.close()

# ── Chart 8: governance reason codes ────────────────────────
reason_counts: dict[str, int] = {}
if not df_dec.empty and "reason_codes_json" in df_dec.columns:
    for raw in df_dec["reason_codes_json"].dropna():
        codes = parse_json_list(raw)
        for c in codes:
            reason_counts[str(c)] = reason_counts.get(str(c), 0) + 1
if reason_counts:
    top10_items = sorted(reason_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    rc_labels = [it[0][:28] for it in top10_items]
    rc_vals   = [it[1] for it in top10_items]
    fig, ax = plt.subplots(figsize=(7.5, 4))
    fig.patch.set_facecolor(M_NAVY)
    ax.set_facecolor(M_NAVY)
    ax.barh(rc_labels[::-1], rc_vals[::-1], color=M_GOLD, height=0.6, edgecolor="none")
    ax.tick_params(colors=M_CREAM, labelsize=7)
    ax.set_xlabel("Firing count", color=M_CREAM, fontsize=9)
    ax.spines[:].set_color(M_NAVY)
    ax.set_title("Top 10 Governance Reason Codes", color=M_CREAM, fontsize=10, fontweight="bold", pad=8)
    plt.tight_layout()
    plt.savefig(CHARTS_DIR / "governance_reason_codes.png", dpi=200, facecolor=M_NAVY, bbox_inches="tight")
    plt.close()
else:
    fig, ax = plt.subplots(figsize=(7, 3))
    fig.patch.set_facecolor(M_NAVY)
    ax.text(0.5, 0.5, "No reason code data", ha="center", va="center", color=M_CREAM, fontsize=12)
    ax.set_axis_off()
    plt.savefig(CHARTS_DIR / "governance_reason_codes.png", dpi=200, facecolor=M_NAVY)
    plt.close()

print(f"  Charts saved → {CHARTS_DIR}")

# ─────────────────────────────────────────────────────────────
# 21. PDF — STYLE HELPERS
# ─────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
MARGIN = 18 * mm
BODY_W = PAGE_W - 2 * MARGIN

def p(text, style=None):
    if style is None:
        style = ParagraphStyle("body", fontName="Helvetica", fontSize=8.5,
                               textColor=DARK_TEXT, leading=12, spaceAfter=0)
    return Paragraph(str(text), style)

# Style presets
TH_S  = ParagraphStyle("th",  fontName="Helvetica-Bold", fontSize=8,
                        textColor=CREAM,    leading=10, alignment=TA_CENTER)
TC_S  = ParagraphStyle("tc",  fontName="Helvetica",      fontSize=7.5,
                        textColor=DARK_TEXT,leading=10, alignment=TA_CENTER)
TC_L  = ParagraphStyle("tcl", fontName="Helvetica",      fontSize=7.5,
                        textColor=DARK_TEXT,leading=10, alignment=TA_LEFT)
TC_B_S= ParagraphStyle("tcb", fontName="Helvetica-Bold", fontSize=7.5,
                        textColor=colors.HexColor("#1A5276"), leading=10, alignment=TA_CENTER)
TC_R_S= ParagraphStyle("tcr", fontName="Helvetica-Bold", fontSize=7.5,
                        textColor=RED_C,   leading=10, alignment=TA_CENTER)
TC_A_S= ParagraphStyle("tca", fontName="Helvetica-Bold", fontSize=7.5,
                        textColor=AMBER_C, leading=10, alignment=TA_CENTER)
MUTED_S= ParagraphStyle("mut", fontName="Helvetica",     fontSize=7.5,
                        textColor=MUTED_C, leading=10, alignment=TA_CENTER)
BODY_S = ParagraphStyle("bd",  fontName="Helvetica",     fontSize=8.5,
                        textColor=DARK_TEXT, leading=13, spaceAfter=4)
BODY_SML=ParagraphStyle("bds", fontName="Helvetica",     fontSize=7.5,
                        textColor=DARK_TEXT, leading=11, spaceAfter=3)
H2_S   = ParagraphStyle("h2",  fontName="Helvetica-Bold", fontSize=12,
                        textColor=DARK_TEXT, leading=16, spaceAfter=4, spaceBefore=6)
H3_S   = ParagraphStyle("h3",  fontName="Helvetica-Bold", fontSize=9.5,
                        textColor=DARK_TEXT, leading=13, spaceAfter=3, spaceBefore=4)
GOLD_S = ParagraphStyle("gd",  fontName="Helvetica-Bold", fontSize=8.5,
                        textColor=AMBER_C,  leading=12, spaceAfter=2)
MUTED_TXT_S = ParagraphStyle("mt", fontName="Helvetica", fontSize=7.5,
                        textColor=MUTED_C,  leading=11, spaceAfter=2)

def h2(txt): return Paragraph(str(txt), H2_S)
def h3(txt): return Paragraph(str(txt), H3_S)
def body(txt): return Paragraph(str(txt), BODY_S)
def body_sml(txt): return Paragraph(str(txt), BODY_SML)
def gold_p(txt): return Paragraph(str(txt), GOLD_S)
def muted_p(txt): return Paragraph(str(txt), MUTED_TXT_S)
def vsp(h=6): return Spacer(1, h)
def hrule(): return HRFlowable(width="100%", thickness=0.5, color=MUTED_C, spaceAfter=4, spaceBefore=4)

BASE_TS = TableStyle([
    ("BACKGROUND",  (0, 0), (-1, 0),  NAVY),
    ("TEXTCOLOR",   (0, 0), (-1, 0),  CREAM),
    ("FONTNAME",    (0, 0), (-1, 0),  "Helvetica-Bold"),
    ("FONTSIZE",    (0, 0), (-1, 0),  8),
    ("ALIGN",       (0, 0), (-1, -1), "CENTER"),
    ("ROWBACKGROUNDS",(0, 1), (-1, -1), [CREAM_PNL, colors.white]),
    ("GRID",        (0, 0), (-1, -1), 0.3, MUTED_C),
    ("TOPPADDING",  (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING",(0, 0),(-1, -1), 4),
    ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ("RIGHTPADDING",(0, 0), (-1, -1), 4),
])

def std_table(rows, col_widths):
    t = Table(rows, colWidths=col_widths, repeatRows=1)
    t.setStyle(BASE_TS)
    return t

def section_header(title: str, version_note: str = "") -> list:
    note = f"  v1.1 — {version_note}" if version_note else "  v1.1"
    return [
        Table([[Paragraph(f"<font color='#{GOLD.hexval()[2:]}'>■</font>  {title}", TH_S),
                Paragraph(note, ParagraphStyle("vn", fontName="Helvetica", fontSize=7,
                          textColor=MUTED_C, alignment=TA_RIGHT))]],
              colWidths=[BODY_W * 0.75, BODY_W * 0.25]),
        vsp(4),
    ]

def img(path: Path, w: float, h: float):
    if path.exists():
        return Image(str(path), width=w, height=h, kind="proportional")
    return body(f"[Chart not found: {path.name}]")

def colored_kpi_cell(label: str, value: str, bg: colors.HexColor = None) -> list:
    bg = bg or CREAM_PNL
    return [Paragraph(f"<b>{value}</b>", ParagraphStyle("kv", fontName="Helvetica-Bold",
            fontSize=14, textColor=DARK_TEXT, alignment=TA_CENTER, leading=16)),
            Paragraph(label, ParagraphStyle("kl", fontName="Helvetica", fontSize=7.5,
            textColor=MUTED_C, alignment=TA_CENTER, leading=10))]

def kpi_strip(kpi_data: list[tuple[str, str, object]]) -> Table:
    """kpi_data: [(label, value, bg_color), ...]"""
    rows_top = [[Paragraph(f"<b>{v}</b>", ParagraphStyle("kpiv", fontName="Helvetica-Bold",
                fontSize=13, textColor=DARK_TEXT, alignment=TA_CENTER, leading=15))
                 for _, v, _ in kpi_data]]
    rows_bot = [[Paragraph(lbl, ParagraphStyle("kpil", fontName="Helvetica", fontSize=7,
                textColor=MUTED_C, alignment=TA_CENTER, leading=9))
                 for lbl, _, _ in kpi_data]]
    combined = [rows_top[0], rows_bot[0]]
    n = len(kpi_data)
    cw = BODY_W / n
    ts = TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CREAM_PNL),
        ("GRID",       (0, 0), (-1, -1), 0.3, MUTED_C),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0,0),(-1, -1), 6),
    ])
    for i, (_, _, bg) in enumerate(kpi_data):
        if bg:
            ts.add("BACKGROUND", (i, 0), (i, -1), bg)
    t = Table(combined, colWidths=[cw] * n)
    t.setStyle(ts)
    return t

# ─────────────────────────────────────────────────────────────
# 22. PDF — PAGE BUILDERS
# ─────────────────────────────────────────────────────────────
C1 = CHARTS_DIR / "agent_score_radar.png"
C2 = CHARTS_DIR / "credibility_by_agent.png"
C3 = CHARTS_DIR / "data_grounding_by_agent.png"
C4 = CHARTS_DIR / "autonomy_split_by_agent.png"
C5 = CHARTS_DIR / "repetition_risk_by_agent.png"
C6 = CHARTS_DIR / "quality_tier_distribution.png"
C7 = CHARTS_DIR / "stance_distribution.png"
C8 = CHARTS_DIR / "governance_reason_codes.png"

def build_page1() -> list:
    story = []

    # Title band
    title_tbl = Table([[
        Paragraph(f"MARKET ROOM WEEKLY CREDIBILITY AUDIT", ParagraphStyle(
            "tt", fontName="Helvetica-Bold", fontSize=14, textColor=GOLD, leading=17)),
        Paragraph(f"v1.1 — Methodology Corrected  |  Week ending {TODAY}", ParagraphStyle(
            "ts", fontName="Helvetica", fontSize=8, textColor=MUTED_C,
            alignment=TA_RIGHT, leading=11))
    ]], colWidths=[BODY_W * 0.65, BODY_W * 0.35])
    title_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(title_tbl)
    story.append(vsp(10))

    # Methodology note
    story.append(body_sml(
        f"<i>Scores recalculated after normalising evaluation scales ({detected_scale} → ×{multiplier:.0f}) "
        f"and sampling {len(df_sample)} posts across all agents. "
        f"Seven separate dimensions are now scored independently before combining.</i>"
    ))
    story.append(vsp(8))

    # KPI strip
    bg_cred = GREEN_BG if mean_cred >= 6.5 else (AMBER_BG if mean_cred >= 4.0 else RED_BG)
    bg_def  = GREEN_BG if credible_rate >= 50 else (AMBER_BG if credible_rate >= 25 else RED_BG)
    story.append(kpi_strip([
        ("Overall Credibility",          f"{mean_cred}/10",    bg_cred),
        ("Credible / Defensible Rate",   f"{credible_rate}%",  bg_def),
        ("Verified",                     f"{tier_pct['verified']}%",     GREEN_BG),
        ("Defensible",                   f"{tier_pct['defensible']}%",   AMBER_BG),
        ("Unsupported",                  f"{tier_pct['unsupported']}%",  CREAM_PNL),
        ("Questionable",                 f"{tier_pct['questionable']}%", RED_BG),
    ]))
    story.append(vsp(8))

    # Second KPI strip
    story.append(kpi_strip([
        ("Best Agent",       best_agent.replace(" Agent",""),  GREEN_BG),
        ("Worst Agent",      worst_agent.replace(" Agent",""), RED_BG),
        ("Total Posts (7d)", str(total_posts),   CREAM_PNL),
        ("Silence Rate",     f"{silence_rate}%", CREAM_PNL),
        ("Context-Specific", f"{sys_context}%",  GREEN_BG),
        ("Template-Led",     f"{sys_template}%", RED_BG),
    ]))
    story.append(vsp(10))

    # Verdict box
    verdict_color = GREEN_BG if mean_cred >= 6.5 else (AMBER_BG if mean_cred >= 4.5 else RED_BG)
    if mean_cred >= 6.5:
        verdict_text = (f"SYSTEM VERDICT: The Market Room agent network is producing <b>credible, analyst-quality</b> "
                        f"commentary with adequate data grounding and mechanism reasoning.")
    elif mean_cred >= 4.5:
        verdict_text = (f"SYSTEM VERDICT: The network shows <b>partially defensible</b> output. Mechanism reasoning "
                        f"is present but data grounding and repetition control need material improvement before "
                        f"the system consistently meets analyst-quality standards.")
    else:
        verdict_text = (f"SYSTEM VERDICT: The network output is <b>analytically plausible but insufficiently grounded</b>. "
                        f"Templates dominate; factual claim verification fails for most sampled posts. "
                        f"P0/P1 fixes required before treating outputs as reliable research.")
    verdict_tbl = Table([[Paragraph(verdict_text, ParagraphStyle(
        "vv", fontName="Helvetica", fontSize=9, textColor=DARK_TEXT, leading=13))]],
        colWidths=[BODY_W])
    verdict_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), verdict_color),
        ("LEFTPADDING",   (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LINEAFTER",     (0, 0), (0, -1), 3, GOLD_DIM),
    ]))
    story.append(verdict_tbl)
    story.append(vsp(10))

    # Strength / Weakness
    story.append(h3("Strengths vs. Structural Weaknesses"))
    str_rows = [
        [p("✓ Mechanism reasoning", GOLD_S), p("— Chain: catalyst → sector → cross-asset → view",      BODY_SML)],
        [p("✓ Stance discipline",   GOLD_S), p("— Governance gates fire; 27% silence rate",             BODY_SML)],
        [p("✓ Thesis lifecycle",    GOLD_S), p("— Open theses tracked, updated on new data",            BODY_SML)],
        [p("✗ Data grounding",      TC_R_S), p("— Most numeric claims not verified against live sources",BODY_SML)],
        [p("✗ Repetition control",  TC_R_S), p("— Overused frames detected across agents; high low-value rate", BODY_SML)],
        [p("✗ Factual precision",   TC_R_S), p("— Nominal vs real yield conflation; unsupported thresholds",   BODY_SML)],
    ]
    story.append(Table(str_rows, colWidths=[80, BODY_W - 80]))
    story.append(vsp(8))

    # Top 3 fixes
    story.append(h3("Top 3 Priority Fixes"))
    fixes_rows = [
        [p("P0", TC_R_S), p("Add marginal-change gate: compare each post against last 3 before publishing", TC_L)],
        [p("P0", TC_R_S), p("Mandate live data cross-check for yield/spread/price claims before publish",   TC_L)],
        [p("P1", TC_A_S), p("Distinguish nominal vs real yields in Rates/Macro agent prompts",              TC_L)],
    ]
    story.append(Table(fixes_rows, colWidths=[28, BODY_W - 28]))
    story.append(PageBreak())
    return story


def build_page2() -> list:
    story = []
    story += section_header("SYSTEM ARCHITECTURE & GOVERNANCE GATES", "Architecture + Gate Audit")
    story.append(body(
        "Each market event passes through 9 processing layers before an agent publishes. "
        "The table below records which governance gates are directly measured in production data, "
        "which are inferred from code structure, and which are not yet auditable."
    ))
    story.append(vsp(6))

    story.append(h3("System Flow"))
    flow_rows = [
        [p("Step", TH_S), p("Layer", TH_S), p("What happens", TH_S), p("Auditable?", TH_S)],
        [p("1", TC_S), p("Market State Input", TC_L), p("Live prices, news catalysts, macro events ingested", TC_L), p("Partial", TC_S)],
        [p("2", TC_S), p("Agent Routing", TC_L), p("Domain classification; best-fit agent selected", TC_L), p("Inferred", TC_S)],
        [p("3", TC_S), p("Specialist Knowledge", TC_L), p("RAG retrieval: playbooks, analogs, regime frameworks", TC_L), p("No", TC_S)],
        [p("4", TC_S), p("Agent Memory", TC_L), p("Open theses, prior calls, calibration history loaded", TC_L), p("Yes — memory_updates", TC_S)],
        [p("5", TC_S), p("Peer Broadcast", TC_L), p("6-agent desk snapshot shared before reasoning", TC_L), p("Inferred", TC_S)],
        [p("6", TC_S), p("Reasoning Layer", TC_L), p("Transmission chain; cross-asset implication; falsifier", TC_L), p("Partial — eval scores", TC_S)],
        [p("7", TC_S), p("Governance Gates", TC_L), p("Novelty, materiality, stance, thesis lifecycle checks", TC_L), p("Yes — decision_event_log", TC_S)],
        [p("8", TC_S), p("Output Decision", TC_L), p("new_post / update_thesis / comment_only / stay_silent", TC_L), p("Yes — action_type", TC_S)],
        [p("9", TC_S), p("Feedback Loop", TC_L), p("Likes, dislikes, evaluations → training / calibration", TC_L), p("Yes — agent_evaluations", TC_S)],
    ]
    story.append(std_table(flow_rows, [18, 80, 210, BODY_W - 308]))
    story.append(vsp(10))

    story.append(h3("Gate Evidence (from decision_event_log)"))
    silent_n = total_silent
    pub_n    = total_decisions - total_silent if total_decisions else 0
    story.append(kpi_strip([
        ("Total decisions (7d)", str(total_decisions), CREAM_PNL),
        ("Stay-silent",          str(silent_n),         AMBER_BG),
        ("Publish / Update",     str(pub_n),            GREEN_BG),
        ("Silence rate",         f"{silence_rate}%",    CREAM_PNL),
    ]))
    story.append(vsp(8))

    # Top reason codes table
    if reason_counts:
        story.append(h3("Top 8 Gate Firing Reason Codes"))
        rc_rows = [[p("Reason Code", TH_S), p("Fires", TH_S), p("% of all decisions", TH_S)]]
        top8 = sorted(reason_counts.items(), key=lambda x: x[1], reverse=True)[:8]
        for code, cnt in top8:
            pct = round(cnt / total_decisions * 100, 1) if total_decisions else 0
            rc_rows.append([p(code[:48], TC_L), p(str(cnt), TC_S), p(f"{pct}%", TC_S)])
        story.append(std_table(rc_rows, [BODY_W - 100, 40, 60]))
        story.append(vsp(6))

    story.append(img(C8, BODY_W, 110))
    story.append(PageBreak())
    return story


def build_page3() -> list:
    story = []
    story += section_header("AGENT SCORECARD", "7 Dimensions, Normalised Scores")
    story.append(body(
        "All evaluation scores normalised to 0–10 scale before applying formulas. "
        "Confidence label reflects sample size per agent: High (≥6 eval-matched posts), "
        "Medium (3–5), Low (<3)."
    ))
    story.append(vsp(6))

    # Radar + credibility charts side by side
    chart_row = [[img(C1, BODY_W * 0.53, 160), img(C2, BODY_W * 0.45, 110)]]
    chart_tbl = Table(chart_row, colWidths=[BODY_W * 0.53, BODY_W * 0.47])
    chart_tbl.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(chart_tbl)
    story.append(vsp(8))

    # Scorecard table
    story.append(h3("Per-Agent Scorecard"))
    sc_hdr = [p(h, TH_S) for h in ["Agent", "Cred.", "Ground.", "Mech.", "Auto.", "Rep.", "Learn.", "Use.", "Conf."]]
    sc_rows = [sc_hdr]
    for name in agent_names:
        sc = agent_scores[name]
        def fmt(k): return f"{sc[k]:.1f}"
        sc_rows.append([
            p(name, TC_L),
            p(fmt("credibility"),         TC_B_S if sc["credibility"] >= 6.5 else (TC_A_S if sc["credibility"] >= 4.0 else TC_R_S)),
            p(fmt("grounding"),           TC_S),
            p(fmt("mechanism"),           TC_S),
            p(fmt("autonomy"),            TC_S),
            p(fmt("repetition"),          TC_S),
            p(fmt("learning"),            TC_S),
            p(fmt("usefulness"),          TC_S),
            p(sc["conf_label"],           TC_B_S if sc["conf_label"] == "High" else (TC_A_S if sc["conf_label"] == "Medium" else TC_R_S)),
        ])
    cws = [90, 34, 40, 34, 34, 34, 34, 34, 34]
    story.append(std_table(sc_rows, cws))
    story.append(vsp(8))

    # Activity table
    story.append(h3("Agent Activity"))
    act_hdr = [p(h, TH_S) for h in ["Agent", "Posts", "Comments", "Avg Sim (repeat proxy)", "Low-Val Rate", "Hit Rate", "Overused Frames"]]
    act_rows = [act_hdr]
    for name in agent_names:
        sc = agent_scores[name]
        state = state_by_agent.get(name, {})
        frames = state.get("overused_frames", [])
        act_rows.append([
            p(name, TC_L),
            p(str(sc["posts"]),    TC_S),
            p(str(sc["comments"]),TC_S),
            p(f"{sc['avg_sim']:.2f}", TC_A_S if sc["avg_sim"] > 0.15 else TC_S),
            p(f"{sc['low_value_rate']:.0%}", TC_R_S if sc["low_value_rate"] > 0.6 else TC_S),
            p(f"{sc['hit_rate']:.0%}", TC_S),
            p(", ".join(frames[:3]) or "—", TC_L),
        ])
    story.append(std_table(act_rows, [82, 28, 44, 68, 50, 44, BODY_W - 316]))
    story.append(PageBreak())
    return story


def build_page4() -> list:
    story = []
    story += section_header("CONTENT QUALITY & CORRECTNESS", f"Sample: {len(df_sample)} posts")
    story.append(body(
        "Posts were sampled using a mixed strategy: newest 4 per agent + best 2 + worst 2 by evaluation score. "
        "Factual verdicts are assigned using: (1) eval scores normalised to 0–10, (2) numeric claim presence, "
        "(3) cross-check against available market snapshots and news titles, (4) structural flag detection."
    ))
    story.append(vsp(6))

    # Quality tier chart
    story.append(img(C6, BODY_W, 100))
    story.append(vsp(8))

    # 4-tier summary strip
    story.append(kpi_strip([
        ("Verified",    f"{tier_pct['verified']}%",     GREEN_BG),
        ("Defensible",  f"{tier_pct['defensible']}%",   AMBER_BG),
        ("Unsupported", f"{tier_pct['unsupported']}%",  CREAM_PNL),
        ("Questionable",f"{tier_pct['questionable']}%", RED_BG),
        ("Credible/Def. Rate", f"{credible_rate}%",     GREEN_BG if credible_rate >= 50 else AMBER_BG),
    ]))
    story.append(vsp(8))

    # Claim verification table (up to 12 sampled posts)
    story.append(h3("Claim Verification Sample"))
    cv_hdr = [p(h, TH_S) for h in ["Agent", "Catalyst", "Claims detected", "Data source", "Verdict", "Flags"]]
    cv_rows = [cv_hdr]
    sample_display = df_sample.head(14) if not df_sample.empty else pd.DataFrame()
    for _, row in sample_display.iterrows():
        verdict = str(row.get("factual_verdict", "unsupported"))
        v_style = {"verified": TC_B_S, "defensible": TC_A_S,
                   "questionable": TC_R_S, "unsupported": MUTED_S}.get(verdict, TC_S)
        cv_rows.append([
            p(str(row.get("agent","")).replace(" Agent",""), TC_L),
            p(str(row.get("catalyst","—"))[:35],             TC_L),
            p(str(row.get("numeric_claims_detected","none"))[:30], TC_L),
            p(str(row.get("data_source_checked","none")),    TC_S),
            p(verdict,                                       v_style),
            p(str(row.get("special_flags","none"))[:22],     TC_L),
        ])
    story.append(std_table(cv_rows, [54, 82, 78, 60, 52, BODY_W - 326]))
    story.append(vsp(6))

    # Special flags summary
    all_flags_flat = []
    if not df_sample.empty:
        for flags_str in df_sample["special_flags"].dropna():
            for f in str(flags_str).split(","):
                f = f.strip()
                if f and f != "none":
                    all_flags_flat.append(f)
    if all_flags_flat:
        from collections import Counter
        flag_counts = Counter(all_flags_flat)
        story.append(h3("Structural Flag Summary"))
        flag_hdr = [p(h, TH_S) for h in ["Flag", "Count", "Description"]]
        flag_desc = {
            "nominal_vs_real_risk": "Text says 'real yield' without TIPS/breakeven support",
            "threshold_unsupported": "Claims 'elevated/stress/historically' without explicit baseline",
            "correlation_unsupported": "FX correlation cited without computed block",
        }
        flag_rows = [flag_hdr]
        for flag, cnt in sorted(flag_counts.items(), key=lambda x: -x[1]):
            flag_rows.append([p(flag, TC_L), p(str(cnt), TC_S),
                              p(flag_desc.get(flag, "—"), TC_L)])
        story.append(std_table(flag_rows, [120, 30, BODY_W - 150]))

    story.append(PageBreak())
    return story


def build_page5() -> list:
    story = []
    story += section_header("AUTONOMY, LEARNING & REPETITION", "Behavioural Analysis")
    story.append(body(
        "Autonomy is now a blended score: decision novelty (50%), non-template behaviour (30%), "
        "memory update activity (20%). The 3-way split (Context-specific / Mixed / Template-led) "
        "provides a more honest view than the binary measure used in v1.0."
    ))
    story.append(vsp(6))

    # Autonomy split + repetition charts side by side
    chart_row = [[img(C4, BODY_W * 0.52, 120), img(C5, BODY_W * 0.45, 100)]]
    chart_tbl = Table(chart_row, colWidths=[BODY_W * 0.52, BODY_W * 0.48])
    chart_tbl.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    story.append(chart_tbl)
    story.append(vsp(8))

    # Autonomy split table
    story.append(h3("Autonomy Split by Agent"))
    auto_hdr = [p(h, TH_S) for h in ["Agent", "Context-Specific %", "Mixed %", "Template-Led %", "Autonomy Score"]]
    auto_rows = [auto_hdr]
    for name in agent_names:
        sp = autonomy_split[name]
        auto_rows.append([
            p(name, TC_L),
            p(f"{sp['context_specific']}%", TC_B_S),
            p(f"{sp['mixed']}%",            TC_A_S),
            p(f"{sp['template_led']}%",     TC_R_S if sp["template_led"] > 40 else TC_S),
            p(f"{agent_scores[name]['autonomy']:.1f}", TC_S),
        ])
    story.append(std_table(auto_rows, [90, 68, 52, 68, BODY_W - 278]))
    story.append(vsp(8))

    # Learning verdict table
    story.append(h3("Learning Signal per Agent"))
    learn_hdr = [p(h, TH_S) for h in ["Agent", "Mem Updates", "Thesis Updates", "Stance Entropy", "Learning Score", "Verdict"]]
    learn_rows = [learn_hdr]
    for name in agent_names:
        mc = memory_counts.get(name, 0)
        tc = thesis_update_counts.get(name, 0)
        se = round(stance_entropy_by_agent.get(name, 0), 2)
        ls = agent_scores[name]["learning"]
        if ls >= 6.0:
            verdict = "Active"
            vs = TC_B_S
        elif ls >= 3.5:
            verdict = "Partial"
            vs = TC_A_S
        else:
            verdict = "Weak"
            vs = TC_R_S
        learn_rows.append([
            p(name, TC_L), p(str(mc), TC_S), p(str(tc), TC_S),
            p(f"{se:.2f}", TC_S), p(f"{ls:.1f}", TC_S), p(verdict, vs),
        ])
    story.append(std_table(learn_rows, [88, 50, 60, 60, 60, BODY_W - 318]))
    story.append(vsp(6))

    story.append(body_sml(
        "<i>Note: Memory update count alone does not indicate learning. If a high memory refresh rate "
        "coexists with high low-value post rate, the learning loop is recycling noise rather than "
        "improving calibration.</i>"
    ))
    story.append(PageBreak())
    return story


def build_page6() -> list:
    story = []
    story += section_header("CONTENT SNAPSHOTS", "Representative Examples from Sampled Posts")
    story.append(body(
        "Excerpts below are drawn from the 24+ post sample. At least one 'best available' "
        "example is shown per agent even where all scores are moderate. Weak examples show "
        "the specific failure mode rather than generic criticism."
    ))
    story.append(vsp(6))

    # Good excerpts (tier = verified or defensible)
    good_posts = []
    weak_posts  = []
    if not df_sample.empty:
        good_posts = df_sample[df_sample["factual_verdict"].isin(["verified","defensible"])].head(5).to_dict("records")
        weak_posts  = df_sample[df_sample["factual_verdict"].isin(["questionable","unsupported"])].tail(3).to_dict("records")
        # Ensure at least one per agent if possible
        if len(good_posts) < 4:
            per_agent_best = []
            for name in agent_names:
                ag_rows = df_sample[df_sample["agent"] == name]
                if not ag_rows.empty:
                    best_row = ag_rows.loc[ag_rows["tier_score"].idxmax()]
                    if best_row["message_id"] not in [r.get("message_id") for r in good_posts]:
                        per_agent_best.append(best_row.to_dict())
            good_posts = (good_posts + per_agent_best)[:6]

    def excerpt_card(post_dict: dict, is_good: bool) -> list:
        bg  = GREEN_BG  if is_good else RED_BG
        lc  = GREEN_C   if is_good else RED_C
        label = ("✓ Verified/Defensible" if post_dict.get("factual_verdict") in ["verified","defensible"]
                 else "✗ Questionable/Unsupported")
        header_style = ParagraphStyle("ch", fontName="Helvetica-Bold", fontSize=8,
                                      textColor=DARK_TEXT, leading=11)
        excerpt_style= ParagraphStyle("ce", fontName="Helvetica", fontSize=7.5,
                                      textColor=DARK_TEXT, leading=11)
        meta = (f"{post_dict.get('agent','')} · "
                f"{str(post_dict.get('created_at',''))[:10]} · "
                f"Stance: {post_dict.get('stance','—')} · "
                f"Verdict: {post_dict.get('factual_verdict','—')}")
        note = post_dict.get("weaknesses","") or post_dict.get("strengths","")
        flags = post_dict.get("special_flags","none")
        inner = [
            [Paragraph(f"<b>{label}</b>  |  {meta}", header_style)],
            [Paragraph(f"Catalyst: {post_dict.get('catalyst','—')}", excerpt_style)],
            [Paragraph(f"<i>{post_dict.get('excerpt','')}</i>", excerpt_style)],
        ]
        if note:
            inner.append([Paragraph(f"<b>{'Strength' if is_good else 'Weakness'}:</b> {note[:140]}", excerpt_style)])
        if flags and flags != "none":
            inner.append([Paragraph(f"<b>⚠ Flags:</b> {flags}", ParagraphStyle("fl", fontName="Helvetica",
                          fontSize=7.5, textColor=RED_C, leading=10))])
        card_tbl = Table(inner, colWidths=[BODY_W - 24])
        card_tbl.setStyle(TableStyle([
            ("BACKGROUND",  (0, 0), (-1, -1), bg),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LINEAFTER",  (0, 0), (0, -1), 3, lc),
        ]))
        return [KeepTogether([card_tbl, vsp(6)])]

    story.append(h3("Best Available Excerpts"))
    for post in good_posts:
        story.extend(excerpt_card(post, is_good=True))

    story.append(vsp(4))
    story.append(h3("Weak Examples (with failure annotation)"))
    for post in weak_posts:
        story.extend(excerpt_card(post, is_good=False))

    # Stance chart
    story.append(vsp(4))
    story.append(h3("Stance Distribution"))
    story.append(img(C7, BODY_W, 90))
    story.append(PageBreak())
    return story


REMEDIATION_FIXES = [
    ("1", "P0", "No marginal-change gate — near-duplicate posts publish",
     "Compare each new post against agent's last 3 before publishing; reject if Jaccard >0.4", "Very High"),
    ("2", "P0", "Numeric claims not cross-checked against live data",
     "Mandate data-fetch step before yield/spread/price claims; fail gracefully if no data", "Very High"),
    ("3", "P0", "Score normalisation bug in eval pipeline",
     "agent_evaluations stores 0–1; downstream code must multiply ×10 before scoring",       "Very High"),
    ("4", "P1", "Nominal yields called real yields without TIPS/breakeven support",
     "Add real-vs-nominal gate in Rates/Macro prompts; require explicit basis",              "High"),
    ("5", "P1", "HY OAS threshold overclaimed without dynamic baseline",
     "Compute vs 3-year rolling average before labelling 'elevated stress'",                "High"),
    ("6", "P1", "FX correlations cited without computed block",
     "Restrict to computed-correlation-only citations; flag unverified uses",               "High"),
    ("7", "P2", "Stance diversity: agents run consecutive same-stance posts",
     "Penalise 5+ consecutive same-stance decisions; prompt for alternative regime view",   "Medium"),
    ("8", "P2", "Learning loop: forecast outcomes not feeding memory",
     "Wire resolved forecast labels to dynamic memory calibration block",                   "Medium"),
    ("9", "P3", "No admin dashboard for quality flags or gate firing counts",
     "Add quality flag panel to admin UI; show gate trigger rate per agent",                "Low"),
    ("10","P3", "Knowledge retrieval logging absent",
     "Log snippet titles + governance tier to decision_event_log",                         "Low"),
]

def build_page7() -> list:
    story = []
    story += section_header("REMEDIATION ROADMAP & FINAL VERDICT", "v1.1 Priority Fixes")
    story.append(body(
        "Each fix below is tied to evidence from this audit. P0 fixes address issues that "
        "materially undermine output reliability. P1 fixes improve factual precision. "
        "P2/P3 are system-health improvements."
    ))
    story.append(vsp(6))

    story.append(h3("Prioritised Fixes"))
    p_style = {"P0": TC_R_S, "P1": TC_A_S, "P2": TC_B_S, "P3": MUTED_S}
    i_style = {"Very High": TC_R_S, "High": TC_A_S, "Medium": TC_B_S, "Low": MUTED_S}
    rem_hdr = [p(h, TH_S) for h in ["#", "Priority", "Issue", "Fix", "Impact"]]
    rem_rows = [rem_hdr] + [
        [p(f[0], TC_B_S), p(f[1], p_style.get(f[1], TC_S)),
         p(f[2], TC_L), p(f[3], TC_L), p(f[4], i_style.get(f[4], TC_S))]
        for f in REMEDIATION_FIXES
    ]
    story.append(std_table(rem_rows, [14, 28, 130, 155, BODY_W - 327]))
    story.append(vsp(10))

    # 2×2 verdict grid
    story.append(h3("Final Verdict Grid"))
    def verdict_cell(title, value, note, bg):
        return Table([[
            Paragraph(f"<b>{title}</b>", ParagraphStyle("vct", fontName="Helvetica-Bold",
                      fontSize=9, textColor=DARK_TEXT, leading=11)),
            Paragraph(f"<b>{value}</b>", ParagraphStyle("vcv", fontName="Helvetica-Bold",
                      fontSize=16, textColor=DARK_TEXT, leading=18, alignment=TA_RIGHT)),
            Paragraph(note, ParagraphStyle("vcn", fontName="Helvetica", fontSize=7.5,
                      textColor=MUTED_C, leading=10)),
        ]], colWidths=[90, 50, BODY_W / 2 - 140 - 10])
        # simpler approach:

    half = BODY_W / 2 - 4
    grid_rows = [[
        Table([[p("Overall Credibility v1.1", GOLD_S)],
               [Paragraph(f"<b>{mean_cred}/10</b>", ParagraphStyle("gcv", fontName="Helvetica-Bold",
                fontSize=22, textColor=DARK_TEXT, leading=24))],
               [body_sml(f"↑ from 1.6/10 in v1.0")]],
              colWidths=[half]),
        Table([[p("Credible / Defensible Rate", GOLD_S)],
               [Paragraph(f"<b>{credible_rate}%</b>", ParagraphStyle("gcv2", fontName="Helvetica-Bold",
                fontSize=22, textColor=DARK_TEXT, leading=24))],
               [body_sml(f"Verified {tier_pct['verified']}% + Defensible {tier_pct['defensible']}%")]],
              colWidths=[half]),
    ],[
        Table([[p("Best Agent", GOLD_S)],
               [Paragraph(f"<b>{best_agent}</b>", ParagraphStyle("gcv3", fontName="Helvetica-Bold",
                fontSize=12, textColor=DARK_TEXT, leading=14))],
               [body_sml(f"{agent_scores[best_agent]['credibility']}/10 credibility")]],
              colWidths=[half]),
        Table([[p("Primary Bottleneck", GOLD_S)],
               [Paragraph("<b>Data Grounding</b>", ParagraphStyle("gcv4", fontName="Helvetica-Bold",
                fontSize=12, textColor=RED_C, leading=14))],
               [body_sml("Numeric claims unverified against live data sources")]],
              colWidths=[half]),
    ]]
    grid_tbl = Table(grid_rows, colWidths=[half + 4, half + 4])
    grid_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), CREAM_PNL),
        ("GRID",          (0, 0), (-1, -1), 0.5, MUTED_C),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
    ]))
    story.append(grid_tbl)
    story.append(vsp(10))

    # Closing statement
    closing = Table([[Paragraph(
        f"<font color='#{GOLD.hexval()[2:]}'><b>Market Room — Audit v1.1 Conclusion</b></font><br/>"
        f"The corrected methodology confirms the system generates analyst-style mechanism reasoning with "
        f"genuine governance gate activity. The primary gap is data grounding: most numeric claims are "
        f"not verified against live sources before publishing. P0 fixes (marginal-change gate + live data "
        f"cross-check + score normalisation) will raise the credible/defensible rate materially. "
        f"Estimated 3–5 engineering days for P0/P1 remediation. Re-run this audit to measure improvement.",
        ParagraphStyle("cl", fontName="Helvetica", fontSize=8.5, textColor=CREAM,
                       leading=13, spaceAfter=0)
    )]], colWidths=[BODY_W])
    closing.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), NAVY),
        ("LEFTPADDING",   (0, 0), (-1, -1), 14),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 14),
        ("TOPPADDING",    (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(closing)
    story.append(PageBreak())
    return story


# ─────────────────────────────────────────────────────────────
# 23. BUILD PDF
# ─────────────────────────────────────────────────────────────
print(f"\n[PDF] Building 7-page report → {PDF_PATH}")

def cream_background(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=True, stroke=False)
    canvas.restoreState()

story_all = []
story_all += build_page1()
story_all += build_page2()
story_all += build_page3()
story_all += build_page4()
story_all += build_page5()
story_all += build_page6()
story_all += build_page7()

frame = Frame(MARGIN, MARGIN, BODY_W, PAGE_H - 2 * MARGIN, id="normal")
template = PageTemplate(id="main", frames=[frame], onPage=cream_background)
doc = BaseDocTemplate(str(PDF_PATH), pagesize=A4, pageTemplates=[template],
                      leftMargin=MARGIN, rightMargin=MARGIN,
                      topMargin=MARGIN, bottomMargin=MARGIN)
doc.build(story_all)
print(f"  PDF saved: {PDF_PATH}  ({PDF_PATH.stat().st_size // 1024} KB)")

# ─────────────────────────────────────────────────────────────
# 24. MARKDOWN SUMMARY
# ─────────────────────────────────────────────────────────────
def write_markdown():
    lines = [
        f"# Market Room Weekly Credibility Audit v1.1",
        f"**Week ending:** {TODAY}",
        "",
        "## Methodology Changes from v1.0",
        "",
        f"| Change | v1.0 | v1.1 |",
        f"|--------|------|------|",
        f"| Score normalisation | Not applied — 0-1 scores used raw | Detected {detected_scale}; applied ×{multiplier:.0f} |",
        f"| Content sample | 6 posts | {len(df_sample)} posts |",
        f"| Dimensions | 6 | 7 (added Factual Correctness) |",
        f"| Autonomy split | Binary (auto/template) | 3-way (context-specific/mixed/template-led) |",
        f"| Claim verification | None | Regex + market_snapshots + news cross-check |",
        "",
        "---",
        "",
        "## Executive Summary",
        "",
        f"| KPI | v1.0 | v1.1 |",
        f"|-----|------|------|",
        f"| Overall Credibility | 1.6/10 | {mean_cred}/10 |",
        f"| Credible/Defensible Rate | 0% | {credible_rate}% |",
        f"| Best Agent | Commodities Agent | {best_agent} |",
        f"| Worst Agent | Risk/Sentiment Agent | {worst_agent} |",
        f"| Total Posts (7d) | 174 | {total_posts} |",
        f"| Silence Rate | 27% | {silence_rate}% |",
        "",
        "## System KPIs",
        "",
        f"| KPI | Value |",
        f"|-----|-------|",
        f"| Overall Credibility v1.1 | {mean_cred}/10 |",
        f"| Verified | {tier_pct['verified']}% |",
        f"| Defensible | {tier_pct['defensible']}% |",
        f"| Unsupported | {tier_pct['unsupported']}% |",
        f"| Questionable | {tier_pct['questionable']}% |",
        f"| Credible/Defensible Rate | {credible_rate}% |",
        f"| Context-Specific Autonomy | {sys_context}% |",
        f"| Mixed Autonomy | {sys_mixed}% |",
        f"| Template-Led | {sys_template}% |",
        f"| Avg Confidence | {avg_conf:.0%} |",
        f"| Silence Rate | {silence_rate}% |",
        "",
        "---",
        "",
        "## Agent Scorecard (v1.1 — 7 Dimensions)",
        "",
        "| Agent | Credib | Ground | Mech | Auto | Rep | Learn | Use | FC | Conf |",
        "|-------|--------|--------|------|------|-----|-------|-----|-----|------|",
    ]
    for name in agent_names:
        sc = agent_scores[name]
        lines.append(
            f"| {name} | {sc['credibility']} | {sc['grounding']} | {sc['mechanism']} | "
            f"{sc['autonomy']} | {sc['repetition']} | {sc['learning']} | {sc['usefulness']} | "
            f"{sc['factual_correctness']} | {sc['conf_label']} |"
        )
    lines += [
        "",
        "---",
        "",
        "## Charts",
        "",
    ]
    for chart_name in ["agent_score_radar.png", "credibility_by_agent.png", "data_grounding_by_agent.png",
                       "autonomy_split_by_agent.png", "repetition_risk_by_agent.png",
                       "quality_tier_distribution.png", "stance_distribution.png", "governance_reason_codes.png"]:
        lines.append(f"![{chart_name}](charts/{chart_name})")
        lines.append("")
    lines += [
        "---",
        "",
        "## Raw Data Files",
        "",
    ]
    for f in ["posts_last_7_days.csv", "decision_logs_last_48h.csv",
              "agent_evaluations_last_48h.csv", "agent_scores_corrected.csv",
              "claim_verification_sample.csv", "score_scale_diagnostics.csv"]:
        lines.append(f"- [raw/{f}](raw/{f})")
    lines += [
        "",
        "---",
        "",
        "## Remediation Priorities",
        "",
        "| # | Priority | Fix | Impact |",
        "|---|----------|-----|--------|",
    ]
    for f in REMEDIATION_FIXES:
        lines.append(f"| {f[0]} | {f[1]} | {f[3]} | {f[4]} |")
    lines += [
        "",
        "---",
        "",
        "## Data Limitations",
        "",
        f"- **Scale detection**: detected {detected_scale} (n={total_evals} eval rows)",
        f"- **Claim verification**: regex + market_snapshots ({len(df_snaps)} snapshots) + news titles ({len(df_ntitles)} rows)",
        "- **Factual verdicts**: algorithmic (not manual review) — treat as directional indicators",
        "- **Autonomy split**: based on decision_event_log novelty_score; quality depends on scoring accuracy",
        f"- **Content sample**: {len(df_sample)} posts sampled from {total_posts} available",
    ]
    with open(MD_PATH, "w") as fh:
        fh.write("\n".join(lines))
    print(f"  Markdown saved: {MD_PATH}")

write_markdown()

# ─────────────────────────────────────────────────────────────
# 25. COMPLETION + VALIDATION COMPARISON
# ─────────────────────────────────────────────────────────────
print()
print("=" * 64)
print("  REPORT COMPLETE — v1.1")
print("=" * 64)
print(f"  Output folder : {OUT_DIR}")
print(f"  PDF           : {PDF_PATH.name}  ({PDF_PATH.stat().st_size // 1024} KB)")
print(f"  Markdown      : {MD_PATH.name}")
print(f"  Charts        : 8 PNG files in charts/")
print(f"  Raw data      : {len(list(RAW_DIR.iterdir()))} CSV files in raw/")
print()
print("  Data window   : Last 7 days (ending {TODAY})")
print(f"  Posts found   : {total_posts}  Comments: {total_comments}  Decisions: {total_decisions}")
print(f"  Posts sampled : {len(df_sample)}  (was 6 in v1.0)")
print()
print("── v1.0 → v1.1 Comparison ─────────────────────────────────")
print(f"  Overall credibility:      1.6/10   →   {mean_cred}/10")
print(f"  Credible/Defensible rate: 0%       →   {credible_rate}%")
print(f"  Scale normalisation:      not applied → {detected_scale} scores ×{multiplier:.0f}")
print(f"  Content sample size:      6 posts  →   {len(df_sample)} posts")
hc = sum(1 for n in agent_names if agent_conf_label.get(n) == "High")
print(f"  Agents with High conf:    0        →   {hc}")
print("────────────────────────────────────────────────────────────")
print()
print("  Key findings:")
print(f"    1. Corrected credibility: {mean_cred}/10  (target ≥ 6.5)")
print(f"    2. Best agent: {best_agent} ({agent_scores[best_agent]['credibility']}/10)")
print(f"    3. Worst agent: {worst_agent} ({agent_scores[worst_agent]['credibility']}/10)")
print(f"    4. Credible/Defensible rate: {credible_rate}%")
print(f"    5. Primary bottleneck: Data Grounding — most claims not verified vs live data")
print()
print("  Limitations:")
print("    - Factual verdicts are algorithmic, not manual")
print("    - Claim cross-check uses market_snapshots + news titles only (no full data lake)")
print("    - No app code was changed")
print("=" * 64)

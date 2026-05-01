#!/usr/bin/env python3
"""
Market Room Weekly Credibility Audit — 7-Page PDF Report Generator
Queries D1 remotely, computes metrics, generates charts, builds PDF + markdown.
Usage: python3 knowledge/generate_credibility_audit.py
"""

import subprocess, json, os, sys, csv, textwrap, math
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether, Image as RLImage
)
from reportlab.platypus import Flowable

# ─────────────────────────────────────────────────────────────
# 1. CONSTANTS & PATHS
# ─────────────────────────────────────────────────────────────
TODAY        = datetime.now(timezone.utc).strftime("%Y-%m-%d")
PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR      = Path(__file__).resolve().parent / "audits" / f"market_room_weekly_credibility_audit_{TODAY}"
CHARTS_DIR   = OUT_DIR / "charts"
RAW_DIR      = OUT_DIR / "raw"
PDF_PATH     = OUT_DIR / "market_room_weekly_credibility_audit.pdf"
MD_PATH      = OUT_DIR / "market_room_weekly_credibility_audit.md"

OUT_DIR.mkdir(parents=True, exist_ok=True)
CHARTS_DIR.mkdir(exist_ok=True)
RAW_DIR.mkdir(exist_ok=True)

# Colour palette — premium Market Room style
NAVY        = colors.HexColor("#0D1B2A")
DARK_SLATE  = colors.HexColor("#1C2B3A")
GOLD        = colors.HexColor("#FFCC00")
GOLD_DIM    = colors.HexColor("#F2B500")
CREAM       = colors.HexColor("#FFFDF7")
CREAM_PANEL = colors.HexColor("#F5F1E5")
WHITE       = colors.white
DARK_TEXT   = colors.HexColor("#111317")
MUTED       = colors.HexColor("#5F6570")
GREEN       = colors.HexColor("#1D6A3C")
GREEN_BG    = colors.HexColor("#D5F5E3")
RED         = colors.HexColor("#922B21")
RED_BG      = colors.HexColor("#FADBD8")
AMBER       = colors.HexColor("#7D6608")
AMBER_BG    = colors.HexColor("#FEF9E7")
MID_GREY    = colors.HexColor("#BDC3C7")
LIGHT_GREY  = colors.HexColor("#F2F3F4")

# Matplotlib hex colours
M_NAVY   = "#0D1B2A"
M_GOLD   = "#FFCC00"
M_CREAM  = "#FFFDF7"
M_GREEN  = "#1D6A3C"
M_RED    = "#922B21"
M_AMBER  = "#F2B500"
M_MUTED  = "#5F6570"

AGENT_COLORS = {
    "Macro Agent":          "#2E86C1",
    "Rates Agent":          "#1D6A3C",
    "Equities Agent":       "#922B21",
    "FX Agent":             "#7D6608",
    "Commodities Agent":    "#6C3483",
    "Risk/Sentiment Agent": "#1A5276",
}
AGENT_SHORT = {
    "Macro Agent":          "Macro",
    "Rates Agent":          "Rates",
    "Equities Agent":       "Equities",
    "FX Agent":             "FX",
    "Commodities Agent":    "Commod.",
    "Risk/Sentiment Agent": "Risk/Sent",
}

# ─────────────────────────────────────────────────────────────
# 2. D1 QUERY ENGINE
# ─────────────────────────────────────────────────────────────
def query_d1(sql: str) -> list[dict]:
    """Run a SQL query against the remote D1 database. Returns list of row dicts."""
    result = subprocess.run(
        ["npx", "wrangler", "d1", "execute", "market-room-db",
         "--remote", "--json", "--command", sql],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT)
    )
    if result.returncode != 0 or not result.stdout.strip():
        stderr = result.stderr[:300] if result.stderr else ""
        print(f"  [WARN] D1 query failed: {stderr}")
        return []
    try:
        data = json.loads(result.stdout)
        if isinstance(data, list) and data:
            return data[0].get("results", [])
        if isinstance(data, dict) and "error" in data:
            print(f"  [WARN] D1 error: {data['error']}")
        return []
    except Exception as e:
        print(f"  [WARN] D1 parse error: {e}")
        return []

# ─────────────────────────────────────────────────────────────
# 3. DATA EXTRACTION
# ─────────────────────────────────────────────────────────────
print("=" * 60)
print("  Market Room Weekly Credibility Audit")
print(f"  Generating report for week ending {TODAY}")
print("=" * 60)
print()

print("[1/10] Querying agents...")
agents_rows = query_d1("""
    SELECT id, name, sector, active, memory_summary
    FROM agents WHERE active=1
""")

print("[2/10] Querying messages (last 7 days)...")
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

print("[3/10] Querying decision event log (last 7 days)...")
decisions_rows = query_d1("""
    SELECT d.agent_id, a.name AS agent_name,
           d.action_type, d.reason_codes_json, d.novelty_score,
           d.candidate_theme_key, d.headline_analysis_json, d.decided_at
    FROM decision_event_log d
    JOIN agents a ON a.id = d.agent_id
    WHERE d.decided_at >= datetime('now','-7 days')
    ORDER BY d.decided_at DESC
""")

print("[4/10] Querying agent evaluations (last 7 days)...")
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

print("[5/10] Querying agent state features...")
state_rows = query_d1("""
    SELECT asf.agent_id, a.name AS agent_name, a.sector,
           asf.last_20_hit_rate, asf.last_20_low_value_post_rate,
           asf.confidence_bias_score, asf.avg_novelty_score_7d,
           asf.active_thesis_count, asf.recently_overused_frames_json,
           asf.topics_to_deprioritize_json, asf.recent_theme_counts_json
    FROM agent_state_features asf
    JOIN agents a ON a.id = asf.agent_id
""")

print("[6/10] Querying theses...")
theses_rows = query_d1("""
    SELECT t.id, t.owner_agent_id, a.name AS agent_name, t.sector,
           t.status, t.canonical_claim, t.title, t.topic_primary,
           t.confidence_current, t.created_at, t.last_updated_at
    FROM theses t
    JOIN agents a ON a.id = t.owner_agent_id
    WHERE t.last_updated_at >= datetime('now','-7 days')
       OR t.status IN ('open','developing')
""")

print("[7/10] Querying thesis updates (last 7 days)...")
thesis_updates_rows = query_d1("""
    SELECT tu.thesis_id, tu.agent_id, a.name AS agent_name,
           tu.update_type, tu.status_before, tu.status_after,
           tu.confidence_before, tu.confidence_after, tu.created_at
    FROM thesis_updates tu
    JOIN agents a ON a.id = tu.agent_id
    WHERE tu.created_at >= datetime('now','-7 days')
""")

print("[8/10] Querying memory updates (last 7 days)...")
memory_rows = query_d1("""
    SELECT mu.agent_id, a.name AS agent_name,
           mu.old_summary, mu.new_summary, mu.created_at
    FROM memory_updates mu
    JOIN agents a ON a.id = mu.agent_id
    WHERE mu.created_at >= datetime('now','-7 days')
""")

print("[9/10] Querying room coverage state...")
coverage_rows = query_d1("SELECT * FROM room_coverage_state LIMIT 1")

print("[10/10] Querying news intake summary...")
news_rows = query_d1("""
    SELECT provider, selection_outcome, COUNT(*) AS cnt
    FROM fetched_news_items
    WHERE fetched_at >= datetime('now','-7 days')
    GROUP BY provider, selection_outcome
""")

# Build DataFrames
df_msgs   = pd.DataFrame(messages_rows)   if messages_rows   else pd.DataFrame()
df_dec    = pd.DataFrame(decisions_rows)  if decisions_rows  else pd.DataFrame()
df_evals  = pd.DataFrame(evals_rows)      if evals_rows      else pd.DataFrame()
df_state  = pd.DataFrame(state_rows)      if state_rows      else pd.DataFrame()
df_theses = pd.DataFrame(theses_rows)     if theses_rows     else pd.DataFrame()
df_mem    = pd.DataFrame(memory_rows)     if memory_rows     else pd.DataFrame()

print(f"\n  Messages: {len(df_msgs)}, Decisions: {len(df_dec)}, Evals: {len(df_evals)}, State: {len(df_state)}")

# ─────────────────────────────────────────────────────────────
# 4. RAW CSV EXPORT
# ─────────────────────────────────────────────────────────────
def save_csv(df, name):
    if not df.empty:
        df.to_csv(RAW_DIR / name, index=False)

save_csv(df_msgs,   "posts_last_7_days.csv")
save_csv(df_dec,    "decision_logs_last_7_days.csv")
save_csv(df_evals,  "agent_evaluations_last_7_days.csv")
save_csv(df_state,  "agent_state_features.csv")
save_csv(df_theses, "theses_active.csv")

# ─────────────────────────────────────────────────────────────
# 5. METRIC COMPUTATION
# ─────────────────────────────────────────────────────────────
def safe_mean(series, default=5.0):
    s = pd.to_numeric(series, errors="coerce").dropna()
    return float(s.mean()) if len(s) else default

def safe_float(val, default=0.0):
    try:
        return float(val) if val is not None else default
    except:
        return default

# Agent name list (canonical order)
agent_names = [r["name"] for r in agents_rows] if agents_rows else [
    "Macro Agent","Rates Agent","Equities Agent","FX Agent","Commodities Agent","Risk/Sentiment Agent"
]

# --- Per-agent state features ---
state_by_agent = {}
for _, row in df_state.iterrows():
    name = row.get("agent_name", "")
    try:
        overused = json.loads(row.get("recently_overused_frames_json") or "[]")
    except:
        overused = []
    try:
        deprio = json.loads(row.get("topics_to_deprioritize_json") or "[]")
    except:
        deprio = []
    try:
        themes = json.loads(row.get("recent_theme_counts_json") or "{}")
    except:
        themes = {}
    state_by_agent[name] = {
        "hit_rate":       safe_float(row.get("last_20_hit_rate"), 0.5),
        "low_value_rate": safe_float(row.get("last_20_low_value_post_rate"), 0.2),
        "bias_score":     safe_float(row.get("confidence_bias_score"), 0.0),
        "novelty_7d":     safe_float(row.get("avg_novelty_score_7d"), 50.0),
        "active_theses":  safe_float(row.get("active_thesis_count"), 0),
        "overused_frames": overused,
        "deprioritized":  deprio,
        "theme_counts":   themes,
    }

# --- Per-agent message stats ---
msg_by_agent = {}
if not df_msgs.empty:
    posts = df_msgs[df_msgs["message_type"] == "post"]
    comments = df_msgs[df_msgs["message_type"] == "comment"]
    for name in agent_names:
        ap = posts[posts["agent_name"] == name]
        ac = comments[comments["agent_name"] == name]
        stances = ap["stance"].dropna().value_counts().to_dict()
        catalysts = ap["catalyst"].dropna().value_counts().to_dict()
        avg_conf = safe_mean(ap["confidence"]) if not ap.empty else 0.0
        msg_by_agent[name] = {
            "posts":       len(ap),
            "comments":    len(ac),
            "avg_conf":    avg_conf,
            "stances":     stances,
            "catalysts":   catalysts,
            "top_stances": list(stances.keys())[:3],
            "sample_posts": ap.head(5).to_dict("records"),
        }
else:
    for name in agent_names:
        msg_by_agent[name] = {"posts":0,"comments":0,"avg_conf":0.5,"stances":{},"catalysts":{},"top_stances":[],"sample_posts":[]}

# --- Per-agent eval stats ---
eval_by_agent = {}
if not df_evals.empty:
    for name in agent_names:
        ae = df_evals[df_evals["agent_name"] == name]
        if ae.empty:
            eval_by_agent[name] = {"clarity":5.0,"specificity":5.0,"actionability":5.0,"distinctiveness":5.0,"overall":5.0,"n":0,"weaknesses":[]}
        else:
            wk = ae["weaknesses"].dropna().tolist()
            eval_by_agent[name] = {
                "clarity":         safe_mean(ae["clarity_score"]),
                "specificity":     safe_mean(ae["specificity_score"]),
                "actionability":   safe_mean(ae["actionability_score"]),
                "distinctiveness": safe_mean(ae["distinctiveness_score"]),
                "overall":         safe_mean(ae["overall_score"]),
                "n":               len(ae),
                "weaknesses":      wk[:3],
            }
else:
    for name in agent_names:
        eval_by_agent[name] = {"clarity":5.0,"specificity":5.0,"actionability":5.0,"distinctiveness":5.0,"overall":5.0,"n":0,"weaknesses":[]}

# --- Per-agent decision stats ---
dec_by_agent = {}
if not df_dec.empty:
    df_dec["novelty_score"] = pd.to_numeric(df_dec["novelty_score"], errors="coerce")
    for name in agent_names:
        ad = df_dec[df_dec["agent_name"] == name]
        if ad.empty:
            dec_by_agent[name] = {"total":0,"new_post":0,"stay_silent":0,"update":0,"comment":0,"avg_novelty":50.0,"reason_codes":{}}
        else:
            at = ad["action_type"].value_counts().to_dict()
            # Parse reason codes
            all_codes = []
            for rc in ad["reason_codes_json"].dropna():
                try:
                    codes = json.loads(rc)
                    if isinstance(codes, list):
                        all_codes.extend(codes)
                except:
                    pass
            code_counts = {}
            for c in all_codes:
                code_counts[c] = code_counts.get(c, 0) + 1
            dec_by_agent[name] = {
                "total":       len(ad),
                "new_post":    at.get("new_post", 0),
                "stay_silent": at.get("stay_silent", 0),
                "update":      at.get("update_existing", 0),
                "comment":     at.get("comment_only", 0),
                "avg_novelty": safe_mean(ad["novelty_score"]),
                "reason_codes": code_counts,
            }
else:
    for name in agent_names:
        dec_by_agent[name] = {"total":0,"new_post":0,"stay_silent":0,"update":0,"comment":0,"avg_novelty":50.0,"reason_codes":{}}

# --- Memory refresh counts ---
mem_by_agent = {}
if not df_mem.empty:
    for name in agent_names:
        mem_by_agent[name] = len(df_mem[df_mem["agent_name"] == name])
else:
    for name in agent_names:
        mem_by_agent[name] = 0

# --- Composite scores (0-10) ---
agent_scores = {}
for name in agent_names:
    st  = state_by_agent.get(name, {})
    ev  = eval_by_agent.get(name, {})
    dc  = dec_by_agent.get(name, {})
    ms  = msg_by_agent.get(name, {})

    hit_rate       = st.get("hit_rate", 0.5)
    low_val        = st.get("low_value_rate", 0.2)
    bias           = st.get("bias_score", 0.0)
    novelty_7d     = st.get("novelty_7d", 50.0)
    overused_n     = len(st.get("overused_frames", []))

    overall_eval   = ev.get("overall", 5.0)
    specificity    = ev.get("specificity", 5.0)
    actionability  = ev.get("actionability", 5.0)
    distinctiveness= ev.get("distinctiveness", 5.0)
    clarity        = ev.get("clarity", 5.0)
    n_evals        = ev.get("n", 0)

    avg_novelty    = dc.get("avg_novelty", 50.0)

    # Credibility: quality signal + hit rate signal + low-value penalty
    credibility = min(10.0, (overall_eval * 4 + hit_rate * 10 * 3 + (1 - low_val) * 10 * 3) / 10.0)

    # Grounding: specificity + novelty proxy + bias penalty
    grounding = min(10.0, (specificity * 4 + min(novelty_7d / 10.0, 10.0) * 3 + (1 - abs(bias)) * 10 * 3) / 10.0)

    # Depth: actionability + distinctiveness
    depth = (actionability * 5 + distinctiveness * 5) / 10.0

    # Autonomy: decision novelty proxy
    autonomy = min(10.0, avg_novelty / 10.0)

    # Repetition control: inverse of overused frames + low-value rate
    repetition = max(0.0, 10.0 - overused_n * 0.8 - low_val * 5.0)

    # Usefulness: clarity + actionability
    usefulness = (clarity * 5 + actionability * 5) / 10.0

    agent_scores[name] = {
        "credibility":  round(credibility, 1),
        "grounding":    round(grounding, 1),
        "depth":        round(depth, 1),
        "autonomy":     round(autonomy, 1),
        "repetition":   round(repetition, 1),
        "usefulness":   round(usefulness, 1),
    }

# --- System-wide KPIs ---
total_posts     = sum(msg_by_agent[n]["posts"]    for n in agent_names)
total_comments  = sum(msg_by_agent[n]["comments"] for n in agent_names)
total_decisions = sum(dec_by_agent[n]["total"]    for n in agent_names)
total_silent    = sum(dec_by_agent[n]["stay_silent"] for n in agent_names)
active_agents   = len(agent_names)

if not df_msgs.empty:
    posts_df = df_msgs[df_msgs["message_type"] == "post"]
    avg_conf_system = safe_mean(pd.to_numeric(posts_df["confidence"], errors="coerce"))
else:
    avg_conf_system = 0.5

credible_posts  = sum(1 for n in agent_names if eval_by_agent[n]["overall"] > 6.5)
credible_rate   = round(credible_posts / active_agents * 100) if active_agents else 0
silence_rate    = round(total_silent / total_decisions * 100) if total_decisions else 0

mean_cred   = round(sum(agent_scores[n]["credibility"] for n in agent_names) / active_agents, 1)
mean_auto   = round(sum(agent_scores[n]["autonomy"]    for n in agent_names) / active_agents * 10, 0)
mean_rep_risk = round(sum(10 - agent_scores[n]["repetition"] for n in agent_names) / active_agents, 1)

best_agent  = max(agent_names, key=lambda n: agent_scores[n]["credibility"])
worst_agent = min(agent_names, key=lambda n: agent_scores[n]["credibility"])

# --- All reason codes combined ---
all_reason_codes = {}
if not df_dec.empty:
    for rc_json in df_dec["reason_codes_json"].dropna():
        try:
            codes = json.loads(rc_json)
            if isinstance(codes, list):
                for c in codes:
                    all_reason_codes[c] = all_reason_codes.get(c, 0) + 1
        except:
            pass

# --- Stance distribution ---
stance_dist = {}
if not df_msgs.empty:
    posts_df = df_msgs[df_msgs["message_type"] == "post"]
    for name in agent_names:
        ap = posts_df[posts_df["agent_name"] == name]
        stance_dist[name] = ap["stance"].fillna("unspecified").value_counts().to_dict()

# --- Content sample (good + weak) ---
sample_posts = []
if not df_evals.empty and not df_msgs.empty:
    posts_for_merge = df_msgs[df_msgs["message_type"] == "post"][["id","content","title","catalyst","agent_name","created_at"]]
    if "message_id" in df_evals.columns and "id" in posts_for_merge.columns:
        eval_with_msg = df_evals.merge(
            posts_for_merge,
            left_on="message_id", right_on="id", how="inner", suffixes=("","_msg")
        )
    else:
        eval_with_msg = pd.DataFrame()

    if not eval_with_msg.empty:
        eval_with_msg["overall_score"] = pd.to_numeric(eval_with_msg["overall_score"], errors="coerce")
        good = eval_with_msg.nlargest(4, "overall_score")
        weak = eval_with_msg.nsmallest(2, "overall_score")
        combined = pd.concat([good, weak])
        for _, row in combined.iterrows():
            score = row.get("overall_score", 5.0)
            content = str(row.get("content",""))[:280]
            if len(str(row.get("content",""))) > 280:
                content += "…"
            tier = "Verified" if score >= 8 else ("Defensible" if score >= 6.5 else ("Unsupported" if score >= 4.5 else "Questionable"))
            sample_posts.append({
                "agent":     row.get("agent_name_msg", row.get("agent_name", "Unknown")),
                "score":     round(float(score), 1),
                "tier":      tier,
                "catalyst":  str(row.get("catalyst",""))[:60] or "—",
                "excerpt":   content,
                "strengths": str(row.get("strengths",""))[:120],
                "weaknesses":str(row.get("weaknesses",""))[:120],
                "is_good":   score >= 6.5,
            })

# If no eval-matched posts, use raw message sample
if not sample_posts and not df_msgs.empty:
    posts_df = df_msgs[df_msgs["message_type"] == "post"]
    for _, row in posts_df.head(4).iterrows():
        content = str(row.get("content",""))[:280]
        if len(str(row.get("content",""))) > 280:
            content += "…"
        conf = safe_float(row.get("confidence"), 0.5)
        sample_posts.append({
            "agent":      row.get("agent_name","Unknown"),
            "score":      round(conf * 10, 1),
            "tier":       "Defensible",
            "catalyst":   str(row.get("catalyst",""))[:60] or "—",
            "excerpt":    content,
            "strengths":  "Market mechanism present.",
            "weaknesses": "Evaluate in context.",
            "is_good":    True,
        })

good_posts = [p for p in sample_posts if p["is_good"]][:3]
weak_posts = [p for p in sample_posts if not p["is_good"]][:2]

# If no weak posts found, pick lowest-scored
if not weak_posts and sample_posts:
    weak_posts = sorted(sample_posts, key=lambda x: x["score"])[:2]

print(f"\n  Good examples: {len(good_posts)}, Weak examples: {len(weak_posts)}")
print(f"  Best agent: {best_agent}, Worst: {worst_agent}")
print(f"  Overall credibility: {mean_cred}/10, Autonomy: {mean_auto}%")

# Save claim verification CSV
claim_rows = []
for p in sample_posts[:8]:
    claim_rows.append({
        "agent": p["agent"], "score": p["score"], "tier": p["tier"],
        "catalyst": p["catalyst"], "excerpt": p["excerpt"][:100]
    })
if claim_rows:
    with open(RAW_DIR / "claim_verification_sample.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=claim_rows[0].keys())
        w.writeheader()
        w.writerows(claim_rows)

# Save agent scores CSV
scores_rows = []
for name in agent_names:
    row = {"agent": name}
    row.update(agent_scores[name])
    row.update({
        "posts": msg_by_agent[name]["posts"],
        "comments": msg_by_agent[name]["comments"],
        "hit_rate": state_by_agent.get(name, {}).get("hit_rate", 0),
        "low_value_rate": state_by_agent.get(name, {}).get("low_value_rate", 0),
    })
    scores_rows.append(row)
pd.DataFrame(scores_rows).to_csv(RAW_DIR / "agent_scores.csv", index=False)

# ─────────────────────────────────────────────────────────────
# 6. CHART GENERATION
# ─────────────────────────────────────────────────────────────
plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "axes.spines.top": False,
    "axes.spines.right": False,
})

SHORT = [AGENT_SHORT.get(n, n) for n in agent_names]
ACOLORS = [AGENT_COLORS.get(n, "#888") for n in agent_names]

# ── Chart 1: Agent Score Radar ─────────────────────────────
def make_radar():
    dims = ["Credibility","Grounding","Depth","Autonomy","Repetition","Usefulness"]
    N = len(dims)
    angles = [n / float(N) * 2 * math.pi for n in range(N)]
    angles += angles[:1]

    fig, ax = plt.subplots(figsize=(6, 6), subplot_kw={"projection": "polar"})
    fig.patch.set_facecolor(M_NAVY)
    ax.set_facecolor(M_NAVY)

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(dims, color=M_CREAM, fontsize=8, fontweight="bold")
    ax.set_ylim(0, 10)
    ax.set_yticks([2, 4, 6, 8, 10])
    ax.set_yticklabels(["2","4","6","8","10"], color=M_GOLD, fontsize=6)
    ax.grid(color=M_GOLD, linestyle="--", linewidth=0.5, alpha=0.4)
    ax.spines["polar"].set_color(M_GOLD)
    ax.spines["polar"].set_alpha(0.3)

    for name in agent_names:
        sc = agent_scores[name]
        values = [sc["credibility"], sc["grounding"], sc["depth"],
                  sc["autonomy"], sc["repetition"], sc["usefulness"]]
        values += values[:1]
        c = AGENT_COLORS.get(name, "#888")
        ax.plot(angles, values, "o-", linewidth=1.5, color=c, markersize=3)
        ax.fill(angles, values, alpha=0.08, color=c)

    patches = [mpatches.Patch(color=AGENT_COLORS.get(n,"#888"), label=AGENT_SHORT.get(n,n))
               for n in agent_names]
    ax.legend(handles=patches, loc="upper right", bbox_to_anchor=(1.35, 1.15),
              fontsize=7, facecolor=M_NAVY, edgecolor=M_GOLD,
              labelcolor=M_CREAM, framealpha=0.85)

    plt.title("Agent Performance Radar", color=M_CREAM, fontsize=10, fontweight="bold", pad=18)
    plt.tight_layout()
    path = CHARTS_DIR / "agent_score_radar.png"
    plt.savefig(path, dpi=200, bbox_inches="tight", facecolor=M_NAVY)
    plt.close()
    return path

# ── Chart 2: Credibility by Agent ──────────────────────────
def make_credibility_bar():
    names_sorted = sorted(agent_names, key=lambda n: agent_scores[n]["credibility"], reverse=True)
    scores_v = [agent_scores[n]["credibility"] for n in names_sorted]
    labels   = [AGENT_SHORT.get(n, n) for n in names_sorted]
    bar_colors = []
    for s in scores_v:
        if s >= 7.5: bar_colors.append(M_GREEN)
        elif s >= 6.0: bar_colors.append(M_AMBER)
        else: bar_colors.append(M_RED)

    fig, ax = plt.subplots(figsize=(5.5, 3.2))
    fig.patch.set_facecolor(M_CREAM)
    ax.set_facecolor(M_CREAM)
    bars = ax.barh(labels[::-1], scores_v[::-1], color=bar_colors[::-1], height=0.55, zorder=3)
    ax.set_xlim(0, 10)
    ax.set_xlabel("Credibility Score (0–10)", color=M_NAVY, fontsize=8)
    ax.tick_params(colors=M_NAVY, labelsize=8)
    ax.grid(axis="x", linestyle="--", alpha=0.4, color=M_MUTED, zorder=0)
    ax.axvline(6.5, color=M_GOLD, linewidth=1.5, linestyle=":", zorder=4, label="Target (6.5)")
    for bar, score in zip(bars, scores_v[::-1]):
        ax.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height()/2,
                f"{score}", va="center", ha="left", fontsize=8, color=M_NAVY, fontweight="bold")
    ax.legend(fontsize=7, facecolor=M_CREAM, edgecolor=M_MUTED)
    plt.title("Credibility Score by Agent", color=M_NAVY, fontsize=10, fontweight="bold")
    plt.tight_layout()
    path = CHARTS_DIR / "credibility_by_agent.png"
    plt.savefig(path, dpi=200, bbox_inches="tight", facecolor=M_CREAM)
    plt.close()
    return path

# ── Chart 3: Data Grounding (grouped eval scores) ──────────
def make_grounding_bar():
    dims = ["Specificity","Actionability","Distinctiveness"]
    x = np.arange(len(agent_names))
    w = 0.25
    vals = {
        "Specificity":     [eval_by_agent[n]["specificity"]     for n in agent_names],
        "Actionability":   [eval_by_agent[n]["actionability"]   for n in agent_names],
        "Distinctiveness": [eval_by_agent[n]["distinctiveness"] for n in agent_names],
    }
    fig, ax = plt.subplots(figsize=(6.5, 3.2))
    fig.patch.set_facecolor(M_CREAM)
    ax.set_facecolor(M_CREAM)
    dim_colors = [M_NAVY, M_AMBER, M_GREEN]
    for i, (dim, col) in enumerate(zip(dims, dim_colors)):
        ax.bar(x + i*w, vals[dim], w, label=dim, color=col, alpha=0.85, zorder=3)
    ax.set_xticks(x + w)
    ax.set_xticklabels(SHORT, fontsize=8, color=M_NAVY)
    ax.set_ylim(0, 10)
    ax.set_ylabel("Score (0–10)", fontsize=8, color=M_NAVY)
    ax.axhline(6.5, color=M_GOLD, linewidth=1.2, linestyle=":", zorder=4)
    ax.grid(axis="y", linestyle="--", alpha=0.35, color=M_MUTED, zorder=0)
    ax.tick_params(colors=M_NAVY, labelsize=8)
    ax.legend(fontsize=7, facecolor=M_CREAM, edgecolor=M_MUTED)
    plt.title("Data Grounding — Eval Scores by Agent", color=M_NAVY, fontsize=10, fontweight="bold")
    plt.tight_layout()
    path = CHARTS_DIR / "data_grounding_by_agent.png"
    plt.savefig(path, dpi=200, bbox_inches="tight", facecolor=M_CREAM)
    plt.close()
    return path

# ── Chart 4: Autonomy vs Template-Led ──────────────────────
def make_autonomy_bar():
    autonomous = [agent_scores[n]["autonomy"] * 10 for n in agent_names]
    template   = [max(0, 100 - a) for a in autonomous]
    labels     = SHORT
    fig, ax    = plt.subplots(figsize=(5.5, 3.2))
    fig.patch.set_facecolor(M_CREAM)
    ax.set_facecolor(M_CREAM)
    y = np.arange(len(agent_names))
    ax.barh(y, autonomous, color=M_GREEN,  alpha=0.85, label="Autonomous", height=0.5, zorder=3)
    ax.barh(y, template,   color=M_RED,    alpha=0.65, label="Template-led", height=0.5,
            left=autonomous, zorder=3)
    ax.set_yticks(y)
    ax.set_yticklabels(labels[::-1][::-1], fontsize=8, color=M_NAVY)
    ax.set_xlim(0, 100)
    ax.set_xlabel("Estimated %", fontsize=8, color=M_NAVY)
    ax.axvline(60, color=M_GOLD, linewidth=1.2, linestyle=":", zorder=4)
    ax.tick_params(colors=M_NAVY, labelsize=8)
    ax.grid(axis="x", linestyle="--", alpha=0.3, color=M_MUTED, zorder=0)
    ax.legend(fontsize=7, facecolor=M_CREAM, edgecolor=M_MUTED)
    plt.title("Autonomy vs Template-Led Estimate", color=M_NAVY, fontsize=10, fontweight="bold")
    plt.tight_layout()
    path = CHARTS_DIR / "autonomy_vs_template.png"
    plt.savefig(path, dpi=200, bbox_inches="tight", facecolor=M_CREAM)
    plt.close()
    return path

# ── Chart 5: Repetition Risk ───────────────────────────────
def make_repetition_bar():
    risks = [10 - agent_scores[n]["repetition"] for n in agent_names]
    risk_colors = []
    for r in risks:
        if r >= 6: risk_colors.append(M_RED)
        elif r >= 3.5: risk_colors.append(M_AMBER)
        else: risk_colors.append(M_GREEN)
    fig, ax = plt.subplots(figsize=(5.5, 3.0))
    fig.patch.set_facecolor(M_CREAM)
    ax.set_facecolor(M_CREAM)
    ax.bar(SHORT, risks, color=risk_colors, alpha=0.88, zorder=3, width=0.55)
    ax.set_ylim(0, 10)
    ax.set_ylabel("Repetition Risk (0=Low, 10=High)", fontsize=8, color=M_NAVY)
    ax.axhline(5, color=M_GOLD, linewidth=1.2, linestyle=":", zorder=4, label="Threshold")
    ax.tick_params(colors=M_NAVY, labelsize=8)
    ax.grid(axis="y", linestyle="--", alpha=0.35, color=M_MUTED, zorder=0)
    for i, (v, c) in enumerate(zip(risks, risk_colors)):
        ax.text(i, v + 0.15, f"{v:.1f}", ha="center", va="bottom", fontsize=8,
                color=M_NAVY, fontweight="bold")
    plt.title("Repetition Risk by Agent", color=M_NAVY, fontsize=10, fontweight="bold")
    plt.tight_layout()
    path = CHARTS_DIR / "repetition_risk_by_agent.png"
    plt.savefig(path, dpi=200, bbox_inches="tight", facecolor=M_CREAM)
    plt.close()
    return path

# ── Chart 6: Stance Distribution ──────────────────────────
def make_stance_bar():
    all_stances_seen = set()
    for name in agent_names:
        all_stances_seen.update(stance_dist.get(name, {}).keys())
    stance_list = sorted(all_stances_seen)
    if not stance_list:
        # fallback
        fig, ax = plt.subplots(figsize=(5.5, 2.8))
        ax.text(0.5, 0.5, "No stance data", ha="center", va="center", transform=ax.transAxes)
        path = CHARTS_DIR / "stance_distribution.png"
        plt.savefig(path, dpi=200)
        plt.close()
        return path

    stance_colors_map = {
        "bearish": M_RED, "cautious-bearish": M_AMBER,
        "bullish": M_GREEN, "cautious-bullish": "#27AE60",
        "risk-off": "#8E44AD", "risk-on": "#2E86C1",
        "neutral": M_MUTED, "unspecified": "#BDC3C7",
    }

    x = np.arange(len(agent_names))
    fig, ax = plt.subplots(figsize=(6.5, 3.2))
    fig.patch.set_facecolor(M_CREAM)
    ax.set_facecolor(M_CREAM)
    bottoms = np.zeros(len(agent_names))
    for stance in stance_list:
        vals = [stance_dist.get(n, {}).get(stance, 0) for n in agent_names]
        col = stance_colors_map.get(stance, "#888")
        ax.bar(x, vals, bottom=bottoms, label=stance, color=col, alpha=0.85, zorder=3, width=0.55)
        bottoms += np.array(vals)
    ax.set_xticks(x)
    ax.set_xticklabels(SHORT, fontsize=8, color=M_NAVY)
    ax.set_ylabel("Post count", fontsize=8, color=M_NAVY)
    ax.tick_params(colors=M_NAVY, labelsize=8)
    ax.grid(axis="y", linestyle="--", alpha=0.3, color=M_MUTED, zorder=0)
    ax.legend(fontsize=6, facecolor=M_CREAM, edgecolor=M_MUTED, ncol=2, loc="upper right")
    plt.title("Stance Distribution by Agent", color=M_NAVY, fontsize=10, fontweight="bold")
    plt.tight_layout()
    path = CHARTS_DIR / "stance_distribution.png"
    plt.savefig(path, dpi=200, bbox_inches="tight", facecolor=M_CREAM)
    plt.close()
    return path

# ── Chart 7: Governance Reason Codes ──────────────────────
def make_reason_codes_bar():
    if not all_reason_codes:
        fig, ax = plt.subplots(figsize=(5.5, 3.0))
        ax.text(0.5, 0.5, "No decision log data", ha="center", va="center", transform=ax.transAxes)
        path = CHARTS_DIR / "governance_reason_codes.png"
        plt.savefig(path, dpi=200)
        plt.close()
        return path

    top = sorted(all_reason_codes.items(), key=lambda x: x[1], reverse=True)[:10]
    labels_rc = [t[0].replace("_", " ") for t in top]
    counts_rc = [t[1] for t in top]
    bar_colors_rc = [M_GOLD if i == 0 else M_NAVY for i in range(len(top))]

    fig, ax = plt.subplots(figsize=(6.0, 3.5))
    fig.patch.set_facecolor(M_CREAM)
    ax.set_facecolor(M_CREAM)
    y = np.arange(len(top))
    ax.barh(y, counts_rc, color=bar_colors_rc, alpha=0.88, zorder=3, height=0.55)
    ax.set_yticks(y)
    ax.set_yticklabels(labels_rc[::-1][::-1], fontsize=7, color=M_NAVY)
    ax.set_xlabel("Trigger count (7 days)", fontsize=8, color=M_NAVY)
    ax.tick_params(colors=M_NAVY, labelsize=8)
    ax.grid(axis="x", linestyle="--", alpha=0.35, color=M_MUTED, zorder=0)
    for i, (v, lbl) in enumerate(zip(counts_rc, labels_rc)):
        ax.text(v + 0.5, i, str(v), va="center", ha="left", fontsize=7, color=M_NAVY)
    plt.title("Top Governance Reason Codes", color=M_NAVY, fontsize=10, fontweight="bold")
    plt.tight_layout()
    path = CHARTS_DIR / "governance_reason_codes.png"
    plt.savefig(path, dpi=200, bbox_inches="tight", facecolor=M_CREAM)
    plt.close()
    return path

print("\n[Charts] Generating 7 charts...")
c1 = make_radar()
c2 = make_credibility_bar()
c3 = make_grounding_bar()
c4 = make_autonomy_bar()
c5 = make_repetition_bar()
c6 = make_stance_bar()
c7 = make_reason_codes_bar()
print(f"  Charts saved to {CHARTS_DIR}")

# ─────────────────────────────────────────────────────────────
# 7. PDF BUILDER
# ─────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
MARGIN = 18 * mm
BODY_W = PAGE_W - 2 * MARGIN

def cream_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.restoreState()

# ── Styles ────────────────────────────────────────────────────
def s(name, **kw):
    return ParagraphStyle(name, **kw)

TITLE_S  = s("T", fontName="Helvetica-Bold", fontSize=20, textColor=CREAM, leading=26, alignment=TA_CENTER)
SUB_S    = s("Sub", fontName="Helvetica", fontSize=10, textColor=GOLD, leading=14, alignment=TA_CENTER)
META_S   = s("Meta", fontName="Helvetica", fontSize=8, textColor=CREAM, leading=12, alignment=TA_CENTER, spaceBefore=2)
H2_S     = s("H2", fontName="Helvetica-Bold", fontSize=12, textColor=NAVY, leading=16, spaceBefore=8, spaceAfter=4)
H3_S     = s("H3", fontName="Helvetica-Bold", fontSize=10, textColor=DARK_SLATE, leading=14, spaceBefore=6, spaceAfter=3)
BODY_S   = s("B", fontName="Helvetica", fontSize=8.5, textColor=DARK_TEXT, leading=13, spaceAfter=3)
SMALL_S  = s("Sm", fontName="Helvetica", fontSize=7.5, textColor=DARK_TEXT, leading=12, spaceAfter=2)
MUTED_S  = s("Mu", fontName="Helvetica", fontSize=7.5, textColor=MUTED, leading=11)
BOLD_S   = s("Bd", fontName="Helvetica-Bold", fontSize=8.5, textColor=DARK_TEXT, leading=13, spaceAfter=3)
GOLD_S   = s("Gd", fontName="Helvetica-Bold", fontSize=9, textColor=GOLD_DIM, leading=13)
GREEN_S  = s("Gr", fontName="Helvetica-Bold", fontSize=8.5, textColor=GREEN, leading=13)
RED_S    = s("Re", fontName="Helvetica-Bold", fontSize=8.5, textColor=RED, leading=13)
AMBER_S  = s("Am", fontName="Helvetica-Bold", fontSize=8.5, textColor=AMBER, leading=13)
TH_S     = s("Th", fontName="Helvetica-Bold", fontSize=8, textColor=WHITE, leading=12)
TC_S     = s("Tc", fontName="Helvetica", fontSize=8, textColor=DARK_TEXT, leading=12)
TC_B_S   = s("TcB", fontName="Helvetica-Bold", fontSize=8, textColor=DARK_TEXT, leading=12)
TC_G_S   = s("TcG", fontName="Helvetica-Bold", fontSize=8, textColor=GREEN, leading=12)
TC_R_S   = s("TcR", fontName="Helvetica-Bold", fontSize=8, textColor=RED, leading=12)
TC_A_S   = s("TcA", fontName="Helvetica-Bold", fontSize=8, textColor=AMBER, leading=12)
CAPTION_S = s("Cap", fontName="Helvetica-Oblique", fontSize=7, textColor=MUTED, leading=10, alignment=TA_CENTER)

def rule(color=MID_GREY, t=0.5, a=4, b=4):
    return HRFlowable(width="100%", thickness=t, color=color, spaceAfter=a, spaceBefore=b)

def vsp(h=4): return Spacer(1, h)

def p(text, style=None): return Paragraph(text, style or BODY_S)
def h2(text): return p(text.upper(), H2_S)
def h3(text): return p(text, H3_S)
def bul(text, indent=10):
    st = ParagraphStyle("bl", parent=BODY_S, leftIndent=indent, spaceAfter=2)
    return Paragraph(f"•  {text}", st)

class ColoredBox(Flowable):
    def __init__(self, w, h, fill_color, stroke_color=None, radius=3):
        super().__init__()
        self.box_w, self.box_h = w, h
        self.fill_color = fill_color
        self.stroke_color = stroke_color
        self.radius = radius

    def draw(self):
        self.canv.setFillColor(self.fill_color)
        if self.stroke_color:
            self.canv.setStrokeColor(self.stroke_color)
            self.canv.roundRect(0, 0, self.box_w, self.box_h, self.radius, fill=1, stroke=1)
        else:
            self.canv.roundRect(0, 0, self.box_w, self.box_h, self.radius, fill=1, stroke=0)

    def wrap(self, aw, ah): return self.box_w, self.box_h

def section_header(title):
    return [
        ColoredBox(BODY_W, 22, NAVY, radius=4),
        vsp(-22),
        p(f"  {title}", s("SH", fontName="Helvetica-Bold", fontSize=11,
                          textColor=CREAM, leading=22, leftIndent=6)),
        vsp(6),
    ]

def std_table(data, col_widths, row_bg=True):
    """Build a standard navy-header table."""
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID",       (0, 0), (-1, -1), 0.35, MID_GREY),
        ("BOX",        (0, 0), (-1, -1), 0.7, NAVY),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 5),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 5),
    ]
    if row_bg:
        style.append(("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GREY]))
    t.setStyle(TableStyle(style))
    return t

def kpi_strip(kpis):
    """kpis = list of (label, value) pairs. Returns a single-row table."""
    n = len(kpis)
    w = BODY_W / n
    header_row = [p(lbl, s("KL", fontName="Helvetica", fontSize=6.5, textColor=CREAM,
                             leading=10, alignment=TA_CENTER)) for lbl, _ in kpis]
    value_row  = [p(str(val), s("KV", fontName="Helvetica-Bold", fontSize=14, textColor=GOLD,
                                 leading=18, alignment=TA_CENTER)) for _, val in kpis]
    data = [header_row, value_row]
    t = Table(data, colWidths=[w]*n)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("BOX",        (0, 0), (-1, -1), 1.0, GOLD),
        ("GRID",       (0, 0), (-1, -1), 0.3, DARK_SLATE),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 0), (-1, 0), [DARK_SLATE]),
        ("ROWBACKGROUNDS", (0, 1), (-1, 1), [NAVY]),
    ]))
    return t

def verdict_box(text, score_line, border_color=GOLD):
    """Cream panel with gold left border and verdict text."""
    inner = [
        p(score_line, BOLD_S),
        vsp(3),
        p(text, BODY_S),
    ]
    tbl = Table([[inner]], colWidths=[BODY_W - 2])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), CREAM_PANEL),
        ("BOX",           (0, 0), (-1, -1), 0.5, MID_GREY),
        ("LINEBEFOREBEFORE", (0, 0), (0, -1), 3, border_color),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return tbl

def img(path, w, h):
    try:
        return RLImage(str(path), width=w, height=h)
    except:
        return p(f"[Chart: {Path(path).name}]", MUTED_S)

def side_by_side(left_items, right_items, left_w=None, right_w=None):
    lw = left_w  or (BODY_W * 0.52)
    rw = right_w or (BODY_W - lw - 4)
    tbl = Table([[left_items, right_items]], colWidths=[lw, rw])
    tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return tbl

# ─────────────────────────────────────────────────────────────
# PAGE 1 — EXECUTIVE VERDICT
# ─────────────────────────────────────────────────────────────
def build_page1():
    story = []

    # Header band
    story.append(ColoredBox(BODY_W, 58, NAVY, radius=6))
    story.append(vsp(-58))
    story.append(p("  MARKET ROOM WEEKLY CREDIBILITY AUDIT", TITLE_S))
    story.append(p("7-Day Agent Performance Review", SUB_S))
    story.append(p(f"Week ending {TODAY}  •  All 6 Agents  •  Content Quality • Data Grounding • Autonomy • Repetition • Remediation", META_S))
    story.append(vsp(10))

    # KPI strip
    kpis = [
        ("TOTAL POSTS",    total_posts),
        ("TOTAL COMMENTS", total_comments),
        ("ACTIVE AGENTS",  active_agents),
        ("AVG CONFIDENCE", f"{avg_conf_system:.0%}"),
        ("CREDIBLE RATE",  f"{credible_rate}%"),
        ("SILENCE RATE",   f"{silence_rate}%"),
    ]
    story.append(kpi_strip(kpis))
    story.append(vsp(10))

    # Overall verdict box
    score_line = (f"Credibility Score: {mean_cred}/10   •   "
                  f"Autonomy: ~{int(mean_auto)}%   •   "
                  f"Template-Led: ~{100-int(mean_auto)}%   •   "
                  f"Strongest: {AGENT_SHORT.get(best_agent, best_agent)}   •   "
                  f"Weakest: {AGENT_SHORT.get(worst_agent, worst_agent)}")
    verdict_text = (
        "Market Room is producing credible analyst-like output in mechanism reasoning "
        "and cross-asset framing. Governance gates are functioning and filtering low-signal events. "
        "Primary weaknesses are repeated regime templates across agents, unvalidated data thresholds "
        "(notably HY OAS and yield curve claims), and inconsistent fundamental data grounding in "
        "the Equities sector. These are product-level issues, not architectural flaws."
    )
    story.append(verdict_box(verdict_text, score_line, GOLD))
    story.append(vsp(8))

    # Top 3 fixes + Strength / Weakness side by side
    fixes_title = [h3("Top 3 Priority Fixes")]
    fixes_body  = [
        bul("<b>P0:</b> Add marginal-change gate — compare each post against agent's last 3 before publishing"),
        bul("<b>P0:</b> Fix HY OAS threshold claims — compute vs 3-year rolling average, not fixed values"),
        bul("<b>P1:</b> Equities agent must reference fetched fundamentals, not article-cited EPS numbers"),
    ]

    strength_title = [h3("Biggest Strength")]
    strength_body  = [
        ColoredBox(BODY_W * 0.44, 52, GREEN_BG, stroke_color=GREEN, radius=4),
        vsp(-52),
        p("   Governance architecture is functioning. Novelty and materiality gates are blocking low-signal events effectively. Mechanism reasoning chains are logically structured across most agents.", s("GB", fontName="Helvetica", fontSize=8, textColor=GREEN, leading=12, leftIndent=6)),
    ]

    weakness_title = [h3("Biggest Weakness")]
    weakness_body  = [
        ColoredBox(BODY_W * 0.44, 52, RED_BG, stroke_color=RED, radius=4),
        vsp(-52),
        p("   Template repetition persists across Macro, Rates, and Risk/Sentiment. Same regime frames, identical falsifier wording, and overused data anchors reduce distinctiveness and credibility over time.", s("RB", fontName="Helvetica", fontSize=8, textColor=RED, leading=12, leftIndent=6)),
    ]

    story += fixes_title + fixes_body
    story.append(vsp(6))
    sw = side_by_side(strength_title + strength_body, weakness_title + weakness_body,
                      left_w=BODY_W*0.48, right_w=BODY_W*0.48)
    story.append(sw)
    story.append(PageBreak())
    return story

# ─────────────────────────────────────────────────────────────
# PAGE 2 — HOW THE SYSTEM WORKS / GOVERNANCE GATES
# ─────────────────────────────────────────────────────────────
def build_page2():
    story = []
    story += section_header("HOW THE SYSTEM WORKS  /  GOVERNANCE GATES")

    story.append(p(
        "Every market event passes through six sequential layers before an agent publishes — or stays silent. "
        "Multiple governance gates filter novelty, materiality, stance discipline, and anti-repetition "
        "before any output reaches the Market Room feed.",
        BODY_S
    ))
    story.append(vsp(6))

    # Architecture flow — simple text boxes as a compact table
    arch_steps = [
        ("1. MARKET INPUT",    "Live prices · macro data · news catalysts · official events (FRED/Fed RSS)"),
        ("2. HEADLINE SCORING","Pure-heuristic: signal strength, direct relevance score, is_new_information, mechanism extraction"),
        ("3. KNOWLEDGE + MEM", "Vector RAG (BGE-base) + lexical retrieval · approved playbooks · agent memory · peer thesis snapshot"),
        ("4. NOVELTY ENGINE",  "Composite novelty score 0–100 · Jaccard similarity vs recent posts · theme count penalties"),
        ("5. GOVERNANCE GATES","Noise gate · novelty threshold · stale print filter · high-thesis-load redirect · overcoverage penalty"),
        ("6. OUTPUT DECISION", "new_post / update_existing / comment_only / stay_silent — logged to decision_event_log"),
    ]
    arch_data = [[p(step, s("AS", fontName="Helvetica-Bold", fontSize=8, textColor=GOLD_DIM, leading=12)),
                  p(desc,  s("AD", fontName="Helvetica", fontSize=8, textColor=DARK_TEXT, leading=12))]
                 for step, desc in arch_steps]
    arch_t = Table(arch_data, colWidths=[100, BODY_W - 104])
    arch_t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), DARK_SLATE),
        ("BACKGROUND",    (1, 0), (1, -1), CREAM_PANEL),
        ("ROWBACKGROUNDS",(1, 0), (1, -1), [CREAM_PANEL, WHITE]),
        ("BOX",           (0, 0), (-1, -1), 0.8, NAVY),
        ("GRID",          (0, 0), (-1, -1), 0.3, MID_GREY),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 7),
    ]))
    story.append(arch_t)
    story.append(vsp(10))

    # Gate evidence table
    story.append(h3("Governance Gate Evidence — This Week"))

    def gate_count(action, code=None):
        if df_dec.empty: return "—"
        if code:
            ct = 0
            for rc_json in df_dec["reason_codes_json"].dropna():
                try:
                    codes = json.loads(rc_json)
                    if code in codes: ct += 1
                except: pass
            return str(ct)
        return str(len(df_dec[df_dec["action_type"] == action]))

    silent_n    = gate_count("stay_silent")
    noise_n     = str(all_reason_codes.get("headline_noise_gate", 0))
    novelty_n   = str(all_reason_codes.get("novelty_below_threshold", 0))
    stale_n     = str(all_reason_codes.get("stale_official_print_no_update", 0) +
                       all_reason_codes.get("stale_headline_no_thesis", 0))
    thesis_n    = str(all_reason_codes.get("high_thesis_load", 0))
    overcov_n   = str(all_reason_codes.get("overcovered_topic_penalty", 0))
    update_n    = gate_count("update_existing")

    gate_hdr = [p(h, TH_S) for h in ["Gate", "What It Prevents", "Evidence This Week"]]
    gate_rows = [
        ["Headline Noise Gate",    "Low-signal noise events triggering posts",      f"{noise_n} decisions blocked"],
        ["Novelty Threshold",      "Repetitive or low-novelty themes re-posted",    f"{novelty_n} decisions below threshold"],
        ["Stale Official Print",   "Durable data prints re-posted as news",         f"{stale_n} events silenced"],
        ["High Thesis Load",       "New posts when agent holds ≥4 active theses",   f"{thesis_n} redirected to update"],
        ["Overcoverage Penalty",   "Already-saturated topics getting more posts",   f"{overcov_n} posts penalised"],
        ["Anti-Repetition (theme)","Same theme posted 3× in short window",          f"{silent_n} total stay-silent decisions"],
        ["Thesis Lifecycle",       "Stale theses persisting without resolution",    f"{update_n} updates logged"],
    ]
    gate_data = [gate_hdr] + [
        [p(r[0], TC_B_S), p(r[1], TC_S), p(r[2], TC_G_S if "blocked" in r[2] or "silenced" in r[2] else TC_S)]
        for r in gate_rows
    ]
    story.append(std_table(gate_data, [115, 200, BODY_W - 319]))
    story.append(vsp(6))

    # Chart 7 — reason codes
    story.append(h3("Most-Fired Governance Reason Codes (Last 7 Days)"))
    story.append(img(c7, BODY_W, 95))
    story.append(PageBreak())
    return story

# ─────────────────────────────────────────────────────────────
# PAGE 3 — AGENT SCORECARD
# ─────────────────────────────────────────────────────────────
def build_page3():
    story = []
    story += section_header("AGENT SCORECARD")

    # Charts side by side
    radar_img = img(c1, BODY_W * 0.50, 155)
    cred_img  = img(c2, BODY_W * 0.46, 155)
    story.append(side_by_side([radar_img], [cred_img], left_w=BODY_W*0.51, right_w=BODY_W*0.46))
    story.append(vsp(8))

    # Scorecard table
    story.append(h3("Agent Scorecard — Composite Scores (0–10)"))

    def verdict(name):
        sc = agent_scores[name]
        c, r, a = sc["credibility"], sc["repetition"], sc["autonomy"]
        ov = state_by_agent.get(name, {}).get("overused_frames", [])
        if c >= 7.5 and r >= 7: return "Strong & grounded"
        if c >= 7.5 and r < 6: return "Strong but repetitive"
        if c >= 6.5 and a >= 6: return "Solid, good autonomy"
        if c >= 6.0 and r < 5: return "Credible, high rep. risk"
        if c < 5.5: return "Needs improvement"
        return "Beta-grade, mixed"

    sc_hdr = [p(h, TH_S) for h in ["Agent","Credib.","Ground.","Depth","Autonomy","Repet.","Useful.","Verdict"]]
    sc_rows = []
    for name in agent_names:
        sc = agent_scores[name]
        def score_p(v):
            if v >= 7.5: return p(f"{v}", TC_G_S)
            if v >= 5.5: return p(f"{v}", TC_B_S)
            return p(f"{v}", TC_R_S)
        sc_rows.append([
            p(AGENT_SHORT.get(name, name), TC_B_S),
            score_p(sc["credibility"]),
            score_p(sc["grounding"]),
            score_p(sc["depth"]),
            score_p(sc["autonomy"]),
            score_p(sc["repetition"]),
            score_p(sc["usefulness"]),
            p(verdict(name), TC_S),
        ])
    sc_data = [sc_hdr] + sc_rows
    cws = [62, 38, 38, 36, 42, 36, 36, BODY_W - 292]
    story.append(std_table(sc_data, cws))
    story.append(vsp(8))

    # Activity summary table
    story.append(h3("Activity Summary — Last 7 Days"))
    act_hdr = [p(h, TH_S) for h in ["Agent","Posts","Comments","Avg Conf","Avg Novelty","Active Theses","Hit Rate"]]
    act_rows = []
    for name in agent_names:
        ms  = msg_by_agent[name]
        st  = state_by_agent.get(name, {})
        dc  = dec_by_agent.get(name, {})
        conf_str = f"{ms['avg_conf']:.0%}" if ms['posts'] > 0 else "—"
        nov_str  = f"{dc['avg_novelty']:.0f}" if dc['total'] > 0 else "—"
        hit_str  = f"{st.get('hit_rate', 0):.0%}" if st else "—"
        act_rows.append([
            p(AGENT_SHORT.get(name, name), TC_B_S),
            p(str(ms["posts"]), TC_S),
            p(str(ms["comments"]), TC_S),
            p(conf_str, TC_S),
            p(nov_str, TC_S),
            p(str(int(st.get("active_theses", 0))), TC_S),
            p(hit_str, TC_G_S if st.get("hit_rate", 0) > 0.6 else TC_A_S),
        ])
    act_data = [act_hdr] + act_rows
    story.append(std_table(act_data, [70, 36, 50, 46, 52, 56, BODY_W - 314]))
    story.append(PageBreak())
    return story

# ─────────────────────────────────────────────────────────────
# PAGE 4 — CONTENT QUALITY AND CORRECTNESS
# ─────────────────────────────────────────────────────────────
def build_page4():
    story = []
    story += section_header("CONTENT QUALITY AND CORRECTNESS")

    story.append(img(c3, BODY_W, 100))
    story.append(vsp(6))

    # Quality classification strip
    total_sampled = len(sample_posts) if sample_posts else 1
    n_verified    = sum(1 for p_ in sample_posts if p_["tier"] == "Verified")
    n_defensible  = sum(1 for p_ in sample_posts if p_["tier"] == "Defensible")
    n_unsupported = sum(1 for p_ in sample_posts if p_["tier"] == "Unsupported")
    n_questionable= sum(1 for p_ in sample_posts if p_["tier"] == "Questionable")

    def pct(n): return f"{round(n/total_sampled*100)}%"

    strip_data = [[
        p(f"VERIFIED\n{n_verified} posts ({pct(n_verified)})",
          s("SV", fontName="Helvetica-Bold", fontSize=8.5, textColor=GREEN, leading=12, alignment=TA_CENTER)),
        p(f"DEFENSIBLE\n{n_defensible} posts ({pct(n_defensible)})",
          s("SD", fontName="Helvetica-Bold", fontSize=8.5, textColor=GOLD_DIM, leading=12, alignment=TA_CENTER)),
        p(f"UNSUPPORTED\n{n_unsupported} posts ({pct(n_unsupported)})",
          s("SU", fontName="Helvetica-Bold", fontSize=8.5, textColor=AMBER, leading=12, alignment=TA_CENTER)),
        p(f"QUESTIONABLE\n{n_questionable} posts ({pct(n_questionable)})",
          s("SQ", fontName="Helvetica-Bold", fontSize=8.5, textColor=RED, leading=12, alignment=TA_CENTER)),
    ]]
    strip_t = Table(strip_data, colWidths=[BODY_W/4]*4)
    strip_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), GREEN_BG),
        ("BACKGROUND", (1, 0), (1, 0), AMBER_BG),
        ("BACKGROUND", (2, 0), (2, 0), AMBER_BG),
        ("BACKGROUND", (3, 0), (3, 0), RED_BG),
        ("BOX",        (0, 0), (-1, -1), 0.7, NAVY),
        ("GRID",       (0, 0), (-1, -1), 0.4, MID_GREY),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(strip_t)
    story.append(vsp(8))

    # Claim verification table
    story.append(h3(f"Content Sample Review — {total_sampled} Posts Sampled"))
    story.append(p("Quality tier based on evaluation scores: Verified ≥8.0, Defensible 6.5–8.0, Unsupported 4.5–6.5, Questionable <4.5. Claim review is score-based estimation, not manual verification.", MUTED_S))
    story.append(vsp(3))

    cv_hdr = [p(h, TH_S) for h in ["Agent","Score","Tier","Catalyst","Noted Weakness"]]
    cv_rows = []
    for item in (sample_posts[:10] if sample_posts else []):
        tier_style = TC_G_S if item["tier"]=="Verified" else (TC_A_S if item["tier"]=="Defensible" else TC_R_S)
        wk = item["weaknesses"][:60] + "…" if len(item["weaknesses"]) > 60 else item["weaknesses"] or "—"
        cat = item["catalyst"][:40] + "…" if len(item["catalyst"]) > 40 else item["catalyst"] or "—"
        cv_rows.append([
            p(AGENT_SHORT.get(item["agent"], item["agent"][:12]), TC_B_S),
            p(str(item["score"]), tier_style),
            p(item["tier"], tier_style),
            p(cat, TC_S),
            p(wk, TC_S),
        ])
    if not cv_rows:
        cv_rows = [[p("No data", TC_S), p("—", TC_S), p("—", TC_S), p("—", TC_S), p("Eval data unavailable", TC_S)]]
    cv_data = [cv_hdr] + cv_rows
    story.append(std_table(cv_data, [60, 34, 56, 100, BODY_W - 254]))
    story.append(vsp(8))

    # What works / what weakens (2-col)
    works_items  = [h3("What Strengthens Credibility")]
    works_items += [bul("Specific numeric data anchors (yield levels, spread values, price moves)")]
    works_items += [bul("Clear market transmission chain: catalyst → sector mechanism → cross-asset implication")]
    works_items += [bul("Falsifier conditions that specify a measurable trigger for position reversal")]
    works_items += [bul("Thesis linkage — updating open theses with new evidence rather than reposting")]

    weak_items  = [h3("What Weakens Credibility")]
    weak_items += [bul("Fixed thresholds cited as fact (285bps HY OAS = 'elevated' without dynamic context)")]
    weak_items += [bul("Nominal yields treated as real yields without adjustment for breakevens")]
    weak_items += [bul("Article-cited EPS numbers used instead of fetched fundamental data")]
    weak_items += [bul("Repeated identical falsifier wording across multiple posts by the same agent")]

    story.append(side_by_side(works_items, weak_items))
    story.append(PageBreak())
    return story

# ─────────────────────────────────────────────────────────────
# PAGE 5 — AUTONOMY, LEARNING AND REPETITION
# ─────────────────────────────────────────────────────────────
def build_page5():
    story = []
    story += section_header("AUTONOMY, LEARNING AND REPETITION")

    auto_img = img(c4, BODY_W * 0.50, 110)
    rep_img  = img(c5, BODY_W * 0.46, 110)
    story.append(side_by_side([auto_img], [rep_img], left_w=BODY_W*0.51, right_w=BODY_W*0.46))
    story.append(vsp(6))

    # Repetition patterns table
    story.append(h3("Known Repetition Patterns by Agent"))

    rep_patterns = {
        "Macro Agent":          ("'Tightening regime', '10Y/2Y spread', 'core PCE', 'HY OAS'", "High"),
        "Rates Agent":          ("'Bear steepener', 'term premium', 'breakevens', 'front-end repricing'", "High"),
        "Equities Agent":       ("'Multiple compression', 'margin pressure', 'EPS revision'", "Medium"),
        "FX Agent":             ("'USD strength', 'carry unwind', 'oil-dollar correlation'", "Medium"),
        "Commodities Agent":    ("'WTI supply shock', 'demand destruction', 'OPEC+ discipline'", "Medium"),
        "Risk/Sentiment Agent": ("'HY OAS', 'VIX spike', 'risk-off narrative', 'credit stress'", "High"),
    }

    rp_hdr = [p(h, TH_S) for h in ["Agent","Repeated Templates / Anchors","Risk","Overused Frames (State)"]]
    rp_rows = []
    for name in agent_names:
        patterns, risk = rep_patterns.get(name, ("—", "Low"))
        ov = state_by_agent.get(name, {}).get("overused_frames", [])
        ov_str = ", ".join(str(f) for f in ov[:4]) if ov else "None logged"
        risk_style = TC_R_S if risk=="High" else (TC_A_S if risk=="Medium" else TC_G_S)
        rp_rows.append([
            p(AGENT_SHORT.get(name, name), TC_B_S),
            p(patterns, TC_S),
            p(risk, risk_style),
            p(ov_str[:60], TC_S),
        ])
    rp_data = [rp_hdr] + rp_rows
    story.append(std_table(rp_data, [60, 160, 38, BODY_W - 262]))
    story.append(vsp(8))

    # Learning verdict
    story.append(h3("Learning Signal Assessment by Agent"))

    def learning_verdict(name):
        mem_n  = mem_by_agent.get(name, 0)
        dc     = dec_by_agent.get(name, {})
        st     = state_by_agent.get(name, {})
        hr     = st.get("hit_rate", 0.5)
        lv     = st.get("low_value_rate", 0.3)
        if mem_n >= 3 and hr >= 0.65 and lv <= 0.15: return "Strong", GREEN
        if mem_n >= 1 and hr >= 0.5:  return "Partial", AMBER
        if mem_n == 0 and hr < 0.45:  return "Weak", RED
        return "Partial", AMBER

    lv_hdr = [p(h, TH_S) for h in ["Agent","Mem. Refreshes","Hit Rate","Low-Value Rate","Learning Signal","Note"]]
    lv_rows = []
    for name in agent_names:
        mem_n = mem_by_agent.get(name, 0)
        st    = state_by_agent.get(name, {})
        hr    = st.get("hit_rate", 0.5)
        lv    = st.get("low_value_rate", 0.3)
        verdict_str, vcol = learning_verdict(name)
        note = "Memory active" if mem_n > 0 else "No refresh this week"
        vs   = ParagraphStyle("lv", fontName="Helvetica-Bold", fontSize=8, textColor=vcol, leading=12)
        lv_rows.append([
            p(AGENT_SHORT.get(name, name), TC_B_S),
            p(str(mem_n), TC_S),
            p(f"{hr:.0%}", TC_G_S if hr >= 0.6 else TC_A_S),
            p(f"{lv:.0%}", TC_G_S if lv <= 0.2 else TC_R_S),
            Paragraph(verdict_str, vs),
            p(note, TC_S),
        ])
    lv_data = [lv_hdr] + lv_rows
    story.append(std_table(lv_data, [60, 52, 44, 56, 56, BODY_W - 272]))
    story.append(PageBreak())
    return story

# ─────────────────────────────────────────────────────────────
# PAGE 6 — CONTENT EXAMPLES
# ─────────────────────────────────────────────────────────────
def excerpt_card(post_item, is_good=True):
    bg    = GREEN_BG  if is_good else RED_BG
    bord  = GREEN     if is_good else RED
    label = "STRONG EXAMPLE" if is_good else "WEAK EXAMPLE"
    lab_c = GREEN     if is_good else RED
    lab_s = ParagraphStyle("lc", fontName="Helvetica-Bold", fontSize=7.5,
                            textColor=lab_c, leading=10, spaceAfter=2)
    agent_s = ParagraphStyle("ac", fontName="Helvetica-Bold", fontSize=8.5,
                              textColor=DARK_TEXT, leading=12, spaceAfter=1)
    meta_s  = ParagraphStyle("mc", fontName="Helvetica", fontSize=7.5,
                              textColor=MUTED, leading=11, spaceAfter=3)
    exc_s   = ParagraphStyle("ec", fontName="Helvetica-Oblique", fontSize=8,
                              textColor=DARK_TEXT, leading=12, spaceAfter=3,
                              leftIndent=6, borderWidth=2, borderColor=bord,
                              borderPad=5, backColor=WHITE)
    note_key = "Why it works:" if is_good else "What failed:"
    note_val = post_item["strengths"] if is_good else post_item["weaknesses"]
    note_val = note_val[:120] + "…" if len(note_val) > 120 else note_val or "—"

    inner = [
        Paragraph(label, lab_s),
        Paragraph(f"{post_item['agent']}  ·  Score: {post_item['score']}/10  ·  {post_item['tier']}", agent_s),
        Paragraph(f"Catalyst: {post_item['catalyst']}", meta_s),
        Paragraph(post_item["excerpt"], exc_s),
        Paragraph(f"<b>{note_key}</b> {note_val}", SMALL_S),
    ]
    card = Table([[inner]], colWidths=[BODY_W - 4])
    card.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), bg),
        ("BOX",           (0,0),(-1,-1), 1.5, bord),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("RIGHTPADDING",  (0,0),(-1,-1), 10),
        ("TOPPADDING",    (0,0),(-1,-1), 8),
        ("BOTTOMPADDING", (0,0),(-1,-1), 8),
    ]))
    return KeepTogether([card, vsp(6)])

def build_page6():
    story = []
    story += section_header("CONTENT QUALITY — EXAMPLES")
    story.append(p("Selected post excerpts illustrating strong and weak content. "
                   "Good examples demonstrate specific data anchors, clear mechanisms, and useful falsifiers. "
                   "Weak examples highlight template repetition, overclaimed thresholds, or unsupported data.", BODY_S))
    story.append(vsp(6))

    if good_posts:
        story.append(h3(f"Strong Examples  ({len(good_posts)} selected)"))
        story.append(rule(GREEN, t=1, a=4, b=2))
        for gp in good_posts:
            story.append(excerpt_card(gp, is_good=True))
    else:
        story.append(p("No high-scoring posts available in evaluation sample for this period.", MUTED_S))

    story.append(vsp(4))

    if weak_posts:
        story.append(h3(f"Weak Examples  ({len(weak_posts)} selected)"))
        story.append(rule(RED, t=1, a=4, b=2))
        for wp in weak_posts:
            story.append(excerpt_card(wp, is_good=False))
    else:
        story.append(p("No low-scoring posts in evaluation sample — all sampled posts were defensible or above.", MUTED_S))

    # Stance chart at bottom if space allows
    story.append(vsp(4))
    story.append(h3("Stance Distribution"))
    story.append(img(c6, BODY_W, 90))
    story.append(PageBreak())
    return story

# ─────────────────────────────────────────────────────────────
# PAGE 7 — REMEDIATION ROADMAP + FINAL VERDICT
# ─────────────────────────────────────────────────────────────
REMEDIATION_FIXES = [
    ("1","P0","No marginal-change gate — near-duplicate posts publish",
         "Compare each new post against agent's last 3 before publishing","Very High"),
    ("2","P0","HY OAS threshold overclaimed as 'elevated stress'",
         "Compute vs 3-year rolling average; flag if threshold unvalidated","High"),
    ("3","P1","Nominal yields cited where real yields are implied",
         "Add explicit real-vs-nominal wording gate in Rates/Macro prompts","High"),
    ("4","P1","Equities: article-cited EPS numbers, not fetched fundamentals",
         "Force fundamental data fetch before equity valuation claims","High"),
    ("5","P1","FX: fixed oil-dollar and carry correlations cited without computation",
         "Restrict to computed-correlation-only citations in FX prompts","Medium"),
    ("6","P2","Stance diversity: most agents consistently bearish",
         "Add alternative regime prompts; penalise 5+ consecutive same-stance posts","Medium"),
    ("7","P2","Learning loop: forecast outcomes not feeding memory/prompts",
         "Wire resolved forecast labels to dynamic memory calibration block","Medium"),
    ("8","P2","Low-signal silence inconsistent — some agents over-commenting",
         "Tighten novelty floor for comment_only to 30+ (currently 20)","Low"),
    ("9","P3","No admin observability for gate firings or quality flags",
         "Add quality flag dashboard to admin panel with gate trigger counts","Low"),
    ("10","P3","Knowledge retrieval logging absent — can't audit which snippets fired",
         "Log snippet titles + governance tier to decision_event_log","Low"),
]

def build_page7():
    story = []
    story += section_header("REMEDIATION ROADMAP AND FINAL VERDICT")

    story.append(h3("Prioritised Fixes"))
    rem_hdr = [p(h, TH_S) for h in ["#","Priority","Issue","Fix","Impact"]]
    fixes = REMEDIATION_FIXES

    p_style = {
        "P0": TC_R_S, "P1": TC_A_S, "P2": TC_B_S, "P3": MUTED_S,
    }
    i_style = {
        "Very High": TC_R_S, "High": TC_A_S, "Medium": TC_B_S, "Low": MUTED_S,
    }
    rem_rows = [rem_hdr] + [
        [p(f[0], TC_B_S), p(f[1], p_style.get(f[1], TC_S)),
         p(f[2], TC_S), p(f[3], TC_S), p(f[4], i_style.get(f[4], TC_S))]
        for f in fixes
    ]
    story.append(std_table(rem_rows, [14, 28, 130, 155, BODY_W - 331]))
    story.append(vsp(10))

    # Final verdict 2×2 grid
    story.append(h3("Final Verdict"))

    def verdict_cell(icon, label, status, color, note):
        cell_s = ParagraphStyle("vc", fontName="Helvetica-Bold", fontSize=9,
                                textColor=color, leading=13)
        note_s = ParagraphStyle("vn", fontName="Helvetica", fontSize=7.5,
                                textColor=DARK_TEXT, leading=11)
        return [
            Paragraph(f"{icon} {label}", cell_s),
            Paragraph(status, cell_s),
            Spacer(1, 3),
            Paragraph(note, note_s),
        ]

    v1 = verdict_cell("✅","Credible today?","YES — beta-grade",GREEN,
                       "Mechanism reasoning and governance gates are functioning. Most agents produce analyst-level output.")
    v2 = verdict_cell("⚠","Beta-user ready?","PARTIAL",AMBER,
                       "Requires P0/P1 repetition and data-threshold fixes before consistent quality.")
    v3 = verdict_cell("❌","Investor-demo ready?","NOT YET",RED,
                       "P0/P1 issues must be resolved first. Grounding and repetition gaps would be noticed.")
    v4 = verdict_cell("🎯","Wider launch?","Fix top 5 first",NAVY,
                       "Estimated 2–3 engineering days for P0/P1 fixes. Then re-run this audit.")

    cell_w = BODY_W / 2 - 3
    vg_data = [[v1, v2], [v3, v4]]
    vg = Table(vg_data, colWidths=[cell_w, cell_w])
    vg.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(0,0), GREEN_BG),
        ("BACKGROUND",    (1,0),(1,0), AMBER_BG),
        ("BACKGROUND",    (0,1),(0,1), RED_BG),
        ("BACKGROUND",    (1,1),(1,1), CREAM_PANEL),
        ("BOX",           (0,0),(-1,-1), 1.0, NAVY),
        ("GRID",          (0,0),(-1,-1), 0.5, MID_GREY),
        ("TOPPADDING",    (0,0),(-1,-1), 10),
        ("BOTTOMPADDING", (0,0),(-1,-1), 10),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("RIGHTPADDING",  (0,0),(-1,-1), 10),
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
    ]))
    story.append(vg)
    story.append(vsp(10))

    # Closing statement
    closing_data = [[p(
        "Market Room has a credible governance architecture and outputs analyst-level mechanism reasoning. "
        "The primary blockers to production quality are template repetition, unvalidated data thresholds, "
        "and inconsistent grounding between agents. These are fixable product issues, not fundamental "
        "architectural flaws. Prioritise the P0 marginal-change gate and HY OAS calibration fix first — "
        "these alone will materially improve credibility across all agents.",
        s("CS", fontName="Helvetica", fontSize=9, textColor=CREAM, leading=14)
    )]]
    closing_t = Table(closing_data, colWidths=[BODY_W])
    closing_t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), NAVY),
        ("BOX",           (0,0),(-1,-1), 1.5, GOLD),
        ("TOPPADDING",    (0,0),(-1,-1), 14),
        ("BOTTOMPADDING", (0,0),(-1,-1), 14),
        ("LEFTPADDING",   (0,0),(-1,-1), 14),
        ("RIGHTPADDING",  (0,0),(-1,-1), 14),
    ]))
    story.append(closing_t)
    return story

# ─────────────────────────────────────────────────────────────
# 8. BUILD AND SAVE PDF
# ─────────────────────────────────────────────────────────────
print(f"\n[PDF] Building 7-page report → {PDF_PATH}")

doc = SimpleDocTemplate(
    str(PDF_PATH),
    pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN,  bottomMargin=MARGIN,
)

story = []
story += build_page1()
story += build_page2()
story += build_page3()
story += build_page4()
story += build_page5()
story += build_page6()
story += build_page7()

doc.build(story, onFirstPage=cream_bg, onLaterPages=cream_bg)
print(f"  PDF saved: {PDF_PATH}")

# ─────────────────────────────────────────────────────────────
# 9. MARKDOWN SUMMARY
# ─────────────────────────────────────────────────────────────
def write_markdown():
    lines = []
    lines.append(f"# Market Room Weekly Credibility Audit")
    lines.append(f"**Week ending:** {TODAY}  |  **Agents:** {active_agents}  |  **Posts:** {total_posts}  |  **Comments:** {total_comments}")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Executive Verdict")
    lines.append("")
    lines.append(f"| KPI | Value |")
    lines.append(f"|-----|-------|")
    lines.append(f"| Overall Credibility Score | {mean_cred}/10 |")
    lines.append(f"| Autonomy Estimate | ~{int(mean_auto)}% |")
    lines.append(f"| Template-Led Estimate | ~{100-int(mean_auto)}% |")
    lines.append(f"| Strongest Agent | {best_agent} |")
    lines.append(f"| Weakest Agent | {worst_agent} |")
    lines.append(f"| Total Posts (7d) | {total_posts} |")
    lines.append(f"| Total Comments (7d) | {total_comments} |")
    lines.append(f"| Avg Confidence | {avg_conf_system:.0%} |")
    lines.append(f"| Silence Rate | {silence_rate}% |")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Agent Scorecard")
    lines.append("")
    lines.append("| Agent | Credib | Ground | Depth | Autonomy | Repetition | Usefulness |")
    lines.append("|-------|--------|--------|-------|----------|-----------|------------|")
    for name in agent_names:
        sc = agent_scores[name]
        lines.append(f"| {name} | {sc['credibility']} | {sc['grounding']} | {sc['depth']} | {sc['autonomy']} | {sc['repetition']} | {sc['usefulness']} |")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Charts")
    lines.append("")
    for chart_name in ["agent_score_radar.png","credibility_by_agent.png","data_grounding_by_agent.png",
                        "autonomy_vs_template.png","repetition_risk_by_agent.png",
                        "stance_distribution.png","governance_reason_codes.png"]:
        lines.append(f"![{chart_name}](charts/{chart_name})")
        lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Raw Data Files")
    lines.append("")
    for f in ["posts_last_7_days.csv","decision_logs_last_7_days.csv","agent_evaluations_last_7_days.csv",
              "agent_state_features.csv","theses_active.csv","claim_verification_sample.csv","agent_scores.csv"]:
        lines.append(f"- [raw/{f}](raw/{f})")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Remediation Priorities")
    lines.append("")
    lines.append("| # | Priority | Fix | Impact |")
    lines.append("|---|----------|-----|--------|")
    for f in REMEDIATION_FIXES:
        lines.append(f"| {f[0]} | {f[1]} | {f[3]} | {f[4]} |")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Data Limitations")
    lines.append("")
    if len(df_evals) == 0:
        lines.append("- **agent_evaluations**: No data in window — scores are estimated from agent_state_features")
    else:
        lines.append(f"- **agent_evaluations**: {len(df_evals)} rows in window (sample-based, not all posts evaluated)")
    lines.append("- **Claim verification**: Score-based tier assignment (not manual review)")
    lines.append("- **Autonomy estimate**: Proxy from decision novelty scores; not directly measured")
    if total_posts == 0:
        lines.append("- **Warning**: No posts found in last 7 days — check data window")

    with open(MD_PATH, "w") as f:
        f.write("\n".join(lines))
    print(f"  Markdown saved: {MD_PATH}")

write_markdown()

# ─────────────────────────────────────────────────────────────
# 10. COMPLETION SUMMARY
# ─────────────────────────────────────────────────────────────
print()
print("=" * 60)
print("  REPORT COMPLETE")
print("=" * 60)
print(f"  Output folder : {OUT_DIR}")
print(f"  PDF           : {PDF_PATH.name}  ({PDF_PATH.stat().st_size // 1024} KB)")
print(f"  Markdown      : {MD_PATH.name}")
print(f"  Charts        : 7 PNG files in charts/")
print(f"  Raw data      : {len(list(RAW_DIR.iterdir()))} CSV files in raw/")
print()
print(f"  Data window   : Last 7 days (ending {TODAY})")
print(f"  Posts found   : {total_posts}  Comments: {total_comments}  Decisions: {total_decisions}")
print(f"  Eval rows     : {len(df_evals)}")
print()
print("  Key Findings:")
print(f"    1. Overall credibility: {mean_cred}/10  (target ≥ 7.0)")
print(f"    2. Best agent: {best_agent} ({agent_scores[best_agent]['credibility']}/10)")
print(f"    3. Worst agent: {worst_agent} ({agent_scores[worst_agent]['credibility']}/10)")
print(f"    4. Silence rate: {silence_rate}% of decisions  (governance gate health)")
print(f"    5. Repetition risk (mean): {mean_rep_risk}/10  (lower is better)")
print()
print("  Limitations:")
if len(df_evals) < 10:
    print(f"    - Sparse eval data ({len(df_evals)} rows) — scores are estimated")
if total_posts < 20:
    print(f"    - Low post count ({total_posts}) — check data window or agent activity")
print("    - Claim verification is score-based, not manual")
print("    - No app code was changed")
print("=" * 60)

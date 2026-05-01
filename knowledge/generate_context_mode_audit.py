"""
Market Room — Context Mode Audit
=================================
Compares agent behaviour across two context-injection pathways:

  SYNTHESIS MODE  — agent receives a pre-curated anchor headline + theme as its
                    primary context driver (triggerMode = "synthesis" in event payload).

  FORUM MODE      — agent receives heuristic/keyword-ranked knowledge snippets
                    (findRelevantKnowledgeSnippets) as its context driver
                    (triggerMode = "forum" or any non-synthesis trigger).

Same agents, different context → measures how each pathway affects:
  • Post volume and silence rates
  • Synthesis-specific quality flags (mismatch, repair, generic fallback, etc.)
  • Heuristic retrieval citation rates (stored_stat_cited, no_stored_stat_cited)
  • Shared quality metrics (data anchor, verified metrics, conviction conditions)
  • Eval scores (0–1 stored; ×10 for display)
  • Per-agent behavioural divergence between modes

Output: knowledge/audits/context_mode_audit_<date>/
"""

import json
import re
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

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

# ── Paths ──────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).parent.parent
TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")
OUT_DIR    = PROJECT_ROOT / "knowledge" / "audits" / f"context_mode_audit_{TODAY}"
CHARTS_DIR = OUT_DIR / "charts"
RAW_DIR    = OUT_DIR / "raw"
PDF_PATH   = OUT_DIR / "context_mode_audit.pdf"
OUT_DIR.mkdir(parents=True, exist_ok=True)
CHARTS_DIR.mkdir(exist_ok=True)
RAW_DIR.mkdir(exist_ok=True)

# ── Palette ────────────────────────────────────────────────────────────────
NAVY    = colors.HexColor("#0D1B2A")
GOLD    = colors.HexColor("#C9A84C")
CREAM   = colors.HexColor("#FAF6EF")
BLUE    = colors.HexColor("#1E4D7B")
GREEN   = colors.HexColor("#27AE60")
RED     = colors.HexColor("#C0392B")
AMBER   = colors.HexColor("#E67E22")
MUTED   = colors.HexColor("#7F8C8D")
LIGHT   = colors.HexColor("#ECF0F1")

C_SYNTH = "#1E4D7B"   # synthesis — deep blue
C_FORUM = "#C9A84C"   # forum/heuristic — gold
C_BOTH  = "#27AE60"   # shared / combined

LOOKUP  = 7   # days of history to pull (48 hours)

# ─────────────────────────────────────────────────────────────
# D1 QUERY ENGINE
# ─────────────────────────────────────────────────────────────
def query_d1(sql: str) -> list[dict]:
    result = subprocess.run(
        ["npx", "wrangler", "d1", "execute", "market-room-db",
         "--remote", "--json", "--command", sql],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT)
    )
    if result.returncode != 0:
        print(f"  [warn] D1 failed: {result.stderr[:300]}", file=sys.stderr)
        return []
    try:
        data = json.loads(result.stdout)
        return data[0].get("results", []) if isinstance(data, list) and data else []
    except Exception as e:
        print(f"  [warn] parse error: {e}", file=sys.stderr)
        return []

# ─────────────────────────────────────────────────────────────
# DATA EXTRACTION
# ─────────────────────────────────────────────────────────────
print("=" * 60)
print("  Market Room — Context Mode Audit")
print(f"  {TODAY}  |  window: last {LOOKUP} days")
print("=" * 60)
print()

print(f"[1/6] agents...")
agents_rows = query_d1("SELECT id, name, sector FROM agents WHERE active=1")

print(f"[2/6] posts with trigger_mode (last {LOOKUP}d)...")
posts_rows = query_d1(f"""
    SELECT m.id, m.agent_id, a.name AS agent_name, a.sector,
           m.content, m.title, m.catalyst, m.stance,
           m.message_type, m.created_at,
           m.posting_decision_json,
           JSON_EXTRACT(e.payload_json, '$.triggerMode') AS trigger_mode
    FROM messages m
    JOIN agents a ON a.id = m.agent_id
    JOIN events e ON m.event_id = e.id
    WHERE m.message_type = 'post'
      AND m.created_at >= datetime('now','-{LOOKUP} days')
    ORDER BY m.created_at DESC
    LIMIT 600
""")

print(f"[3/6] decision_event_log (last {LOOKUP}d, trigger_mode resolved client-side)...")
# Pull decisions without trigger_mode (correlated subquery times out on D1).
# trigger_mode is matched client-side using room_id + decided_at against events.
decisions_rows = query_d1(f"""
    SELECT d.agent_id, a.name AS agent_name, a.sector,
           d.action_type, d.reason_codes_json,
           d.novelty_score, d.decided_at, d.room_id
    FROM decision_event_log d
    JOIN agents a ON a.id = d.agent_id
    WHERE d.decided_at >= datetime('now','-{LOOKUP} days')
    ORDER BY d.decided_at DESC
    LIMIT 2000
""")

print(f"[4/6] evaluations (last {LOOKUP}d)...")
evals_rows = query_d1(f"""
    SELECT ae.message_id, ae.agent_id, a.name AS agent_name, a.sector,
           ae.overall_score, ae.clarity_score, ae.specificity_score,
           ae.actionability_score, ae.distinctiveness_score,
           ae.strengths, ae.weaknesses, ae.created_at,
           JSON_EXTRACT(e.payload_json, '$.triggerMode') AS trigger_mode
    FROM agent_evaluations ae
    JOIN agents a ON a.id = ae.agent_id
    JOIN messages m ON m.id = ae.message_id
    JOIN events e ON m.event_id = e.id
    WHERE ae.created_at >= datetime('now','-{LOOKUP} days')
    ORDER BY ae.created_at DESC
    LIMIT 400
""")

print(f"[5/6] events summary (last {LOOKUP}d)...")
events_rows = query_d1(f"""
    SELECT id,
           JSON_EXTRACT(payload_json, '$.roomId') AS room_id,
           JSON_EXTRACT(payload_json, '$.triggerMode') AS trigger_mode,
           JSON_EXTRACT(payload_json, '$.agentCount') AS agent_count,
           JSON_EXTRACT(payload_json, '$.synthesisTopicLabel') AS synthesis_topic,
           created_at
    FROM events
    WHERE event_type = 'market_discussion_run'
      AND created_at >= datetime('now','-{LOOKUP} days')
    ORDER BY created_at DESC
""")

print(f"[6/6] synthesis-flag posts sample (for qualitative review)...")
synth_sample_rows = query_d1(f"""
    SELECT m.id, a.name AS agent_name, a.sector,
           m.title, m.catalyst, m.content, m.stance,
           m.posting_decision_json, m.created_at
    FROM messages m
    JOIN agents a ON a.id = m.agent_id
    JOIN events e ON m.event_id = e.id
    WHERE m.message_type = 'post'
      AND m.created_at >= datetime('now','-{LOOKUP} days')
      AND JSON_EXTRACT(e.payload_json, '$.triggerMode') = 'synthesis'
    ORDER BY m.created_at DESC
    LIMIT 60
""")

# ── Client-side trigger_mode resolution for decisions ──────────────────────
# Build a lookup: (room_id, created_at) → trigger_mode, sorted desc by created_at.
# For each decision, find the most recent event with same room_id that started
# before or at the decision's decided_at timestamp.
_event_lookup: list[tuple[str, str, str]] = []  # (room_id, created_at, trigger_mode)
for ev in events_rows:
    _event_lookup.append((
        ev.get("room_id", ""),
        ev.get("created_at", ""),
        ev.get("trigger_mode") or "forum"
    ))
_event_lookup.sort(key=lambda x: x[1], reverse=True)  # newest first

def _resolve_trigger_mode(room_id: str, decided_at: str) -> str:
    for ev_room, ev_at, ev_mode in _event_lookup:
        if ev_room == room_id and ev_at <= decided_at:
            return ev_mode
    return "forum"  # fallback

for row in decisions_rows:
    row["trigger_mode"] = _resolve_trigger_mode(
        row.get("room_id", ""), row.get("decided_at", "")
    )

# Save raw
for name, rows in [("agents", agents_rows), ("posts", posts_rows),
                   ("decisions", decisions_rows), ("evals", evals_rows),
                   ("events", events_rows), ("synth_sample", synth_sample_rows)]:
    (RAW_DIR / f"{name}.json").write_text(json.dumps(rows, indent=2))

print(f"\n  posts={len(posts_rows)}  decisions={len(decisions_rows)}  evals={len(evals_rows)}  events={len(events_rows)}")
print()

# ─────────────────────────────────────────────────────────────
# HELPER: normalise trigger_mode
# ─────────────────────────────────────────────────────────────
def normalise_mode(raw: Optional[str]) -> str:
    if raw and str(raw).lower() == "synthesis":
        return "synthesis"
    return "forum"

# ─────────────────────────────────────────────────────────────
# SECTION A — EVENTS OVERVIEW
# ─────────────────────────────────────────────────────────────
df_events = pd.DataFrame(events_rows)
if not df_events.empty:
    df_events["mode"] = df_events["trigger_mode"].apply(normalise_mode)

events_by_mode = df_events["mode"].value_counts().to_dict() if not df_events.empty else {}

# ─────────────────────────────────────────────────────────────
# SECTION B — POST FLAGS
# ─────────────────────────────────────────────────────────────
FLAG_GROUPS = {
    "synthesis": [
        "synthesis_anchor_selected",
        "synthesis_anchor_mismatch",
        "synthesis_anchor_repaired",
        "synthesis_theme_generic_fallback",
        "synthesis_no_valid_news_anchor",
        "synthesis_delta_missing",
        "synthesis_duplicate_conviction_condition",
        "synthesis_directional_call_missing",
        "synthesis_data_anchor_missing",
        "synthesis_opening_not_sector_specific",
    ],
    "retrieval": [
        "stored_stat_cited",
        "no_stored_stat_cited",
        "data_anchor_present",
        "data_anchor_missing",
    ],
    "quality": [
        "verified_metric_cited",
        "unverified_metric_claim",
        "nominal_yield_cited_as_real",
        "conviction_condition_present",
        "conviction_condition_missing",
        "weak_conviction_condition",
        "hy_oas_threshold_unsupported",
        "stock_specific_no_fundamentals",
        "equity_breadth_overused",
        "rates_template_repetition",
        "fx_correlation_from_computed_block",
        "fx_correlation_missing_when_required",
        "fx_correlation_static_anchor_suspected",
    ],
}
ALL_FLAGS = [f for grp in FLAG_GROUPS.values() for f in grp]

def extract_flags(row: dict) -> list[str]:
    try:
        pd_json = json.loads(row.get("posting_decision_json") or "{}")
        return pd_json.get("qualityFlags", []) or []
    except Exception:
        return []

def extract_reason_codes(row: dict) -> list[str]:
    try:
        return json.loads(row.get("reason_codes_json") or "[]") or []
    except Exception:
        return []

df_posts = pd.DataFrame(posts_rows)
if not df_posts.empty:
    df_posts["mode"] = df_posts["trigger_mode"].apply(normalise_mode)
    df_posts["flags"] = df_posts.apply(extract_flags, axis=1)
    df_posts["content_words"] = df_posts["content"].apply(
        lambda c: len(str(c).split()) if pd.notna(c) else 0
    )
    for flag in ALL_FLAGS:
        df_posts[f"flag_{flag}"] = df_posts["flags"].apply(lambda fl: flag in fl)

df_decisions = pd.DataFrame(decisions_rows)
if not df_decisions.empty:
    df_decisions["mode"] = df_decisions["trigger_mode"].apply(normalise_mode)
    df_decisions["reason_codes"] = df_decisions.apply(extract_reason_codes, axis=1)

df_evals = pd.DataFrame(evals_rows)
if not df_evals.empty:
    df_evals["mode"] = df_evals["trigger_mode"].apply(normalise_mode)
    # Detect scale
    max_score = df_evals["overall_score"].dropna().max()
    scale = 10.0 if (max_score is not None and float(max_score) <= 1.5) else 1.0
    for col in ["overall_score", "clarity_score", "specificity_score",
                "actionability_score", "distinctiveness_score"]:
        df_evals[col] = pd.to_numeric(df_evals[col], errors="coerce") * scale

# ─────────────────────────────────────────────────────────────
# COMPUTE STATISTICS
# ─────────────────────────────────────────────────────────────
MODES = ["synthesis", "forum"]

def flag_rate(df: pd.DataFrame, flag: str, mode: Optional[str] = None) -> float:
    sub = df if mode is None else df[df["mode"] == mode]
    col = f"flag_{flag}"
    if col not in sub.columns or len(sub) == 0:
        return 0.0
    return sub[col].mean()

def silence_rate(df_dec: pd.DataFrame, mode: Optional[str] = None) -> float:
    sub = df_dec if mode is None else df_dec[df_dec["mode"] == mode]
    if len(sub) == 0:
        return 0.0
    return (sub["action_type"] == "stay_silent").mean()

# Post counts per mode per agent
agent_mode_counts: dict[str, dict[str, int]] = defaultdict(lambda: {"synthesis": 0, "forum": 0})
if not df_posts.empty:
    for _, row in df_posts.iterrows():
        agent_mode_counts[row["agent_name"]][row["mode"]] += 1

# Decision counts per mode
decision_mode_counts = df_decisions["mode"].value_counts().to_dict() if not df_decisions.empty else {}

# Silence rates
silence_synth  = silence_rate(df_decisions, "synthesis")  if not df_decisions.empty else None
silence_forum  = silence_rate(df_decisions, "forum")      if not df_decisions.empty else None

# Eval mean per mode
def eval_mean(mode: Optional[str] = None) -> dict:
    if df_evals.empty:
        return {}
    sub = df_evals if mode is None else df_evals[df_evals["mode"] == mode]
    if len(sub) == 0:
        return {}
    return {
        "overall":        sub["overall_score"].dropna().mean(),
        "clarity":        sub["clarity_score"].dropna().mean(),
        "specificity":    sub["specificity_score"].dropna().mean(),
        "actionability":  sub["actionability_score"].dropna().mean(),
        "distinctiveness":sub["distinctiveness_score"].dropna().mean(),
        "n":              len(sub),
    }

eval_synth = eval_mean("synthesis")
eval_forum  = eval_mean("forum")

# Per-agent eval by mode
agent_eval_by_mode: dict[str, dict] = {}
if not df_evals.empty:
    for ag in df_evals["agent_name"].unique():
        sub = df_evals[df_evals["agent_name"] == ag]
        s = sub[sub["mode"] == "synthesis"]["overall_score"].dropna()
        f = sub[sub["mode"] == "forum"]["overall_score"].dropna()
        agent_eval_by_mode[ag] = {
            "synth_mean": s.mean() if len(s) else None,
            "forum_mean": f.mean() if len(f) else None,
            "synth_n": len(s),
            "forum_n": len(f),
        }

# Flag rate comparison table
flag_compare: list[dict] = []
for grp_name, flags in FLAG_GROUPS.items():
    for flag in flags:
        col = f"flag_{flag}"
        if col not in df_posts.columns:
            continue
        rs = flag_rate(df_posts, flag, "synthesis")
        rf = flag_rate(df_posts, flag, "forum")
        ns = int(df_posts[df_posts["mode"] == "synthesis"][col].sum()) if not df_posts.empty else 0
        nf = int(df_posts[df_posts["mode"] == "forum"][col].sum()) if not df_posts.empty else 0
        flag_compare.append({
            "group": grp_name, "flag": flag,
            "rate_synth": rs, "rate_forum": rf,
            "n_synth": ns, "n_forum": nf,
            "delta": rs - rf
        })

# Reason code suppression breakdown
suppression_codes = defaultdict(lambda: {"synthesis": 0, "forum": 0})
if not df_decisions.empty:
    for _, row in df_decisions[df_decisions["action_type"] == "stay_silent"].iterrows():
        for code in row["reason_codes"]:
            suppression_codes[code][row["mode"]] += 1

# ─────────────────────────────────────────────────────────────
# CHARTS
# ─────────────────────────────────────────────────────────────
def save_fig(name: str):
    path = CHARTS_DIR / f"{name}.png"
    plt.savefig(path, dpi=180, bbox_inches="tight", facecolor="#FAF6EF")
    plt.close()
    return str(path)

chart_paths: dict[str, str] = {}

# ── Chart 1: Posts by mode per agent ──────────────────────────
if agent_mode_counts:
    agents_sorted = sorted(agent_mode_counts.keys())
    synth_vals = [agent_mode_counts[a]["synthesis"] for a in agents_sorted]
    forum_vals = [agent_mode_counts[a]["forum"] for a in agents_sorted]
    x = np.arange(len(agents_sorted))
    width = 0.38
    fig, ax = plt.subplots(figsize=(9, 4.2))
    fig.patch.set_facecolor("#FAF6EF")
    ax.set_facecolor("#FAF6EF")
    bars1 = ax.bar(x - width/2, synth_vals, width, color=C_SYNTH, label="Synthesis", alpha=0.9)
    bars2 = ax.bar(x + width/2, forum_vals,  width, color=C_FORUM, label="Forum / Heuristic", alpha=0.9)
    for bar in list(bars1) + list(bars2):
        h = bar.get_height()
        if h > 0:
            ax.text(bar.get_x() + bar.get_width()/2, h + 0.2, str(int(h)),
                    ha="center", va="bottom", fontsize=7.5, color="#333")
    ax.set_xticks(x)
    ax.set_xticklabels([a.split()[0] for a in agents_sorted], fontsize=9)
    ax.set_ylabel("Posts published", fontsize=9)
    ax.set_title("Posts published — Synthesis vs Forum mode per agent", fontsize=11, fontweight="bold", color="#0D1B2A")
    ax.legend(fontsize=9)
    ax.tick_params(axis="both", labelsize=9)
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    chart_paths["posts_per_agent"] = save_fig("posts_per_agent")

# ── Chart 2: Silence rate comparison ──────────────────────────
if not df_decisions.empty:
    modes_label = ["Synthesis", "Forum / Heuristic"]
    silence_vals = [silence_synth or 0, silence_forum or 0]
    fig, ax = plt.subplots(figsize=(5, 3.5))
    fig.patch.set_facecolor("#FAF6EF")
    ax.set_facecolor("#FAF6EF")
    bars = ax.bar(modes_label, [v * 100 for v in silence_vals],
                  color=[C_SYNTH, C_FORUM], alpha=0.9, width=0.4)
    for bar, val in zip(bars, silence_vals):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                f"{val*100:.1f}%", ha="center", va="bottom", fontsize=10, fontweight="bold")
    ax.set_ylabel("% decisions → stay_silent", fontsize=9)
    ax.set_title("Silence rate by trigger mode", fontsize=11, fontweight="bold", color="#0D1B2A")
    ax.set_ylim(0, 100)
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    chart_paths["silence_rate"] = save_fig("silence_rate")

# ── Chart 3: Synthesis quality flags (synthesis posts only) ────
synth_flags = [f for f in FLAG_GROUPS["synthesis"] if f"flag_{f}" in df_posts.columns]
if synth_flags and not df_posts.empty:
    synth_posts = df_posts[df_posts["mode"] == "synthesis"]
    rates = [synth_posts[f"flag_{f}"].mean() * 100 if len(synth_posts) > 0 else 0
             for f in synth_flags]
    short_labels = [f.replace("synthesis_", "").replace("_", " ") for f in synth_flags]
    fig, ax = plt.subplots(figsize=(9, 4.5))
    fig.patch.set_facecolor("#FAF6EF")
    ax.set_facecolor("#FAF6EF")
    bar_colors = ["#C0392B" if ("mismatch" in f or "missing" in f or "fallback" in f or "generic" in f)
                  else "#1E4D7B" for f in synth_flags]
    bars = ax.barh(range(len(synth_flags)), rates, color=bar_colors, alpha=0.88)
    for bar, val in zip(bars, rates):
        if val > 0:
            ax.text(val + 0.5, bar.get_y() + bar.get_height()/2,
                    f"{val:.1f}%", va="center", fontsize=8.5)
    ax.set_yticks(range(len(synth_flags)))
    ax.set_yticklabels(short_labels, fontsize=9)
    ax.set_xlabel("% of synthesis posts with flag", fontsize=9)
    ax.set_title(f"Synthesis quality flags  (n={len(synth_posts)} synthesis posts)", fontsize=11, fontweight="bold", color="#0D1B2A")
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    chart_paths["synthesis_flags"] = save_fig("synthesis_flags")

# ── Chart 4: Heuristic retrieval flags (forum posts only) ──────
ret_flags = [f for f in FLAG_GROUPS["retrieval"] if f"flag_{f}" in df_posts.columns]
if ret_flags and not df_posts.empty:
    forum_posts = df_posts[df_posts["mode"] == "forum"]
    rates = [forum_posts[f"flag_{f}"].mean() * 100 if len(forum_posts) > 0 else 0 for f in ret_flags]
    short_labels = [f.replace("_", " ") for f in ret_flags]
    fig, ax = plt.subplots(figsize=(7, 3.5))
    fig.patch.set_facecolor("#FAF6EF")
    ax.set_facecolor("#FAF6EF")
    bar_colors = [C_FORUM if "cited" in f else "#C0392B" for f in ret_flags]
    bars = ax.barh(range(len(ret_flags)), rates, color=bar_colors, alpha=0.88)
    for bar, val in zip(bars, rates):
        if val > 0:
            ax.text(val + 0.5, bar.get_y() + bar.get_height()/2,
                    f"{val:.1f}%", va="center", fontsize=8.5)
    ax.set_yticks(range(len(ret_flags)))
    ax.set_yticklabels(short_labels, fontsize=9)
    ax.set_xlabel("% of forum posts with flag", fontsize=9)
    ax.set_title(f"Heuristic retrieval signal flags  (n={len(forum_posts)} forum posts)", fontsize=11, fontweight="bold", color="#0D1B2A")
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    chart_paths["retrieval_flags"] = save_fig("retrieval_flags")

# ── Chart 5: Shared quality flags — synthesis vs forum ─────────
shared_flags = [f for f in FLAG_GROUPS["quality"] if f"flag_{f}" in df_posts.columns]
if shared_flags and not df_posts.empty:
    rates_s = [flag_rate(df_posts, f, "synthesis") * 100 for f in shared_flags]
    rates_f = [flag_rate(df_posts, f, "forum") * 100 for f in shared_flags]
    short_labels = [f.replace("_", " ") for f in shared_flags]
    x = np.arange(len(shared_flags))
    width = 0.38
    fig, ax = plt.subplots(figsize=(10, 5.5))
    fig.patch.set_facecolor("#FAF6EF")
    ax.set_facecolor("#FAF6EF")
    ax.bar(x - width/2, rates_s, width, color=C_SYNTH, label="Synthesis", alpha=0.88)
    ax.bar(x + width/2, rates_f, width, color=C_FORUM, label="Forum / Heuristic", alpha=0.88)
    ax.set_xticks(x)
    ax.set_xticklabels(short_labels, rotation=35, ha="right", fontsize=8)
    ax.set_ylabel("% of posts with flag", fontsize=9)
    ax.set_title("Shared quality flags — Synthesis vs Forum mode", fontsize=11, fontweight="bold", color="#0D1B2A")
    ax.legend(fontsize=9)
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    chart_paths["quality_flags_compare"] = save_fig("quality_flags_compare")

# ── Chart 6: Eval scores comparison ────────────────────────────
if eval_synth and eval_forum:
    dims = ["overall", "clarity", "specificity", "actionability", "distinctiveness"]
    labels = ["Overall", "Clarity", "Specificity", "Actionability", "Distinctiveness"]
    vals_s = [eval_synth.get(d, 0) for d in dims]
    vals_f = [eval_forum.get(d, 0) for d in dims]
    x = np.arange(len(dims))
    width = 0.38
    fig, ax = plt.subplots(figsize=(9, 4.2))
    fig.patch.set_facecolor("#FAF6EF")
    ax.set_facecolor("#FAF6EF")
    b1 = ax.bar(x - width/2, vals_s, width, color=C_SYNTH, label=f"Synthesis (n={eval_synth.get('n',0)})", alpha=0.88)
    b2 = ax.bar(x + width/2, vals_f, width, color=C_FORUM, label=f"Forum (n={eval_forum.get('n',0)})", alpha=0.88)
    for bar in list(b1) + list(b2):
        h = bar.get_height()
        if h and h > 0:
            ax.text(bar.get_x() + bar.get_width()/2, h + 0.05, f"{h:.1f}",
                    ha="center", va="bottom", fontsize=7.5)
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=9)
    ax.set_ylabel("Score (0–10 scale)", fontsize=9)
    ax.set_ylim(0, 10)
    ax.set_title("Eval scores by mode — 0–10 scale", fontsize=11, fontweight="bold", color="#0D1B2A")
    ax.legend(fontsize=9)
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    chart_paths["eval_scores"] = save_fig("eval_scores")

# ── Chart 7: Per-agent eval delta (synthesis − forum) ──────────
agents_with_both = {a: v for a, v in agent_eval_by_mode.items()
                    if v["synth_mean"] is not None and v["forum_mean"] is not None}
if agents_with_both:
    agents_sorted2 = sorted(agents_with_both.keys())
    deltas = [agents_with_both[a]["synth_mean"] - agents_with_both[a]["forum_mean"]
              for a in agents_sorted2]
    bar_colors2 = [C_SYNTH if d >= 0 else C_FORUM for d in deltas]
    fig, ax = plt.subplots(figsize=(8, 4))
    fig.patch.set_facecolor("#FAF6EF")
    ax.set_facecolor("#FAF6EF")
    bars = ax.bar([a.split()[0] for a in agents_sorted2], deltas, color=bar_colors2, alpha=0.88)
    for bar, val in zip(bars, deltas):
        ax.text(bar.get_x() + bar.get_width()/2,
                val + (0.05 if val >= 0 else -0.15),
                f"{val:+.1f}", ha="center", va="bottom" if val >= 0 else "top",
                fontsize=8.5, fontweight="bold")
    ax.axhline(0, color="#555", linewidth=0.8)
    ax.set_ylabel("Score delta (synthesis − forum)", fontsize=9)
    ax.set_title("Per-agent eval delta: synthesis minus forum mode", fontsize=11, fontweight="bold", color="#0D1B2A")
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    chart_paths["eval_delta"] = save_fig("eval_delta")

# ── Chart 8: Word count distribution by mode ───────────────────
if not df_posts.empty and "content_words" in df_posts.columns:
    fig, axes = plt.subplots(1, 2, figsize=(9, 3.5), sharey=False)
    fig.patch.set_facecolor("#FAF6EF")
    for ax_i, (mode, color) in enumerate(zip(["synthesis", "forum"], [C_SYNTH, C_FORUM])):
        sub = df_posts[df_posts["mode"] == mode]["content_words"].dropna()
        ax = axes[ax_i]
        ax.set_facecolor("#FAF6EF")
        if len(sub) > 0:
            ax.hist(sub, bins=20, color=color, alpha=0.85, edgecolor="#fff")
            ax.axvline(sub.mean(), color="#C0392B", linewidth=1.2, linestyle="--",
                       label=f"mean {sub.mean():.0f}w")
            ax.legend(fontsize=8)
        ax.set_title(f"{'Synthesis' if mode=='synthesis' else 'Forum'} (n={len(sub)})", fontsize=10)
        ax.set_xlabel("Words", fontsize=9)
        ax.spines[["top", "right"]].set_visible(False)
    fig.suptitle("Post word count distribution by mode", fontsize=11, fontweight="bold", y=1.02, color="#0D1B2A")
    plt.tight_layout()
    chart_paths["word_count"] = save_fig("word_count")

print(f"  Generated {len(chart_paths)} charts")

# ─────────────────────────────────────────────────────────────
# PDF GENERATION
# ─────────────────────────────────────────────────────────────
print("\nBuilding PDF...")

styles = getSampleStyleSheet()

def ps(name, **kw):
    return ParagraphStyle(name, parent=styles["Normal"], **kw)

title_s  = ps("T", fontName="Helvetica-Bold", fontSize=22, textColor=NAVY, leading=28, spaceAfter=4)
sub_s    = ps("Sub", fontName="Helvetica", fontSize=11, textColor=BLUE, leading=15, spaceAfter=10)
h1_s     = ps("H1", fontName="Helvetica-Bold", fontSize=14, textColor=NAVY, spaceBefore=12, spaceAfter=6, leading=18)
h2_s     = ps("H2", fontName="Helvetica-Bold", fontSize=11, textColor=BLUE, spaceBefore=8, spaceAfter=4, leading=14)
body_s   = ps("B",  fontName="Helvetica", fontSize=9, leading=13, spaceAfter=3, textColor=colors.HexColor("#2C3E50"))
muted_s  = ps("M",  fontName="Helvetica", fontSize=8, leading=11, textColor=MUTED, spaceAfter=2)
bold_s   = ps("Bd", fontName="Helvetica-Bold", fontSize=9, leading=13, spaceAfter=3)
small_s  = ps("Sm", fontName="Helvetica", fontSize=7.5, leading=10, textColor=MUTED)

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=GOLD, spaceAfter=6, spaceBefore=6)

def section(title: str):
    return [hr(), Paragraph(title, h1_s)]

def img(path: str, w=155*mm, h=None):
    if not path or not Path(path).exists():
        return Spacer(1, 4)
    from reportlab.lib.utils import ImageReader
    im = ImageReader(path)
    iw, ih = im.getSize()
    ratio = ih / iw
    pw = w
    ph = h or (pw * ratio)
    return Image(path, width=pw, height=ph)

def stat_table(rows: list[tuple], col_widths=None):
    if not rows:
        return Spacer(1, 2)
    data = [list(r) for r in rows]
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CREAM, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#CCC")),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t

def pct(v):
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return "—"
    return f"{v*100:.1f}%"

def sc(v):
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return "—"
    return f"{v:.1f}"

def delta_str(s, f):
    if s is None or f is None:
        return "—"
    d = s - f
    return f"{d:+.1f}"

# Build PDF
doc = BaseDocTemplate(str(PDF_PATH), pagesize=A4,
                      leftMargin=18*mm, rightMargin=18*mm,
                      topMargin=16*mm, bottomMargin=16*mm)
frame = Frame(doc.leftMargin, doc.bottomMargin,
              doc.width, doc.height, id="main")

def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, A4[1]-8*mm, A4[0], 8*mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 7)
    canvas.drawString(18*mm, A4[1]-5.5*mm, "MARKET ROOM — CONTEXT MODE AUDIT")
    canvas.drawRightString(A4[0]-18*mm, A4[1]-5.5*mm, TODAY)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawCentredString(A4[0]/2, 6*mm, f"Page {doc.page}")
    canvas.restoreState()

doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=on_page)])
story = []

# ── Cover ────────────────────────────────────────────────────
story += [
    Spacer(1, 20*mm),
    Paragraph("Market Room", ps("Cov", fontName="Helvetica", fontSize=13, textColor=GOLD)),
    Paragraph("Context Mode Audit", title_s),
    Paragraph(f"Synthesis vs Heuristic Retrieval — {TODAY}", sub_s),
    Spacer(1, 4*mm),
    Paragraph(
        f"This report compares agent behaviour across two context-injection pathways. "
        f"<b>Synthesis mode</b> drives agents with a pre-curated anchor headline and theme. "
        f"<b>Forum mode</b> drives agents with heuristic/keyword-scored knowledge snippets "
        f"(findRelevantKnowledgeSnippets). The agents are identical in both modes; only their "
        f"context differs. Window: last <b>{LOOKUP} days</b>.",
        body_s
    ),
    Spacer(1, 6*mm),
    stat_table([
        ("Metric", "Synthesis", "Forum / Heuristic", "Total"),
        ("Discussion events",
         events_by_mode.get("synthesis", 0),
         events_by_mode.get("forum", 0),
         len(df_events) if not df_events.empty else 0),
        ("Posts published",
         len(df_posts[df_posts["mode"]=="synthesis"]) if not df_posts.empty else 0,
         len(df_posts[df_posts["mode"]=="forum"]) if not df_posts.empty else 0,
         len(df_posts) if not df_posts.empty else 0),
        ("Decisions logged",
         decision_mode_counts.get("synthesis", 0),
         decision_mode_counts.get("forum", 0),
         len(df_decisions) if not df_decisions.empty else 0),
        ("Eval scores",
         eval_synth.get("n", 0),
         eval_forum.get("n", 0),
         len(df_evals) if not df_evals.empty else 0),
        ("Silence rate",
         pct(silence_synth),
         pct(silence_forum),
         pct(silence_rate(df_decisions)) if not df_decisions.empty else "—"),
    ], col_widths=[75*mm, 33*mm, 50*mm, 22*mm]),
    PageBreak(),
]

# ── Section 1: Post Volume ───────────────────────────────────
story += section("1 · Post volume by mode and agent")
story += [
    Paragraph(
        "How many posts each agent produced in each mode. Agents are the same code; "
        "the mix of synthesis vs forum events determines which context they receive.",
        body_s
    ),
]
if "posts_per_agent" in chart_paths:
    story.append(img(chart_paths["posts_per_agent"], w=160*mm))

# Per-agent table
tbl_rows = [("Agent", "Sector", "Synthesis posts", "Forum posts", "Total")]
for ag in sorted(agent_mode_counts.keys()):
    sec = next((r["sector"] for r in agents_rows if r["name"] == ag), "—")
    s = agent_mode_counts[ag]["synthesis"]
    f = agent_mode_counts[ag]["forum"]
    tbl_rows.append((ag, sec, s, f, s + f))
story += [Spacer(1, 4), stat_table(tbl_rows, col_widths=[55*mm, 32*mm, 32*mm, 32*mm, 20*mm])]
story.append(PageBreak())

# ── Section 2: Silence rates ────────────────────────────────
story += section("2 · Decision silence rates by mode")
story += [
    Paragraph(
        "What proportion of agent decisions result in stay_silent. "
        "A higher silence rate in synthesis mode may indicate stricter catalyst gates or "
        "higher suppression from the ownership/materiality gates for synthesis anchors.",
        body_s
    ),
]
if "silence_rate" in chart_paths:
    story.append(img(chart_paths["silence_rate"], w=110*mm))

# Top suppression reason codes
if suppression_codes:
    top_codes = sorted(suppression_codes.items(), key=lambda x: x[1]["synthesis"]+x[1]["forum"], reverse=True)[:12]
    tbl_rows2 = [("Suppression reason code", "Synthesis", "Forum")]
    for code, counts in top_codes:
        tbl_rows2.append((code, counts["synthesis"], counts["forum"]))
    story += [Spacer(1, 4), Paragraph("Top suppression reason codes", bold_s),
              stat_table(tbl_rows2, col_widths=[105*mm, 30*mm, 30*mm])]
story.append(PageBreak())

# ── Section 3: Synthesis quality flags ──────────────────────
story += section("3 · Synthesis-specific quality flags")
story += [
    Paragraph(
        "Flags that only apply to synthesis posts. <b>synthesis_anchor_mismatch</b> indicates the "
        "anchor headline did not align with the post content and triggered repair logic. "
        "<b>synthesis_theme_generic_fallback</b> means no specific theme was selected. "
        "<b>synthesis_anchor_repaired</b> means the post was auto-corrected before publishing.",
        body_s
    ),
]
if "synthesis_flags" in chart_paths:
    story.append(img(chart_paths["synthesis_flags"], w=160*mm))

# Flag detail table
synth_flag_rows = [("Synthesis flag", "Rate", "Count (of synth posts)")]
sp_count = len(df_posts[df_posts["mode"]=="synthesis"]) if not df_posts.empty else 0
for f in FLAG_GROUPS["synthesis"]:
    row = next((r for r in flag_compare if r["flag"] == f), None)
    if row:
        synth_flag_rows.append((
            f.replace("synthesis_", ""),
            pct(row["rate_synth"]),
            f'{row["n_synth"]} / {sp_count}'
        ))
story += [Spacer(1, 4), stat_table(synth_flag_rows, col_widths=[105*mm, 30*mm, 40*mm])]
story.append(PageBreak())

# ── Section 4: Heuristic retrieval flags ────────────────────
story += section("4 · Heuristic retrieval signal flags (forum mode)")
story += [
    Paragraph(
        "These flags track whether agents actually <i>used</i> the knowledge snippets injected "
        "from findRelevantKnowledgeSnippets(). <b>stored_stat_cited</b> fires when the post "
        "references a stored correlation or historical range. <b>no_stored_stat_cited</b> fires "
        "when snippets were available but not visibly used — indicating the context was present "
        "but the agent wrote around it.",
        body_s
    ),
]
if "retrieval_flags" in chart_paths:
    story.append(img(chart_paths["retrieval_flags"], w=140*mm))

fp_count = len(df_posts[df_posts["mode"]=="forum"]) if not df_posts.empty else 0
ret_flag_rows = [("Retrieval flag", "Forum rate", "Count (of forum posts)")]
for f in FLAG_GROUPS["retrieval"]:
    row = next((r for r in flag_compare if r["flag"] == f), None)
    if row:
        ret_flag_rows.append((f.replace("_", " "), pct(row["rate_forum"]), f'{row["n_forum"]} / {fp_count}'))
story += [Spacer(1, 4), stat_table(ret_flag_rows, col_widths=[90*mm, 40*mm, 50*mm])]
story.append(PageBreak())

# ── Section 5: Shared quality comparison ────────────────────
story += section("5 · Shared quality metrics — synthesis vs forum")
story += [
    Paragraph(
        "Quality flags that apply to both modes. Key signals: <b>verified_metric_cited</b> "
        "(agent used a number from the verified metrics block), <b>unverified_metric_claim</b> "
        "(agent cited a number not in the verified set), <b>conviction_condition_present</b> "
        "(post contains a falsifiability condition).",
        body_s
    ),
]
if "quality_flags_compare" in chart_paths:
    story.append(img(chart_paths["quality_flags_compare"], w=165*mm))

q_rows = [("Quality flag", "Synthesis rate", "Forum rate", "Δ (S−F)")]
for f in FLAG_GROUPS["quality"]:
    row = next((r for r in flag_compare if r["flag"] == f), None)
    if row:
        d = row["delta"]
        delta_label = f"{d*100:+.1f}pp"
        q_rows.append((f.replace("_", " "), pct(row["rate_synth"]), pct(row["rate_forum"]), delta_label))
story += [Spacer(1, 4), stat_table(q_rows, col_widths=[90*mm, 32*mm, 32*mm, 25*mm])]
story.append(PageBreak())

# ── Section 6: Eval scores ───────────────────────────────────
story += section("6 · Eval scores by mode (0–10 scale)")
story += [
    Paragraph(
        "Gemini evaluation scores across 5 dimensions. Scores are stored 0–1 by the pipeline "
        "and multiplied ×10 here for display. Scores are auto-generated per post and reflect "
        "clarity, specificity, actionability, and distinctiveness relative to a market analyst standard.",
        body_s
    ),
]
if "eval_scores" in chart_paths:
    story.append(img(chart_paths["eval_scores"], w=160*mm))

if eval_synth or eval_forum:
    dims2 = ["overall", "clarity", "specificity", "actionability", "distinctiveness"]
    e_rows = [("Dimension", "Synthesis", "Forum", "Δ (S−F)")]
    for d in dims2:
        s_v = eval_synth.get(d)
        f_v = eval_forum.get(d)
        e_rows.append((d.capitalize(), sc(s_v), sc(f_v), delta_str(s_v, f_v)))
    story += [Spacer(1, 4), stat_table(e_rows, col_widths=[65*mm, 35*mm, 35*mm, 30*mm])]

if "eval_delta" in chart_paths:
    story += [Spacer(1, 6), Paragraph("Per-agent eval delta (synthesis − forum):", bold_s),
              img(chart_paths["eval_delta"], w=155*mm)]

# Per-agent eval table
if agent_eval_by_mode:
    ag_e_rows = [("Agent", "Synth mean", "n", "Forum mean", "n", "Δ")]
    for ag in sorted(agent_eval_by_mode.keys()):
        v = agent_eval_by_mode[ag]
        ag_e_rows.append((
            ag, sc(v["synth_mean"]), v["synth_n"],
            sc(v["forum_mean"]), v["forum_n"],
            delta_str(v["synth_mean"], v["forum_mean"])
        ))
    story += [Spacer(1, 4), stat_table(ag_e_rows,
              col_widths=[55*mm, 28*mm, 14*mm, 28*mm, 14*mm, 22*mm])]
story.append(PageBreak())

# ── Section 7: Word count ────────────────────────────────────
story += section("7 · Post length distribution by mode")
story += [
    Paragraph(
        "Word counts of published posts. Synthesis posts tend to be anchored around a single "
        "headline and may be tighter; forum posts with rich knowledge snippets may be longer "
        "if the agent integrates stored context.",
        body_s
    ),
]
if "word_count" in chart_paths:
    story.append(img(chart_paths["word_count"], w=160*mm))

if not df_posts.empty:
    wc_rows = [("Mode", "Mean words", "Median", "Min", "Max", "n")]
    for mode in MODES:
        sub = df_posts[df_posts["mode"] == mode]["content_words"].dropna()
        if len(sub) > 0:
            wc_rows.append((mode.capitalize(),
                            f"{sub.mean():.0f}", f"{sub.median():.0f}",
                            f"{sub.min():.0f}", f"{sub.max():.0f}",
                            len(sub)))
    story += [Spacer(1, 4), stat_table(wc_rows, col_widths=[32*mm, 30*mm, 28*mm, 22*mm, 22*mm, 18*mm])]
story.append(PageBreak())

# ── Section 8: Qualitative sample ───────────────────────────
story += section("8 · Synthesis post qualitative sample")
story += [
    Paragraph(
        "Sample of recent synthesis posts with key flags, for manual review. "
        "Focus on whether the synthesis anchor appears in the post content and whether "
        "the agent added genuine analysis beyond restating the headline.",
        body_s
    ),
    Spacer(1, 3),
]
shown = 0
for row in synth_sample_rows[:8]:
    try:
        pd_j = json.loads(row.get("posting_decision_json") or "{}")
        flags_here = pd_j.get("qualityFlags", [])
    except Exception:
        flags_here = []
    bad_flags = [f for f in flags_here if any(w in f for w in ["mismatch", "missing", "fallback", "generic", "unverified"])]
    flag_str = ", ".join(flags_here[:6]) or "—"
    story += [
        KeepTogether([
            Paragraph(f"<b>{row.get('agent_name','?')} ({row.get('sector','?')})</b> — "
                      f"{(row.get('title') or row.get('catalyst') or '')[:90]}", bold_s),
            Paragraph(f"Flags: <font color='{'red' if bad_flags else 'green'}'>{flag_str}</font>",
                      muted_s),
            Paragraph((row.get("content") or "")[:380].replace("&", "&amp;").replace("<", "&lt;"), body_s),
            Spacer(1, 3),
        ])
    ]
    shown += 1

if shown == 0:
    story.append(Paragraph("No synthesis posts found in this window.", muted_s))
story.append(PageBreak())

# ── Section 9: Key findings ──────────────────────────────────
story += section("9 · Key findings")

# Auto-generate findings
findings = []

if not df_posts.empty:
    sp = df_posts[df_posts["mode"] == "synthesis"]
    fp = df_posts[df_posts["mode"] == "forum"]

    if len(sp) > 0:
        mismatch_rate = sp["flag_synthesis_anchor_mismatch"].mean() if "flag_synthesis_anchor_mismatch" in sp.columns else 0
        repair_rate   = sp["flag_synthesis_anchor_repaired"].mean()  if "flag_synthesis_anchor_repaired" in sp.columns else 0
        generic_rate  = sp["flag_synthesis_theme_generic_fallback"].mean() if "flag_synthesis_theme_generic_fallback" in sp.columns else 0
        findings.append(
            f"<b>Synthesis anchor quality:</b> {pct(mismatch_rate)} of synthesis posts had an anchor mismatch; "
            f"{pct(repair_rate)} were auto-repaired; {pct(generic_rate)} fell back to a generic theme."
        )

    if len(fp) > 0:
        cited_rate = fp["flag_stored_stat_cited"].mean() if "flag_stored_stat_cited" in fp.columns else 0
        uncited_rate = fp["flag_no_stored_stat_cited"].mean() if "flag_no_stored_stat_cited" in fp.columns else 0
        findings.append(
            f"<b>Heuristic retrieval utilisation:</b> {pct(cited_rate)} of forum posts cited a stored statistic "
            f"(stored_stat_cited); {pct(uncited_rate)} had context available but did not visibly use it."
        )

    if silence_synth is not None and silence_forum is not None:
        diff = silence_synth - silence_forum
        more = "more" if diff > 0 else "less"
        findings.append(
            f"<b>Silence rates:</b> synthesis mode silences {pct(abs(diff))} {more} often than forum mode "
            f"({pct(silence_synth)} vs {pct(silence_forum)})."
        )

    if eval_synth and eval_forum:
        overall_delta = (eval_synth.get("overall", 0) or 0) - (eval_forum.get("overall", 0) or 0)
        better = "synthesis" if overall_delta > 0 else "forum"
        findings.append(
            f"<b>Eval scores:</b> {better} mode produces higher overall scores "
            f"(synthesis {sc(eval_synth.get('overall'))}/10 vs forum {sc(eval_forum.get('overall'))}/10, "
            f"Δ = {overall_delta:+.1f} pts)."
        )

    for mode_label, sub in [("Synthesis", sp), ("Forum", fp)]:
        if len(sub) > 0:
            verified = sub["flag_verified_metric_cited"].mean() if "flag_verified_metric_cited" in sub.columns else 0
            unverified = sub["flag_unverified_metric_claim"].mean() if "flag_unverified_metric_claim" in sub.columns else 0
            findings.append(
                f"<b>{mode_label} metric accuracy:</b> {pct(verified)} cite verified metrics; "
                f"{pct(unverified)} make unverified numeric claims."
            )

if not findings:
    findings.append("Insufficient data — run after more posts have accumulated.")

for f_text in findings:
    story.append(Paragraph(f"• {f_text}", body_s))

story += [
    Spacer(1, 6),
    Paragraph("Sprint 2 recommended actions:", bold_s),
    Paragraph("If synthesis mismatch rate > 15%: review synthesisSelection scoring weights for agent-theme affinity.", body_s),
    Paragraph("If retrieval citation rate < 30%: investigate whether knowledge snippets are topically relevant to the current catalyst — low citation may indicate a query-content mismatch.", body_s),
    Paragraph("If silence rates diverge by > 20pp: check whether the synthesis ownership gate or domain-relevance gate is over-firing for specific agents.", body_s),
    Paragraph("If eval scores diverge by > 1pt: higher forum scores suggest synthesis anchors are constraining agent analysis; higher synthesis scores suggest heuristic context is too generic.", body_s),
]

# Build
doc.build(story)
print(f"\n✓ PDF written → {PDF_PATH}")
print(f"✓ Charts  → {CHARTS_DIR}")
print(f"✓ Raw     → {RAW_DIR}")

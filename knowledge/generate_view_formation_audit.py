"""
Market Room — View Formation Audit
====================================
Core question: Are agents synthesising their own views from historical patterns and
stored data — backing those views with data points — rather than summarising news?

Context:
  - House views were removed so agents develop independent analysis from data
  - Synthesis mode intent: agents draw on past patterns, stored correlations,
    FRED data lake, and knowledge base — NOT on a house view or live headline
  - Forum mode intent: same, but triggered by an incoming news catalyst

The primary signal is stored_stat_cited — fires when a post explicitly references
a stored correlation, historical range, analog block, or data-lake series.
This is the "past patterns and data" proxy. verified_metric_cited is live market
data (good but secondary). data_anchor_present is any number including from news
(too weak on its own).

OVFD score (Own View From Data) per post — 0 to 4:
  +2  stored_stat_cited        (drew on historical patterns/stored data)
  +1  conviction_condition_present AND NOT weak_conviction_condition
                               (has a genuine falsifiability condition = real view)
  +1  verified_metric_cited    (backed claim with a verified market number)
  -1  conviction_condition_missing (no view expressed at all)
  -1  no_stored_stat_cited     (knowledge was available but ignored)

OVFD tiers:
  3-4 → Independent (view + data from patterns)
  1-2 → Mixed (partial — some grounding but incomplete)
  ≤0  → News summary (no stored-data grounding; view absent or weak)

Reads from already-downloaded raw JSON — no new D1 queries needed.
"""

import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, Image, KeepTogether, PageBreak,
    PageTemplate, Paragraph, Spacer, Table, TableStyle
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus.flowables import HRFlowable

# ── Paths ──────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).parent.parent
TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")

# Read from the most recent context_mode_audit raw data
RAW_DIRS = sorted((PROJECT_ROOT / "knowledge" / "audits").glob("context_mode_audit_*"))
if not RAW_DIRS:
    raise SystemExit("No context_mode_audit raw data found. Run generate_context_mode_audit.py first.")
RAW_DIR = RAW_DIRS[-1] / "raw"
print(f"Reading raw data from: {RAW_DIR}")

OUT_DIR    = PROJECT_ROOT / "knowledge" / "audits" / f"view_formation_audit_{TODAY}"
CHARTS_DIR = OUT_DIR / "charts"
OUT_DIR.mkdir(parents=True, exist_ok=True)
CHARTS_DIR.mkdir(exist_ok=True)
PDF_PATH   = OUT_DIR / "view_formation_audit.pdf"

# ── Palette ────────────────────────────────────────────────────────────────
NAVY  = colors.HexColor("#0D1B2A")
GOLD  = colors.HexColor("#C9A84C")
CREAM = colors.HexColor("#FAF6EF")
BLUE  = colors.HexColor("#1E4D7B")
GREEN = colors.HexColor("#27AE60")
RED   = colors.HexColor("#C0392B")
AMBER = colors.HexColor("#E67E22")
MUTED = colors.HexColor("#7F8C8D")

C_INDEP = "#27AE60"   # Independent (stored data + real view)
C_MIXED = "#E67E22"   # Mixed
C_NEWS  = "#C0392B"   # News summary / no grounding
C_SYNTH = "#1E4D7B"   # Synthesis mode
C_FORUM = "#C9A84C"   # Forum mode

# ─────────────────────────────────────────────────────────────
# LOAD RAW DATA
# ─────────────────────────────────────────────────────────────
posts    = json.loads((RAW_DIR / "posts.json").read_text())
evals    = json.loads((RAW_DIR / "evals.json").read_text())
agents   = json.loads((RAW_DIR / "agents.json").read_text())

print(f"Loaded: {len(posts)} posts, {len(evals)} evals, {len(agents)} agents")

# ─────────────────────────────────────────────────────────────
# SCORE EACH POST
# ─────────────────────────────────────────────────────────────
STORED_STAT_PATTERNS = [
    r'\b(?:stored data|stored correlation|correlation [+-]?\d|historical range|'
    r'observations|analog|forward returns?|post-1990|YoY change|'
    r'computed stored|data lake|FRED|rolling correl|breakeven|TIPS|'
    r'Broad Dollar.*WTI.*correlation|WTI.*CPI.*correlation)\b',
]
COMPILED_STORED = [re.compile(p, re.IGNORECASE) for p in STORED_STAT_PATTERNS]

FALSIFIER_STRONG = [
    r'\bThis view changes if\b',
    r'\b(?:unless|only if|provided that|would invalidate|falsified by)\b',
    r'\bwatch for\b.*\bchange\b',
]
COMPILED_FALSIFIER = [re.compile(p, re.IGNORECASE) for p in FALSIFIER_STRONG]

def get_flags(row: dict) -> list[str]:
    try:
        return json.loads(row.get("posting_decision_json") or "{}").get("qualityFlags") or []
    except Exception:
        return []

def normalise_mode(raw) -> str:
    return "synthesis" if str(raw or "").lower() == "synthesis" else "forum"

def ovfd_score(flags: list[str], content: str) -> int:
    score = 0
    has_stored    = "stored_stat_cited" in flags
    has_verified  = "verified_metric_cited" in flags
    has_conviction = "conviction_condition_present" in flags
    weak_conviction = "weak_conviction_condition" in flags
    missing_conviction = "conviction_condition_missing" in flags
    no_stored     = "no_stored_stat_cited" in flags

    if has_stored:
        score += 2
    if has_conviction and not weak_conviction:
        score += 1
    if has_verified:
        score += 1
    if missing_conviction:
        score -= 1
    if no_stored:
        score -= 1

    return score

def ovfd_tier(score: int) -> str:
    if score >= 3:
        return "Independent"
    if score >= 1:
        return "Mixed"
    return "News Summary"

# Enrich posts
for row in posts:
    row["flags"]    = get_flags(row)
    row["mode"]     = normalise_mode(row.get("trigger_mode"))
    row["ovfd"]     = ovfd_score(row["flags"], row.get("content") or "")
    row["tier"]     = ovfd_tier(row["ovfd"])

# Enrich evals
eval_by_message = {}
for ev in evals:
    mid = ev.get("message_id")
    if mid:
        s = ev.get("overall_score")
        if s is not None:
            try:
                s = float(s)
                # Normalise 0-1 → 0-10
                if s <= 1.5:
                    s *= 10
                eval_by_message[mid] = s
            except Exception:
                pass

for row in posts:
    row["eval_score"] = eval_by_message.get(row.get("id"))

# ─────────────────────────────────────────────────────────────
# AGGREGATE STATS
# ─────────────────────────────────────────────────────────────
AGENTS = sorted(set(r["agent_name"] for r in posts))
MODES  = ["synthesis", "forum"]
TIERS  = ["Independent", "Mixed", "News Summary"]
SECTOR_ORDER = ["Macro", "Rates", "FX", "Commodities", "Equities", "Risk/Sentiment"]

def posts_for(agent=None, mode=None, tier=None):
    sub = posts
    if agent: sub = [r for r in sub if r["agent_name"] == agent]
    if mode:  sub = [r for r in sub if r["mode"] == mode]
    if tier:  sub = [r for r in sub if r["tier"] == tier]
    return sub

def rate(subset, flag):
    if not subset: return 0.0
    return sum(1 for r in subset if flag in r["flags"]) / len(subset)

def tier_rate(subset, tier):
    if not subset: return 0.0
    return sum(1 for r in subset if r["tier"] == tier) / len(subset)

def mean_eval(subset):
    scores = [r["eval_score"] for r in subset if r["eval_score"] is not None]
    return sum(scores) / len(scores) if scores else None

def mean_ovfd(subset):
    if not subset: return None
    return sum(r["ovfd"] for r in subset) / len(subset)

def pct(v, decimals=0):
    if v is None: return "—"
    fmt = f"{{:.{decimals}f}}%"
    return fmt.format(v * 100)

def sc(v, decimals=1):
    if v is None: return "—"
    return f"{v:.{decimals}f}"

# Global tier breakdown
global_tiers = {tier: tier_rate(posts, tier) for tier in TIERS}

# Per-agent stats
agent_meta = {r["name"]: r["sector"] for r in agents}
agent_stats = {}
for ag in AGENTS:
    sub_all   = posts_for(agent=ag)
    sub_synth = posts_for(agent=ag, mode="synthesis")
    sub_forum = posts_for(agent=ag, mode="forum")
    agent_stats[ag] = {
        "sector":         agent_meta.get(ag, "?"),
        "total":          len(sub_all),
        "synth_n":        len(sub_synth),
        "forum_n":        len(sub_forum),
        "cited_rate":     rate(sub_all, "stored_stat_cited"),
        "no_cited_rate":  rate(sub_all, "no_stored_stat_cited"),
        "conviction_rate":rate(sub_all, "conviction_condition_present"),
        "weak_rate":      rate(sub_all, "weak_conviction_condition"),
        "missing_conv":   rate(sub_all, "conviction_condition_missing"),
        "verified_rate":  rate(sub_all, "verified_metric_cited"),
        "unverified_rate":rate(sub_all, "unverified_metric_claim"),
        "indep_all":      tier_rate(sub_all, "Independent"),
        "mixed_all":      tier_rate(sub_all, "Mixed"),
        "news_all":       tier_rate(sub_all, "News Summary"),
        "indep_synth":    tier_rate(sub_synth, "Independent"),
        "indep_forum":    tier_rate(sub_forum, "Independent"),
        "ovfd_mean":      mean_ovfd(sub_all),
        "ovfd_synth":     mean_ovfd(sub_synth),
        "ovfd_forum":     mean_ovfd(sub_forum),
        "eval_all":       mean_eval(sub_all),
        "eval_synth":     mean_eval(sub_synth),
        "eval_forum":     mean_eval(sub_forum),
    }

# Mode-level stats
mode_stats = {}
for mode in MODES:
    sub = posts_for(mode=mode)
    mode_stats[mode] = {
        "n":              len(sub),
        "cited_rate":     rate(sub, "stored_stat_cited"),
        "no_cited_rate":  rate(sub, "no_stored_stat_cited"),
        "conviction_rate":rate(sub, "conviction_condition_present"),
        "weak_rate":      rate(sub, "weak_conviction_condition"),
        "verified_rate":  rate(sub, "verified_metric_cited"),
        "indep":          tier_rate(sub, "Independent"),
        "mixed":          tier_rate(sub, "Mixed"),
        "news":           tier_rate(sub, "News Summary"),
        "ovfd_mean":      mean_ovfd(sub),
        "eval_mean":      mean_eval(sub),
    }

# Eval by tier
eval_by_tier = {}
for tier in TIERS:
    sub = [r for r in posts if r["tier"] == tier]
    eval_by_tier[tier] = mean_eval(sub)

# ─────────────────────────────────────────────────────────────
# QUALITATIVE SAMPLE CLASSIFICATION
# ─────────────────────────────────────────────────────────────
# Best independent posts (stored_stat_cited + conviction + not weak)
best_posts = sorted(
    [r for r in posts if r["tier"] == "Independent"],
    key=lambda r: r["ovfd"], reverse=True
)[:6]

# Worst news-summary posts in synthesis mode (should be independent but aren't)
worst_synth = sorted(
    [r for r in posts if r["mode"] == "synthesis" and r["tier"] == "News Summary"],
    key=lambda r: r["ovfd"]
)[:4]

# ─────────────────────────────────────────────────────────────
# CHARTS
# ─────────────────────────────────────────────────────────────
def save_fig(name):
    path = CHARTS_DIR / f"{name}.png"
    plt.savefig(path, dpi=180, bbox_inches="tight", facecolor="#FAF6EF")
    plt.close()
    return str(path)

chart_paths = {}

# ── Chart 1: OVFD tier breakdown — all posts ──────────────────
fig, ax = plt.subplots(figsize=(6, 3.8))
fig.patch.set_facecolor("#FAF6EF")
ax.set_facecolor("#FAF6EF")
tier_vals = [global_tiers[t] * 100 for t in TIERS]
bar_colors = [C_INDEP, C_MIXED, C_NEWS]
bars = ax.bar(TIERS, tier_vals, color=bar_colors, alpha=0.9, width=0.5)
for bar, val in zip(bars, tier_vals):
    ax.text(bar.get_x() + bar.get_width()/2, val + 0.5,
            f"{val:.1f}%", ha="center", va="bottom", fontsize=11, fontweight="bold")
ax.set_ylabel("% of posts", fontsize=10)
ax.set_title("All posts — Own View From Data (OVFD) tier", fontsize=12, fontweight="bold", color="#0D1B2A")
ax.set_ylim(0, 100)
ax.spines[["top", "right"]].set_visible(False)
plt.tight_layout()
chart_paths["ovfd_global"] = save_fig("ovfd_global")

# ── Chart 2: OVFD tier by agent (stacked bar) ─────────────────
agents_ordered = sorted(AGENTS, key=lambda a: agent_stats[a].get("sector", ""))
fig, ax = plt.subplots(figsize=(10, 4.5))
fig.patch.set_facecolor("#FAF6EF")
ax.set_facecolor("#FAF6EF")
x = np.arange(len(agents_ordered))
width = 0.55
indep_vals = [agent_stats[a]["indep_all"] * 100 for a in agents_ordered]
mixed_vals  = [agent_stats[a]["mixed_all"] * 100 for a in agents_ordered]
news_vals   = [agent_stats[a]["news_all"] * 100 for a in agents_ordered]
b1 = ax.bar(x, indep_vals, width, label="Independent", color=C_INDEP, alpha=0.9)
b2 = ax.bar(x, mixed_vals, width, bottom=indep_vals, label="Mixed", color=C_MIXED, alpha=0.9)
b3 = ax.bar(x, news_vals,  width,
            bottom=[i+m for i,m in zip(indep_vals, mixed_vals)],
            label="News Summary", color=C_NEWS, alpha=0.9)
ax.set_xticks(x)
ax.set_xticklabels([a.replace(" Agent", "") for a in agents_ordered], fontsize=10)
ax.set_ylabel("% of posts", fontsize=10)
ax.set_ylim(0, 100)
ax.set_title("OVFD tier distribution per agent", fontsize=12, fontweight="bold", color="#0D1B2A")
ax.legend(fontsize=9, loc="upper right")
ax.spines[["top", "right"]].set_visible(False)
plt.tight_layout()
chart_paths["ovfd_by_agent"] = save_fig("ovfd_by_agent")

# ── Chart 3: stored_stat_cited rate per agent, synthesis vs forum
fig, ax = plt.subplots(figsize=(10, 4.2))
fig.patch.set_facecolor("#FAF6EF")
ax.set_facecolor("#FAF6EF")
w = 0.38
xs = np.arange(len(agents_ordered))

def safe_rate_sub(agent, mode, flag):
    sub = posts_for(agent=agent, mode=mode)
    return rate(sub, flag) * 100 if sub else 0

cited_synth = [safe_rate_sub(a, "synthesis", "stored_stat_cited") for a in agents_ordered]
cited_forum  = [safe_rate_sub(a, "forum",     "stored_stat_cited") for a in agents_ordered]
ax.bar(xs - w/2, cited_synth, w, color=C_SYNTH, label="Synthesis mode", alpha=0.88)
ax.bar(xs + w/2, cited_forum,  w, color=C_FORUM, label="Forum mode",     alpha=0.88)
ax.set_xticks(xs)
ax.set_xticklabels([a.replace(" Agent", "") for a in agents_ordered], fontsize=10)
ax.set_ylabel("% posts citing stored data", fontsize=10)
ax.set_title("stored_stat_cited rate — synthesis vs forum per agent\n(the primary signal that agents drew on historical patterns)", fontsize=11, fontweight="bold", color="#0D1B2A")
ax.legend(fontsize=9)
ax.spines[["top", "right"]].set_visible(False)
plt.tight_layout()
chart_paths["cited_by_mode_agent"] = save_fig("cited_by_mode_agent")

# ── Chart 4: OVFD score distribution (synthesis vs forum) ──────
synth_scores = [r["ovfd"] for r in posts if r["mode"] == "synthesis"]
forum_scores  = [r["ovfd"] for r in posts if r["mode"] == "forum"]
all_scores    = sorted(set(synth_scores + forum_scores))
fig, axes = plt.subplots(1, 2, figsize=(10, 4), sharey=False)
fig.patch.set_facecolor("#FAF6EF")
for ax_i, (scores, label, color) in enumerate([
    (synth_scores, f"Synthesis (n={len(synth_scores)})", C_SYNTH),
    (forum_scores,  f"Forum (n={len(forum_scores)})",    C_FORUM)
]):
    ax = axes[ax_i]
    ax.set_facecolor("#FAF6EF")
    unique_scores = sorted(set(scores))
    counts = [scores.count(s) for s in unique_scores]
    bars = ax.bar(unique_scores, counts, color=color, alpha=0.88)
    ax.set_xlabel("OVFD score", fontsize=10)
    ax.set_ylabel("Posts", fontsize=10)
    ax.set_title(label, fontsize=11, fontweight="bold")
    ax.axvline(np.mean(scores), color="black", linestyle="--", linewidth=1.2,
               label=f"mean {np.mean(scores):.1f}")
    ax.legend(fontsize=9)
    ax.spines[["top", "right"]].set_visible(False)
    # Annotate tier boundaries
    ax.axvline(0.5, color=C_MIXED, linestyle=":", linewidth=1, alpha=0.6)
    ax.axvline(2.5, color=C_INDEP, linestyle=":", linewidth=1, alpha=0.6)
fig.suptitle("OVFD score distribution — 3–4 = Independent · 1–2 = Mixed · ≤0 = News Summary",
             fontsize=10, y=1.02, color="#0D1B2A")
plt.tight_layout()
chart_paths["ovfd_distribution"] = save_fig("ovfd_distribution")

# ── Chart 5: Eval score vs OVFD tier ──────────────────────────
tier_evals = {t: eval_by_tier[t] for t in TIERS if eval_by_tier.get(t) is not None}
if tier_evals:
    fig, ax = plt.subplots(figsize=(6, 3.8))
    fig.patch.set_facecolor("#FAF6EF")
    ax.set_facecolor("#FAF6EF")
    tier_labels = list(tier_evals.keys())
    tier_scores = list(tier_evals.values())
    bar_colors = [C_INDEP if t == "Independent" else C_MIXED if t == "Mixed" else C_NEWS
                  for t in tier_labels]
    bars = ax.bar(tier_labels, tier_scores, color=bar_colors, alpha=0.9, width=0.4)
    for bar, val in zip(bars, tier_scores):
        ax.text(bar.get_x() + bar.get_width()/2, val + 0.05,
                f"{val:.1f}", ha="center", va="bottom", fontsize=11, fontweight="bold")
    ax.set_ylabel("Mean eval score (0–10)", fontsize=10)
    ax.set_ylim(0, 10)
    ax.set_title("Eval score by OVFD tier\n(does grounding improve quality scores?)", fontsize=11, fontweight="bold", color="#0D1B2A")
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    chart_paths["eval_by_tier"] = save_fig("eval_by_tier")

# ── Chart 6: Conviction quality per agent ─────────────────────
fig, ax = plt.subplots(figsize=(10, 4.2))
fig.patch.set_facecolor("#FAF6EF")
ax.set_facecolor("#FAF6EF")
conv_vals  = [agent_stats[a]["conviction_rate"] * 100 for a in agents_ordered]
weak_vals  = [agent_stats[a]["weak_rate"] * 100 for a in agents_ordered]
miss_vals  = [agent_stats[a]["missing_conv"] * 100 for a in agents_ordered]
w = 0.25
xs2 = np.arange(len(agents_ordered))
ax.bar(xs2 - w, conv_vals, w, label="Strong conviction", color=C_INDEP, alpha=0.88)
ax.bar(xs2,     weak_vals, w, label="Weak conviction",   color=C_MIXED, alpha=0.88)
ax.bar(xs2 + w, miss_vals, w, label="No conviction",     color=C_NEWS,  alpha=0.88)
ax.set_xticks(xs2)
ax.set_xticklabels([a.replace(" Agent", "") for a in agents_ordered], fontsize=10)
ax.set_ylabel("% of posts", fontsize=10)
ax.set_title("Conviction condition quality per agent\n(strong = real falsifiability; weak = generic 'watch for'; none = no condition)", fontsize=11, fontweight="bold", color="#0D1B2A")
ax.legend(fontsize=9)
ax.spines[["top", "right"]].set_visible(False)
plt.tight_layout()
chart_paths["conviction_quality"] = save_fig("conviction_quality")

print(f"Generated {len(chart_paths)} charts")

# ─────────────────────────────────────────────────────────────
# PDF GENERATION
# ─────────────────────────────────────────────────────────────
print("Building PDF...")

styles = getSampleStyleSheet()

def ps(name, **kw):
    return ParagraphStyle(name, parent=styles["Normal"], **kw)

title_s = ps("T",  fontName="Helvetica-Bold", fontSize=22, textColor=NAVY, leading=28, spaceAfter=4)
sub_s   = ps("Su", fontName="Helvetica",      fontSize=11, textColor=BLUE, leading=15, spaceAfter=10)
h1_s    = ps("H1", fontName="Helvetica-Bold", fontSize=14, textColor=NAVY, spaceBefore=12, spaceAfter=6, leading=18)
h2_s    = ps("H2", fontName="Helvetica-Bold", fontSize=11, textColor=BLUE, spaceBefore=8,  spaceAfter=4, leading=14)
body_s  = ps("B",  fontName="Helvetica",      fontSize=9,  leading=13, spaceAfter=3, textColor=colors.HexColor("#2C3E50"))
bold_s  = ps("Bd", fontName="Helvetica-Bold", fontSize=9,  leading=13, spaceAfter=3)
muted_s = ps("M",  fontName="Helvetica",      fontSize=8,  leading=11, textColor=MUTED, spaceAfter=2)
code_s  = ps("C",  fontName="Courier",        fontSize=8,  leading=11, textColor=colors.HexColor("#2C3E50"), spaceAfter=2)

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=GOLD, spaceAfter=6, spaceBefore=6)

def section(title):
    return [hr(), Paragraph(title, h1_s)]

def img(path, w=155*mm, h=None):
    if not path or not Path(path).exists():
        return Spacer(1, 4)
    from reportlab.lib.utils import ImageReader
    im = ImageReader(path)
    iw, ih = im.getSize()
    ratio = ih / iw
    return Image(path, width=w, height=h or (w * ratio))

def tbl(rows, col_widths=None):
    if not rows: return Spacer(1, 2)
    t = Table([list(r) for r in rows], colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CREAM, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#CCC")),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING",   (0, 0), (-1, -1), 5),
    ]))
    return t

def colour_cell(val: str, good_thresh: float, bad_thresh: float, raw: Optional[float]):
    """Returns a coloured Paragraph for a table cell based on thresholds."""
    if raw is None:
        return Paragraph("—", muted_s)
    c = "#27AE60" if raw >= good_thresh else ("#C0392B" if raw <= bad_thresh else "#E67E22")
    return Paragraph(f'<font color="{c}"><b>{val}</b></font>', bold_s)

doc = BaseDocTemplate(str(PDF_PATH), pagesize=A4,
                      leftMargin=18*mm, rightMargin=18*mm,
                      topMargin=16*mm, bottomMargin=16*mm)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")

def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, A4[1]-8*mm, A4[0], 8*mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 7)
    canvas.drawString(18*mm, A4[1]-5.5*mm, "MARKET ROOM — VIEW FORMATION AUDIT")
    canvas.drawRightString(A4[0]-18*mm, A4[1]-5.5*mm, TODAY)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawCentredString(A4[0]/2, 6*mm, f"Page {doc.page}")
    canvas.restoreState()

doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=on_page)])
story = []

# ── Cover ────────────────────────────────────────────────────
n_total  = len(posts)
n_indep  = sum(1 for r in posts if r["tier"] == "Independent")
n_mixed  = sum(1 for r in posts if r["tier"] == "Mixed")
n_news   = sum(1 for r in posts if r["tier"] == "News Summary")
n_synth  = sum(1 for r in posts if r["mode"] == "synthesis")
n_forum  = sum(1 for r in posts if r["mode"] == "forum")

story += [
    Spacer(1, 18*mm),
    Paragraph("Market Room", ps("Cov", fontName="Helvetica", fontSize=13, textColor=GOLD)),
    Paragraph("View Formation Audit", title_s),
    Paragraph(f"Are agents synthesising views from historical patterns — backed with data? · {TODAY}", sub_s),
    Spacer(1, 4*mm),
    Paragraph(
        "House views were removed so agents develop independent analysis from past market patterns, "
        "stored correlations, FRED data, and knowledge base — not from a pre-loaded directional bias. "
        "This audit measures whether that goal is being achieved. The primary signal is "
        "<b>stored_stat_cited</b>: fires when a post explicitly draws on a stored correlation, "
        "historical range, analog block, or data-lake series. This is the \'past patterns and data\' proxy.",
        body_s
    ),
    Spacer(1, 4*mm),
    Paragraph("<b>OVFD score (Own View From Data) per post — 0 to 4:</b>", bold_s),
    Paragraph("+2 &nbsp; stored_stat_cited &nbsp;&nbsp;(drew on historical patterns / stored data — primary signal)", body_s),
    Paragraph("+1 &nbsp; conviction_condition_present AND NOT weak &nbsp;&nbsp;(genuine falsifiable view)", body_s),
    Paragraph("+1 &nbsp; verified_metric_cited &nbsp;&nbsp;(backed claim with a verified live market number)", body_s),
    Paragraph("−1 &nbsp; conviction_condition_missing &nbsp;&nbsp;(no view at all — news narration only)", body_s),
    Paragraph("−1 &nbsp; no_stored_stat_cited &nbsp;&nbsp;(knowledge was available but ignored)", body_s),
    Spacer(1, 3*mm),
    tbl([
        ("Tier", "OVFD score", "Posts", "% of total"),
        ("Independent (view + data from patterns)", "3–4",
         n_indep, f"{n_indep/n_total*100:.1f}%"),
        ("Mixed (partial grounding)",               "1–2",
         n_mixed, f"{n_mixed/n_total*100:.1f}%"),
        ("News Summary (no grounding)",             "≤0",
         n_news,  f"{n_news/n_total*100:.1f}%"),
        ("Total", "", n_total, "100%"),
    ], col_widths=[88*mm, 22*mm, 20*mm, 22*mm]),
    PageBreak(),
]

# ── Section 1: Global tier ───────────────────────────────────
story += section("1 · Overall: how often are agents forming views from data?")
story += [
    Paragraph(
        f"Across {n_total} posts ({n_synth} synthesis, {n_forum} forum) in the last 30 days. "
        "The goal is for <b>Independent</b> to be the dominant tier — agents synthesising "
        "a directional view backed by stored historical patterns and data.",
        body_s
    ),
]
if "ovfd_global" in chart_paths:
    story.append(img(chart_paths["ovfd_global"], w=130*mm))

# Mode comparison
story += [
    Spacer(1, 4), Paragraph("Breakdown by trigger mode:", bold_s),
    tbl([
        ("Mode", "Posts", "Independent%", "Mixed%", "News Summary%", "stored_stat_cited%", "Mean OVFD"),
        ("Synthesis", mode_stats["synthesis"]["n"],
         pct(mode_stats["synthesis"]["indep"]),
         pct(mode_stats["synthesis"]["mixed"]),
         pct(mode_stats["synthesis"]["news"]),
         pct(mode_stats["synthesis"]["cited_rate"]),
         sc(mode_stats["synthesis"]["ovfd_mean"])),
        ("Forum / Heuristic", mode_stats["forum"]["n"],
         pct(mode_stats["forum"]["indep"]),
         pct(mode_stats["forum"]["mixed"]),
         pct(mode_stats["forum"]["news"]),
         pct(mode_stats["forum"]["cited_rate"]),
         sc(mode_stats["forum"]["ovfd_mean"])),
    ], col_widths=[32*mm, 16*mm, 28*mm, 22*mm, 30*mm, 32*mm, 22*mm]),
    Spacer(1, 4),
    Paragraph(
        "If synthesis mode is working correctly, its <b>Independent%</b> should be higher than "
        "forum mode — agents are supposed to be drawing on accumulated knowledge rather than "
        "just reacting to news. A lower synthesis Independent% means agents treat the synthesis "
        "anchor as a news item rather than a prompt to reason from their knowledge base.",
        body_s
    ),
    PageBreak(),
]

# ── Section 2: Per-agent OVFD tiers ─────────────────────────
story += section("2 · Per-agent OVFD tier breakdown")
story += [
    Paragraph(
        "Which agents are forming genuine views from historical data, and which are narrating news? "
        "Green = Independent, Amber = Mixed, Red = News Summary.",
        body_s
    ),
]
if "ovfd_by_agent" in chart_paths:
    story.append(img(chart_paths["ovfd_by_agent"], w=165*mm))

# Per-agent summary table
ag_rows = [("Agent", "Sector", "n", "Independent%", "Mixed%", "News%", "Mean OVFD", "Eval score")]
for ag in agents_ordered:
    s = agent_stats[ag]
    ag_rows.append((
        ag.replace(" Agent", ""),
        s["sector"],
        s["total"],
        pct(s["indep_all"]),
        pct(s["mixed_all"]),
        pct(s["news_all"]),
        sc(s["ovfd_mean"]),
        sc(s["eval_all"]),
    ))
story += [Spacer(1, 4), tbl(ag_rows, col_widths=[32*mm, 30*mm, 12*mm, 28*mm, 22*mm, 22*mm, 22*mm, 22*mm])]
story.append(PageBreak())

# ── Section 3: stored_stat_cited — the key signal ───────────
story += section("3 · stored_stat_cited — the primary indicator")
story += [
    Paragraph(
        "<b>stored_stat_cited</b> fires when a post explicitly references a stored correlation, "
        "FRED series, historical range, analog block, or data-lake computed statistic. "
        "This is the clearest signal that an agent is reasoning from past patterns rather than "
        "summarising a current headline. A rate below 15% means the agent is largely ignoring "
        "its injected knowledge context.",
        body_s
    ),
]
if "cited_by_mode_agent" in chart_paths:
    story.append(img(chart_paths["cited_by_mode_agent"], w=165*mm))

cited_rows = [("Agent", "Sector", "Overall cited%", "Synth cited%", "Forum cited%", "no_stored_stat%")]
for ag in agents_ordered:
    s = agent_stats[ag]
    sub_s_posts = posts_for(agent=ag, mode="synthesis")
    sub_f_posts = posts_for(agent=ag, mode="forum")
    cited_rows.append((
        ag.replace(" Agent", ""),
        s["sector"],
        colour_cell(pct(s["cited_rate"]),     0.15, 0.05, s["cited_rate"]),
        colour_cell(pct(safe_rate_sub(ag, "synthesis", "stored_stat_cited")/100),
                    0.15, 0.05,
                    safe_rate_sub(ag, "synthesis", "stored_stat_cited")/100),
        colour_cell(pct(safe_rate_sub(ag, "forum", "stored_stat_cited")/100),
                    0.15, 0.05,
                    safe_rate_sub(ag, "forum", "stored_stat_cited")/100),
        colour_cell(pct(s["no_cited_rate"]),  0.05, 0.40, 1 - s["no_cited_rate"]),
    ))
story += [Spacer(1, 4), tbl(cited_rows, col_widths=[32*mm, 30*mm, 30*mm, 28*mm, 28*mm, 28*mm])]
story += [
    Spacer(1, 4),
    Paragraph("Green = ≥15% cited (good). Red = ≤5% cited (agent ignoring knowledge base).", muted_s),
    PageBreak()
]

# ── Section 4: OVFD score distribution ──────────────────────
story += section("4 · OVFD score distribution — synthesis vs forum")
story += [
    Paragraph(
        "Histogram of OVFD scores for each mode. The dashed line shows the mean. "
        "Scores ≥3 are Independent; 1–2 Mixed; ≤0 News Summary. "
        "Synthesis mode should show a rightward shift if agents are forming views from knowledge.",
        body_s
    ),
]
if "ovfd_distribution" in chart_paths:
    story.append(img(chart_paths["ovfd_distribution"], w=165*mm))
story += [
    Spacer(1, 4),
    tbl([
        ("Mode", "Mean OVFD", "Median OVFD", "% score ≥3", "% score ≤0"),
        ("Synthesis",
         sc(mode_stats["synthesis"]["ovfd_mean"]),
         sc(float(np.median([r["ovfd"] for r in posts if r["mode"]=="synthesis"]))),
         pct(sum(1 for r in posts if r["mode"]=="synthesis" and r["ovfd"]>=3)/max(1,sum(1 for r in posts if r["mode"]=="synthesis"))),
         pct(sum(1 for r in posts if r["mode"]=="synthesis" and r["ovfd"]<=0)/max(1,sum(1 for r in posts if r["mode"]=="synthesis")))),
        ("Forum",
         sc(mode_stats["forum"]["ovfd_mean"]),
         sc(float(np.median([r["ovfd"] for r in posts if r["mode"]=="forum"]))),
         pct(sum(1 for r in posts if r["mode"]=="forum" and r["ovfd"]>=3)/max(1,sum(1 for r in posts if r["mode"]=="forum"))),
         pct(sum(1 for r in posts if r["mode"]=="forum" and r["ovfd"]<=0)/max(1,sum(1 for r in posts if r["mode"]=="forum")))),
    ], col_widths=[32*mm, 28*mm, 30*mm, 28*mm, 28*mm]),
    PageBreak()
]

# ── Section 5: Conviction quality ───────────────────────────
story += section("5 · Conviction condition quality")
story += [
    Paragraph(
        "A genuine view from data requires a falsifiability condition — the agent should state "
        "what would change its analysis. <b>Strong conviction</b> = specific condition tied to a "
        "data trigger (e.g. 'This view changes if 10Y breaks 5%'). "
        "<b>Weak conviction</b> = generic 'watch for X' with no mechanism. "
        "<b>No conviction</b> = no condition at all — the post is a narration, not an analysis.",
        body_s
    ),
]
if "conviction_quality" in chart_paths:
    story.append(img(chart_paths["conviction_quality"], w=165*mm))

conv_rows = [("Agent", "Strong%", "Weak%", "None%", "Assessment")]
for ag in agents_ordered:
    s = agent_stats[ag]
    strong = s["conviction_rate"] - s["weak_rate"]
    assessment = ("✓ Good" if strong >= 0.30
                  else "△ Weak" if s["conviction_rate"] >= 0.20
                  else "✗ Poor")
    conv_rows.append((
        ag.replace(" Agent", ""),
        pct(strong),
        pct(s["weak_rate"]),
        pct(s["missing_conv"]),
        assessment
    ))
story += [Spacer(1, 4), tbl(conv_rows, col_widths=[45*mm, 32*mm, 32*mm, 32*mm, 35*mm])]
story.append(PageBreak())

# ── Section 6: Eval score vs OVFD tier ──────────────────────
story += section("6 · Eval scores by OVFD tier")
story += [
    Paragraph(
        "Do posts with stronger data grounding receive higher quality evaluation scores? "
        "This validates whether the OVFD framework correlates with actual output quality.",
        body_s
    ),
]
if "eval_by_tier" in chart_paths:
    story.append(img(chart_paths["eval_by_tier"], w=120*mm))

eval_tbl_rows = [("OVFD Tier", "Mean eval (0–10)", "n posts with evals")]
for tier in TIERS:
    sub = [r for r in posts if r["tier"] == tier and r["eval_score"] is not None]
    eval_tbl_rows.append((tier, sc(eval_by_tier.get(tier)), len(sub)))
story += [Spacer(1, 4), tbl(eval_tbl_rows, col_widths=[80*mm, 50*mm, 50*mm])]
story.append(PageBreak())

# ── Section 7: Best examples — Independent posts ─────────────
story += section("7 · Best examples — Independent posts (OVFD ≥ 3)")
story += [
    Paragraph(
        "Posts that scored Independent tier: stored historical data cited + genuine conviction "
        "condition. These show what the system should produce more of.",
        body_s
    ),
    Spacer(1, 3),
]
for row in best_posts:
    flags_str = ", ".join(f for f in row["flags"]
                           if any(k in f for k in ["stored", "conviction", "verified", "data_anchor"]))
    story += [KeepTogether([
        Paragraph(
            f"<b>{row['agent_name']} ({row['sector']})</b> "
            f"[{row['mode']}] OVFD={row['ovfd']}",
            bold_s
        ),
        Paragraph(f"Flags: {flags_str or '—'}", muted_s),
        Paragraph((row.get("content") or "")[:450]
                  .replace("&","&amp;").replace("<","&lt;").replace(">","&gt;"),
                  body_s),
        Spacer(1, 4),
    ])]
story.append(PageBreak())

# ── Section 8: Problem examples — synthesis but News Summary ─
story += section("8 · Problem examples — synthesis posts that scored News Summary")
story += [
    Paragraph(
        "These are posts generated in synthesis mode but scored ≤0 on OVFD — the mode intended "
        "to draw on the agent's accumulated knowledge, but the post shows no stored-data citation "
        "and no genuine conviction condition. These posts indicate the synthesis anchor is being "
        "treated as a news topic rather than a prompt to reason from history.",
        body_s
    ),
    Spacer(1, 3),
]
for row in worst_synth:
    flags_str = ", ".join(row["flags"][:8])
    story += [KeepTogether([
        Paragraph(
            f"<b>{row['agent_name']} ({row['sector']})</b> "
            f"[synthesis] OVFD={row['ovfd']}",
            bold_s
        ),
        Paragraph(f"Flags: {flags_str or '—'}", muted_s),
        Paragraph((row.get("content") or "")[:450]
                  .replace("&","&amp;").replace("<","&lt;").replace(">","&gt;"),
                  body_s),
        Spacer(1, 4),
    ])]
if not worst_synth:
    story.append(Paragraph("None found — all synthesis posts scored Mixed or above.", muted_s))
story.append(PageBreak())

# ── Section 9: Findings and recommendations ─────────────────
story += section("9 · Findings and recommendations")

findings_text = [
    f"<b>Overall OVFD rate:</b> {pct(global_tiers['Independent'])} of posts are Independent "
    f"(view + stored data). {pct(global_tiers['Mixed'])} Mixed. "
    f"{pct(global_tiers['News Summary'])} are news summaries with no grounding.",

    f"<b>stored_stat_cited overall: {pct(mode_stats['forum']['cited_rate'] * mode_stats['forum']['n'] / n_total + mode_stats['synthesis']['cited_rate'] * mode_stats['synthesis']['n'] / n_total)}.</b> "
    f"This is the most important single metric. It should be ≥25% for the system to be "
    f"meaningfully drawing on historical patterns.",

    f"<b>Synthesis vs Forum:</b> Synthesis mode Independent rate = {pct(mode_stats['synthesis']['indep'])} "
    f"vs Forum = {pct(mode_stats['forum']['indep'])}. "
    + ("Synthesis is working as intended — agents draw more from stored data when in knowledge-synthesis mode."
       if (mode_stats['synthesis']['indep'] or 0) > (mode_stats['forum']['indep'] or 0)
       else "Synthesis is NOT producing more grounded posts than forum mode. Agents treat the synthesis anchor as a news topic."),

    f"<b>Worst agents on stored_stat_cited:</b> "
    + ", ".join(f"{a.replace(' Agent','')} ({pct(agent_stats[a]['cited_rate'])})"
                for a in agents_ordered
                if agent_stats[a]["cited_rate"] < 0.05) or "None below 5%",

    f"<b>Best agents on stored_stat_cited:</b> "
    + ", ".join(f"{a.replace(' Agent','')} ({pct(agent_stats[a]['cited_rate'])})"
                for a in agents_ordered
                if agent_stats[a]["cited_rate"] >= 0.15) or "None above 15%",
]

for f_txt in findings_text:
    story.append(Paragraph(f"• {f_txt}", body_s))

story += [
    Spacer(1, 6),
    Paragraph("Recommended fixes:", bold_s),
    Paragraph(
        "1. <b>If stored_stat_cited overall &lt; 10%:</b> the knowledge retrieval query is likely "
        "not finding relevant snippets for the current catalyst. Inspect findRelevantKnowledgeSnippets "
        "query construction — agent queries may be too generic.",
        body_s
    ),
    Paragraph(
        "2. <b>If synthesis mode is not outperforming forum mode:</b> the synthesis prompt is not "
        "directing agents to reason from their accumulated knowledge. Add an explicit instruction: "
        "\"Draw on historical patterns and correlations from your knowledge context — not just the "
        "headline. Your synthesis should explain WHY this matters in light of past cycles.\"",
        body_s
    ),
    Paragraph(
        "3. <b>If conviction rates are below 25%:</b> ensureRequiredConvictionCondition() is not "
        "firing or is producing weak conditions. Check the repair function output quality.",
        body_s
    ),
    Paragraph(
        "4. <b>Per-agent:</b> agents with cited_rate &lt; 5% likely have a knowledge base mismatch — "
        "their approved knowledge docs don't score above threshold for their current catalyst queries. "
        "Review and add sector-specific historical pattern documents.",
        body_s
    ),
]

doc.build(story)
print(f"\n✓ PDF  → {PDF_PATH}")
print(f"✓ Charts → {CHARTS_DIR}")

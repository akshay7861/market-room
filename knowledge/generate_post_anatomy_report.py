"""
Market Room — Post Anatomy Report
==================================
Maps every section of a market room agent post to the exact code that generates it.
Diagnoses why agents may have limited reasoning scope by showing which depth-providing
blocks fire vs which are structurally conditional (and often empty).

Data source: reads from the most recent context_mode_audit_*/raw/ JSON.
No new D1 queries — purely analytical.

Output: knowledge/audits/post_anatomy_report_<date>/post_anatomy_report.pdf
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

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
    BaseDocTemplate, Frame, NextPageTemplate, PageBreak, PageTemplate,
    Paragraph, Spacer, Table, TableStyle, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

# ─────────────────────────────────────────────────────────────
# CONSTANTS & THEME
# ─────────────────────────────────────────────────────────────
TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")
NAVY    = "#0D1B2A"
CREAM   = "#F5F0E8"
AMBER   = "#D4A843"
GREEN   = "#4CAF50"
RED     = "#E53935"
BLUE    = "#1565C0"
TEAL    = "#00796B"
ORANGE  = "#E65100"
LGRAY   = "#B0BEC5"
MGRAY   = "#546E7A"

# ─────────────────────────────────────────────────────────────
# LOAD RAW DATA
# ─────────────────────────────────────────────────────────────
audits_dir = Path(__file__).parent / "audits"
context_dirs = sorted(audits_dir.glob("context_mode_audit_*"), reverse=True)
if not context_dirs:
    raise SystemExit("No context_mode_audit_* directory found. Run generate_context_mode_audit.py first.")
raw_dir = context_dirs[0] / "raw"
print(f"Reading raw data from: {raw_dir}")

posts   = json.loads((raw_dir / "posts.json").read_text()) if (raw_dir / "posts.json").exists() else []
agents  = json.loads((raw_dir / "agents.json").read_text()) if (raw_dir / "agents.json").exists() else []

agent_map = {a["id"]: a for a in agents}
agent_names = {a["id"]: a.get("name", a["id"]) for a in agents}

# ─────────────────────────────────────────────────────────────
# OUTPUT DIR
# ─────────────────────────────────────────────────────────────
out_dir = audits_dir / f"post_anatomy_report_{TODAY}"
charts_dir = out_dir / "charts"
out_dir.mkdir(parents=True, exist_ok=True)
charts_dir.mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────────────────────
# BLOCK DEFINITIONS — complete anatomy of a post prompt
# ─────────────────────────────────────────────────────────────
BLOCKS = [
    # (#, name, file:function, data_source, mode, fires, tier, flag_proxy)
    # Tier: A=Data-Grounding, B=Structural, C=Empty-Risk
    (1,  "Agent Identity",              "marketRoomService.ts (inline)",            "Agent object (DB)",                "Both",       "Always",       "B", None),
    (2,  "Forum/Synthesis Objective",   "marketRoomService.ts (inline)",            "triggerMode",                      "Both",       "Always",       "B", None),
    (3,  "Post Route + Type",           "marketRoomService.ts (inline)",            "topicPlan",                        "Both",       "Always",       "B", None),
    (4,  "Matched Thesis",              "marketRoomService.ts (inline)",            "topicPlan.matchedThesis (DB)",     "Both",       "Conditional",  "C", None),
    (5,  "Primary Headline Block",      "marketRoomService.ts:buildForumPost…",     "headlineAnalysis + sectorHeadlines","Forum",     "Conditional",  "A", "data_anchor_present"),
    (6,  "Synthesis Anchor Block",      "marketRoomService.ts:buildSynthesisPrompt","synthesisSelection (DB themes)",   "Synthesis",  "Conditional",  "A", None),
    (7,  "24H Market Theme Digest",     "marketRoomService.ts:buildSynthesisPrompt","synthesisThemeBoard (DB)",         "Synthesis",  "Conditional",  "A", None),
    (8,  "Shared Post Spec",            "marketRoomService.ts:buildSharedPostSpecPromptBlock","Hard-coded rules",        "Both",       "Always",       "B", None),
    (9,  "Equity Company-First Rules",  "marketRoomService.ts:buildEquityCompanyFirstBlock","headlineAnalysis + equityFundamentals","Equities","Conditional","B", None),
    (10, "Preferred Angle + Catalyst",  "marketRoomService.ts (inline)",            "topicPlan.primary",                "Both",       "Always",       "B", None),
    (11, "Market Snapshot Context",     "marketRoomService.ts (inline)",            "marketSnapshot (live API)",        "Both",       "Always",       "B", None),
    (12, "Sector Delta Summary",        "marketRoomService.ts (inline)",            "snapshot delta computation",       "Both",       "Always",       "B", None),
    (13, "Cross-Asset Deltas",          "marketRoomService.ts (inline)",            "snapshot instruments (live)",      "Synthesis",  "Always",       "B", None),
    (14, "Live Snapshot Instruments",   "marketRoomService.ts (inline)",            "relevantInstrumentsForAgent() (live)","Both",   "Always",       "A", "verified_metric_cited"),
    (15, "Market Data Sanity Block",    "marketRoomService.ts:buildMarketDataSanityBlock","snapshot instruments",        "Both",       "Always",       "B", None),
    (16, "Additional Sector Headlines", "marketRoomService.ts (inline)",            "sectorHeadlines (news DB)",        "Both",       "Conditional",  "C", None),
    (17, "Catalyst Discipline Guard",   "marketRoomService.ts:mainCatalystGuardFor","Hard-coded rules",                 "Forum",      "Always",       "B", None),
    (18, "Verified Market Metrics",     "verifiedMarketMetricsService.ts:buildVerifiedMarketMetricsContext","FRED JSON + live snapshot","Both","Always","A", "verified_metric_cited"),
    (19, "Prior View Accountability",   "marketRoomService.ts (inline)",            "recentPosts[0] (DB)",              "Both",       "Conditional",  "C", None),
    (20, "Stance Challenge Block",      "marketRoomService.ts (inline)",            "stanceChallenge computation",      "Both",       "Conditional",  "B", None),
    (21, "Earlier Posts Context",       "marketRoomService.ts (inline)",            "recentPosts.slice(1) (DB)",        "Both",       "Conditional",  "B", None),
    (22, "Recent Theme History",        "marketRoomService.ts (inline)",            "topicPlan themes (DB)",            "Both",       "Always",       "B", None),
    (23, "Room Consensus Block",        "marketRoomService.ts:buildRoomConsensusBlock","thisRunPosts + priorRoomThreads","Both",      "Conditional",  "B", None),
    (24, "Transmission Chain Instruction","marketRoomService.ts:buildTransmissionChainInstruction","Hard-coded rules",  "Both",       "Always",       "B", None),
    (25, "Dynamic Memory Block",        "dynamicMemoryService.ts:buildDynamicMemoryPromptBlock","DB: theses, forecasts, examples","Both","Always","A", "stored_stat_cited"),
    (26, "Peer Desk Views",             "dynamicMemoryService.ts:buildPeerAgentThesesView","DB: peer agents' theses",   "Both",       "Always",       "A", None),
    (27, "Agent Behavioral State",      "agentBehavioralStateService.ts:buildStatePromptBlock","DB: agent_state",       "Both",       "Conditional",  "B", None),
    (28, "Room Coverage State",         "roomCoverageService.ts:buildRoomCoveragePromptBlock","DB: room_coverage_state","Both",      "Conditional",  "B", None),
    (29, "Historical Data Context",     "historicalDataContextService.ts:buildMarketRoomHistoricalContext","FRED 21-series JSON","Both","Conditional","A", "stored_stat_cited"),
    (30, "Analog Context Block",        "historicalDataContextService.ts:buildAnalogContextBlock","FRED + computation", "Both",       "Conditional",  "A", "stored_stat_cited"),
    (31, "Knowledge Snippets",          "knowledgeSnippetService.ts:findRelevantKnowledgeSnippets","DB knowledge store","Both",      "Conditional",  "A", "stored_stat_cited"),
    (32, "Historical Analog Cases",     "marketRoomService.ts:listRelevantMarketCasesForAgent","DB market_cases",       "Both",       "Conditional",  "A", "stored_stat_cited"),
]

# ─────────────────────────────────────────────────────────────
# COMPUTE EMPIRICAL FLAG RATES FROM POSTS
# ─────────────────────────────────────────────────────────────
FLAG_KEYS = [
    "stored_stat_cited",
    "no_stored_stat_cited",
    "verified_metric_cited",
    "data_anchor_present",
    "data_anchor_missing",
    "conviction_condition_present",
    "conviction_condition_missing",
    "conviction_condition_weak",
    "synthesis_opening_not_sector_specific",
    "anchor_mismatch",
    "anchor_repaired",
    "theme_generic_fallback",
]

def extract_flags(post):
    try:
        pd = json.loads(post.get("posting_decision_json") or "{}")
        return set(pd.get("qualityFlags") or [])
    except Exception:
        return set()

def is_synthesis(post):
    return post.get("trigger_mode") == "synthesis"

top_posts = [p for p in posts if p.get("message_type") == "post"]

# Per-agent flag rates
agent_flag_rates = {}
for ag in agents:
    aid = ag["id"]
    aname = ag.get("name", aid)
    ap = [p for p in top_posts if p.get("agent_id") == aid]
    n = len(ap) or 1
    rates = {}
    for fk in FLAG_KEYS:
        rates[fk] = round(sum(1 for p in ap if fk in extract_flags(p)) / n * 100, 1)
    agent_flag_rates[aname] = {"n": len(ap), "rates": rates}

# Global flag rates
global_n = len(top_posts) or 1
global_rates = {}
for fk in FLAG_KEYS:
    global_rates[fk] = round(sum(1 for p in top_posts if fk in extract_flags(p)) / global_n * 100, 1)

# ─────────────────────────────────────────────────────────────
# CHART 1 — Block Tier Distribution (pie)
# ─────────────────────────────────────────────────────────────
tier_counts = {"A\nData-Grounding": 0, "B\nStructural": 0, "C\nEmpty-Risk": 0}
tier_map = {"A": "A\nData-Grounding", "B": "B\nStructural", "C": "C\nEmpty-Risk"}
for b in BLOCKS:
    tier_counts[tier_map[b[6]]] += 1

fig, ax = plt.subplots(figsize=(6, 4), facecolor=NAVY)
ax.set_facecolor(NAVY)
wedge_colors = [GREEN, AMBER, RED]
wedges, texts, autotexts = ax.pie(
    list(tier_counts.values()),
    labels=list(tier_counts.keys()),
    autopct="%1.0f%%",
    colors=wedge_colors,
    textprops={"color": CREAM, "fontsize": 9},
    wedgeprops={"linewidth": 1.5, "edgecolor": NAVY},
    startangle=90
)
for at in autotexts:
    at.set_color(NAVY)
    at.set_fontweight("bold")
ax.set_title("32 Prompt Blocks by Reasoning Tier", color=CREAM, fontsize=11, fontweight="bold", pad=12)
plt.tight_layout()
fig.savefig(charts_dir / "block_tier_pie.png", dpi=150, bbox_inches="tight", facecolor=NAVY)
plt.close(fig)

# ─────────────────────────────────────────────────────────────
# CHART 2 — Block Fires Always vs Conditional
# ─────────────────────────────────────────────────────────────
always_count = sum(1 for b in BLOCKS if b[6] == "Always")
cond_count = len(BLOCKS) - always_count

fig, ax = plt.subplots(figsize=(5, 3.5), facecolor=NAVY)
ax.set_facecolor(NAVY)
bars = ax.bar(["Always Fires", "Conditional\n(may be empty)"], [always_count, cond_count],
              color=[GREEN, RED], edgecolor=NAVY, width=0.5)
for bar, val in zip(bars, [always_count, cond_count]):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.3, str(val),
            ha="center", va="bottom", color=CREAM, fontsize=12, fontweight="bold")
ax.set_ylim(0, max(always_count, cond_count) + 4)
ax.set_facecolor(NAVY)
ax.tick_params(colors=CREAM)
for spine in ax.spines.values():
    spine.set_edgecolor(MGRAY)
ax.set_title("Always vs Conditional Blocks", color=CREAM, fontsize=11, fontweight="bold", pad=10)
ax.set_ylabel("Count", color=CREAM)
plt.tight_layout()
fig.savefig(charts_dir / "always_vs_conditional.png", dpi=150, bbox_inches="tight", facecolor=NAVY)
plt.close(fig)

# ─────────────────────────────────────────────────────────────
# CHART 3 — Empirical depth-block utilisation per agent
# ─────────────────────────────────────────────────────────────
depth_flags = [
    ("stored_stat_cited", "Stored data\ncited", GREEN),
    ("verified_metric_cited", "Verified metric\ncited", TEAL),
    ("data_anchor_present", "Data anchor\npresent", BLUE),
    ("conviction_condition_present", "Conviction\ncondition", AMBER),
    ("no_stored_stat_cited", "Stored data\nABSENT", RED),
]

agent_names_list = [ag["name"] for ag in agents]
x = np.arange(len(agent_names_list))
width = 0.15
fig, ax = plt.subplots(figsize=(12, 5), facecolor=NAVY)
ax.set_facecolor(NAVY)
for i, (fk, label, col) in enumerate(depth_flags):
    vals = [agent_flag_rates.get(n, {}).get("rates", {}).get(fk, 0) for n in agent_names_list]
    offset = (i - 2) * width
    bars = ax.bar(x + offset, vals, width, label=label, color=col, alpha=0.85, edgecolor=NAVY)

ax.set_xticks(x)
ax.set_xticklabels([n.replace(" Agent", "") for n in agent_names_list], color=CREAM, fontsize=9)
ax.set_ylabel("% of Posts", color=CREAM)
ax.set_ylim(0, 110)
ax.tick_params(colors=CREAM)
ax.set_title("Depth-Block Utilisation by Agent (48h window)", color=CREAM, fontsize=11, fontweight="bold", pad=10)
for spine in ax.spines.values():
    spine.set_edgecolor(MGRAY)
ax.axhline(15, color=AMBER, linewidth=0.8, linestyle="--", alpha=0.6)
ax.text(len(agent_names_list) - 0.3, 16, "15% target", color=AMBER, fontsize=8)
ax.legend(loc="upper right", facecolor=NAVY, labelcolor=CREAM, fontsize=8, framealpha=0.5)
plt.tight_layout()
fig.savefig(charts_dir / "depth_utilisation_by_agent.png", dpi=150, bbox_inches="tight", facecolor=NAVY)
plt.close(fig)

# ─────────────────────────────────────────────────────────────
# CHART 4 — Synthesis vs Forum: depth flags comparison
# ─────────────────────────────────────────────────────────────
synth_posts = [p for p in top_posts if is_synthesis(p)]
forum_posts  = [p for p in top_posts if not is_synthesis(p)]
s_n = len(synth_posts) or 1
f_n = len(forum_posts) or 1

compare_flags = [
    ("stored_stat_cited", "Stored stat cited"),
    ("no_stored_stat_cited", "No stored stat"),
    ("verified_metric_cited", "Verified metric"),
    ("data_anchor_present", "Data anchor present"),
    ("conviction_condition_present", "Conviction present"),
]
s_vals = [sum(1 for p in synth_posts if fk in extract_flags(p)) / s_n * 100 for fk, _ in compare_flags]
f_vals = [sum(1 for p in forum_posts if fk in extract_flags(p)) / f_n * 100 for fk, _ in compare_flags]
labels = [lbl for _, lbl in compare_flags]

x = np.arange(len(labels))
fig, ax = plt.subplots(figsize=(10, 4.5), facecolor=NAVY)
ax.set_facecolor(NAVY)
ax.bar(x - 0.2, s_vals, 0.38, label=f"Synthesis (n={len(synth_posts)})", color=TEAL, alpha=0.85, edgecolor=NAVY)
ax.bar(x + 0.2, f_vals, 0.38, label=f"Forum (n={len(forum_posts)})", color=AMBER, alpha=0.85, edgecolor=NAVY)
ax.set_xticks(x)
ax.set_xticklabels(labels, color=CREAM, fontsize=9)
ax.set_ylabel("% of Posts", color=CREAM)
ax.set_ylim(0, 110)
ax.tick_params(colors=CREAM)
ax.set_title("Depth Flags: Synthesis vs Forum Mode", color=CREAM, fontsize=11, fontweight="bold", pad=10)
for spine in ax.spines.values():
    spine.set_edgecolor(MGRAY)
ax.legend(facecolor=NAVY, labelcolor=CREAM, fontsize=9)
plt.tight_layout()
fig.savefig(charts_dir / "depth_synthesis_vs_forum.png", dpi=150, bbox_inches="tight", facecolor=NAVY)
plt.close(fig)

# ─────────────────────────────────────────────────────────────
# CHART 5 — Reasoning scope gap (expected vs actual)
# ─────────────────────────────────────────────────────────────
# Expected: these blocks should fire for most posts IF the system is working
gap_data = [
    ("Verified Metrics\n(should: ~80%)", 80, global_rates.get("verified_metric_cited", 0)),
    ("Data Anchor\n(should: ~70%)", 70, global_rates.get("data_anchor_present", 0)),
    ("Stored/Historical\n(should: ~40%)", 40, global_rates.get("stored_stat_cited", 0)),
    ("Conviction\n(should: ~60%)", 60, global_rates.get("conviction_condition_present", 0)),
]
labels_g = [d[0] for d in gap_data]
expected = [d[1] for d in gap_data]
actual   = [d[2] for d in gap_data]
x = np.arange(len(labels_g))

fig, ax = plt.subplots(figsize=(9, 4.5), facecolor=NAVY)
ax.set_facecolor(NAVY)
ax.bar(x, expected, 0.45, label="Expected (design intent)", color=MGRAY, alpha=0.5, edgecolor=NAVY)
bars = ax.bar(x, actual, 0.45, label="Actual (48h observed)", color=[GREEN if a >= e*0.7 else RED for a, e in zip(actual, expected)], alpha=0.9, edgecolor=NAVY)
for bar, val in zip(bars, actual):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
            f"{val:.0f}%", ha="center", va="bottom", color=CREAM, fontsize=10, fontweight="bold")
ax.set_xticks(x)
ax.set_xticklabels(labels_g, color=CREAM, fontsize=9)
ax.set_ylabel("% of Posts", color=CREAM)
ax.set_ylim(0, 110)
ax.tick_params(colors=CREAM)
ax.set_title("Reasoning Scope Gap: Design Intent vs Observed", color=CREAM, fontsize=11, fontweight="bold", pad=10)
for spine in ax.spines.values():
    spine.set_edgecolor(MGRAY)
ax.legend(facecolor=NAVY, labelcolor=CREAM, fontsize=9)
plt.tight_layout()
fig.savefig(charts_dir / "reasoning_scope_gap.png", dpi=150, bbox_inches="tight", facecolor=NAVY)
plt.close(fig)

print("Generated 5 charts")

# ─────────────────────────────────────────────────────────────
# PDF STYLES
# ─────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()
S = lambda name, **kw: ParagraphStyle(name, **kw)

style_body    = S("body",    fontName="Helvetica",       fontSize=8,  leading=12, textColor=colors.HexColor(CREAM), spaceAfter=4)
style_small   = S("small",   fontName="Helvetica",       fontSize=7,  leading=10, textColor=colors.HexColor(LGRAY), spaceAfter=2)
style_h1      = S("h1",      fontName="Helvetica-Bold",  fontSize=15, leading=18, textColor=colors.HexColor(AMBER), spaceAfter=8, spaceBefore=6)
style_h2      = S("h2",      fontName="Helvetica-Bold",  fontSize=11, leading=14, textColor=colors.HexColor(AMBER), spaceAfter=6, spaceBefore=10)
style_h3      = S("h3",      fontName="Helvetica-Bold",  fontSize=9,  leading=12, textColor=colors.HexColor(CREAM), spaceAfter=4, spaceBefore=6)
style_code    = S("code",    fontName="Courier",         fontSize=7,  leading=10, textColor=colors.HexColor(TEAL),  spaceAfter=3)
style_verdict = S("verdict", fontName="Helvetica-Bold",  fontSize=10, leading=14, textColor=colors.HexColor(AMBER), spaceAfter=4, alignment=TA_CENTER)
style_label   = S("label",   fontName="Helvetica-Bold",  fontSize=7,  leading=10, textColor=colors.HexColor(AMBER), spaceAfter=2)

BG   = colors.HexColor(NAVY)
AMB  = colors.HexColor(AMBER)
GRN  = colors.HexColor(GREEN)
RD   = colors.HexColor(RED)
TL   = colors.HexColor(TEAL)
CR   = colors.HexColor(CREAM)
MG   = colors.HexColor(MGRAY)
LG   = colors.HexColor(LGRAY)

def make_table(data, col_widths, row_colors=None, header=True):
    t = Table(data, colWidths=col_widths, repeatRows=1 if header else 0)
    base = [
        ("BACKGROUND",  (0,0), (-1, 0 if header else -1), AMB if header else BG),
        ("TEXTCOLOR",   (0,0), (-1, 0 if header else -1), BG if header else CR),
        ("FONTNAME",    (0,0), (-1, 0 if header else -1), "Helvetica-Bold" if header else "Helvetica"),
        ("FONTSIZE",    (0,0), (-1,-1), 7),
        ("LEADING",     (0,0), (-1,-1), 9),
        ("ROWBACKGROUNDS", (0, 1 if header else 0), (-1,-1), [colors.HexColor("#122338"), colors.HexColor("#0D1B2A")]),
        ("TEXTCOLOR",   (0, 1 if header else 0), (-1,-1), CR),
        ("GRID",        (0,0), (-1,-1), 0.3, MG),
        ("LEFTPADDING", (0,0), (-1,-1), 4),
        ("RIGHTPADDING",(0,0), (-1,-1), 4),
        ("TOPPADDING",  (0,0), (-1,-1), 3),
        ("BOTTOMPADDING",(0,0),(-1,-1), 3),
    ]
    if row_colors:
        for row_idx, col_idx, col in row_colors:
            base.append(("TEXTCOLOR", (col_idx, row_idx), (col_idx, row_idx), col))
            base.append(("FONTNAME",  (col_idx, row_idx), (col_idx, row_idx), "Helvetica-Bold"))
    t.setStyle(TableStyle(base))
    return t

def img(path, width=160*mm, height=None):
    from reportlab.platypus import Image as RLImage
    im = RLImage(str(path), width=width, height=height or width*0.5)
    return im

# ─────────────────────────────────────────────────────────────
# PDF ASSEMBLY
# ─────────────────────────────────────────────────────────────
pdf_path = out_dir / "post_anatomy_report.pdf"
PAGE_W, PAGE_H = A4
MARGIN = 18*mm
CONTENT_W = PAGE_W - 2*MARGIN

def make_header(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BG)
    canvas.rect(0, PAGE_H - 20*mm, PAGE_W, 20*mm, fill=1, stroke=0)
    canvas.setFillColor(AMB)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(MARGIN, PAGE_H - 12*mm, "MARKET ROOM — POST ANATOMY REPORT")
    canvas.setFillColor(CR)
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 12*mm, f"{TODAY}  |  page {doc.page}")
    canvas.setStrokeColor(AMB)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, PAGE_H - 20*mm, PAGE_W - MARGIN, PAGE_H - 20*mm)
    canvas.restoreState()

def make_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(MG)
    canvas.setLineWidth(0.3)
    canvas.line(MARGIN, 14*mm, PAGE_W - MARGIN, 14*mm)
    canvas.setFillColor(LG)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(MARGIN, 9*mm, "Market Room — Confidential | Post Anatomy Report")
    canvas.restoreState()

def on_page(canvas, doc):
    make_header(canvas, doc)
    make_footer(canvas, doc)

doc = BaseDocTemplate(
    str(pdf_path), pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=22*mm, bottomMargin=18*mm,
)
frame = Frame(MARGIN, 18*mm, CONTENT_W, PAGE_H - 40*mm, id="main")
doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=on_page)])

story = []
sp = lambda h=4: Spacer(1, h*mm)
P = lambda text, style=style_body: Paragraph(text, style)

# ══════════════════════════════════════════════════════════════
# COVER
# ══════════════════════════════════════════════════════════════
story += [
    sp(8),
    P("POST ANATOMY REPORT", style_h1),
    P("What generates each section of a Market Room agent post — and why agents may have limited reasoning scope.", style_body),
    sp(2),
    P(f"Data window: last 48 hours (as of {TODAY})  ·  Posts analysed: {len(top_posts)}", style_small),
    sp(4),
]

# Key stats box
ks_data = [
    ["Metric", "Value"],
    ["Posts analysed (48h)", str(len(top_posts))],
    ["Agents active", str(len(agents))],
    ["Prompt blocks mapped", "32"],
    ["Always-fires blocks", str(always_count)],
    ["Conditional blocks", str(cond_count)],
    ["Data-Grounding blocks (Tier A)", str(tier_counts["A\nData-Grounding"])],
    ["Stored stat cited (global)", f"{global_rates.get('stored_stat_cited', 0):.0f}%"],
    ["No stored stat (global)", f"{global_rates.get('no_stored_stat_cited', 0):.0f}%"],
    ["Verified metric cited", f"{global_rates.get('verified_metric_cited', 0):.0f}%"],
    ["Conviction condition", f"{global_rates.get('conviction_condition_present', 0):.0f}%"],
]
story.append(make_table(ks_data, [80*mm, 90*mm]))
story.append(sp(4))

# ══════════════════════════════════════════════════════════════
# SECTION 1 — Two-Pass Generation Pipeline
# ══════════════════════════════════════════════════════════════
story += [
    PageBreak(),
    P("1. The Two-Pass Generation Pipeline", style_h2),
    P("Every agent post — synthesis or forum mode — goes through two sequential LLM calls before any text is published.", style_body),
    sp(2),
]

pipeline_text = [
    ["Pass", "Purpose", "Temp", "Max tokens", "Output"],
    ["Pass 1\nCrystallisation", "Agent forms a crisp directional view\nbefore writing prose", "0.3\n(low — precise)", "600", "2-sentence directional\nview statement"],
    ["Pass 2\nFull Post", "Agent writes the full post anchored\nto the crystallised view", "0.72 forum\n0.60 synthesis", "~450", "Final post text\n(trimmed to 120 words)"],
]
story.append(make_table(pipeline_text, [30*mm, 65*mm, 28*mm, 25*mm, 32*mm]))
story.append(sp(3))
story += [
    P("Model: <font color='#00796B'>gemma-4-31b-it</font> (Gemini) or <font color='#00796B'>o4-mini</font> (OpenAI) — determined by env.OPENAI_API_KEY priority.", style_body),
    P("Prompt structure: system <b>instructions</b> (agent identity + rules) + user <b>prompt</b> (all 32 data blocks below).", style_body),
    P("Word cap: <font color='#D4A843'>trimToWordLimit(output, 120)</font> — hard ceiling on all top-level posts.", style_body),
    sp(3),
    P("Why two passes?", style_h3),
    P("Pass 1 at low temperature forces the agent to commit to a direction before prose generation begins. "
      "Without it, agents drift — writing around a thesis rather than from one. "
      "The crystallised view is injected as the first instruction in Pass 2.", style_body),
]

# ══════════════════════════════════════════════════════════════
# SECTION 2 — Complete Block Inventory
# ══════════════════════════════════════════════════════════════
story += [
    PageBreak(),
    P("2. Complete Prompt Block Inventory (all 32 blocks)", style_h2),
    P("Every block injected into the Pass 2 prompt, in assembly order. Tier A = provides data/numbers. "
      "Tier B = structural framing. Tier C = conditional and often empty.", style_body),
    sp(2),
]

tier_colors = {"A": GRN, "B": AMB, "C": RD}
block_header = ["#", "Block Name", "File : Function", "Data Source", "Mode", "Fires", "Tier"]
block_rows   = [block_header]
row_color_overrides = []
for i, b in enumerate(BLOCKS):
    row_idx = i + 1
    tier_col = tier_colors.get(b[6], CR)
    block_rows.append([
        str(b[0]), b[1], b[2], b[3], b[4], b[5], b[6]
    ])
    row_color_overrides.append((row_idx, 6, tier_col))  # colour the Tier column (col index 6)

story.append(make_table(block_rows, [8*mm, 38*mm, 48*mm, 40*mm, 18*mm, 20*mm, 8*mm],
                        row_colors=row_color_overrides))
story += [
    sp(3),
    P("<b>Tier key:</b> <font color='#4CAF50'>A = Data-Grounding</font>  "
      "<font color='#D4A843'>B = Structural Framing</font>  "
      "<font color='#E53935'>C = Empty-Risk (conditional, often fires empty)</font>", style_small),
]

# ══════════════════════════════════════════════════════════════
# SECTION 3 — Reasoning Depth Classification
# ══════════════════════════════════════════════════════════════
story += [
    PageBreak(),
    P("3. Reasoning Depth Classification", style_h2),
    P("Not all blocks contribute equally to an agent's ability to reason with data. "
      "The three tiers below show which blocks drive depth vs which provide scaffolding.", style_body),
    sp(3),
]

story.append(img(charts_dir / "block_tier_pie.png", width=100*mm))
story.append(sp(3))
story.append(img(charts_dir / "always_vs_conditional.png", width=90*mm))
story.append(sp(4))

tier_detail = [
    ["Tier", "What it provides", "Key blocks", "Always fires?"],
    ["A\nData-Grounding", "Actual numbers, historical patterns,\nstored correlations, live metrics",
     "Verified Market Metrics (18)\nHistorical Data Context (29)\nAnalog Block (30)\nKnowledge Snippets (31)\nAnalog Cases (32)",
     "Verified Metrics: YES\nOthers: NO (conditional)"],
    ["B\nStructural\nFraming", "Format rules, reasoning structure,\nanti-template guardrails",
     "Shared Post Spec (8)\nTransmission Chain (24)\nDynamic Memory (25)\nPeer Desk Views (26)",
     "All: YES (always)"],
    ["C\nEmpty-Risk", "Conditionally deep — but fires\nempty for most catalysts",
     "Historical Data Context (29)\nAnalog Block (30)\nKnowledge Snippets (31)\nSynthesis Anchor (6)\nPrior View (19)",
     "All: NO (conditional)"],
]
story.append(make_table(tier_detail, [15*mm, 52*mm, 60*mm, 45*mm]))

# ══════════════════════════════════════════════════════════════
# SECTION 4 — Empirical Block Utilisation
# ══════════════════════════════════════════════════════════════
story += [
    PageBreak(),
    P("4. Empirical Block Utilisation (48h Posts)", style_h2),
    P("Derived from quality flags in posting_decision_json. Shows which depth-providing blocks actually fired vs which were absent.", style_body),
    sp(2),
]
story.append(img(charts_dir / "depth_utilisation_by_agent.png", width=CONTENT_W))
story.append(sp(3))
story.append(img(charts_dir / "depth_synthesis_vs_forum.png", width=CONTENT_W))
story.append(sp(3))

# Per-agent table
util_header = ["Agent", "Posts", "Stored stat\ncited %", "No stored\nstat %", "Verified\nmetric %", "Data anchor\npresent %", "Conviction\npresent %"]
util_rows   = [util_header]
util_colors = []
for i, ag in enumerate(agents):
    aname = ag.get("name", ag["id"])
    r = agent_flag_rates.get(aname, {})
    n = r.get("n", 0)
    rates = r.get("rates", {})
    row = [
        aname,
        str(n),
        f"{rates.get('stored_stat_cited', 0):.0f}%",
        f"{rates.get('no_stored_stat_cited', 0):.0f}%",
        f"{rates.get('verified_metric_cited', 0):.0f}%",
        f"{rates.get('data_anchor_present', 0):.0f}%",
        f"{rates.get('conviction_condition_present', 0):.0f}%",
    ]
    util_rows.append(row)
    ri = i + 1
    # Colour stored_stat_cited col (col 2)
    ssc = rates.get("stored_stat_cited", 0)
    col = GRN if ssc >= 15 else (AMB if ssc >= 5 else RD)
    util_colors.append((ri, 2, col))
    # Colour no_stored_stat col (col 3)
    nss = rates.get("no_stored_stat_cited", 0)
    col3 = RD if nss >= 40 else (AMB if nss >= 20 else GRN)
    util_colors.append((ri, 3, col3))

story.append(make_table(util_rows, [40*mm, 16*mm, 24*mm, 22*mm, 22*mm, 24*mm, 22*mm], row_colors=util_colors))

# ══════════════════════════════════════════════════════════════
# SECTION 5 — The Limited-Scope Diagnosis
# ══════════════════════════════════════════════════════════════
story += [
    PageBreak(),
    P("5. Why Agents Have Limited Reasoning Scope", style_h2),
    P("The gap between what the system was designed to inject and what actually fires:", style_body),
    sp(2),
]
story.append(img(charts_dir / "reasoning_scope_gap.png", width=CONTENT_W))
story.append(sp(3))

root_causes = [
    ["Root cause", "Affected block", "Code location", "When it fires empty"],
    ["Historical context\npattern-match too narrow",
     "Block 29\nHistorical Data Context",
     "historicalDataContextService.ts\nbuildMarketRoomHistoricalContext()",
     "Headline does not match ~8 keyword\nfamilies (oil, inflation, FX, rates…).\nAbstract macro headlines → empty string."],
    ["Knowledge snippets\nrequire keyword overlap",
     "Block 31\nKnowledge Snippets",
     "knowledgeSnippetService.ts\nfindRelevantKnowledgeSnippets()",
     "Keyword scoring: meta=3, content=2,\nsector=1. Thin knowledge store or\nnon-matching headline → 0 results."],
    ["Analog block needs\nextractable indicator",
     "Block 30\nAnalog Block",
     "historicalDataContextService.ts\nbuildAnalogContextBlock()",
     "Needs a numeric signal value to\nmatch historical periods. Abstract\nheadlines yield no indicator → empty."],
    ["Dynamic memory thin\nwithout active theses",
     "Block 25\nDynamic Memory",
     "dynamicMemoryService.ts\nbuildHouseView()",
     "Falls back to 'No current house view'\nif agent has no active theses. New\nagents or post-reset agents get nothing."],
    ["Synthesis anchor silent\nif no theme matched",
     "Block 6\nSynthesis Anchor",
     "marketRoomService.ts\nselectSynthesisAnchorForAgent()",
     "Agent stays silent for synthesis\nrather than posting with a weak\nanchor — but reduces post volume."],
]
story.append(make_table(root_causes, [38*mm, 28*mm, 44*mm, 62*mm]))

# ══════════════════════════════════════════════════════════════
# SECTION 6 — Synthesis vs Forum Block Differences
# ══════════════════════════════════════════════════════════════
story += [
    PageBreak(),
    P("6. Synthesis vs Forum — Block Differences", style_h2),
    P("The two modes share most blocks but differ in the 'anchor' layer that drives the post topic.", style_body),
    sp(2),
]

mode_diff = [
    ["Block", "Synthesis only", "Forum only", "Both modes"],
    ["Primary topic driver",         "Synthesis Anchor (6)\n24H Theme Digest (7)\nCross-Asset Deltas (13)",
                                     "Primary Headline Block (5)\nCatalyst Discipline Guard (17)",
                                     "—"],
    ["Transmission chain",           "MANDATORY\n(must trace mechanism)",
                                     "ENCOURAGED\n(strong suggestion, not rule)",
                                     "—"],
    ["Data depth blocks",            "—", "—",
                                     "Verified Metrics (18)\nHistorical Context (29)\nAnalog Block (30)\nKnowledge Snippets (31)"],
    ["Memory + peer context",        "—", "—",
                                     "Dynamic Memory (25)\nPeer Desk Views (26)\nAgent Behavioral State (27)"],
    ["Room awareness",               "Synthesis Repetition Challenge",
                                     "Room Consensus Block (23)",
                                     "Room Coverage State (28)"],
    ["Temperature (Pass 2)",         "0.60 (tighter — data-driven)",
                                     "0.72 (more creative range)",
                                     "—"],
]
story.append(make_table(mode_diff, [30*mm, 50*mm, 50*mm, 48*mm]))
story += [
    sp(3),
    P("Key insight: Both modes get the same Tier A data-grounding blocks. "
      "The difference is the topic anchor — synthesis locks to a pre-curated theme while forum reacts to the live headline. "
      "If agents show limited scope in synthesis, the problem is in blocks 29-31 not firing, "
      "not the synthesis anchor itself.", style_body),
]

# ══════════════════════════════════════════════════════════════
# SECTION 7 — Per-Agent Detail Table
# ══════════════════════════════════════════════════════════════
story += [
    PageBreak(),
    P("7. Per-Agent Utilisation — Full Detail (48h)", style_h2),
    sp(2),
]

full_header = ["Agent", "N", "stored\ncited%", "no_stored%", "verified\nmetric%", "data\nanchor%", "conviction\npresent%", "anchor\nmatch%", "thesis\nmatch%"]
full_rows = [full_header]
full_colors = []
for i, ag in enumerate(agents):
    aname = ag.get("name", ag["id"])
    r = agent_flag_rates.get(aname, {})
    n = r.get("n", 0)
    rates = r.get("rates", {})
    ap = [p for p in top_posts if p.get("agent_id") == ag["id"]]
    # anchor match = posts where NOT anchor_mismatch
    mismatch = sum(1 for p in ap if "anchor_mismatch" in extract_flags(p))
    anchor_match = round((1 - mismatch / max(len(ap), 1)) * 100, 0)
    # thesis match = posts with thesis_id set
    thesis_match = round(sum(1 for p in ap if p.get("thesis_id")) / max(len(ap), 1) * 100, 0)
    row = [
        aname, str(n),
        f"{rates.get('stored_stat_cited', 0):.0f}%",
        f"{rates.get('no_stored_stat_cited', 0):.0f}%",
        f"{rates.get('verified_metric_cited', 0):.0f}%",
        f"{rates.get('data_anchor_present', 0):.0f}%",
        f"{rates.get('conviction_condition_present', 0):.0f}%",
        f"{anchor_match:.0f}%",
        f"{thesis_match:.0f}%",
    ]
    full_rows.append(row)
    ri = i + 1
    ssc = rates.get("stored_stat_cited", 0)
    full_colors.append((ri, 2, GRN if ssc >= 15 else (AMB if ssc >= 5 else RD)))
    nss = rates.get("no_stored_stat_cited", 0)
    full_colors.append((ri, 3, RD if nss >= 40 else (AMB if nss >= 20 else GRN)))

story.append(make_table(full_rows,
    [38*mm, 10*mm, 18*mm, 18*mm, 18*mm, 16*mm, 20*mm, 16*mm, 16*mm],
    row_colors=full_colors))

# ══════════════════════════════════════════════════════════════
# SECTION 8 — Code Quickref
# ══════════════════════════════════════════════════════════════
story += [
    PageBreak(),
    P("8. Code Quickref — Block → File → Function", style_h2),
    P("For developers. The exact function responsible for each depth-providing block.", style_body),
    sp(2),
]

qr_header = ["Block", "File", "Function / Key variable"]
qr_rows   = [qr_header]
for b in BLOCKS:
    if b[6] in ("A", "C"):  # only Tier A and C (depth + conditional)
        qr_rows.append([f"#{b[0]} {b[1]}", b[2].split(":")[0], b[2].split(":")[-1]])

story.append(make_table(qr_rows, [48*mm, 60*mm, 70*mm]))

# ══════════════════════════════════════════════════════════════
# SECTION 9 — Recommendations
# ══════════════════════════════════════════════════════════════
story += [
    PageBreak(),
    P("9. Recommendations — Expanding Reasoning Scope", style_h2),
    P("Four targeted changes to widen the scope of data-grounding blocks without breaking existing logic:", style_body),
    sp(3),
]

recs = [
    ["Priority", "Fix", "Affected block", "Expected impact", "Risk"],
    ["P0\nHigh",
     "Broaden historical context keyword patterns\n"
     "historicalDataContextService.ts currently checks ~8 families.\n"
     "Add: earnings/equity, geopolitical, credit/spread, housing, PMI.\n"
     "Result: more posts get FRED correlations injected.",
     "Block 29\nHistorical Data\nContext",
     "stored_stat_cited rate\nrises across all agents",
     "Low — additive only,\nexisting logic unchanged"],
    ["P1\nHigh",
     "Expand knowledge store per agent\n"
     "Low snippet retrieval (especially Risk/Sentiment: 0%)\n"
     "indicates thin knowledge store or keyword mismatch.\n"
     "Upload more sector-specific knowledge tagged to each agent.",
     "Block 31\nKnowledge\nSnippets",
     "stored_stat_cited improves\nfor worst agents",
     "None — admin action,\nno code change"],
    ["P1\nMedium",
     "Fall back to sector-level analog when no indicator extracted\n"
     "buildAnalogContextBlock() returns empty for abstract headlines.\n"
     "Add a sector-default analog (e.g. 'equity regime' for Equities)\n"
     "when specific indicator extraction fails.",
     "Block 30\nAnalog Block",
     "More posts get historical\ncontext; analog block fires\nmore consistently",
     "Low — fallback only,\nprimary path unchanged"],
    ["P2\nMedium",
     "Bootstrap dynamic memory from last-closed thesis\n"
     "Agents with no active theses get 'No current house view'.\n"
     "Include last-closed thesis as fallback so new/reset agents\n"
     "still have a directional memory anchor.",
     "Block 25\nDynamic\nMemory",
     "New agents reason from\nown history not cold start",
     "Low — fallback only;\nactive thesis path unchanged"],
]
story.append(make_table(recs, [18*mm, 68*mm, 28*mm, 38*mm, 26*mm]))

story += [
    sp(4),
    P("Bottom line", style_h3),
    P("The system already has 32 blocks injected into every post prompt. "
      "The Tier A data-grounding blocks are all built and wired — the gap is that "
      "<b>blocks 29, 30, and 31 are conditional and often fire empty</b>. "
      "Fixing block 29's trigger patterns and uploading more knowledge (block 31) "
      "are the highest-leverage changes with the lowest risk. "
      "No LLM behaviour changes needed — the data just needs to reach the prompt.", style_body),
]

# ─────────────────────────────────────────────────────────────
# BUILD PDF
# ─────────────────────────────────────────────────────────────
doc.build(story)
print(f"\n✓ PDF  → {pdf_path}")
print(f"✓ Charts → {charts_dir}")

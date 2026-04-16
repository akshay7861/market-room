import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import type {
  LiveMarketView,
  MarketQuestionThread,
  MarketQuestionThreadView,
  MarketQuestionsView,
  MarketSnapshotPayload,
  SnapshotHeadline,
  SnapshotInstrument
} from "@market-room/shared";
import { FeedbackPanel } from "../components/FeedbackPanel";
import { RichText } from "../components/RichText";
import {
  createMarketQuestion,
  fetchLiveMarket,
  fetchMarketQuestionThread,
  fetchMarketQuestions,
  replyToMarketQuestion
} from "../lib/api";
import { formatDisplayNumberText } from "../lib/formatting";

type StarterQuestionKind = "rates" | "oil" | "equities";

export function MarketQuestionsPage() {
  const [marketQuestions, setMarketQuestions] = useState<MarketQuestionsView | null>(null);
  const [liveMarket, setLiveMarket] = useState<LiveMarketView | null>(null);
  const [selectedThread, setSelectedThread] = useState<MarketQuestionThreadView | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [isMobileThreadOpen, setIsMobileThreadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadQuestions();
    void loadLivePromptContext();
  }, []);

  useEffect(() => {
    function handlePopState(event: PopStateEvent) {
      if (window.location.pathname === "/ask-market") {
        setIsMobileThreadOpen(Boolean(event.state?.askMarketThreadOpen));
      }
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  function openMobileThreadView() {
    setIsMobileThreadOpen(true);

    if (!isPhoneLayout() || window.history.state?.askMarketThreadOpen) {
      return;
    }

    window.history.pushState(
      { ...(window.history.state || {}), askMarketThreadOpen: true },
      "",
      window.location.href
    );
  }

  function closeMobileThreadView() {
    if (isPhoneLayout() && window.history.state?.askMarketThreadOpen) {
      window.history.back();
      return;
    }

    setIsMobileThreadOpen(false);
  }

  async function loadQuestions(preferredThreadId?: string | null) {
    try {
      setIsLoading(true);
      setError(null);
      const nextQuestions = await fetchMarketQuestions();
      setMarketQuestions(nextQuestions);

      const nextSelectedThreadId = preferredThreadId || selectedThreadId || nextQuestions.threads[0]?.id || null;
      setSelectedThreadId(nextSelectedThreadId);

      if (nextSelectedThreadId) {
        const nextThread = await fetchMarketQuestionThread(nextSelectedThreadId);
        setSelectedThread(nextThread);
      } else {
        setSelectedThread(null);
      }
    } catch {
      setError("Could not load market question threads.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadLivePromptContext() {
    try {
      const nextLiveMarket = await fetchLiveMarket();
      setLiveMarket(nextLiveMarket);
    } catch {
      // Prompt chips still work with fallback templates if the live board is temporarily unavailable.
    }
  }

  async function handleCreateThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = newQuestion.trim();

    if (!question) {
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      const threadView = await createMarketQuestion(question);
      setNewQuestion("");
      setStatusMessage(`Opened a new thread with ${threadView.thread.assignedAgentName}.`);
      openMobileThreadView();
      await loadQuestions(threadView.thread.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not start the market question thread.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSelectThread(thread: MarketQuestionThread) {
    try {
      setError(null);
      setSelectedThreadId(thread.id);
      const threadView = await fetchMarketQuestionThread(thread.id);
      setSelectedThread(threadView);
      openMobileThreadView();
    } catch {
      setError("Could not load that thread.");
    }
  }

  function handleThreadKeyDown(event: KeyboardEvent<HTMLElement>, thread: MarketQuestionThread) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    void handleSelectThread(thread);
  }

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedThreadId) {
      return;
    }

    const question = followUpQuestion.trim();

    if (!question) {
      return;
    }

    try {
      setIsReplying(true);
      setError(null);
      const threadView = await replyToMarketQuestion(selectedThreadId, question);
      setFollowUpQuestion("");
      setSelectedThread(threadView);
      setStatusMessage(`Updated the thread with ${threadView.thread.assignedAgentName}.`);
      const nextQuestions = await fetchMarketQuestions();
      setMarketQuestions(nextQuestions);
    } catch (replyError) {
      setError(replyError instanceof Error ? replyError.message : "Could not send the follow-up question.");
    } finally {
      setIsReplying(false);
    }
  }

  if (isLoading) {
    return (
      <FeedbackPanel
        title="Loading market questions"
        description="Fetching the latest user questions and assigned specialist threads."
      />
    );
  }

  const activeAgents = marketQuestions?.activeAgents || [];
  const threads = marketQuestions?.threads || [];
  const liveSnapshot = parseSnapshotPayload(liveMarket?.latestSnapshot?.payloadJson || null);
  const starterQuestionCards = buildStarterQuestionCards(liveSnapshot);
  const selectedAgentLabel = selectedThread
    ? participantTrailFromThreadView(selectedThread) || `${selectedThread.thread.assignedAgentName} / ${selectedThread.thread.assignedAgentSector}`
    : "Auto-routed";

  return (
    <div className="ask-market-page stack-lg">
      <section className="ask-market-hero">
        <div>
          <p className="eyebrow">Human-to-agent market threads</p>
          <h2>Ask the room without briefing the room.</h2>
          <p>
            Your question is routed to the specialist most likely to understand the market mechanism. The agent answers from live state, approved knowledge, and rolling memory instead of treating your wording as truth.
          </p>
        </div>
        <div className="ask-market-hero__stats" aria-label="Ask Market status">
          <div>
            <span>{threads.length}</span>
            <strong>saved threads</strong>
          </div>
          <div>
            <span>{activeAgents.length}</span>
            <strong>specialists</strong>
          </div>
          <div>
            <span>{selectedAgentLabel}</span>
            <strong>current route</strong>
          </div>
        </div>
      </section>

      {error ? <FeedbackPanel title="Something went wrong" description={error} tone="error" /> : null}
      {statusMessage ? <FeedbackPanel title="Thread updated" description={statusMessage} /> : null}

      <section className="panel stack-md ask-market-compose">
        <div className="section-heading">
          <p className="eyebrow">New market question</p>
          <h2>Start with a messy market thought.</h2>
          <p className="muted">
            The router decides who should answer, then the specialist separates signal from framing error.
          </p>
        </div>

        <div className="ask-market-prompt-strip" aria-label="Example market questions">
          {starterQuestionCards.map((question) => (
            <button
              key={question.label}
              type="button"
              onClick={() => setNewQuestion(generateLiveStarterQuestion(question.kind, liveSnapshot))}
            >
              <span>{question.label}</span>
              {question.short}
            </button>
          ))}
        </div>

        <form className="stack-md" onSubmit={handleCreateThread}>
          <label className="field">
            <span>Your market question</span>
            <textarea
              rows={4}
              placeholder="Example: Are bank stocks telling us the rate selloff is becoming a real growth problem, or is this still just a duration tantrum?"
              value={newQuestion}
              onChange={(event) => setNewQuestion(event.target.value)}
            />
          </label>
          <div className="market-question-actions">
            <button className="button button-primary" type="submit" disabled={isCreating}>
              {isCreating ? "Opening thread..." : "Ask the market"}
            </button>
            <p className="muted">
              {activeAgents.length} active specialists available:
              {" "}
              {activeAgents.map((agent) => agent.name).join(", ")}
            </p>
          </div>
        </form>
      </section>

      <div className={isMobileThreadOpen ? "market-questions-layout is-thread-open" : "market-questions-layout"}>
        <aside className="panel stack-md market-question-archive-panel ask-market-archive">
          <div className="section-heading">
            <p className="eyebrow">Saved threads</p>
            <h2>Question archive</h2>
          </div>

          {threads.length === 0 ? (
            <p className="muted">No market questions yet. Start the first thread above.</p>
          ) : (
            <div className="market-question-thread-list">
              {threads.map((thread) => (
                <article
                  key={thread.id}
                  className={thread.id === selectedThreadId ? "market-question-thread is-active" : "market-question-thread"}
                  role="button"
                  tabIndex={0}
                  onClick={() => void handleSelectThread(thread)}
                  onKeyDown={(event) => handleThreadKeyDown(event, thread)}
                >
                  {(() => {
                    const participantTrail = participantTrailFromThread(thread);
                    const isMultiAgent = participantTrail.includes("→");

                    return (
                      <>
                  <div className="market-question-thread__header">
                    <div>
                      <p className="eyebrow">{isMultiAgent ? "Multi-agent thread" : thread.assignedAgentSector}</p>
                      <h3>{thread.title}</h3>
                    </div>
                    <span className="badge badge--muted">{thread.assignedAgentName}</span>
                  </div>
                  <div className={isMultiAgent ? "thread-participant-trail is-multi" : "thread-participant-trail"}>
                    <span>Participants</span>
                    <strong>{participantTrail}</strong>
                  </div>
                  {thread.lastMessagePreview ? (
                    <p className="muted market-question-thread__preview">
                      {truncatePreview(thread.lastMessagePreview, 118)}
                    </p>
                  ) : null}
                  <div className="market-question-thread__footer">
                    <p className="timestamp">{formatTime(thread.updatedAt)}</p>
                    <button
                      type="button"
                      className="market-question-thread__more"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleSelectThread(thread);
                      }}
                    >
                      Show more
                    </button>
                  </div>
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>
          )}
        </aside>

        <section className="panel stack-md market-question-detail-panel ask-market-detail">
          <button type="button" className="mobile-thread-back" onClick={closeMobileThreadView}>
            Back to question archive
          </button>

          {selectedThread ? (
            <>
              {(() => {
                const participantTrail = participantTrailFromThreadView(selectedThread);
                const isMultiAgent = participantTrail.includes("→");

                return (
                  <>
              <div className="market-question-thread-detail__header">
                <div>
                  <p className="eyebrow">{isMultiAgent ? "Multi-agent thread" : "Assigned specialist"}</p>
                  <h2>{selectedThread.thread.title}</h2>
                  <p className="muted">
                    Current responder: {selectedThread.thread.assignedAgentName} • {selectedThread.thread.assignedAgentSector}
                  </p>
                </div>
                <span className="badge">{selectedThread.thread.status}</span>
              </div>

              <div className="ask-market-route-note">
                <span>{isMultiAgent ? "Route trail" : "Route"}</span>
                <strong>{participantTrail}</strong>
                <p>
                  {isMultiAgent
                    ? "Follow-ups can bring a new specialist into the same thread when the market question changes lane."
                    : "Answers should show mechanism, uncertainty, and what would change the view."}
                </p>
              </div>
                  </>
                );
              })()}

              <div className="market-question-message-list">
                {selectedThread.messages.map((message) => (
                  <article
                    key={message.id}
                    className={message.role === "assistant" ? "market-question-message is-agent" : "market-question-message is-user"}
                  >
                    <div className="market-question-message__header">
                      <div>
                        <p className="eyebrow">
                          {message.role === "assistant"
                            ? `${message.agentName} • ${message.agentSector}`
                            : "You"}
                        </p>
                      </div>
                      <p className="timestamp">{formatTime(message.createdAt)}</p>
                    </div>
                    <RichText className="message-card__content" content={message.content} />
                  </article>
                ))}
              </div>

              <form className="stack-md" onSubmit={handleReply}>
                <label className="field">
                  <span>Continue the thread</span>
                  <textarea
                    rows={3}
                    placeholder="Ask a follow-up, push back on the thesis, or test another angle."
                    value={followUpQuestion}
                    onChange={(event) => setFollowUpQuestion(event.target.value)}
                  />
                </label>
                <div className="market-question-actions">
                  <button className="button button-primary" type="submit" disabled={isReplying}>
                    {isReplying ? "Posting follow-up..." : `Reply to ${selectedThread.thread.assignedAgentName}`}
                  </button>
                  <p className="muted">
                    User questions shape sentiment context for the app, but the agent still grounds its answer in market data, news, and historical patterns.
                  </p>
                </div>
              </form>
            </>
          ) : (
            <FeedbackPanel
              title="Choose a thread"
              description="Open a saved question on the left or start a new one to see the specialist discussion."
            />
          )}
        </section>
      </div>
    </div>
  );
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString([], {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  });
}

function truncatePreview(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function participantTrailFromThread(thread: MarketQuestionThread): string {
  if (!thread.participantAgentSectors) {
    return thread.assignedAgentSector;
  }

  return dedupeConsecutive(thread.participantAgentSectors.split(/\s*→\s*/).filter(Boolean)).join(" → ");
}

function participantTrailFromThreadView(threadView: MarketQuestionThreadView): string {
  const sectors = threadView.messages
    .filter((message) => message.role === "assistant" && message.agentSector)
    .map((message) => message.agentSector as string);
  const uniqueSectors = dedupeConsecutive(sectors);

  if (uniqueSectors.length > 0) {
    return uniqueSectors.join(" → ");
  }

  return participantTrailFromThread(threadView.thread);
}

function dedupeConsecutive(values: string[]): string[] {
  return values.filter((value, index) => index === 0 || value !== values[index - 1]);
}

function isPhoneLayout(): boolean {
  return window.matchMedia("(max-width: 720px)").matches;
}

function parseSnapshotPayload(payloadJson: string | null): MarketSnapshotPayload | null {
  if (!payloadJson) {
    return null;
  }

  try {
    return JSON.parse(payloadJson) as MarketSnapshotPayload;
  } catch {
    return null;
  }
}

function buildStarterQuestionCards(snapshot: MarketSnapshotPayload | null): Array<{
  kind: StarterQuestionKind;
  label: string;
  short: string;
}> {
  const us10y = instrumentByKey(snapshot, "us10y");
  const wti = instrumentByKey(snapshot, "wti");
  const sp500 = instrumentByKey(snapshot, "sp500");
  const nasdaq = instrumentByKey(snapshot, "nasdaq");

  return [
    {
      kind: "rates",
      label: "Rates",
      short: us10y?.change ? `Generate from 10Y ${us10y.change}` : "Generate a live duration question"
    },
    {
      kind: "oil",
      label: "Oil",
      short: wti?.change ? `Generate from WTI ${wti.change}` : "Generate a live crude question"
    },
    {
      kind: "equities",
      label: "Equities",
      short: sp500?.change || nasdaq?.change
        ? `Generate from SPX/Nasdaq ${sp500?.change || nasdaq?.change}`
        : "Generate a live leadership question"
    }
  ];
}

function generateLiveStarterQuestion(kind: StarterQuestionKind, snapshot: MarketSnapshotPayload | null): string {
  const headline = selectHeadline(snapshot, headlineKeywordsByKind[kind]);

  if (kind === "rates") {
    const us10y = instrumentSummary(snapshot, "us10y");
    const dxy = instrumentSummary(snapshot, "dxy");
    const sp500 = instrumentSummary(snapshot, "sp500");
    const variants = [
      `Current board: ${us10y}; ${dxy}; ${sp500}. ${headlinePrompt(headline)} From a Rates perspective, is this a genuine Fed repricing / duration signal or just noisy cross-asset movement? Which part of the curve should matter most, and what false signal should I avoid?`,
      `With ${us10y} and ${dxy}, should I read today's tape as tighter financial conditions or just a temporary rates move? ${headlinePrompt(headline)} Tell me whether this deserves a new rates thesis, an update, or just a comment.`,
      `${headlinePrompt(headline)} The tape also shows ${us10y}. Is the market repricing the Fed path, term premium, or risk appetite? What would confirm the move and what would make the Rates agent stay silent?`
    ];

    return pickRandom(variants);
  }

  if (kind === "oil") {
    const wti = instrumentSummary(snapshot, "wti");
    const brent = instrumentSummary(snapshot, "brent");
    const dxy = instrumentSummary(snapshot, "dxy");
    const variants = [
      `Current board: ${wti}; ${brent}; ${dxy}. ${headlinePrompt(headline)} Is this a genuine physical oil tightness signal or a price move that needs inventory / refinery / OPEC confirmation before becoming a thesis?`,
      `${headlinePrompt(headline)} With ${wti} and ${brent}, should the Commodities agent treat this as supply risk, demand strength, or positioning noise? What would be the key false positive?`,
      `Oil question from the live tape: ${wti}; ${brent}. Is the market reacting to confirmed barrels, inventory mechanics, or just headline risk? What should I check before posting a bullish crude view?`
    ];

    return pickRandom(variants);
  }

  const sp500 = instrumentSummary(snapshot, "sp500");
  const nasdaq = instrumentSummary(snapshot, "nasdaq");
  const us10y = instrumentSummary(snapshot, "us10y");
  const variants = [
    `Current board: ${sp500}; ${nasdaq}; ${us10y}. ${headlinePrompt(headline)} Is equity leadership here a real regime signal, a duration-sensitive squeeze, or defensive crowding? Which sectors should confirm it?`,
    `${headlinePrompt(headline)} With ${sp500}, ${nasdaq}, and ${us10y}, should the Equities agent classify this as rates relief, earnings resilience, liquidity support, or fragile narrow leadership?`,
    `Equities question from the live tape: ${sp500}; ${nasdaq}. Is this broad market leadership or just mega-cap concentration? What would make this a new equity regime post versus a comment?`
  ];

  return pickRandom(variants);
}

function instrumentByKey(snapshot: MarketSnapshotPayload | null, key: string): SnapshotInstrument | null {
  return snapshot?.instruments.find((instrument) => instrument.key === key && instrument.status !== "unavailable") || null;
}

function instrumentSummary(snapshot: MarketSnapshotPayload | null, key: string): string {
  const instrument = instrumentByKey(snapshot, key);

  if (!instrument) {
    return fallbackInstrumentLabels[key] || key.toUpperCase();
  }

  return `${instrument.label} ${formatDisplayNumberText(instrument.value)}${instrument.change ? ` (${instrument.change})` : ""}`;
}

function selectHeadline(snapshot: MarketSnapshotPayload | null, keywords: string[]): SnapshotHeadline | null {
  const headlines = snapshot?.headlines || [];
  const scored = headlines
    .map((headline) => ({
      headline,
      score: keywords.reduce((total, keyword) => {
        const text = `${headline.title} ${headline.description || ""} ${(headline.entities || []).join(" ")}`.toLowerCase();
        return total + (text.includes(keyword) ? 1 : 0);
      }, 0)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  if (scored.length > 0) {
    return pickRandom(scored.slice(0, 4)).headline;
  }

  return headlines.length > 0 ? pickRandom(headlines.slice(0, 5)) : null;
}

function headlinePrompt(headline: SnapshotHeadline | null): string {
  if (!headline) {
    return "There is no single clean headline, so use the live tape rather than a generic narrative.";
  }

  return `Latest relevant headline: "${headline.title}".`;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

const headlineKeywordsByKind: Record<StarterQuestionKind, string[]> = {
  rates: ["fed", "yield", "treasury", "rate", "rates", "cpi", "inflation", "fomc", "powell"],
  oil: ["oil", "wti", "brent", "crude", "opec", "inventory", "eia", "energy", "barrel"],
  equities: ["stock", "stocks", "equity", "equities", "s&p", "nasdaq", "earnings", "tech", "sector", "margin"]
};

const fallbackInstrumentLabels: Record<string, string> = {
  sp500: "S&P 500",
  nasdaq: "Nasdaq",
  us10y: "10-year Treasury yield",
  dxy: "US dollar index",
  wti: "WTI crude",
  brent: "Brent crude"
};

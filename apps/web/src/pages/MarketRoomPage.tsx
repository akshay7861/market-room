import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { AgentDiscussionThread, MarketRoomView, MarketSnapshotPayload } from "@market-room/shared";
import { ActiveAgentList } from "../components/ActiveAgentList";
import { DiscussionFeed } from "../components/DiscussionFeed";
import { FeedbackPanel } from "../components/FeedbackPanel";
import { fetchMarketRoom, reactToMessage } from "../lib/api";

const MARKET_ROOM_THREAD_PAGE_SIZE = 18;
const MARKET_ROOM_SCROLL_THRESHOLD_PX = 220;

export function MarketRoomPage() {
  const [marketRoom, setMarketRoom] = useState<MarketRoomView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMoreThreads, setIsLoadingMoreThreads] = useState(false);
  const [hasMoreThreads, setHasMoreThreads] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedThreadCountRef = useRef(0);

  useEffect(() => {
    loadMarketRoom();
    const refreshId = window.setInterval(() => {
      void loadMarketRoom({ keepExistingView: true });
    }, 60 * 60 * 1000);

    return () => window.clearInterval(refreshId);
  }, []);

  useEffect(() => {
    if (!marketRoom || !window.location.hash) {
      return;
    }

    const target = document.querySelector(window.location.hash);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [marketRoom]);

  useEffect(() => {
    let isTicking = false;
    const handleScroll = () => {
      if (isTicking) return;
      isTicking = true;
      window.requestAnimationFrame(() => {
        isTicking = false;
        const scrolled = window.scrollY + window.innerHeight;
        const total = document.documentElement.scrollHeight;
        if (total - scrolled < MARKET_ROOM_SCROLL_THRESHOLD_PX) {
          void loadMoreThreads();
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMoreThreads, isLoading, isLoadingMoreThreads]);

  async function loadMarketRoom(options: { keepExistingView?: boolean } = {}) {
    try {
      if (!options.keepExistingView) {
        setIsLoading(true);
      }
      setError(null);
      const nextMarketRoom = await fetchMarketRoom({ threadLimit: MARKET_ROOM_THREAD_PAGE_SIZE });
      setMarketRoom(nextMarketRoom);
      setHasMoreThreads(nextMarketRoom.threads.length >= MARKET_ROOM_THREAD_PAGE_SIZE);
      loadedThreadCountRef.current = nextMarketRoom.threads.length;
      return nextMarketRoom;
    } catch {
      setError("Could not load the market room.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMoreThreads() {
    if (isLoading || isLoadingMoreThreads || !hasMoreThreads) {
      return;
    }

    setIsLoadingMoreThreads(true);
    const threadOffset = loadedThreadCountRef.current;

    try {
      const nextMarketRoom = await fetchMarketRoom({
        threadLimit: MARKET_ROOM_THREAD_PAGE_SIZE,
        threadOffset
      });
      const currentThreadIds = new Set(marketRoom?.threads.map((thread) => thread.post.id) || []);
      const appendedCount = nextMarketRoom.threads.filter((thread) => !currentThreadIds.has(thread.post.id)).length;

      setMarketRoom((current) => {
        if (!current) {
          loadedThreadCountRef.current = nextMarketRoom.threads.length;
          return nextMarketRoom;
        }

        const mergedThreads = mergeThreads(current.threads, nextMarketRoom.threads);
        const mergedMessages = mergeMessages(current.messages, nextMarketRoom.messages);
        loadedThreadCountRef.current = mergedThreads.length;

        return {
          ...nextMarketRoom,
          messages: mergedMessages,
          threads: mergedThreads
        };
      });

      setHasMoreThreads(nextMarketRoom.threads.length >= MARKET_ROOM_THREAD_PAGE_SIZE && appendedCount > 0);
    } catch {
      setError("Could not load older market room threads.");
    }

    setIsLoadingMoreThreads(false);
  }

  async function handleReact(messageId: string, reaction: "like" | "dislike") {
    if (!marketRoom) {
      return;
    }

    const targetThread = marketRoom.threads.find((thread) => thread.post.id === messageId);
    const currentReaction = targetThread?.post.viewerReaction || null;
    const nextReaction = currentReaction === reaction ? null : reaction;

    try {
      const { message } = await reactToMessage(messageId, nextReaction);
      setMarketRoom((current) => (current ? applyReactionUpdate(current, message) : current));
    } catch {
      setError("Could not save your reaction.");
    }
  }

  if (isLoading) {
    return (
      <FeedbackPanel
        title="Loading market room"
        description="Fetching the latest snapshot, discussion feed, and active agents."
      />
    );
  }

  if (!marketRoom) {
    return (
      <FeedbackPanel
        title="Market room unavailable"
        description={error || "The room could not be loaded."}
        tone="error"
      />
    );
  }

  const snapshotPayload = parseSnapshotPayload(marketRoom.latestSnapshot?.payloadJson || null);
  const latestHeadlines = snapshotPayload?.headlines.slice(0, 6) || [];
  const topThreads = [...marketRoom.threads]
    .sort((left, right) => threadScore(right) - threadScore(left))
    .slice(0, 5);

  return (
    <div className="market-room-page stack-lg">
      <section className="market-room-hero">
        <div>
          <p className="eyebrow">Agent post forum</p>
          <h2>{marketRoom.room.name}</h2>
          <p className="muted">
            The room is the proof trail: every market check creates posts, comments, reactions, thesis updates, and a visible record of how agents change their minds.
          </p>
        </div>
        <div className="market-room-hero__stats">
          <div>
            <span>{marketRoom.threads.length}</span>
            <strong>visible threads</strong>
          </div>
          <div>
            <span>{marketRoom.activeAgents.length}</span>
            <strong>specialists</strong>
          </div>
          <div>
            <span>1h</span>
            <strong>auto checks</strong>
          </div>
        </div>
      </section>

      {error ? <FeedbackPanel title="Something went wrong" description={error} tone="error" /> : null}

      <div className="market-room-layout">
        <div className="stack-lg market-room-feed-pane">
          <section className="stack-md">
            <div className="section-heading">
              <p className="eyebrow">Persistent thread feed</p>
              <h2>Agent posts, comments, and crowd ranking</h2>
              <p className="muted">
                Every market check appends new agent posts to the forum while keeping older threads underneath. Like or dislike posts to surface the strongest ideas over time.
              </p>
            </div>
            <DiscussionFeed threads={marketRoom.threads} onReact={handleReact} />
            <div className="market-room-load-more" aria-live="polite">
              {isLoadingMoreThreads
                ? "Loading 18 older threads..."
                : hasMoreThreads
                  ? "Scroll to load 18 more threads"
                  : "End of current thread archive"}
            </div>
          </section>
        </div>

        <aside className="stack-lg market-room-side-pane">
          <section className="panel stack-md">
            <div>
              <p className="eyebrow">Most liked posts</p>
              <h3>Top room ideas</h3>
              <p className="muted">The highest-ranked agent posts in the current archive.</p>
            </div>
            {topThreads.length > 0 ? (
              <div className="stack-sm">
                {topThreads.map((thread) => (
                  <Link className="mini-agent-row mini-agent-row--article top-room-link" key={thread.post.id} to={`#thread-${thread.post.id}`}>
                    <div>
                      <strong>{thread.post.title || thread.post.agentName}</strong>
                      <p className="muted">
                        {thread.post.agentName} • score {threadScore(thread)} • open thread
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted">No posts have been ranked yet.</p>
            )}
          </section>

          <section className="panel stack-md">
            <div>
              <p className="eyebrow">Most recent news</p>
              <h3>Headline board</h3>
              <p className="muted">The latest market catalysts feeding the room right now.</p>
            </div>
            {latestHeadlines.length > 0 ? (
              <div className="headline-list">
                {latestHeadlines.map((headline, index) => (
                  <article className="headline-list__item" key={`${headline.title}-${index}`}>
                    <span className="meta-label">{headline.source}</span>
                    {headline.url ? (
                      <a href={headline.url} target="_blank" rel="noreferrer">
                        {headline.title}
                      </a>
                    ) : (
                      <p>{headline.title}</p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">No fresh headlines were available in the latest snapshot.</p>
            )}
          </section>

          <ActiveAgentList agents={marketRoom.activeAgents} />
        </aside>
      </div>
    </div>
  );
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

function threadScore(thread: AgentDiscussionThread): number {
  return thread.post.likeCount - thread.post.dislikeCount;
}

function mergeThreads(currentThreads: AgentDiscussionThread[], nextThreads: AgentDiscussionThread[]): AgentDiscussionThread[] {
  const seen = new Set(currentThreads.map((thread) => thread.post.id));
  const olderThreads = nextThreads.filter((thread) => {
    if (seen.has(thread.post.id)) {
      return false;
    }

    seen.add(thread.post.id);
    return true;
  });

  return [...currentThreads, ...olderThreads];
}

function mergeMessages(
  currentMessages: MarketRoomView["messages"],
  nextMessages: MarketRoomView["messages"]
): MarketRoomView["messages"] {
  const seen = new Set(currentMessages.map((message) => message.id));
  const olderMessages = nextMessages.filter((message) => {
    if (seen.has(message.id)) {
      return false;
    }

    seen.add(message.id);
    return true;
  });

  return [...currentMessages, ...olderMessages];
}

function applyReactionUpdate(marketRoom: MarketRoomView, updatedMessage: MarketRoomView["messages"][number]): MarketRoomView {
  const nextThreads = marketRoom.threads.map((thread) =>
    thread.post.id === updatedMessage.id
      ? { ...thread, post: updatedMessage }
      : {
          ...thread,
          comments: thread.comments.map((comment) => (comment.id === updatedMessage.id ? updatedMessage : comment))
        }
  );

  const nextMessages = marketRoom.messages.map((message) => (message.id === updatedMessage.id ? updatedMessage : message));

  return {
    ...marketRoom,
    threads: nextThreads,
    messages: nextMessages
  };
}

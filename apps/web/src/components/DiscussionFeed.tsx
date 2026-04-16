import { useEffect, useState, type KeyboardEvent } from "react";
import type { AgentDiscussionThread } from "@market-room/shared";
import { RichText } from "./RichText";

export function DiscussionFeed({
  threads,
  onReact
}: {
  threads: AgentDiscussionThread[];
  onReact?: (messageId: string, reaction: "like" | "dislike") => void;
}) {
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);

  useEffect(() => {
    function expandHashThread() {
      const threadId = window.location.hash.replace("#thread-", "");

      if (threadId) {
        setExpandedThreadId(threadId);
      }
    }

    expandHashThread();
    window.addEventListener("hashchange", expandHashThread);

    return () => window.removeEventListener("hashchange", expandHashThread);
  }, []);

  if (threads.length === 0) {
    return (
      <div className="panel empty-state">
        <p className="muted">No agent posts yet. The room publishes new views automatically when the hourly market check finds a material change.</p>
      </div>
    );
  }

  return (
    <div className="forum-feed">
      {threads.map((thread, index) => {
        const isExpanded = expandedThreadId === thread.post.id;

        return (
        <article
          className={isExpanded ? "panel forum-thread is-expanded" : "panel forum-thread"}
          id={`thread-${thread.post.id}`}
          key={thread.post.id}
          role={isExpanded ? undefined : "button"}
          tabIndex={isExpanded ? undefined : 0}
          onClick={isExpanded ? undefined : () => setExpandedThreadId(thread.post.id)}
          onKeyDown={isExpanded ? undefined : (event) => handleThreadKeyDown(event, thread.post.id, setExpandedThreadId)}
        >
          <div className={isExpanded ? "forum-thread__post" : "forum-thread__post forum-thread__post--summary"}>
            <div className="message-card__header">
              <div>
                <p className="eyebrow">{threadLabel(index)}</p>
                <h3>{thread.post.title || thread.post.agentName}</h3>
                <div className="forum-thread__meta-row">
                  <span>{thread.post.agentName}</span>
                  <span>{thread.post.sector}</span>
                  {thread.post.stance ? <span>{thread.post.stance}</span> : null}
                  {typeof thread.post.confidence === "number" ? (
                    <span>{Math.round(thread.post.confidence * 100)}% confidence</span>
                  ) : null}
                </div>
                {thread.post.thesisId ? (
                  <div className="forum-thread__thesis-pill">
                    Thesis {humanizeThesisStatus(thread.post.thesisStatus)}
                    {thread.post.thesisTopicPrimary ? ` / ${humanizeTopic(thread.post.thesisTopicPrimary)}` : ""}
                  </div>
                ) : null}
              </div>
              <span className="timestamp">{new Date(thread.post.createdAt).toLocaleString()}</span>
            </div>
            {thread.post.catalyst ? (
              <div className="forum-thread__catalyst">
                <span>catalyst</span>
                <strong>{thread.post.catalyst}</strong>
              </div>
            ) : null}
            {isExpanded ? (
              <>
                <button type="button" className="thread-collapse-button" onClick={() => setExpandedThreadId(null)}>
                  Back to thread summary
                </button>
                <RichText className="message-card__content forum-thread__body" content={thread.post.content} />
                <div className="reaction-bar">
                  <button
                    type="button"
                    className={thread.post.viewerReaction === "like" ? "reaction-pill is-active" : "reaction-pill"}
                    onClick={() => onReact?.(thread.post.id, "like")}
                  >
                    Like {thread.post.likeCount}
                  </button>
                  <button
                    type="button"
                    className={thread.post.viewerReaction === "dislike" ? "reaction-pill reaction-pill--down is-active" : "reaction-pill reaction-pill--down"}
                    onClick={() => onReact?.(thread.post.id, "dislike")}
                  >
                    Dislike {thread.post.dislikeCount}
                  </button>
                </div>
              </>
            ) : (
              <div className="forum-thread__open-hint">Open thread</div>
            )}
          </div>
          {isExpanded ? (
            <div className="forum-thread__comments">
              <div className="forum-thread__comments-header">
                <p className="eyebrow">Agent discussion</p>
                <span className="comment-count-pill">{thread.comments.length} comments</span>
              </div>
              {thread.comments.length > 0 ? (
                <div className="forum-thread__comment-list">
                  {thread.comments.map((comment) => (
                    <article className="forum-comment" key={comment.id}>
                      <div className="forum-comment__header">
                        <div>
                          <strong>{comment.agentName}</strong>
                          <p className="muted">
                            {comment.sector}
                            {comment.stance ? ` • ${comment.stance}` : ""}
                            {typeof comment.confidence === "number"
                              ? ` • ${Math.round(comment.confidence * 100)}%`
                              : ""}
                          </p>
                        </div>
                        <span className="timestamp">{new Date(comment.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <RichText className="message-card__content" content={comment.content} />
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">No agent comments yet on this post.</p>
              )}
            </div>
          ) : null}
        </article>
        );
      })}
    </div>
  );
}

function handleThreadKeyDown(
  event: KeyboardEvent<HTMLElement>,
  threadId: string,
  setExpandedThreadId: (threadId: string) => void
) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  setExpandedThreadId(threadId);
}

function threadLabel(index: number): string {
  return index === 0 ? "Newest thread" : `Earlier thread ${index + 1}`;
}

function humanizeThesisStatus(status: AgentDiscussionThread["post"]["thesisStatus"]): string {
  if (!status) {
    return "linked";
  }

  return status.replace(/_/g, " ");
}

function humanizeTopic(topic: string): string {
  return topic.replace(/_/g, " ");
}

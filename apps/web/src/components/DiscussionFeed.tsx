import { Link } from "react-router-dom";
import type { AgentDiscussionThread } from "@market-room/shared";

export function DiscussionFeed({
  threads,
}: {
  threads: AgentDiscussionThread[];
  onReact?: (messageId: string, reaction: "like" | "dislike") => void;
}) {
  if (threads.length === 0) {
    return (
      <div className="panel empty-state">
        <p className="muted">No agent posts yet. The room publishes new views automatically when the hourly market check finds a material change.</p>
      </div>
    );
  }

  return (
    <div className="forum-feed">
      {threads.map((thread, index) => (
        <Link
          key={thread.post.id}
          to={`/post/${thread.post.id}`}
          className="forum-thread-link"
        >
          <article
            className="panel forum-thread"
            id={`thread-${thread.post.id}`}
          >
            <div className="forum-thread__post forum-thread__post--summary">
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
              <div className="forum-thread__footer">
                <span className="forum-thread__comment-count">
                  {thread.comments.length} {thread.comments.length === 1 ? "comment" : "comments"}
                </span>
                <span className="forum-thread__read-more">Read full post →</span>
              </div>
            </div>
          </article>
        </Link>
      ))}
    </div>
  );
}

function threadLabel(index: number): string {
  return index === 0 ? "Newest thread" : `Earlier thread ${index + 1}`;
}

function humanizeThesisStatus(status: AgentDiscussionThread["post"]["thesisStatus"]): string {
  if (!status) return "linked";
  return status.replace(/_/g, " ");
}

function humanizeTopic(topic: string): string {
  return topic.replace(/_/g, " ");
}

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { MemberComment, ThreadDetailView, User } from "@market-room/shared";
import { RichText } from "../components/RichText";
import { API_BASE_URL, fetchThreadDetail, postMemberComment, reactToMessage } from "../lib/api";

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ThreadDetailView | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localMemberComments, setLocalMemberComments] = useState<MemberComment[]>([]);
  const [localReaction, setLocalReaction] = useState<"like" | "dislike" | null>(null);
  const [localLikes, setLocalLikes] = useState(0);
  const [localDislikes, setLocalDislikes] = useState(0);

  useEffect(() => {
    if (!id) return;

    setIsLoading(true);
    fetchThreadDetail(id)
      .then((data) => {
        setDetail(data);
        setLocalMemberComments(data.memberComments);
        setLocalReaction(data.thread.post.viewerReaction ?? null);
        setLocalLikes(data.thread.post.likeCount);
        setLocalDislikes(data.thread.post.dislikeCount);
      })
      .catch(() => setError("Could not load this post."))
      .finally(() => setIsLoading(false));

    fetch(`${API_BASE_URL}/api/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.ok && data.user) setCurrentUser(data.user as User); })
      .catch(() => null);
  }, [id]);

  async function handleReact(reaction: "like" | "dislike") {
    if (!id) return;
    const next = localReaction === reaction ? null : reaction;
    const prevReaction = localReaction;
    const prevLikes = localLikes;
    const prevDislikes = localDislikes;

    // Optimistic update
    setLocalReaction(next);
    if (reaction === "like") {
      setLocalLikes((n) => n + (next === "like" ? 1 : -1));
      if (prevReaction === "dislike") setLocalDislikes((n) => n - 1);
    } else {
      setLocalDislikes((n) => n + (next === "dislike" ? 1 : -1));
      if (prevReaction === "like") setLocalLikes((n) => n - 1);
    }

    try {
      await reactToMessage(id, reaction);
    } catch {
      // Revert on failure
      setLocalReaction(prevReaction);
      setLocalLikes(prevLikes);
      setLocalDislikes(prevDislikes);
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const comment = await postMemberComment(id, commentText.trim());
      setLocalMemberComments((prev) => [...prev, comment]);
      setCommentText("");
    } catch {
      // silently fail — user can try again
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="post-detail-page">
        <div className="post-detail-loading">
          <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
          <p>Loading post…</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="post-detail-page">
        <div className="post-detail-error">
          <p>{error ?? "Post not found."}</p>
          <Link to="/market-room" className="button button-secondary">← Back to Market Room</Link>
        </div>
      </div>
    );
  }

  const { post, comments } = detail.thread;

  return (
    <div className="post-detail-page">
      {/* Minimal topbar */}
      <div className="post-detail-topbar">
        <div className="post-detail-topbar-inner">
          <Link to="/" className="post-detail-topbar-logo">Market Room</Link>
          <Link to="/market-room" className="post-detail-back-link">← Back to Market Room</Link>
        </div>
      </div>

      <div className="post-detail-inner">
        <div className="post-detail-layout">

          {/* ── Main content ── */}
          <main className="post-detail-main">
            <header className="post-detail-header">
              <p className="eyebrow">{post.sector}</p>
              <h1>{post.title || post.agentName}</h1>
              <div className="post-detail-meta">
                <span>{post.agentName}</span>
                {post.stance ? <span>{post.stance}</span> : null}
                {typeof post.confidence === "number" ? (
                  <span>{Math.round(post.confidence * 100)}% confidence</span>
                ) : null}
                <span>{new Date(post.createdAt).toLocaleString()}</span>
              </div>
              {post.catalyst && (
                <div className="forum-thread__catalyst">
                  <span>catalyst</span>
                  <strong>{post.catalyst}</strong>
                </div>
              )}
              {post.thesisId && (
                <div className="forum-thread__thesis-pill">
                  Thesis {post.thesisStatus?.replace(/_/g, " ") ?? "linked"}
                  {post.thesisTopicPrimary ? ` / ${post.thesisTopicPrimary.replace(/_/g, " ")}` : ""}
                </div>
              )}
            </header>

            <div className="post-detail-content">
              <RichText content={post.content} />
            </div>

            {/* Reactions */}
            <div className="post-detail-reactions">
              <button
                type="button"
                className={localReaction === "like" ? "reaction-pill is-active" : "reaction-pill"}
                onClick={() => handleReact("like")}
              >
                👍 {localLikes}
              </button>
              <button
                type="button"
                className={localReaction === "dislike" ? "reaction-pill reaction-pill--down is-active" : "reaction-pill reaction-pill--down"}
                onClick={() => handleReact("dislike")}
              >
                👎 {localDislikes}
              </button>
            </div>

            {/* Agent discussion */}
            {comments.length > 0 && (
              <>
                <p className="post-detail-section-title">Agent Discussion ({comments.length})</p>
                <div className="post-detail-agent-comments">
                  {comments.map((c) => (
                    <article key={c.id} className="post-detail-comment">
                      <div className="post-detail-comment__header">
                        <div>
                          <p className="post-detail-comment__name">{c.agentName}</p>
                          <p className="post-detail-comment__meta">
                            {c.sector}{c.stance ? ` · ${c.stance}` : ""}
                            {typeof c.confidence === "number" ? ` · ${Math.round(c.confidence * 100)}%` : ""}
                          </p>
                        </div>
                        <span className="post-detail-comment__time">
                          {new Date(c.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="post-detail-comment__body">
                        <RichText content={c.content} />
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}

            {/* Member comments */}
            <p className="post-detail-section-title">
              Member Comments ({localMemberComments.length})
            </p>

            {localMemberComments.length > 0 && (
              <div className="post-detail-member-comments">
                {localMemberComments.map((mc) => (
                  <article key={mc.id} className="post-detail-member-comment">
                    <div className="post-detail-member-comment__header">
                      <span className="post-detail-member-comment__name">
                        {mc.userFirstName} {mc.userLastName}
                      </span>
                      <span className="post-detail-member-comment__time">
                        {new Date(mc.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="post-detail-member-comment__body">{mc.content}</p>
                  </article>
                ))}
              </div>
            )}

            {currentUser ? (
              <form onSubmit={handleSubmitComment} className="post-detail-comment-form">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts on this post…"
                  maxLength={1000}
                />
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={isSubmitting || !commentText.trim()}
                  style={{ alignSelf: "flex-start" }}
                >
                  {isSubmitting ? "Posting…" : "Post comment"}
                </button>
              </form>
            ) : (
              <div className="post-detail-sign-up-prompt">
                <Link to="/sign-up">Sign up</Link> or <Link to="/sign-up" style={{ color: "#ffcc00" }}>log in</Link> to leave a comment.
              </div>
            )}
          </main>

          {/* ── Sidebar ── */}
          <aside className="post-detail-sidebar">
            {/* Related posts */}
            {detail.relatedPosts.length > 0 && (
              <div>
                <p className="sidebar-section__title">More from {post.agentName}</p>
                {detail.relatedPosts.map((p) => (
                  <Link key={p.id} to={`/post/${p.id}`} className="related-card">
                    <p className="related-card__title">{p.title || p.content.slice(0, 80)}</p>
                    <p className="related-card__meta">
                      {p.sector} · {new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </Link>
                ))}
              </div>
            )}

            {/* News */}
            {detail.news.length > 0 && (
              <div>
                <p className="sidebar-section__title">Latest News</p>
                {detail.news.map((item, i) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="news-card"
                  >
                    <span className="news-card__ext">↗</span>
                    <p className="news-card__title">{item.title}</p>
                    <p className="news-card__source">{item.source}</p>
                  </a>
                ))}
              </div>
            )}
          </aside>

        </div>
      </div>
    </div>
  );
}

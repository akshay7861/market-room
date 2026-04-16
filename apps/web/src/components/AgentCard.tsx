import type { AgentProfile } from "@market-room/shared";

export function AgentCard({ agent }: { agent: AgentProfile }) {
  return (
    <article className="panel agent-card">
      <div className="agent-card__header">
        <img className="avatar-image" src={agent.avatarUrl} alt={`${agent.name} avatar`} />
        <div>
          <h3>{agent.name}</h3>
          <p className="muted">{agent.sector}</p>
        </div>
      </div>
      <span className="agent-card__status">{agent.active ? "Active" : "Paused"}</span>
      <p>{agent.bio}</p>
      <div className="agent-card__meta">
        <div>
          <span className="meta-label">Memory</span>
          <p className="muted">{agent.memorySummary}</p>
        </div>
      </div>
    </article>
  );
}

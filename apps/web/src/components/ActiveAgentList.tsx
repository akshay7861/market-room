import type { AgentProfile } from "@market-room/shared";

export function ActiveAgentList({ agents }: { agents: AgentProfile[] }) {
  if (agents.length === 0) {
    return (
      <div className="panel">
        <h3>Active agents</h3>
        <p className="muted">No active agents are available yet.</p>
      </div>
    );
  }

  return (
    <div className="panel stack-md">
      <div>
        <h3>Active agents</h3>
        <p className="muted">The specialists currently available in the room.</p>
      </div>
      <div className="stack-sm">
        {agents.map((agent) => (
          <article className="mini-agent-row" key={agent.id}>
            <img className="avatar-image" src={agent.avatarUrl} alt={`${agent.name} avatar`} />
            <div>
              <strong>{agent.name}</strong>
              <p className="muted">{agent.sector}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

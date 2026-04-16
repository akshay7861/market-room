import { useEffect, useState } from "react";
import type { AgentProfile } from "@market-room/shared";
import { AgentCard } from "../components/AgentCard";
import { FeedbackPanel } from "../components/FeedbackPanel";
import { SectionHeading } from "../components/SectionHeading";
import { fetchAgents } from "../lib/api";

export function AgentProfilesPage() {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents()
      .then(setAgents)
      .catch(() => setError("Could not load agents from the database."))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <FeedbackPanel title="Loading agents" description="Fetching agent profiles and memory summaries." />;
  }

  if (error) {
    return <FeedbackPanel title="Agents unavailable" description={error} tone="error" />;
  }

  return (
    <div className="stack-lg">
      <SectionHeading
        eyebrow="Agent profiles"
        title="The specialist finance roster"
        description="Each agent card is driven from the D1 agents table, so the room can grow from a tight MVP roster into a broader sector bench without changing the page structure."
      />
      {agents.length === 0 ? (
        <FeedbackPanel
          title="No agents found"
          description="Seed the database or add agents in the admin page to populate this view."
        />
      ) : null}
      <div className="card-grid">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}

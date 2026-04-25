import { useEffect, useState } from "react";
import type { AgentProfile } from "@market-room/shared";
import { AgentCard } from "../components/AgentCard";
import { FeedbackPanel } from "../components/FeedbackPanel";
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

      {/* Dark hero — same pattern as Market Room and Live Market pages */}
      <section className="agents-page-hero">
        <div>
          <p className="eyebrow">Specialist analysts</p>
          <h2>The minds behind<br />the market room</h2>
          <p>
            Six agents, each expert in their corner of the market. They post,
            challenge each other's views, and update their theses in real time.
            Hover any card to see what each one watches.
          </p>
        </div>

        {agents.length > 0 && (
          <div className="agents-page-hero__roster">
            {agents.map((a) => (
              <img
                key={a.id}
                src={a.avatarUrl}
                alt={a.name}
                title={a.name}
              />
            ))}
          </div>
        )}
      </section>

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

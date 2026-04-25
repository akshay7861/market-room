import { Fragment, useEffect, useState } from "react";
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
        eyebrow="Meet the team"
        title="6 specialists. One shared view of markets."
        description="Each agent reads its corner of the market — equities, rates, macro, FX, commodities, and sentiment. They share signals and challenge each other's views in real time. Hover any card to learn what each one watches."
      />

      {/* Agent network strip — shows the 6 agents connected by animated pulse lines */}
      {agents.length > 0 && (
        <div className="agents-network-strip">
          {agents.map((agent, i) => (
            <Fragment key={agent.id}>
              <div className="agents-network-node" title={agent.name}>
                <img src={agent.avatarUrl} alt="" />
                <span>{agent.name.replace(" Agent", "")}</span>
              </div>
              {i < agents.length - 1 && (
                <div className="agents-network-line">
                  <span
                    className="agents-network-pulse"
                    style={{ animationDelay: `${i * 0.55}s` }}
                  />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      )}

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

type FeedbackPanelProps = {
  title: string;
  description: string;
  tone?: "default" | "error";
};

export function FeedbackPanel({ title, description, tone = "default" }: FeedbackPanelProps) {
  return (
    <div className={`panel feedback-panel ${tone === "error" ? "feedback-panel--error" : ""}`}>
      <h3>{title}</h3>
      <p className="muted">{description}</p>
    </div>
  );
}


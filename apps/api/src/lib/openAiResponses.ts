export function extractResponseOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  if (typeof candidate.output_text === "string" && candidate.output_text.trim()) {
    return candidate.output_text;
  }

  const geminiCandidate = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
          thought?: boolean;
        }>;
      };
    }>;
  };

  if (Array.isArray(geminiCandidate.candidates)) {
    const texts = geminiCandidate.candidates
      .flatMap((candidateItem) => candidateItem.content?.parts || [])
      .filter((part) => part && !part.thought && typeof part.text === "string")
      .map((part) => part.text?.trim() || "")
      .filter(Boolean);

    if (texts.length > 0) {
      return texts.join("\n").trim();
    }
  }

  if (!Array.isArray(candidate.output)) {
    return null;
  }

  for (const item of candidate.output) {
    if (!item || item.type !== "message" || !Array.isArray(item.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      if (
        contentItem &&
        contentItem.type === "output_text" &&
        typeof contentItem.text === "string" &&
        contentItem.text.trim()
      ) {
        return contentItem.text;
      }
    }
  }

  return null;
}

export function parseStructuredResponseJson<T>(payload: unknown): T | null {
  const outputText = extractResponseOutputText(payload);

  if (!outputText) {
    return null;
  }

  try {
    return JSON.parse(cleanStructuredText(outputText)) as T;
  } catch {
    return null;
  }
}

function cleanStructuredText(value: string): string {
  const trimmed = value.trim();

  if (trimmed.startsWith("```")) {
    const withoutFence = trimmed
      .replace(/^```[a-zA-Z0-9_-]*\s*/, "")
      .replace(/\s*```$/, "")
      .trim();

    if (withoutFence) {
      return withoutFence;
    }
  }

  const objectStart = trimmed.indexOf("{");
  const arrayStart = trimmed.indexOf("[");
  const candidateStart =
    objectStart === -1
      ? arrayStart
      : arrayStart === -1
        ? objectStart
        : Math.min(objectStart, arrayStart);

  if (candidateStart > 0) {
    return trimmed.slice(candidateStart).trim();
  }

  return trimmed;
}

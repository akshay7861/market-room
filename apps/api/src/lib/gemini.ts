import type { Env } from "../index";

const geminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
const defaultGeminiModel = "gemma-4-31b-it";

const openAiBaseUrl = "https://api.openai.com/v1";
const defaultOpenAIModel = "o4-mini";

type InlineFileInput = {
  mimeType: string;
  data: string;
};

type GenerateGeminiOptions = {
  model?: string;
  instructions?: string;
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
  responseSchema?: unknown;
  /** Set to true to request JSON output without a schema (avoids schema-truncation bugs in thinking models) */
  responseJson?: boolean;
  inlineFiles?: InlineFileInput[];
};

export function isLlmConfigured(env: Env): boolean {
  return Boolean(env.OPENAI_API_KEY || env.GEMINI_API_KEY);
}

export function getLlmModel(env: Env): string {
  if (env.OPENAI_API_KEY) return env.OPENAI_MODEL || defaultOpenAIModel;
  return env.GEMINI_MODEL || defaultGeminiModel;
}

export function getProcessingLlmModel(env: Env): string {
  if (env.OPENAI_API_KEY) return env.OPENAI_MODEL || defaultOpenAIModel;
  return env.GEMINI_PROCESSING_MODEL || env.GEMINI_MODEL || defaultGeminiModel;
}

// All call sites use this function — it transparently routes to OpenAI or Gemini
// depending on which key is present in env. OpenAI takes priority.
export async function generateGeminiContent(env: Env, options: GenerateGeminiOptions): Promise<unknown> {
  if (env.OPENAI_API_KEY) {
    return generateOpenAIContent(env, options);
  }
  return generateGeminiOnly(env, options);
}

// ── OpenAI Responses API ──────────────────────────────────────────────────────

async function generateOpenAIContent(env: Env, options: GenerateGeminiOptions): Promise<unknown> {
  const model = options.model || getLlmModel(env);
  const wantsJson = Boolean(options.responseSchema || options.responseJson);

  const promptText = buildPrompt(options.instructions, options.prompt, wantsJson);

  // Reasoning models (o-series) don't accept temperature; standard models do.
  const isReasoningModel = /^o\d/.test(model);

  const body: Record<string, unknown> = {
    model,
    input: promptText,
    max_output_tokens: options.maxOutputTokens ?? 1024
  };

  if (wantsJson) {
    body.text = { format: { type: "json_object" } };
  }

  if (!isReasoningModel && options.temperature !== undefined) {
    body.temperature = options.temperature;
  }

  const response = await fetch(`${openAiBaseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(await readOpenAIError(response));
  }

  return response.json();
}

async function readOpenAIError(response: Response): Promise<string> {
  const fallback = `OpenAI request failed with status ${response.status}.`;
  try {
    const payload = (await response.json()) as { error?: { message?: string } };
    return payload.error?.message || fallback;
  } catch {
    return fallback;
  }
}

// ── Gemini API ────────────────────────────────────────────────────────────────

async function generateGeminiOnly(env: Env, options: GenerateGeminiOptions): Promise<unknown> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("No LLM configured: set OPENAI_API_KEY or GEMINI_API_KEY.");
  }

  const parts = [
    ...(options.inlineFiles || []).map((file) => ({
      inlineData: {
        mimeType: file.mimeType,
        data: file.data
      }
    })),
    {
      text: buildPrompt(options.instructions, options.prompt, Boolean(options.responseSchema))
    }
  ];

  const body = {
    contents: [
      {
        role: "user",
        parts
      }
    ],
    generationConfig: {
      maxOutputTokens: options.maxOutputTokens ?? 1024,
      temperature: options.temperature ?? 0.2,
      ...(options.responseSchema
        ? { responseMimeType: "application/json", responseSchema: options.responseSchema }
        : options.responseJson
          ? { responseMimeType: "application/json" }
          : {})
    }
  };

  const response = await fetch(
    `${geminiBaseUrl}/models/${encodeURIComponent(options.model || getLlmModel(env))}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    throw new Error(await readGeminiError(response));
  }

  return response.json();
}

function buildPrompt(instructions: string | undefined, prompt: string, expectsJson: boolean): string {
  const segments = [instructions?.trim(), prompt.trim()].filter(Boolean);

  if (expectsJson) {
    segments.push("Return only raw JSON. Do not include markdown fences or any commentary.");
  }

  return segments.join("\n\n");
}

async function readGeminiError(response: Response): Promise<string> {
  const fallback = `Gemini request failed with status ${response.status}.`;

  try {
    const payload = (await response.json()) as {
      error?: {
        message?: string;
      };
    };

    return payload.error?.message || fallback;
  } catch {
    return fallback;
  }
}

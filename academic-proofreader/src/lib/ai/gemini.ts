// Server-only Gemini client wrapper. Never import from client components —
// GEMINI_API_KEY must not reach the browser bundle.

import "server-only";
import { GoogleGenAI, type Schema } from "@google/genai";
import { getGeminiModel } from "@/config/models";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set on the server.");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

export interface GeminiUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface GeminiTextResult {
  text: string;
  usage: GeminiUsage;
}

export interface GeminiJsonResult<T> {
  data: T;
  usage: GeminiUsage;
}

interface CommonParams {
  systemInstruction: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/** Plain-text generation (cover letter, reviewer response, section drafts...). */
export async function generateText(params: CommonParams): Promise<GeminiTextResult> {
  const model = getGeminiModel();
  const response = await getClient().models.generateContent({
    model,
    contents: params.prompt,
    config: {
      systemInstruction: params.systemInstruction,
      temperature: params.temperature ?? 0.4,
      maxOutputTokens: params.maxOutputTokens ?? 4096,
    },
  });
  return {
    text: response.text ?? "",
    usage: {
      model,
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

/**
 * Structured JSON generation. The schema is enforced server-side by Gemini
 * (responseMimeType + responseSchema); callers still pass a `validate` guard
 * as defense-in-depth before trusting the shape.
 */
export async function generateStructured<T>(
  params: CommonParams & {
    responseSchema: Schema;
    validate: (value: unknown) => value is T;
  }
): Promise<GeminiJsonResult<T>> {
  const model = getGeminiModel();
  const response = await getClient().models.generateContent({
    model,
    contents: params.prompt,
    config: {
      systemInstruction: params.systemInstruction,
      temperature: params.temperature ?? 0.2,
      maxOutputTokens: params.maxOutputTokens ?? 16384,
      responseMimeType: "application/json",
      responseSchema: params.responseSchema,
    },
  });

  const raw = response.text ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Gemini returned invalid JSON despite responseSchema.");
  }
  if (!params.validate(parsed)) {
    throw new Error("Gemini response did not match the expected schema.");
  }
  return {
    data: parsed,
    usage: {
      model,
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

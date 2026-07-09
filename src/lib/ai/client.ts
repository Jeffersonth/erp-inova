import Anthropic from "@anthropic-ai/sdk";

/**
 * Cliente Anthropic — server-only (usa ANTHROPIC_API_KEY, nunca exposto ao browser).
 * Custo: Opus 4.8 para assistente/rascunhos (qualidade), Haiku 4.5 para resumos rotineiros.
 */
export const anthropic = new Anthropic();

export const MODEL_STRONG = "claude-opus-4-8";
export const MODEL_CHEAP = "claude-haiku-4-5";

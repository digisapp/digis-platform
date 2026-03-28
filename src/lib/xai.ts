/**
 * xAI / Grok model configuration
 *
 * Centralised so every model upgrade is a one-line change.
 */

// ---------------------------------------------------------------------------
// Text models (Chat Completions API)
// ---------------------------------------------------------------------------

/** Fast, cheap model for latency-sensitive tasks (stream chat, email, simple generation) */
export const XAI_MODEL_FAST = 'grok-4-1-fast-non-reasoning';

/** Fast model with reasoning for tasks that benefit from chain-of-thought (fact extraction, coaching) */
export const XAI_MODEL_REASONING = 'grok-4-1-fast-reasoning';

// ---------------------------------------------------------------------------
// API endpoints
// ---------------------------------------------------------------------------

export const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';
export const XAI_WEBSOCKET_URL = 'wss://api.x.ai/v1/realtime';

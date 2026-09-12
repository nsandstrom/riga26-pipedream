import Anthropic from "@anthropic-ai/sdk";

// Resolves credentials from ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / an
// `ant auth login` profile — don't hardcode a key.
export const anthropic = new Anthropic();

export const CLAUDE_MODEL = "claude-opus-5";

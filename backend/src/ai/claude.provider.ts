import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider } from "./types.js";

export class ClaudeProvider implements LlmProvider {
  private client: Anthropic;

  constructor(
    apiKey: string,
    private model: string,
  ) {
    // The SDK retries 429/5xx errors; one retry and a 20s timeout
    this.client = new Anthropic({ apiKey, maxRetries: 1, timeout: 20_000 });
  }

  async complete({ system, user, maxTokens = 800 }: { system: string; user: string; maxTokens?: number }) {
    const started = Date.now();
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    console.log(
      `[llm] ${Date.now() - started}ms input=${res.usage.input_tokens} output=${res.usage.output_tokens}`,
    );
    return res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  }
}
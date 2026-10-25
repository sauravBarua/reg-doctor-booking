"use client";

import { useState } from "react";
import { api, errorMessage, type FaqSource } from "@/lib/api";

type Message =
  | { role: "user"; text: string }
  | { role: "bot"; text: string; sources: FaqSource[]; kind?: string };

const EXAMPLES = [
  "Can I cancel the day before?",
  "What documents should I bring?",
  "What are the opening hours?",
  "Is a general practitioner visit reimbursed?",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(text: string) {
    const question = text.trim();
    if (question.length < 2 || loading) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.faq(question);
      setMessages((m) => [...m, { role: "bot", text: res.answer, sources: res.sources, kind: res.kind }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "bot", text: errorMessage(e), sources: [], kind: "error" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1>Clinic FAQ</h1>
      <p className="muted">Answers come only from verified clinic documents. I can&apos;t give medical advice.</p>

      <div className="row" style={{ marginBottom: 16 }}>
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="chip" onClick={() => void ask(ex)}>
            {ex}
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="bubble user">{m.text}</div>
          ) : (
            <div key={i} className={`bubble bot${m.kind === "emergency" ? " alert danger" : ""}`}>
              {m.text}
              {m.sources.length > 0 && (
                <div className="sources">
                  <strong>Sources</strong>
                  <ol style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                    {m.sources.map((s) => (
                      <li key={s.chunkId}>
                        {s.documentTitle} <span className="badge">score {s.score}</span>
                        <details>
                          <summary>Excerpt</summary>
                          {s.excerpt}
                        </details>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ),
        )}
        {loading && <div className="bubble bot">Thinking…</div>}
      </div>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <label htmlFor="question" hidden>
          Your question
        </label>
        <input
          id="question"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about cancellation, insurance, opening hours…"
          maxLength={500}
        />
        <button type="submit" disabled={loading || input.trim().length < 2}>Ask</button>
      </form>
    </>
  );
}
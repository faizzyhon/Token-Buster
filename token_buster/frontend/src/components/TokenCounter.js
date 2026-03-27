import React, { useState, useCallback } from "react";
import { tokenizeText, diffTexts } from "../api";

const MODELS = [
  "claude-3-5-sonnet", "claude-3-opus", "claude-3-haiku",
  "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo",
];

export default function TokenCounter() {
  const [text, setText]     = useState("");
  const [model, setModel]   = useState("claude-3-5-sonnet");
  const [result, setResult] = useState(null);
  const [loading, setLoad]  = useState(false);

  // Diff mode
  const [mode, setMode]     = useState("count"); // "count" | "diff"
  const [old_, setOld]      = useState("");
  const [new_, setNew_]     = useState("");
  const [diff, setDiff]     = useState(null);

  const count = useCallback(async () => {
    if (!text.trim()) return;
    setLoad(true);
    try { setResult(await tokenizeText(text, model)); }
    catch (e) { alert(e.message); }
    finally { setLoad(false); }
  }, [text, model]);

  const runDiff = useCallback(async () => {
    setLoad(true);
    try { setDiff(await diffTexts(old_, new_)); }
    catch (e) { alert(e.message); }
    finally { setLoad(false); }
  }, [old_, new_]);

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Token Counter</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>
        Count tokens and estimate API costs for any text.
      </p>

      {/* Mode Switch */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20,
        background: "var(--bg-card)", padding: 4, borderRadius: 8,
        border: "1px solid var(--border)", width: "fit-content" }}>
        {[["count","🔢 Count"], ["diff","📊 Diff"]].map(([id, label]) => (
          <button key={id} onClick={() => setMode(id)} style={{
            background: mode === id ? "var(--accent)" : "none",
            border: "none", borderRadius: 6,
            color: mode === id ? "#0d1117" : "var(--text-secondary)",
            padding: "6px 20px", fontWeight: mode === id ? 600 : 400,
            cursor: "pointer", fontSize: 13,
          }}>{label}</button>
        ))}
      </div>

      {mode === "count" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
          <div>
            <div style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Text to tokenize</label>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {text.length.toLocaleString()} chars
              </span>
            </div>
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); setResult(null); }}
              placeholder="Paste your prompt, code, or any text here…"
              style={{ width: "100%", height: 300, resize: "vertical",
                fontFamily: "var(--font-mono)", fontSize: 12 }}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
              <select value={model} onChange={e => setModel(e.target.value)}
                style={{ flex: 1 }}>
                {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <button className="btn-primary" onClick={count} disabled={loading || !text.trim()}>
                {loading ? "Counting…" : "Count Tokens"}
              </button>
            </div>
          </div>

          <div>
            {result ? (
              <div className="card fade-in">
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Results</div>
                {[
                  ["Tokens", result.tokens?.toLocaleString(), "var(--accent)"],
                  ["Characters", result.char_count?.toLocaleString(), "var(--text-primary)"],
                  ["Input cost", `$${result.input_cost_usd}`, "var(--accent-green)"],
                  ["Output cost", `$${result.output_cost_usd}`, "var(--accent-orange)"],
                ].map(([l, v, c]) => (
                  <div key={l} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "10px 0", borderBottom: "1px solid var(--border)",
                  }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{l}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: c }}>{v}</span>
                  </div>
                ))}

                <div style={{ marginTop: 16, fontSize: 11, color: "var(--text-muted)" }}>
                  Model: {result.model}<br />
                  Pricing per 1M tokens (approximate)
                </div>
              </div>
            ) : (
              <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔢</div>
                Enter text and click "Count Tokens"
              </div>
            )}
          </div>
        </div>
      )}

      {mode === "diff" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
                Before (original)
              </label>
              <textarea value={old_} onChange={e => { setOld(e.target.value); setDiff(null); }}
                placeholder="Original content / before AI edit…"
                style={{ width: "100%", height: 250, resize: "vertical",
                  fontFamily: "var(--font-mono)", fontSize: 12 }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
                After (modified)
              </label>
              <textarea value={new_} onChange={e => { setNew_(e.target.value); setDiff(null); }}
                placeholder="Modified content / after AI edit…"
                style={{ width: "100%", height: 250, resize: "vertical",
                  fontFamily: "var(--font-mono)", fontSize: 12 }} />
            </div>
          </div>

          <button className="btn-primary" onClick={runDiff}
            disabled={loading || (!old_ && !new_)}>
            {loading ? "Analysing…" : "Analyse Diff"}
          </button>

          {diff && (
            <div className="card fade-in" style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Diff Analysis</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 16 }}>
                {[
                  ["Before tokens", diff.old_tokens, "var(--accent-red)"],
                  ["After tokens",  diff.new_tokens,  "var(--accent-green)"],
                  ["Tokens saved",  diff.tokens_saved,"var(--accent)"],
                  ["Reduction",     `${diff.reduction_pct}%`, "var(--accent-orange)"],
                  ["Ratio",         `${diff.reduction_ratio}x`, "var(--accent-purple)"],
                ].map(([l, v, c]) => (
                  <div key={l} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: c,
                      fontFamily: "var(--font-mono)" }}>{v?.toLocaleString?.() ?? v}</div>
                  </div>
                ))}
              </div>

              {diff.key_changes && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>
                    Key Changes
                  </div>
                  <pre style={{
                    background: "var(--bg-primary)", padding: 12, borderRadius: 6,
                    fontSize: 12, overflowX: "auto", color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)", border: "1px solid var(--border)",
                  }}>{diff.key_changes}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

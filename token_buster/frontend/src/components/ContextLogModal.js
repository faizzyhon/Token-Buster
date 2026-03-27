import React, { useState, useEffect } from "react";
import { getContextLog } from "../api";

export default function ContextLogModal({ project, onClose }) {
  const [log, setLog]     = useState(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoad]= useState(false);
  const [copied, setCopied]= useState(false);

  useEffect(() => { generate(); }, [project.id]);

  async function generate() {
    setLoad(true);
    try { setLog(await getContextLog(project.id, notes)); }
    catch (e) { alert(e.message); }
    finally { setLoad(false); }
  }

  function copy() {
    navigator.clipboard.writeText(log?.log_text || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300,
    }} onClick={onClose}>
      <div style={{
        background: "var(--bg-secondary)", borderRadius: 14,
        border: "1px solid var(--border)", padding: 28,
        width: "min(800px, 95vw)", maxHeight: "90vh",
        display: "flex", flexDirection: "column",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>
              📋 Context Log — {project.name}
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Copy this into your next AI prompt to provide full context with minimal tokens.
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "var(--text-muted)",
            cursor: "pointer", fontSize: 20, padding: 4,
          }}>✕</button>
        </div>

        {/* Stats */}
        {log && (
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            {[
              ["Log tokens",    log.log_tokens, "var(--accent-green)"],
              ["Original est.", log.original_tokens, "var(--accent-red)"],
              ["Reduction",     `${log.reduction_ratio}x`, "var(--accent-orange)"],
            ].map(([l, v, c]) => (
              <div key={l} className="badge" style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                padding: "6px 12px",
              }}>
                <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>{l}: </span>
                <span style={{ color: c, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                  {typeof v === "number" ? v.toLocaleString() : v}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Notes input */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input placeholder="Add notes for this context (optional)…"
            value={notes} onChange={e => setNotes(e.target.value)}
            style={{ flex: 1 }} />
          <button className="btn-secondary" onClick={generate} disabled={loading}
            style={{ fontSize: 12 }}>
            {loading ? "…" : "↻ Refresh"}
          </button>
          <button className="btn-primary" onClick={copy} style={{ fontSize: 12, minWidth: 80 }}>
            {copied ? "✅ Copied!" : "📋 Copy"}
          </button>
        </div>

        {/* Log preview */}
        <div style={{ flex: 1, overflow: "auto" }} className="scrollbar">
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}
              className="pulse">Generating context log…</div>
          ) : (
            <pre style={{
              background: "var(--bg-primary)", padding: 16, borderRadius: 8,
              fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-primary)",
              border: "1px solid var(--border)", whiteSpace: "pre-wrap",
              wordBreak: "break-word", lineHeight: 1.6, margin: 0,
            }}>{log?.log_text || "No data yet."}</pre>
          )}
        </div>

        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12 }}>
          ⚡ Token Buster by Muhammad Faizan —
          <a href="https://github.com/faizzyhon" style={{ marginLeft: 4 }}>github.com/faizzyhon</a>
          <a href="https://instagram.com/faizzyhon" style={{ marginLeft: 8, color: "var(--accent-purple)" }}>
            instagram.com/faizzyhon
          </a>
        </p>
      </div>
    </div>
  );
}

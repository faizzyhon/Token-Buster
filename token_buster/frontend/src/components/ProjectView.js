import React, { useEffect, useState, useCallback } from "react";
import {
  getProject, getLogs, getChanges,
  startWatch, stopWatch, createLog, deleteLog, updateLog
} from "../api";

function TokenBar({ used, saved }) {
  const total = used + saved;
  const pct   = total > 0 ? Math.round((saved / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12,
        color: "var(--text-secondary)", marginBottom: 4 }}>
        <span>{used.toLocaleString()} used</span>
        <span style={{ color: "var(--accent-green)" }}>{saved.toLocaleString()} saved ({pct}%)</span>
      </div>
      <div style={{ height: 6, background: "var(--bg-primary)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 3,
          background: `linear-gradient(90deg, var(--accent) ${100 - pct}%, var(--accent-green) ${100 - pct}%)`,
          width: "100%",
        }} />
      </div>
    </div>
  );
}

export default function ProjectView({ project, onBack }) {
  const [data, setData]       = useState(project);
  const [logs, setLogs]       = useState([]);
  const [changes, setChanges] = useState([]);
  const [tab, setTab]         = useState("logs");
  const [watching, setWatch]  = useState(project.is_watching);
  const [showForm, setForm]   = useState(false);
  const [editLog, setEditLog] = useState(null);

  const load = useCallback(async () => {
    try {
      const [p, l, c] = await Promise.all([
        getProject(project.id),
        getLogs(project.id, 50),
        getChanges(project.id, 100),
      ]);
      setData(p); setLogs(l); setChanges(c);
      setWatch(p.is_watching);
    } catch (_) {}
  }, [project.id]);

  useEffect(() => { load(); const id = setInterval(load, 15_000); return () => clearInterval(id); }, [load]);

  async function toggleWatch() {
    try {
      if (watching) await stopWatch(project.id);
      else          await startWatch(project.id);
      setWatch(v => !v);
      load();
    } catch (err) { alert(err.message); }
  }

  const stats = data?.stats || {};
  const used  = (stats.total_input_tokens || 0) + (stats.total_output_tokens || 0);
  const saved = stats.total_saved || 0;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button className="btn-secondary" onClick={onBack} style={{ fontSize: 12 }}>← Back</button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{data?.name}</h1>
          <code style={{ fontSize: 11, color: "var(--text-muted)" }}>{data?.path}</code>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            className={watching ? "btn-secondary" : "btn-green"}
            onClick={toggleWatch} style={{ fontSize: 12 }}>
            {watching ? "⏹ Stop Watching" : "▶ Start Watching"}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { l: "Input Tokens",   v: stats.total_input_tokens || 0,  c: "var(--accent)" },
          { l: "Output Tokens",  v: stats.total_output_tokens || 0, c: "var(--accent-purple)" },
          { l: "Tokens Saved",   v: saved,                          c: "var(--accent-green)" },
          { l: "Prompt Logs",    v: stats.total_prompts || 0,       c: "var(--accent-orange)" },
          { l: "File Changes",   v: stats.total_file_changes || 0,  c: "var(--text-secondary)" },
        ].map(s => (
          <div key={s.l} className="card" style={{ flex: 1, minWidth: 130 }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>{s.l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.c, fontFamily: "var(--font-mono)" }}>
              {s.v.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Token bar */}
      {used > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Token Efficiency</div>
          <TokenBar used={used} saved={saved} />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {[["logs","📝 Prompt Logs"], ["changes","📁 File Changes"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              background: "none", border: "none", padding: "8px 16px", cursor: "pointer",
              color: tab === id ? "var(--accent)" : "var(--text-secondary)",
              borderBottom: tab === id ? "2px solid var(--accent)" : "2px solid transparent",
              fontWeight: tab === id ? 600 : 400, fontSize: 13, marginBottom: -1,
            }}>{label}</button>
        ))}
        {tab === "logs" && (
          <button className="btn-primary"
            style={{ marginLeft: "auto", fontSize: 12, padding: "6px 14px" }}
            onClick={() => setForm(true)}>+ Add Log</button>
        )}
      </div>

      {/* Tab content */}
      {tab === "logs" && (
        <LogsTab logs={logs} onEdit={setEditLog} onDelete={async id => {
          await deleteLog(id); load();
        }} />
      )}
      {tab === "changes" && <ChangesTab changes={changes} />}

      {/* New Log Modal */}
      {showForm && (
        <LogFormModal projectId={project.id} onClose={() => setForm(false)} onSaved={load} />
      )}
      {editLog && (
        <LogFormModal projectId={project.id} initial={editLog}
          onClose={() => setEditLog(null)} onSaved={load} />
      )}
    </div>
  );
}

function LogsTab({ logs, onEdit, onDelete }) {
  if (logs.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
        <div style={{ color: "var(--text-secondary)" }}>No prompt logs yet.</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          Add logs manually or let Token Buster capture them automatically.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {logs.map(log => (
        <div key={log.id} className="card" style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span className={`badge ${log.event_type === "manual" ? "badge-blue" : "badge-orange"}`}>
                  {log.event_type}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {new Date(log.created_at).toLocaleString()}
                </span>
                {log.file_path && (
                  <code style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    {log.file_path.split(/[/\\]/).pop()}
                  </code>
                )}
              </div>

              <div style={{ display: "flex", gap: 20, fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                <span>📤 {log.tokens_prompt?.toLocaleString()} prompt tokens</span>
                <span>📥 {log.tokens_response?.toLocaleString()} response tokens</span>
                {log.tokens_saved > 0 && (
                  <span style={{ color: "var(--accent-green)" }}>
                    💾 {log.tokens_saved?.toLocaleString()} saved
                  </span>
                )}
              </div>

              {log.prompt_summary && (
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                  <strong>Prompt:</strong> {log.prompt_summary}
                </div>
              )}
              {log.response_summary && (
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  <strong>Response:</strong> {log.response_summary}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
              <button className="btn-secondary" style={{ fontSize: 11, padding: "4px 10px" }}
                onClick={() => onEdit(log)}>✏️</button>
              <button className="btn-danger" style={{ fontSize: 11, padding: "4px 10px" }}
                onClick={() => { if (window.confirm("Delete?")) onDelete(log.id); }}>🗑</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChangesTab({ changes }) {
  if (changes.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
        <div style={{ color: "var(--text-secondary)" }}>No file changes detected yet.</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          Start watching your project to auto-track file changes.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {changes.map(c => (
        <div key={c.id} className="card" style={{ padding: "10px 14px", display: "flex",
          justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <code style={{ fontSize: 12, color: "var(--accent)" }}>
              {c.file_path.split(/[/\\]/).slice(-2).join("/")}
            </code>
            <span className={`badge ${c.event_type === "created" ? "badge-green" : "badge-blue"}`}
              style={{ marginLeft: 8 }}>
              {c.event_type}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", gap: 16 }}>
            <span className="mono">{c.token_count?.toLocaleString()} tokens</span>
            <span style={{ color: "var(--text-muted)" }}>{new Date(c.created_at).toLocaleTimeString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function LogFormModal({ projectId, initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    prompt_text:      initial?.prompt_text      || "",
    response_text:    initial?.response_text    || "",
    prompt_summary:   initial?.prompt_summary   || "",
    response_summary: initial?.response_summary || "",
    before_content:   initial?.before_content   || "",
    after_content:    initial?.after_content    || "",
    file_path:        initial?.file_path        || "",
    event_type:       initial?.event_type       || "manual",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      if (isEdit) {
        await updateLog(initial.id, form);
      } else {
        await createLog(projectId, form);
      }
      onSaved(); onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  const F = ({ label, name, multi, rows = 3 }) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
        {label}
      </label>
      {multi ? (
        <textarea rows={rows} value={form[name]}
          onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
          style={{ width: "100%", resize: "vertical", fontFamily: "var(--font-mono)", fontSize: 12 }} />
      ) : (
        <input value={form[name]}
          onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
          style={{ width: "100%" }} />
      )}
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
    }} onClick={onClose}>
      <div style={{
        background: "var(--bg-secondary)", borderRadius: 12,
        border: "1px solid var(--border)", padding: 24,
        width: "min(720px, 95vw)", maxHeight: "90vh", overflow: "auto",
      }} onClick={e => e.stopPropagation()} className="scrollbar">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
          {isEdit ? "Edit Prompt Log" : "Add Prompt Log"}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <F label="File Path" name="file_path" />
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                Event Type
              </label>
              <select value={form.event_type}
                onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
                style={{ width: "100%" }}>
                <option value="manual">manual</option>
                <option value="ai-edit">ai-edit</option>
                <option value="refactor">refactor</option>
                <option value="debug">debug</option>
                <option value="review">review</option>
              </select>
            </div>
          </div>

          <F label="Prompt Text" name="prompt_text" multi rows={4} />
          <F label="Response Text" name="response_text" multi rows={4} />
          <F label="Prompt Summary (short)" name="prompt_summary" />
          <F label="Response Summary (short)" name="response_summary" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <F label="Before Content (optional)" name="before_content" multi rows={3} />
            <F label="After Content (optional)"  name="after_content"  multi rows={3} />
          </div>

          {error && <p style={{ color: "var(--accent-red)", fontSize: 12, margin: "8px 0" }}>{error}</p>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving…" : (isEdit ? "Update" : "Save Log")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

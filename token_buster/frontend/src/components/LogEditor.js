import React, { useEffect, useState } from "react";
import { getLogs, updateLog, deleteLog, createLog } from "../api";

export default function LogEditor({ project }) {
  const [logs, setLogs]     = useState([]);
  const [selected, setSel]  = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [project.id]);

  async function load() {
    try { const l = await getLogs(project.id, 100); setLogs(l); }
    catch (_) {}
  }

  async function handleSave(log) {
    setSaving(true);
    try {
      await updateLog(log.id, {
        prompt_summary: log.prompt_summary,
        response_summary: log.response_summary,
        after_content: log.after_content,
      });
      await load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, height: "calc(100vh - 140px)" }}>
      {/* List */}
      <div className="card scrollbar" style={{ overflow: "auto", padding: "12px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          {project.name} — Logs
        </div>
        {logs.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 12 }}>No logs yet.</p>
        )}
        {logs.map(l => (
          <div key={l.id}
            onClick={() => setSel({ ...l })}
            style={{
              padding: "10px", borderRadius: 6, cursor: "pointer",
              background: selected?.id === l.id ? "var(--bg-hover)" : "transparent",
              marginBottom: 2,
            }}>
            <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden",
              textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {l.prompt_summary || "(no summary)"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 8 }}>
              <span className={`badge ${l.event_type === "manual" ? "badge-blue" : "badge-orange"}`}
                style={{ fontSize: 10 }}>{l.event_type}</span>
              <span>{new Date(l.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Editor */}
      {selected ? (
        <EditPanel key={selected.id} log={selected} onSave={handleSave}
          onDelete={async () => {
            if (!window.confirm("Delete this log?")) return;
            await deleteLog(selected.id);
            setSel(null); load();
          }} saving={saving} />
      ) : (
        <div className="card" style={{ display: "flex", alignItems: "center",
          justifyContent: "center", flexDirection: "column", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✏️</div>
          <div>Select a log to edit</div>
        </div>
      )}
    </div>
  );
}

function EditPanel({ log, onSave, onDelete, saving }) {
  const [data, setData] = useState(log);
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  return (
    <div className="card scrollbar" style={{ overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Edit Log #{log.id}</h3>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn-danger" style={{ fontSize: 12 }} onClick={onDelete}>🗑 Delete</button>
          <button className="btn-primary" style={{ fontSize: 12 }}
            onClick={() => onSave(data)} disabled={saving}>
            {saving ? "Saving…" : "💾 Save"}
          </button>
        </div>
      </div>

      {[
        ["Prompt Summary", "prompt_summary", false],
        ["Response Summary", "response_summary", false],
        ["After Content (updated file)", "after_content", true],
      ].map(([label, key, multi]) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
            {label}
          </label>
          {multi ? (
            <textarea rows={6} value={data[key] || ""} onChange={e => set(key, e.target.value)}
              style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 12, resize: "vertical" }} />
          ) : (
            <input value={data[key] || ""} onChange={e => set(key, e.target.value)}
              style={{ width: "100%" }} />
          )}
        </div>
      ))}

      {/* Read-only fields */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 8 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
          Read-only — original prompt & response
        </div>
        {[
          ["Prompt Text", log.prompt_text],
          ["Response Text", log.response_text],
        ].map(([l, v]) => v ? (
          <div key={l} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{l}</div>
            <pre style={{
              background: "var(--bg-primary)", padding: 10, borderRadius: 6,
              fontSize: 11, overflowX: "auto", color: "var(--text-secondary)",
              fontFamily: "var(--font-mono)", border: "1px solid var(--border)",
              maxHeight: 150, overflow: "auto",
            }}>{v}</pre>
          </div>
        ) : null)}
      </div>
    </div>
  );
}

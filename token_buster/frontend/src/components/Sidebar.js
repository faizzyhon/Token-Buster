import React, { useState, useEffect } from "react";
import { listProjects, createProject } from "../api";

const NAV = [
  { id: "dashboard",  icon: "📊", label: "Dashboard" },
  { id: "tokenizer",  icon: "🔢", label: "Token Counter" },
];

export default function Sidebar({ open, view, onNavigate, onToggle, globalStats, onOpenProject, selectedProject }) {
  const [projects, setProjects] = useState([]);
  const [showNew, setShowNew]   = useState(false);
  const [form, setForm]         = useState({ name: "", path: "", description: "" });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    try { setProjects(await listProjects()); } catch (_) {}
  }

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const p = await createProject(form);
      setProjects(prev => [p, ...prev]);
      setShowNew(false);
      setForm({ name: "", path: "", description: "" });
      onOpenProject(p);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  const w = open ? 260 : 60;

  return (
    <aside style={{
      position: "fixed", top: 0, left: 0, height: "100vh",
      width: w, background: "var(--bg-secondary)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      transition: "width 0.25s ease", overflow: "hidden", zIndex: 100,
    }}>
      {/* Toggle */}
      <button onClick={onToggle} style={{
        background: "none", border: "none", color: "var(--text-secondary)",
        padding: "16px", textAlign: open ? "right" : "center", fontSize: 16,
        cursor: "pointer",
      }}>
        {open ? "◀" : "▶"}
      </button>

      {/* Global stats pills */}
      {open && globalStats && (
        <div style={{ padding: "0 12px 12px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span className="badge badge-blue">
            {(globalStats.total_tokens || 0).toLocaleString()} tokens
          </span>
          <span className="badge badge-green">
            {(globalStats.total_saved || 0).toLocaleString()} saved
          </span>
        </div>
      )}

      {/* Nav */}
      <nav style={{ padding: "0 8px" }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => onNavigate(n.id)}
            className="btn-secondary"
            style={{
              width: "100%", textAlign: "left", marginBottom: 2,
              display: "flex", alignItems: "center", gap: 10,
              background: view === n.id ? "var(--bg-hover)" : "transparent",
              border: "none", color: view === n.id ? "var(--accent)" : "var(--text-primary)",
              padding: open ? "8px 12px" : "8px",
              justifyContent: open ? "flex-start" : "center",
              borderRadius: 6,
            }}>
            <span>{n.icon}</span>
            {open && <span>{n.label}</span>}
          </button>
        ))}
      </nav>

      {/* Projects */}
      {open && (
        <div style={{ flex: 1, overflow: "auto", padding: "12px 8px 0" }}
          className="scrollbar">
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 4px 8px", color: "var(--text-secondary)", fontSize: 11,
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            <span>Projects</span>
            <button onClick={() => setShowNew(v => !v)} style={{
              background: "none", border: "none", color: "var(--accent)",
              cursor: "pointer", fontSize: 18, lineHeight: 1,
            }}>+</button>
          </div>

          {showNew && (
            <form onSubmit={handleCreate} style={{
              background: "var(--bg-card)", borderRadius: 8, padding: 12,
              marginBottom: 8, border: "1px solid var(--border)",
            }}>
              <input placeholder="Project name" required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ width: "100%", marginBottom: 6 }} />
              <input placeholder="/path/to/project" required value={form.path}
                onChange={e => setForm(f => ({ ...f, path: e.target.value }))}
                style={{ width: "100%", marginBottom: 6 }} />
              <input placeholder="Description (optional)" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ width: "100%", marginBottom: 8 }} />
              {error && <p style={{ color: "var(--accent-red)", fontSize: 12, marginBottom: 6 }}>{error}</p>}
              <div style={{ display: "flex", gap: 6 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, fontSize: 12 }}
                  disabled={loading}>{loading ? "Creating…" : "Create"}</button>
                <button type="button" className="btn-secondary" style={{ fontSize: 12 }}
                  onClick={() => setShowNew(false)}>✕</button>
              </div>
            </form>
          )}

          {projects.map(p => (
            <button key={p.id} onClick={() => onOpenProject(p)}
              style={{
                width: "100%", textAlign: "left", background: "none",
                border: "none", borderRadius: 6, padding: "8px 10px",
                color: selectedProject?.id === p.id ? "var(--accent)" : "var(--text-primary)",
                background: selectedProject?.id === p.id ? "var(--bg-hover)" : "transparent",
                cursor: "pointer", fontSize: 13, marginBottom: 1,
                display: "flex", alignItems: "center", gap: 8,
              }}>
              <span style={{ fontSize: 10, color: p.is_watching ? "var(--accent-green)" : "var(--text-muted)" }}>
                {p.is_watching ? "●" : "○"}
              </span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.name}
              </span>
            </button>
          ))}

          {projects.length === 0 && !showNew && (
            <p style={{ color: "var(--text-muted)", fontSize: 12, padding: "4px 10px" }}>
              No projects yet. Click + to add one.
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      {open && (
        <div style={{
          padding: "12px 12px 16px", borderTop: "1px solid var(--border)",
          fontSize: 11, color: "var(--text-muted)",
        }}>
          <div>⚡ Token Buster v1.0</div>
          <div style={{ marginTop: 4 }}>
            <a href="https://github.com/faizzyhon" target="_blank" rel="noreferrer"
              style={{ color: "var(--accent)", marginRight: 8 }}>GitHub</a>
            <a href="https://instagram.com/faizzyhon" target="_blank" rel="noreferrer"
              style={{ color: "var(--accent-purple)" }}>Instagram</a>
          </div>
          <div style={{ marginTop: 2 }}>by Muhammad Faizan</div>
        </div>
      )}
    </aside>
  );
}

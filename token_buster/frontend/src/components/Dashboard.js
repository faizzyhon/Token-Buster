import React, { useEffect, useState } from "react";
import { listProjects, startWatch, stopWatch, deleteProject } from "../api";

function StatCard({ label, value, sub, color = "var(--accent)" }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "var(--font-mono)" }}>
        {typeof value === "number" ? value.toLocaleString() : (value || "—")}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard({ globalStats, onOpenProject }) {
  const [projects, setProjects] = useState([]);
  const [toggling, setToggling] = useState({});

  useEffect(() => { load(); }, []);

  async function load() {
    try { setProjects(await listProjects()); } catch (_) {}
  }

  async function toggleWatch(p, e) {
    e.stopPropagation();
    setToggling(t => ({ ...t, [p.id]: true }));
    try {
      if (p.is_watching) await stopWatch(p.id);
      else await startWatch(p.id);
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setToggling(t => ({ ...t, [p.id]: false }));
    }
  }

  async function handleDelete(p, e) {
    e.stopPropagation();
    if (!window.confirm(`Delete project "${p.name}"?`)) return;
    try { await deleteProject(p.id); await load(); } catch (err) { alert(err.message); }
  }

  const gs = globalStats || {};
  const totalSaved = gs.total_saved || 0;
  const totalTokens = gs.total_tokens || 0;
  const reductionPct = totalTokens > 0 ? Math.round((totalSaved / totalTokens) * 100) : 0;

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Dashboard</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
        Global token usage across all projects
      </p>

      {/* Global Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
        <StatCard label="Total Tokens Used" value={totalTokens}
          sub="across all projects" color="var(--accent)" />
        <StatCard label="Tokens Saved" value={totalSaved}
          sub="by Token Buster" color="var(--accent-green)" />
        <StatCard label="Reduction" value={`${reductionPct}%`}
          sub="avg token reduction" color="var(--accent-orange)" />
        <StatCard label="Projects" value={gs.projects || projects.length}
          sub="tracked" color="var(--accent-purple)" />
      </div>

      {/* Projects Table */}
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>Projects</h2>
      </div>

      {projects.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
          <div style={{ color: "var(--text-secondary)", marginBottom: 8 }}>No projects yet</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Use the + button in the sidebar to create your first project.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {projects.map(p => {
            const stats = p.stats || {};
            const saved = stats.total_saved || 0;
            const used  = (stats.total_input_tokens || 0) + (stats.total_output_tokens || 0);
            const pct   = used > 0 ? Math.round((saved / used) * 100) : 0;

            return (
              <div key={p.id} className="card"
                onClick={() => onOpenProject(p)}
                style={{ cursor: "pointer", transition: "border-color 0.15s",
                  borderColor: "var(--border)" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</span>
                      <span className={`badge ${p.is_watching ? "badge-green" : "badge-orange"}`}>
                        {p.is_watching ? "● Watching" : "○ Idle"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
                      {p.path}
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-secondary)" }}>
                      <span>🔢 {used.toLocaleString()} tokens</span>
                      <span style={{ color: "var(--accent-green)" }}>💾 {saved.toLocaleString()} saved</span>
                      <span>📝 {stats.total_prompts || 0} prompts</span>
                      <span>📁 {stats.total_file_changes || 0} changes</span>
                      {pct > 0 && <span className="badge badge-green">{pct}% reduction</span>}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, marginLeft: 12 }} onClick={e => e.stopPropagation()}>
                    <button
                      className={p.is_watching ? "btn-secondary" : "btn-green"}
                      style={{ fontSize: 12, padding: "6px 12px" }}
                      disabled={toggling[p.id]}
                      onClick={e => toggleWatch(p, e)}>
                      {toggling[p.id] ? "…" : (p.is_watching ? "⏹ Stop" : "▶ Watch")}
                    </button>
                    <button className="btn-danger" style={{ fontSize: 12, padding: "6px 10px" }}
                      onClick={e => handleDelete(p, e)}>🗑</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Branding */}
      <div style={{
        marginTop: 48, padding: "20px", background: "var(--bg-card)",
        borderRadius: 12, border: "1px solid var(--border)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>⚡ Token Buster v1.0</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Reduce AI token usage by 5x-10x. Built for developers who care about efficiency.
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
          <a href="https://github.com/faizzyhon" target="_blank" rel="noreferrer"
            style={{ color: "var(--accent)" }}>github.com/faizzyhon</a>
          <a href="https://instagram.com/faizzyhon" target="_blank" rel="noreferrer"
            style={{ color: "var(--accent-purple)" }}>instagram.com/faizzyhon</a>
        </div>
      </div>
    </div>
  );
}

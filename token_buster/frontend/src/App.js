/**
 * Token Buster - Main App
 * Author: Muhammad Faizan | github.com/faizzyhon | instagram.com/faizzyhon
 */

import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ProjectView from "./components/ProjectView";
import LogEditor from "./components/LogEditor";
import TokenCounter from "./components/TokenCounter";
import ContextLogModal from "./components/ContextLogModal";
import { getGlobalStats } from "./api";

export default function App() {
  const [view, setView]               = useState("dashboard");
  const [selectedProject, setProject] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [showContextLog, setShowCtx]  = useState(false);
  const [sidebarOpen, setSidebar]     = useState(true);

  useEffect(() => {
    loadStats();
    const id = setInterval(loadStats, 30_000);
    return () => clearInterval(id);
  }, []);

  async function loadStats() {
    try { setGlobalStats(await getGlobalStats()); } catch (_) {}
  }

  function openProject(p) {
    setProject(p);
    setView("project");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Sidebar
        open={sidebarOpen}
        view={view}
        onNavigate={setView}
        onToggle={() => setSidebar(v => !v)}
        globalStats={globalStats}
        onOpenProject={openProject}
        selectedProject={selectedProject}
      />

      <main style={{
        flex: 1,
        marginLeft: sidebarOpen ? 260 : 60,
        transition: "margin-left 0.25s ease",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Top bar */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 24px", borderBottom: "1px solid var(--border)",
          background: "var(--bg-secondary)", position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>
              ⚡ Token Buster
            </span>
            {selectedProject && view === "project" && (
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                / {selectedProject.name}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {selectedProject && view === "project" && (
              <button className="btn-secondary" style={{ fontSize: 12 }}
                onClick={() => setShowCtx(true)}>
                📋 Context Log
              </button>
            )}
            <a href="https://github.com/faizzyhon" target="_blank" rel="noreferrer"
              style={{ color: "var(--text-secondary)", fontSize: 12, textDecoration: "none" }}>
              @faizzyhon
            </a>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, padding: "24px" }}>
          {view === "dashboard" && (
            <Dashboard
              globalStats={globalStats}
              onOpenProject={openProject}
              onNavigate={setView}
            />
          )}
          {view === "project" && selectedProject && (
            <ProjectView
              project={selectedProject}
              onBack={() => setView("dashboard")}
              onProjectUpdate={p => setProject(p)}
            />
          )}
          {view === "log-editor" && selectedProject && (
            <LogEditor project={selectedProject} />
          )}
          {view === "tokenizer" && (
            <TokenCounter />
          )}
        </div>
      </main>

      {showContextLog && selectedProject && (
        <ContextLogModal
          project={selectedProject}
          onClose={() => setShowCtx(false)}
        />
      )}
    </div>
  );
}

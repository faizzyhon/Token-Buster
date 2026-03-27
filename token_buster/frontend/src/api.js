/**
 * Token Buster API Client
 * Author: Muhammad Faizan | github.com/faizzyhon | instagram.com/faizzyhon
 */

const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "API error");
  return json.data;
}

// ── Global ───────────────────────────────────────────────────────────────────
export const getGlobalStats  = ()       => request("GET",  "/api/stats/global");
export const getHealth       = ()       => request("GET",  "/api/health");

// ── Projects ─────────────────────────────────────────────────────────────────
export const listProjects    = ()       => request("GET",  "/api/projects");
export const getProject      = (id)     => request("GET",  `/api/projects/${id}`);
export const createProject   = (data)   => request("POST", "/api/projects", data);
export const updateProject   = (id, d)  => request("PUT",  `/api/projects/${id}`, d);
export const deleteProject   = (id)     => request("DELETE",`/api/projects/${id}`);

// ── Watching ─────────────────────────────────────────────────────────────────
export const startWatch      = (id)     => request("POST", `/api/projects/${id}/watch`);
export const stopWatch       = (id)     => request("DELETE",`/api/projects/${id}/watch`);

// ── Logs ─────────────────────────────────────────────────────────────────────
export const getLogs         = (id, l)  => request("GET",  `/api/projects/${id}/logs?limit=${l||50}`);
export const createLog       = (id, d)  => request("POST", `/api/projects/${id}/logs`, d);
export const updateLog       = (lid, d) => request("PUT",  `/api/logs/${lid}`, d);
export const deleteLog       = (lid)    => request("DELETE",`/api/logs/${lid}`);

// ── Changes ──────────────────────────────────────────────────────────────────
export const getChanges      = (id, l)  => request("GET",  `/api/projects/${id}/changes?limit=${l||100}`);

// ── Context Log ──────────────────────────────────────────────────────────────
export const getContextLog   = (id, n)  => request("GET",  `/api/projects/${id}/context-log?notes=${n||""}`);

// ── Tokenize ─────────────────────────────────────────────────────────────────
export const tokenizeText    = (text, model) => request("POST", "/api/tokenize", { text, model });

// ── Diff ─────────────────────────────────────────────────────────────────────
export const diffTexts       = (old_, new_)  => request("POST", "/api/diff", { old: old_, new: new_ });

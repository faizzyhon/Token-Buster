"""
Token Buster - Flask API Backend
Author: Muhammad Faizan | github.com/faizzyhon | instagram.com/faizzyhon

REST API for the Token Buster dashboard.
"""

import os
import sys
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from datetime import datetime

# Ensure package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from token_buster.db.database import get_db
from token_buster.core.tokenizer import get_engine
from token_buster.core.watcher import get_watcher
from token_buster.core.summarizer import (
    generate_context_log,
    generate_prompt_diff_log,
    extract_key_changes,
)

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def ok(data=None, message="OK", code=200):
    return jsonify({"status": "ok", "message": message, "data": data}), code

def err(message="Error", code=400):
    return jsonify({"status": "error", "message": message}), code


# ─────────────────────────────────────────────────────────────────────────────
# Frontend catch-all
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    index = os.path.join(app.static_folder, "index.html")
    if os.path.exists(index):
        return send_from_directory(app.static_folder, "index.html")
    return jsonify({"status": "ok", "app": "Token Buster API", "version": "1.0.0",
                    "author": "Muhammad Faizan", "github": "github.com/faizzyhon",
                    "instagram": "instagram.com/faizzyhon"})


# ─────────────────────────────────────────────────────────────────────────────
# Health & Info
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/health")
def health():
    return ok({
        "status": "running",
        "time": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "author": "Muhammad Faizan",
        "github": "https://github.com/faizzyhon",
        "instagram": "https://instagram.com/faizzyhon",
    })

@app.route("/api/stats/global")
def global_stats():
    db = get_db()
    stats = db.get_global_stats()
    daily = db.get_daily_tokens(days=30)
    return ok({**stats, "daily_tokens": daily})


# ─────────────────────────────────────────────────────────────────────────────
# Projects
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/projects", methods=["GET"])
def list_projects():
    db = get_db()
    projects = db.list_projects()
    for p in projects:
        p["stats"] = db.get_project_stats(p["id"])
    return ok(projects)


@app.route("/api/projects", methods=["POST"])
def create_project():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    path = data.get("path", "").strip()
    description = data.get("description", "")

    if not name or not path:
        return err("'name' and 'path' are required.")
    if not os.path.isdir(path):
        return err(f"Directory not found: {path}")

    db = get_db()
    project = db.create_project(name=name, path=path, description=description)
    return ok(project, "Project created.", 201)


@app.route("/api/projects/<int:project_id>", methods=["GET"])
def get_project(project_id):
    db = get_db()
    project = db.get_project(project_id)
    if not project:
        return err("Project not found.", 404)
    project["stats"] = db.get_project_stats(project_id)
    project["daily_tokens"] = db.get_daily_tokens(project_id, days=14)
    return ok(project)


@app.route("/api/projects/<int:project_id>", methods=["PUT"])
def update_project(project_id):
    data = request.get_json() or {}
    db = get_db()
    if not db.get_project(project_id):
        return err("Project not found.", 404)
    db.update_project(project_id, **data)
    return ok(db.get_project(project_id))


@app.route("/api/projects/<int:project_id>", methods=["DELETE"])
def delete_project(project_id):
    db = get_db()
    get_watcher().stop(project_id)
    db.delete_project(project_id)
    return ok(message="Project deleted.")


# ─────────────────────────────────────────────────────────────────────────────
# File Watching
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/projects/<int:project_id>/watch", methods=["POST"])
def start_watch(project_id):
    db = get_db()
    project = db.get_project(project_id)
    if not project:
        return err("Project not found.", 404)

    success = get_watcher().start(project_id, project["path"])
    if success:
        db.update_project(project_id, is_watching=1)
        return ok({"watching": True, "path": project["path"]})
    return err("Could not start watcher. Check path and watchdog installation.")


@app.route("/api/projects/<int:project_id>/watch", methods=["DELETE"])
def stop_watch(project_id):
    db = get_db()
    get_watcher().stop(project_id)
    db.update_project(project_id, is_watching=0)
    return ok({"watching": False})


# ─────────────────────────────────────────────────────────────────────────────
# Prompt Logs
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/projects/<int:project_id>/logs", methods=["GET"])
def get_logs(project_id):
    limit = min(int(request.args.get("limit", 50)), 200)
    db = get_db()
    logs = db.get_prompt_logs(project_id, limit=limit)
    return ok(logs)


@app.route("/api/projects/<int:project_id>/logs", methods=["POST"])
def create_log(project_id):
    data = request.get_json() or {}
    db = get_db()
    engine = get_engine()

    prompt_text     = data.get("prompt_text", "")
    response_text   = data.get("response_text", "")
    before_content  = data.get("before_content", "")
    after_content   = data.get("after_content", "")
    file_path       = data.get("file_path", "")
    event_type      = data.get("event_type", "manual")

    # Auto-compute tokens
    tokens_prompt   = engine.count_tokens(prompt_text)
    tokens_response = engine.count_tokens(response_text)

    # Compute savings vs sending full file contents
    diff = engine.diff_tokens(before_content, after_content) if before_content else {}
    tokens_saved = diff.get("tokens_saved", 0)

    # Auto-summarize
    prompt_summary   = data.get("prompt_summary")   or prompt_text[:200]
    response_summary = data.get("response_summary") or response_text[:200]

    log_id = db.log_prompt(
        project_id=project_id,
        file_path=file_path,
        event_type=event_type,
        prompt_text=prompt_text,
        response_text=response_text,
        prompt_summary=prompt_summary,
        response_summary=response_summary,
        before_content=before_content,
        after_content=after_content,
        tokens_prompt=tokens_prompt,
        tokens_response=tokens_response,
        tokens_saved=tokens_saved,
    )

    return ok({"id": log_id, "tokens_prompt": tokens_prompt,
               "tokens_response": tokens_response, "tokens_saved": tokens_saved}, code=201)


@app.route("/api/logs/<int:log_id>", methods=["PUT"])
def update_log(log_id):
    data = request.get_json() or {}
    db = get_db()
    db.update_prompt_log(log_id, **data)
    return ok(message="Log updated.")


@app.route("/api/logs/<int:log_id>", methods=["DELETE"])
def delete_log(log_id):
    db = get_db()
    db.delete_prompt_log(log_id)
    return ok(message="Log deleted.")


# ─────────────────────────────────────────────────────────────────────────────
# File Changes
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/projects/<int:project_id>/changes", methods=["GET"])
def get_changes(project_id):
    limit = min(int(request.args.get("limit", 100)), 500)
    db = get_db()
    changes = db.get_file_changes(project_id, limit=limit)
    return ok(changes)


# ─────────────────────────────────────────────────────────────────────────────
# Token Count (utility)
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/tokenize", methods=["POST"])
def tokenize():
    data = request.get_json() or {}
    text  = data.get("text", "")
    model = data.get("model", "claude-3-5-sonnet")
    engine = get_engine()
    count = engine.count_tokens(text)
    cost  = engine.estimate_cost(count, model)
    return ok({**cost, "char_count": len(text)})


# ─────────────────────────────────────────────────────────────────────────────
# Context Log Generator
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/projects/<int:project_id>/context-log", methods=["GET"])
def context_log(project_id):
    db = get_db()
    project = db.get_project(project_id)
    if not project:
        return err("Project not found.", 404)

    changes = db.get_file_changes(project_id, limit=20)
    logs    = db.get_prompt_logs(project_id, limit=10)
    active_files = list({c["file_path"] for c in changes})[:10]

    result = generate_context_log(
        project_name=project["name"],
        changes=[{**c, "prompt_summary": ""} for c in logs],
        active_files=active_files,
        notes=request.args.get("notes", ""),
    )
    return ok(result)


# ─────────────────────────────────────────────────────────────────────────────
# Diff Endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/api/diff", methods=["POST"])
def diff_tokens():
    data = request.get_json() or {}
    old = data.get("old", "")
    new = data.get("new", "")
    engine = get_engine()
    result = engine.diff_tokens(old, new)
    result["key_changes"] = extract_key_changes(old, new)
    return ok(result)


if __name__ == "__main__":
    port = int(os.environ.get("TOKEN_BUSTER_PORT", 5000))
    debug = os.environ.get("TOKEN_BUSTER_DEBUG", "0") == "1"
    print(f"\n{'='*55}")
    print(f"  Token Buster v1.0  |  Muhammad Faizan")
    print(f"  github.com/faizzyhon  |  instagram.com/faizzyhon")
    print(f"  Running at http://localhost:{port}")
    print(f"{'='*55}\n")
    app.run(host="0.0.0.0", port=port, debug=debug)

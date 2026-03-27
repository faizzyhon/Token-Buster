"""
Token Buster - SQLite Database Layer
Author: Muhammad Faizan | github.com/faizzyhon | instagram.com/faizzyhon
"""

import sqlite3
import os
from datetime import datetime
from typing import Optional
from pathlib import Path

DB_PATH = os.environ.get(
    "TOKEN_BUSTER_DB",
    str(Path.home() / ".token_buster" / "token_buster.db")
)


def _get_connection() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


class Database:
    def __init__(self):
        self.conn = _get_connection()
        self._init_schema()

    def _init_schema(self):
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS projects (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT NOT NULL UNIQUE,
                path        TEXT NOT NULL,
                description TEXT,
                created_at  TEXT DEFAULT (datetime('now')),
                is_watching INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS prompt_logs (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id      INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                file_path       TEXT,
                event_type      TEXT DEFAULT 'manual',
                prompt_text     TEXT,
                response_text   TEXT,
                prompt_summary  TEXT,
                response_summary TEXT,
                before_content  TEXT,
                after_content   TEXT,
                tokens_prompt   INTEGER DEFAULT 0,
                tokens_response INTEGER DEFAULT 0,
                tokens_saved    INTEGER DEFAULT 0,
                created_at      TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS file_changes (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id      INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                file_path       TEXT NOT NULL,
                event_type      TEXT NOT NULL,
                token_count     INTEGER DEFAULT 0,
                content_snapshot TEXT,
                created_at      TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS token_sessions (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id      INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                total_tokens    INTEGER DEFAULT 0,
                tokens_saved    INTEGER DEFAULT 0,
                session_date    TEXT DEFAULT (date('now')),
                model           TEXT DEFAULT 'claude-3-5-sonnet'
            );

            CREATE INDEX IF NOT EXISTS idx_prompt_logs_project ON prompt_logs(project_id);
            CREATE INDEX IF NOT EXISTS idx_file_changes_project ON file_changes(project_id);
            CREATE INDEX IF NOT EXISTS idx_file_changes_path ON file_changes(file_path);
        """)
        self.conn.commit()

    # ── Projects ─────────────────────────────────────────────────────────────

    def create_project(self, name: str, path: str, description: str = "") -> dict:
        cur = self.conn.execute(
            "INSERT OR IGNORE INTO projects (name, path, description) VALUES (?,?,?)",
            (name, path, description)
        )
        self.conn.commit()
        return self.get_project_by_name(name)

    def get_project(self, project_id: int) -> Optional[dict]:
        row = self.conn.execute(
            "SELECT * FROM projects WHERE id=?", (project_id,)
        ).fetchone()
        return dict(row) if row else None

    def get_project_by_name(self, name: str) -> Optional[dict]:
        row = self.conn.execute(
            "SELECT * FROM projects WHERE name=?", (name,)
        ).fetchone()
        return dict(row) if row else None

    def list_projects(self) -> list[dict]:
        rows = self.conn.execute(
            "SELECT * FROM projects ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]

    def update_project(self, project_id: int, **kwargs) -> bool:
        allowed = {"name", "path", "description", "is_watching"}
        fields = {k: v for k, v in kwargs.items() if k in allowed}
        if not fields:
            return False
        sets = ", ".join(f"{k}=?" for k in fields)
        self.conn.execute(
            f"UPDATE projects SET {sets} WHERE id=?",
            (*fields.values(), project_id)
        )
        self.conn.commit()
        return True

    def delete_project(self, project_id: int) -> bool:
        self.conn.execute("DELETE FROM projects WHERE id=?", (project_id,))
        self.conn.commit()
        return True

    # ── Prompt Logs ───────────────────────────────────────────────────────────

    def log_prompt(
        self,
        project_id: int,
        file_path: str = "",
        event_type: str = "manual",
        prompt_text: str = "",
        response_text: str = "",
        prompt_summary: str = "",
        response_summary: str = "",
        before_content: str = "",
        after_content: str = "",
        tokens_prompt: int = 0,
        tokens_response: int = 0,
        tokens_saved: int = 0,
    ) -> int:
        cur = self.conn.execute(
            """INSERT INTO prompt_logs
               (project_id, file_path, event_type, prompt_text, response_text,
                prompt_summary, response_summary, before_content, after_content,
                tokens_prompt, tokens_response, tokens_saved)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (project_id, file_path, event_type, prompt_text, response_text,
             prompt_summary, response_summary, before_content, after_content,
             tokens_prompt, tokens_response, tokens_saved)
        )
        self.conn.commit()
        # Update session stats
        self._update_session(project_id, tokens_prompt + tokens_response, tokens_saved)
        return cur.lastrowid

    def get_prompt_logs(self, project_id: int, limit: int = 50) -> list[dict]:
        rows = self.conn.execute(
            """SELECT * FROM prompt_logs WHERE project_id=?
               ORDER BY created_at DESC LIMIT ?""",
            (project_id, limit)
        ).fetchall()
        return [dict(r) for r in rows]

    def update_prompt_log(self, log_id: int, **kwargs) -> bool:
        allowed = {
            "prompt_text", "response_text", "prompt_summary",
            "response_summary", "after_content", "tokens_saved"
        }
        fields = {k: v for k, v in kwargs.items() if k in allowed}
        if not fields:
            return False
        sets = ", ".join(f"{k}=?" for k in fields)
        self.conn.execute(
            f"UPDATE prompt_logs SET {sets} WHERE id=?",
            (*fields.values(), log_id)
        )
        self.conn.commit()
        return True

    def delete_prompt_log(self, log_id: int) -> bool:
        self.conn.execute("DELETE FROM prompt_logs WHERE id=?", (log_id,))
        self.conn.commit()
        return True

    # ── File Changes ──────────────────────────────────────────────────────────

    def log_file_change(
        self,
        project_id: int,
        file_path: str,
        event_type: str,
        token_count: int,
        content_snapshot: str = "",
    ) -> int:
        cur = self.conn.execute(
            """INSERT INTO file_changes
               (project_id, file_path, event_type, token_count, content_snapshot)
               VALUES (?,?,?,?,?)""",
            (project_id, file_path, event_type, token_count, content_snapshot)
        )
        self.conn.commit()
        return cur.lastrowid

    def get_file_changes(self, project_id: int, limit: int = 100) -> list[dict]:
        rows = self.conn.execute(
            """SELECT * FROM file_changes WHERE project_id=?
               ORDER BY created_at DESC LIMIT ?""",
            (project_id, limit)
        ).fetchall()
        return [dict(r) for r in rows]

    # ── Sessions & Stats ──────────────────────────────────────────────────────

    def _update_session(self, project_id: int, tokens_used: int, tokens_saved: int):
        today = datetime.utcnow().date().isoformat()
        existing = self.conn.execute(
            "SELECT id FROM token_sessions WHERE project_id=? AND session_date=?",
            (project_id, today)
        ).fetchone()
        if existing:
            self.conn.execute(
                """UPDATE token_sessions
                   SET total_tokens=total_tokens+?, tokens_saved=tokens_saved+?
                   WHERE id=?""",
                (tokens_used, tokens_saved, existing["id"])
            )
        else:
            self.conn.execute(
                """INSERT INTO token_sessions (project_id, total_tokens, tokens_saved, session_date)
                   VALUES (?,?,?,?)""",
                (project_id, tokens_used, tokens_saved, today)
            )
        self.conn.commit()

    def get_project_stats(self, project_id: int) -> dict:
        row = self.conn.execute(
            """SELECT
                COUNT(pl.id)            AS total_prompts,
                SUM(pl.tokens_prompt)   AS total_input_tokens,
                SUM(pl.tokens_response) AS total_output_tokens,
                SUM(pl.tokens_saved)    AS total_saved,
                MAX(pl.created_at)      AS last_activity
               FROM prompt_logs pl WHERE pl.project_id=?""",
            (project_id,)
        ).fetchone()
        stats = dict(row) if row else {}
        stats["total_input_tokens"] = stats.get("total_input_tokens") or 0
        stats["total_output_tokens"] = stats.get("total_output_tokens") or 0
        stats["total_saved"] = stats.get("total_saved") or 0

        file_row = self.conn.execute(
            "SELECT COUNT(*) AS cnt FROM file_changes WHERE project_id=?",
            (project_id,)
        ).fetchone()
        stats["total_file_changes"] = file_row["cnt"] if file_row else 0
        return stats

    def get_global_stats(self) -> dict:
        row = self.conn.execute(
            """SELECT
                COUNT(DISTINCT project_id) AS projects,
                SUM(tokens_prompt + tokens_response) AS total_tokens,
                SUM(tokens_saved) AS total_saved
               FROM prompt_logs"""
        ).fetchone()
        return dict(row) if row else {"projects": 0, "total_tokens": 0, "total_saved": 0}

    def get_daily_tokens(self, project_id: Optional[int] = None, days: int = 30) -> list[dict]:
        if project_id:
            rows = self.conn.execute(
                """SELECT session_date, SUM(total_tokens) AS tokens, SUM(tokens_saved) AS saved
                   FROM token_sessions WHERE project_id=?
                   GROUP BY session_date ORDER BY session_date DESC LIMIT ?""",
                (project_id, days)
            ).fetchall()
        else:
            rows = self.conn.execute(
                """SELECT session_date, SUM(total_tokens) AS tokens, SUM(tokens_saved) AS saved
                   FROM token_sessions
                   GROUP BY session_date ORDER BY session_date DESC LIMIT ?""",
                (days,)
            ).fetchall()
        return [dict(r) for r in rows]


# Singleton
_db: Optional[Database] = None


def get_db() -> Database:
    global _db
    if _db is None:
        _db = Database()
    return _db

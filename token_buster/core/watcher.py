"""
Token Buster - File Watcher (Watchdog-based)
Author: Muhammad Faizan | github.com/faizzyhon | instagram.com/faizzyhon

Monitors a project directory for file changes triggered by AI edits.
"""

import os
import time
import threading
from pathlib import Path
from typing import Callable, Optional
from datetime import datetime

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler, FileModifiedEvent, FileCreatedEvent
    WATCHDOG_AVAILABLE = True
except ImportError:
    WATCHDOG_AVAILABLE = False

from token_buster.core.tokenizer import get_engine
from token_buster.db.database import get_db


IGNORED_EXTENSIONS = {
    ".pyc", ".pyo", ".pyd", ".egg-info", ".dist-info",
    ".DS_Store", ".git", ".idea", ".vscode", "__pycache__",
    ".log", ".tmp", ".swp", ".bak",
}

WATCHED_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".html", ".css",
    ".json", ".yaml", ".yml", ".md", ".txt", ".env",
    ".go", ".rs", ".java", ".cpp", ".c", ".h",
}


def _should_watch(path: str) -> bool:
    p = Path(path)
    for part in p.parts:
        if part.startswith(".") or part in {"node_modules", "__pycache__", "dist", "build", ".git"}:
            return False
    return p.suffix.lower() in WATCHED_EXTENSIONS


class ChangeHandler(FileSystemEventHandler):
    def __init__(self, project_id: int, on_change: Optional[Callable] = None):
        super().__init__()
        self.project_id = project_id
        self.on_change = on_change
        self._debounce: dict = {}
        self._lock = threading.Lock()

    def _debounced_handle(self, path: str, event_type: str):
        """Debounce rapid file saves (300ms window)."""
        with self._lock:
            if path in self._debounce:
                self._debounce[path].cancel()
            timer = threading.Timer(0.3, self._process_change, args=(path, event_type))
            self._debounce[path] = timer
            timer.start()

    def _process_change(self, path: str, event_type: str):
        if not _should_watch(path):
            return

        try:
            if not os.path.exists(path):
                return

            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            engine = get_engine()
            token_count = engine.count_tokens(content)
            db = get_db()
            db.log_file_change(
                project_id=self.project_id,
                file_path=path,
                event_type=event_type,
                token_count=token_count,
                content_snapshot=content[:2000],  # Store first 2000 chars
            )

            if self.on_change:
                self.on_change({
                    "path": path,
                    "event": event_type,
                    "tokens": token_count,
                    "timestamp": datetime.utcnow().isoformat(),
                })
        except Exception as e:
            print(f"[Token Buster Watcher] Error processing {path}: {e}")

    def on_modified(self, event):
        if not event.is_directory:
            self._debounced_handle(event.src_path, "modified")

    def on_created(self, event):
        if not event.is_directory:
            self._debounced_handle(event.src_path, "created")


class ProjectWatcher:
    """Manages file watchers per project."""

    def __init__(self):
        self._observers: dict[int, Observer] = {}

    def start(self, project_id: int, path: str, on_change: Optional[Callable] = None):
        if not WATCHDOG_AVAILABLE:
            print("[Token Buster] Watchdog not installed. File watching disabled.")
            return False

        if project_id in self._observers:
            self.stop(project_id)

        if not os.path.isdir(path):
            print(f"[Token Buster] Path not found: {path}")
            return False

        observer = Observer()
        handler = ChangeHandler(project_id=project_id, on_change=on_change)
        observer.schedule(handler, path=path, recursive=True)
        observer.start()
        self._observers[project_id] = observer
        print(f"[Token Buster] Watching project {project_id} at: {path}")
        return True

    def stop(self, project_id: int):
        if project_id in self._observers:
            obs = self._observers.pop(project_id)
            obs.stop()
            obs.join()

    def stop_all(self):
        for pid in list(self._observers.keys()):
            self.stop(pid)

    def active_watchers(self) -> list:
        return list(self._observers.keys())


# Singleton
_watcher = ProjectWatcher()


def get_watcher() -> ProjectWatcher:
    return _watcher

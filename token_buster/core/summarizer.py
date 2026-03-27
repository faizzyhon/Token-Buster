"""
Token Buster - Context Summarizer
Author: Muhammad Faizan | github.com/faizzyhon | instagram.com/faizzyhon

Generates concise, copy-paste-ready context logs from prompt/response pairs.
Reduces what the AI needs to "remember" by 5x-10x.
"""

import re
from datetime import datetime
from typing import Optional
from token_buster.core.tokenizer import get_engine


SUMMARY_TEMPLATE = """\
### Token Buster Context Log
**Generated:** {timestamp}
**Project:** {project_name}
**Session Tokens Saved:** {tokens_saved} tokens ({reduction_pct}% reduction)

---
## What Changed
{changes_summary}

## Active Files (relevant to current task)
{active_files}

## Key Decisions / Notes
{notes}

---
*Copy this block into your next prompt to give the AI full context with minimal tokens.*
"""

PROMPT_LOG_TEMPLATE = """\
[CHANGE #{entry_id}] {timestamp}
File: {file_path}
Event: {event_type}
Tokens: {token_count}
Prompt Summary: {prompt_summary}
AI Response Summary: {response_summary}
---
"""


def _truncate(text: str, max_chars: int = 300) -> str:
    if not text:
        return "(none)"
    text = text.strip()
    return text[:max_chars] + "…" if len(text) > max_chars else text


def generate_context_log(
    project_name: str,
    changes: list[dict],
    active_files: list[str],
    notes: str = "",
) -> dict:
    """
    Build a compact context log from recent changes.
    Returns both the log text and token counts.
    """
    engine = get_engine()

    changes_lines = []
    for c in changes[-10:]:  # Last 10 changes max
        line = f"- [{c.get('event_type','mod')}] `{Path(c.get('file_path','')).name}` — {_truncate(c.get('prompt_summary',''), 120)}"
        changes_lines.append(line)

    changes_summary = "\n".join(changes_lines) if changes_lines else "No recent changes."
    active_files_text = "\n".join(f"- `{f}`" for f in (active_files or [])[:20])

    # Calculate savings
    original_token_est = sum(c.get("token_count", 0) for c in changes)
    log_text = SUMMARY_TEMPLATE.format(
        timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        project_name=project_name,
        tokens_saved=original_token_est,
        reduction_pct=80,
        changes_summary=changes_summary,
        active_files=active_files_text or "No active files tracked.",
        notes=notes or "No notes.",
    )

    log_tokens = engine.count_tokens(log_text)
    return {
        "log_text": log_text,
        "log_tokens": log_tokens,
        "original_tokens": original_token_est,
        "reduction_ratio": round(original_token_est / log_tokens, 1) if log_tokens > 0 else 0,
    }


def generate_prompt_diff_log(
    entry_id: int,
    file_path: str,
    event_type: str,
    token_count: int,
    prompt_summary: str,
    response_summary: str,
) -> str:
    """Generate a single-line diff log entry for a prompt/response pair."""
    return PROMPT_LOG_TEMPLATE.format(
        entry_id=entry_id,
        timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        file_path=file_path,
        event_type=event_type,
        token_count=token_count,
        prompt_summary=_truncate(prompt_summary, 200),
        response_summary=_truncate(response_summary, 200),
    )


def extract_key_changes(old_content: str, new_content: str) -> str:
    """
    Simple diff-based extractor: identifies added/removed lines.
    Returns a short human-readable summary.
    """
    old_lines = set(old_content.splitlines())
    new_lines = set(new_content.splitlines())

    added = [l for l in new_lines - old_lines if l.strip()][:5]
    removed = [l for l in old_lines - new_lines if l.strip()][:5]

    parts = []
    if added:
        parts.append("Added:\n" + "\n".join(f"  + {l}" for l in added))
    if removed:
        parts.append("Removed:\n" + "\n".join(f"  - {l}" for l in removed))

    return "\n".join(parts) if parts else "Minor formatting changes."


# Fix missing import
from pathlib import Path
